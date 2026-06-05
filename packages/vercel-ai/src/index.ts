import { AuditReceipt } from '@aivoralabs/agenttrail';

export interface VercelAIConfig {
  agentId: string;
}

interface VercelMiddleware {
  wrapGenerate?: (opts: {
    doGenerate: () => Promise<any>;
    params: any;
  }) => Promise<any>;
  wrapStream?: (opts: {
    doStream: () => Promise<{ stream: ReadableStream; warnings?: unknown }>;
    params: any;
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
export function auditReceiptMiddleware(
  config: VercelAIConfig,
): VercelMiddleware {
  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const timestampStart = new Date().toISOString();
      const result = await doGenerate();
      const timestampEnd = new Date().toISOString();

      const auditor = new AuditReceipt({ agentId: config.agentId });

      await auditor.record({
        input: JSON.stringify(params.prompt),
        output: result.text ?? '',
        model: params.modelId ?? 'unknown',
        provider: 'vercel-ai',
        tokensPrompt: result.usage?.promptTokens,
        tokensCompletion: result.usage?.completionTokens,
        metadata: {
          timestamp_start: timestampStart,
          timestamp_end: timestampEnd,
          settings: params.providerMetadata,
        },
      }).catch(() => {
        // Fail-safe: never throw from middleware
      });

      return result;
    },

    wrapStream: async ({ doStream, params }) => {
      const timestampStart = new Date().toISOString();
      const { stream, ...rest } = await doStream();

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
          const auditor = new AuditReceipt({ agentId: config.agentId });

          await auditor.record({
            input: JSON.stringify(params.prompt),
            output: fullOutput,
            model: params.modelId ?? 'unknown',
            provider: 'vercel-ai',
            metadata: {
              timestamp_start: timestampStart,
              timestamp_end: timestampEnd,
            },
          }).catch(() => {
            // Fail-safe: never throw from middleware
          });
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    },
  };
}
