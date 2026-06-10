import { AuditReceipt, type ComplianceConfig, type StorageBackend } from '@aivoralabs/agenttrail';
import type OpenAI from 'openai';
import type { ChatCompletion } from 'openai/resources/chat/completions';

export interface OpenAIConfig {
  agentId: string;
  /** Optional persistent storage backend. When provided, receipts are persisted to disk. */
  storage?: StorageBackend;
  /** Optional compliance mode configuration. */
  complianceConfig?: ComplianceConfig;
}

/**
 * Wraps an OpenAI client to automatically generate audit receipts
 * for every chat completion call.
 *
 * The wrapper intercepts non-streaming chat completions and records
 * input/output with cryptographic audit receipts.
 *
 * Usage:
 * ```typescript
 * import { wrapOpenAI } from '@aivoralabs/agenttrail-openai';
 *
 * const client = wrapOpenAI(new OpenAI(), { agentId: 'my-agent' });
 * const result = await client.chat.completions.create({ ... });
 * ```
 */
export function wrapOpenAI(client: OpenAI, config: OpenAIConfig): OpenAI {
  const auditor = new AuditReceipt({
    agentId: config.agentId,
    storage: config.storage,
    complianceConfig: config.complianceConfig,
  });

  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  // Replace create with an audited version
  client.chat.completions.create = ((body: any, options?: any) => {
    const timestampStart = new Date().toISOString();

    return originalCreate(body, options).then((result: any) => {
      const timestampEnd = new Date().toISOString();

      // Only handle non-streaming ChatCompletion responses
      if (result?.choices && Array.isArray(result.choices)) {
        const completion = result as ChatCompletion;
        const outputMessage = completion.choices?.[0]?.message;

        auditor
          .record({
            input: JSON.stringify(body.messages ?? []),
            output: outputMessage?.content ?? '',
            model: body.model ?? 'unknown',
            provider: 'openai',
            tokensPrompt: completion.usage?.prompt_tokens,
            tokensCompletion: completion.usage?.completion_tokens,
            metadata: {
              timestamp_start: timestampStart,
              timestamp_end: timestampEnd,
              finish_reason: completion.choices?.[0]?.finish_reason,
              ...(outputMessage?.tool_calls !== undefined
                ? { tool_calls: outputMessage.tool_calls }
                : {}),
            },
          })
          .catch(() => {
            // Fail-safe: never throw from the wrapper
          });
      }

      return result;
    });
  }) as typeof client.chat.completions.create;

  return client;
}
