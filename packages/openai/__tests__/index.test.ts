import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wrapOpenAI } from '../src/index';

describe('wrapOpenAI', () => {
  function createMockClient() {
    const originalCreate = vi.fn();
    return {
      chat: {
        completions: {
          create: originalCreate,
        },
      },
      // Store reference to verify calls on the original
      __originalCreate: originalCreate,
    } as any;
  }

  it('should return the same client instance', () => {
    const client = createMockClient();
    const wrapped = wrapOpenAI(client, { agentId: 'test-agent' });
    expect(wrapped).toBe(client);
  });

  it('should intercept chat.completions.create and return original result', async () => {
    const client = createMockClient();

    const mockResult = {
      id: 'chat-1',
      choices: [
        {
          message: { content: 'Hello back!', role: 'assistant' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      model: 'gpt-4o',
    };

    client.__originalCreate.mockResolvedValue(mockResult);

    const wrapped = wrapOpenAI(client, { agentId: 'test-agent' });
    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toEqual(mockResult);
  });

  it('should pass params to the original create method', async () => {
    const client = createMockClient();

    const mockResult = {
      id: 'chat-1',
      choices: [{ message: { content: 'Hi!', role: 'assistant' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      model: 'gpt-4o',
    };

    client.__originalCreate.mockResolvedValue(mockResult);

    const wrapped = wrapOpenAI(client, { agentId: 'test-agent' });
    await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(client.__originalCreate).toHaveBeenCalledWith({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
    });
  });

  it('should not throw if no messages provided', async () => {
    const client = createMockClient();

    const mockResult = {
      id: 'chat-1',
      choices: [{ message: { content: '', role: 'assistant' }, finish_reason: 'stop' }],
      usage: {},
      model: 'gpt-4o',
    };

    client.__originalCreate.mockResolvedValue(mockResult);

    const wrapped = wrapOpenAI(client, { agentId: 'test-agent' });
    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
    } as any);

    expect(result).toEqual(mockResult);
  });
});
