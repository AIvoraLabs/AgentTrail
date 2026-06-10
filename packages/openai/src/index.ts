import { AuditReceipt, ComplianceError } from '@aivoralabs/agenttrail';
import type { ComplianceConfig, ComplianceMode, StorageBackend } from '@aivoralabs/agenttrail';
import type OpenAI from 'openai';
import type { RequestOptions } from 'openai/core';
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources/chat/completions';
import type { Stream } from 'openai/streaming';

export interface OpenAIConfig {
  agentId: string;
  /** Optional persistent storage backend. When provided, receipts are persisted to disk. */
  storage?: StorageBackend;
  complianceMode?: ComplianceMode;
  complianceConfig?: ComplianceConfig;
}

/**
 * Creates an async iterable that replays the given chunks.
 * Used to return a stream-like value after fully consuming the original stream.
 */
function createReplayStream(chunks: ChatCompletionChunk[]): AsyncIterable<ChatCompletionChunk> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<ChatCompletionChunk> {
      let index = 0;
      return {
        next(): Promise<IteratorResult<ChatCompletionChunk>> {
          if (index < chunks.length) {
            return Promise.resolve({ value: chunks[index++], done: false });
          }
          return Promise.resolve({
            value: undefined as unknown as ChatCompletionChunk,
            done: true,
          });
        },
      };
    },
  };
}

/**
 * Accumulate tool call deltas from a streaming chunk into the accumulator map.
 */
function accumulateToolCallDeltas(
  toolCalls: Map<
    number,
    {
      id?: string;
      function?: { name?: string; arguments?: string };
      type?: string;
    }
  >,
  deltas: Array<{
    index: number;
    id?: string;
    function?: { name?: string; arguments?: string };
    type?: string;
  }>,
): void {
  for (const tc of deltas) {
    const existing = toolCalls.get(tc.index) ?? {};
    if (tc.id) existing.id = tc.id;
    if (tc.type) existing.type = tc.type;
    if (tc.function) {
      existing.function = existing.function ?? {};
      if (tc.function.name) existing.function.name = tc.function.name;
      if (tc.function.arguments) {
        existing.function.arguments = (existing.function.arguments ?? '') + tc.function.arguments;
      }
    }
    toolCalls.set(tc.index, existing);
  }
}

