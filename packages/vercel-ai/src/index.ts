import { AuditReceipt, ComplianceError } from '@aivoralabs/agenttrail';
import type { ComplianceConfig, ComplianceMode, StorageBackend } from '@aivoralabs/agenttrail';

export interface VercelAIConfig {
  agentId: string;
  /** Optional persistent storage backend. When provided, receipts are persisted to disk. */
  storage?: StorageBackend;
  complianceMode?: ComplianceMode;
  /** Optional compliance mode configuration. */
  complianceConfig?: ComplianceConfig;
}

interface GenerateParams {
  prompt: string;
  messages?: unknown[];
  modelId?: string;
  providerMetadata?: unknown;
  tools?: unknown[];
}

interface StreamParams {
  prompt: string;
  messages?: unknown[];
  modelId?: string;
  onChunk?: (chunk: unknown) => void;
}

interface GenerateResult {
  text?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

interface VercelMiddleware {
  wrapGenerate?: (opts: {
    doGenerate: () => Promise<GenerateResult>;
    params: GenerateParams;
  }) => Promise<unknown>;
  wrapStream?: (opts: {
    doStream: () => Promise<{ stream: ReadableStream; warnings?: unknown }>;
    params: StreamParams;
  }) => Promise<{ stream: ReadableStream; warnings?: unknown }>;
}

/**
 * Creates a Vercel AI SDK middleware that automatically generates
 * audit receipts for every model interaction.
 *
 * Usage:
 * ```typescript
 * import { wrapLanguageModel } from 'ai';
 * import { auditReceiptMiddleware } from '@aivoralabs/agenttrail-vercel';
 *
 * const model = wrapLanguageModel({
 *   model: yourModel,
 *   middleware: auditReceiptMiddleware({ agentId: 'my-agent' }),
 * });
 * ```
 */
export function auditReceiptMiddleware(config: VercelAIConfig): VercelMiddleware {
  const complianceMode = config.complianceMode ?? config.complianceConfig?.mode ?? 'strict';
  const complianceConfig = config.complianceConfig;

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const timestampStart = new Date().toISOString();
      let result: GenerateResult;
      try {
        result = await doGenerate();
      } catch (err) {
        if (complianceMode === 'strict') {
          throw new ComplianceError('LLM provider call failed', { cause: err });
        }
        throw err;
      }
      const timestampEnd = new Date().toISOString();

      const auditor = new AuditReceipt({
        agentId: config.agentId,
        storage: config.storage,
        complianceConfig: { mode: complianceMode, ...complianceConfig },
      });

      await auditor
        .record({
          input: JSON.stringify(params.prompt),
          output: result.text ?? '',
          model: params.modelId ?? 'unknown',
          provider: 'vercel-ai',
          tokensPrompt: result.usage?.promptTokens,
          tokensCompletion: result.usage?.completionTokens,
          metadata: {
            timestamp_start: timestampStart,
            timestamp_end: timestampEnd,
            ...(params.providerMetadata !== undefined ? { settings: params.providerMetadata } : {}),
          },
        })
        .catch((error: Error) => {
          if (complianceMode === 'strict') {
            throw error;
          }
          complianceConfig?.onComplianceError?.(error);
          console.warn('[AgentTrail] Receipt recording failed (generate)');
        });

      return result;
    },

    wrapStream: async ({ doStream, params }) => {
      // Pre-flight: verify auditor can record (dry run, no storage persistence)
      const preflightAuditor = new AuditReceipt({
        agentId: config.agentId,
        complianceConfig: { mode: complianceMode, ...complianceConfig },
      });
      try {
        await preflightAuditor.record({
          input: '[preflight]',
          output: '[preflight]',
          model: '[preflight]',
          provider: 'vercel-ai',
        });
      } catch (err) {
        if (complianceMode === 'strict') {
          throw err;
        }
        console.warn(
          '[AgentTrail] Compliance pre-flight check failed, continuing in permissive mode',
        );
      }

      const timestampStart = new Date().toISOString();
      let streamResult: { stream: ReadableStream; warnings?: unknown };
      try {
        streamResult = await doStream();
      } catch (err) {
        if (complianceMode === 'strict') {
          throw new ComplianceError('LLM provider call failed', { cause: err });
        }
        throw err;
      }
      const { stream, ...rest } = streamResult;

      let fullOutput = '';

      const transformStream = new TransformStream({
        transform(
          chunk: { type?: string; delta?: string },
          controller: TransformStreamDefaultController,
        ) {
          if (chunk.type === 'text-delta' && chunk.delta) {
            fullOutput += chunk.delta;
          }
          controller.enqueue(chunk);
        },
        async flush() {
          const timestampEnd = new Date().toISOString();
          const auditor = new AuditReceipt({
            agentId: config.agentId,
            storage: config.storage,
            complianceConfig: { mode: complianceMode, ...complianceConfig },
          });

          try {
            await auditor.record({
              input: JSON.stringify(params.prompt),
              output: fullOutput,
              model: params.modelId ?? 'unknown',
              provider: 'vercel-ai',
              metadata: {
                timestamp_start: timestampStart,
                timestamp_end: timestampEnd,
              },
            });
          } catch {
            console.warn('[AgentTrail] Stream receipt creation failed');
          }
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    },
  };
}
