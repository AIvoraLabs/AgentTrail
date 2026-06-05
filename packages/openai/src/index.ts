import OpenAI from 'openai';
import { AuditReceipt } from '@aivoralabs/agenttrail';

export interface OpenAIConfig {
  agentId: string;
}

/**
 * Wraps an OpenAI client to automatically generate audit receipts
 * for every chat completion call.
 */
export function wrapOpenAI(client: OpenAI, config: OpenAIConfig): OpenAI {
  const auditor = new AuditReceipt({ agentId: config.agentId });

  const originalCreate = client.chat.completions.create.bind(
    client.chat.completions,
  );

  // Override create method to intercept calls
  client.chat.completions.create = async (
    ...args: Parameters<typeof originalCreate>
  ): Promise<ReturnType<typeof originalCreate>> => {
    const [params] = args;
    const timestampStart = new Date().toISOString();

    const result = await originalCreate(...args);
    const timestampEnd = new Date().toISOString();

    // Extract messages for audit
    const inputMessages = params.messages ?? [];
    const outputMessage = result.choices?.[0]?.message;

    // Record the interaction (fire-and-forget — never block the response)
    auditor.record({
      input: JSON.stringify(inputMessages),
      output: outputMessage?.content ?? '',
      model: params.model ?? 'unknown',
      provider: 'openai',
      tokensPrompt: result.usage?.prompt_tokens,
      tokensCompletion: result.usage?.completion_tokens,
      metadata: {
        timestamp_start: timestampStart,
        timestamp_end: timestampEnd,
        finish_reason: result.choices?.[0]?.finish_reason,
        tool_calls: outputMessage?.tool_calls,
      },
    }).catch(() => {
      // Fail-safe: never throw from the wrapper
    });

    return result;
  };

  return client;
}