/**
 * Wraps an OpenAI client to automatically generate audit receipts
 * for every chat completion call.
 *
 * The wrapper intercepts chat completions (both streaming and non-streaming)
 * and records input/output with cryptographic audit receipts.
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
  const complianceMode = config.complianceMode ?? config.complianceConfig?.mode ?? 'strict';
  const complianceConfig = config.complianceConfig;

  const auditor = new AuditReceipt({
    agentId: config.agentId,
    storage: config.storage,
    complianceConfig: { mode: complianceMode, ...complianceConfig },
  });

  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  // Replace create with an audited version
  client.chat.completions.create = ((
    body: ChatCompletionCreateParams,
    options?: RequestOptions,
  ) => {
    const timestampStart = new Date().toISOString();

    // Wrap in an async IIFE so we can use await for pre-flight and streaming
    return (async () => {
      // --- Pre-flight compliance check ---
      // Pre-flight is a dry-run compliance check; storage persistence not needed
      const preflightAuditor = new AuditReceipt({
        agentId: config.agentId,
        complianceConfig: { mode: complianceMode, ...complianceConfig },
      });
      try {
        await preflightAuditor.record({
          input: '[preflight]',
          output: 'ok',
          model: 'preflight',
          provider: 'openai',
        });
      } catch (err) {
        if (complianceMode === 'strict') {
          throw new ComplianceError('Pre-flight compliance check failed', {
            cause: err,
          });
        }
        complianceConfig?.onComplianceError?.(err as Error);
        console.warn('[AgentTrail] Pre-flight check failed, continuing in permissive mode');
      }

      // --- Streaming branch ---
      if (body.stream === true) {
        const result = await originalCreate(body, options);
        const stream = result as Stream<ChatCompletionChunk>;
        const chunks: ChatCompletionChunk[] = [];
        let fullOutput = '';
        let finishReason: string | null = null;
        let usage: ChatCompletionChunk['usage'] = null;
        const toolCallAccumulator = new Map<
          number,
          { id?: string; function?: { name?: string; arguments?: string }; type?: string }
        >();
        let streamError: unknown = null;

        // Consume the entire stream
        try {
          for await (const chunk of stream) {
            chunks.push(chunk);
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) {
              fullOutput += delta.content;
            }
            if (delta?.tool_calls) {
              accumulateToolCallDeltas(toolCallAccumulator, delta.tool_calls);
            }
            if (chunk.choices?.[0]?.finish_reason) {
              finishReason = chunk.choices[0].finish_reason;
            }
            if (chunk.usage) {
              usage = chunk.usage;
            }
          }
        } catch (err) {
          streamError = err;
          // Strict mode: no receipt, re-throw (spec 14)
          if (complianceMode === 'strict') {
            throw err;
          }
          // Permissive: record partial output below (spec 15)
        }

        // Record receipt (if no stream error, or in permissive mode)
        if (!streamError || complianceMode === 'permissive') {
          const accumulatedToolCalls =
            toolCallAccumulator.size > 0
              ? Array.from(toolCallAccumulator.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([index, tc]) => ({ index, ...tc }))
              : undefined;

          const timestampEnd = new Date().toISOString();
          try {
            await auditor.record({
              input: JSON.stringify(body.messages ?? []),
              output: fullOutput,
              model: body.model ?? 'unknown',
              provider: 'openai',
              tokensPrompt: usage?.prompt_tokens,
              tokensCompletion: usage?.completion_tokens,
              metadata: {
                timestamp_start: timestampStart,
                timestamp_end: timestampEnd,
                finish_reason: finishReason,
                tool_calls: accumulatedToolCalls,
                stream_error: streamError ? true : undefined,
              },
            });
          } catch (recordErr) {
            if (complianceMode === 'strict') {
              throw new ComplianceError('Receipt recording failed', {
                cause: recordErr,
              });
            }
            complianceConfig?.onComplianceError?.(recordErr as Error);
            console.warn('[AgentTrail] Receipt recording failed (streaming)');
          }
        }

        // Re-throw stream error if present
        if (streamError) {
          throw streamError;
        }

        // Return a replay stream for the caller to consume
        return createReplayStream(chunks);
      }

      // --- Non-streaming branch ---
      return originalCreate(body, options).then((result: ChatCompletion) => {
        const timestampEnd = new Date().toISOString();

        if (result?.choices && Array.isArray(result.choices)) {
          const outputMessage = result.choices?.[0]?.message;

          return auditor
            .record({
              input: JSON.stringify(body.messages ?? []),
              output: outputMessage?.content ?? '',
              model: body.model ?? 'unknown',
              provider: 'openai',
              tokensPrompt: result.usage?.prompt_tokens,
              tokensCompletion: result.usage?.completion_tokens,
              metadata: {
                timestamp_start: timestampStart,
                timestamp_end: timestampEnd,
                finish_reason: result.choices?.[0]?.finish_reason,
                ...(outputMessage?.tool_calls !== undefined
                  ? { tool_calls: outputMessage.tool_calls }
                  : {}),
              },
            })
            .then(() => result)
            .catch((error: Error) => {
              if (complianceMode === 'strict') {
                throw new ComplianceError('Receipt recording failed', {
                  cause: error,
                });
              }
              complianceConfig?.onComplianceError?.(error);
              console.warn('[AgentTrail] Receipt recording failed (non-streaming)');
              return result;
            });
        }

        return result;
      });
    })();
  }) as typeof client.chat.completions.create;

  return client;
}
