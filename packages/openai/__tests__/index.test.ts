import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wrapOpenAI } from '../src/index';

// ---------------------------------------------------------------------------
// Hoisted mocks — these run before the module factory below.
// mockRecord is shared across ALL AuditReceipt instances created in tests.
// ---------------------------------------------------------------------------
const mockRecord = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@aivoralabs/agenttrail', () => ({
  AuditReceipt: vi.fn().mockImplementation(() => ({
    record: mockRecord,
  })),
  ComplianceError: class ComplianceError extends Error {
    readonly code = 'COMPLIANCE_ERROR';

    constructor(message: string, options?: { cause?: unknown }) {
      super(message);
      this.name = 'ComplianceError';
      this.cause = options?.cause;
    }
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockClient() {
  const originalCreate = vi.fn();
  return {
    chat: {
      completions: {
        create: originalCreate,
      },
    },
    __originalCreate: originalCreate,
  } as any;
}

/** Helper: create a partial ChatCompletionChunk with sensible defaults. */
function createChunk(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'chunk-default',
    object: 'chat.completion.chunk',
    created: 1000000,
    model: 'gpt-4o',
    choices: [
      {
        index: 0,
        delta: { content: '', role: 'assistant' },
        finish_reason: null,
        logprobs: null,
      },
    ],
    ...overrides,
  };
}

/** Helper: create an async iterable from chunk data. */
function mockStream(chunks: any[]): any {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next(): Promise<IteratorResult<any>> {
          if (i < chunks.length) {
            return Promise.resolve({ value: chunks[i++], done: false });
          }
          return Promise.resolve({ value: undefined, done: true });
        },
      };
    },
  };
}

/** Default non-streaming result used across multiple tests. */
const defaultResult = {
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

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockRecord.mockReset();
  mockRecord.mockResolvedValue({}); // default: succeed
});

// ===================================================================
// Existing (regression) tests — Phase 1 / Task 1.5 / 4.4
// ===================================================================
describe('wrapOpenAI — regression', () => {
  it('should return the same client instance', () => {
    const client = createMockClient();
    const wrapped = wrapOpenAI(client, { agentId: 'test-agent' });
    expect(wrapped).toBe(client);
  });

  it('should intercept chat.completions.create and return original result', async () => {
    const client = createMockClient();
    client.__originalCreate.mockResolvedValue(defaultResult);

    const wrapped = wrapOpenAI(client, { agentId: 'test-agent' });
    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toEqual(defaultResult);
  });

  it('should pass params to the original create method', async () => {
    const client = createMockClient();
    client.__originalCreate.mockResolvedValue(defaultResult);

    const wrapped = wrapOpenAI(client, { agentId: 'test-agent' });
    await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(client.__originalCreate).toHaveBeenCalledWith(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hi' }] },
      undefined,
    );
  });

  it('should not throw if no messages provided', async () => {
    const client = createMockClient();

    const mockResult = {
      id: 'chat-1',
      choices: [
        {
          message: { content: '', role: 'assistant' },
          finish_reason: 'stop',
        },
      ],
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

  describe('storage integration', () => {
    it('should not throw when storage configured', async () => {
      const storage = { append: vi.fn().mockResolvedValue(undefined), readRange: vi.fn() };
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

      const wrapped = wrapOpenAI(client, { agentId: 'test-agent', storage });
      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      ).resolves.toEqual(mockResult);
    });

    it('should not throw when storage omitted from config', async () => {
      const client = createMockClient();

      const mockResult = {
        id: 'chat-1',
        choices: [{ message: { content: 'Hi!', role: 'assistant' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        model: 'gpt-4o',
      };

      client.__originalCreate.mockResolvedValue(mockResult);

      const wrapped = wrapOpenAI(client, { agentId: 'test-agent' });
      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      ).resolves.toEqual(mockResult);
    });
  });
});

// ===================================================================
// Phase 2: Compliance Mode — Non-streaming
// ===================================================================
describe('compliance mode — non-streaming', () => {
  // Task 2.5 / spec 7, 24
  it('strict mode: receipt failure throws ComplianceError', async () => {
    const client = createMockClient();
    client.__originalCreate.mockResolvedValue(defaultResult);

    // pre-flight succeeds, actual record fails
    mockRecord.mockResolvedValueOnce({});
    mockRecord.mockRejectedValueOnce(new Error('DB write failed'));

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    await expect(
      wrapped.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toMatchObject({ code: 'COMPLIANCE_ERROR' });
  });

  // Task 2.6 / spec 8, 25
  it('permissive mode: receipt failure warns and returns result', async () => {
    const client = createMockClient();
    client.__originalCreate.mockResolvedValue(defaultResult);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockRecord.mockResolvedValueOnce({}); // pre-flight succeeds
    mockRecord.mockRejectedValueOnce(new Error('DB write failed')); // record fails

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'permissive',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toEqual(defaultResult);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Receipt recording failed'),
    );

    warnSpy.mockRestore();
  });

  // Task 2.7 / spec 2, 32
  it('pre-flight check in strict mode blocks before originalCreate', async () => {
    const client = createMockClient();
    client.__originalCreate.mockResolvedValue(defaultResult);

    // Pre-flight fails on the first record() call
    mockRecord.mockRejectedValueOnce(new Error('Key not available'));

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    let err: any;
    try {
      await wrapped.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe('COMPLIANCE_ERROR');
    expect(err.message).toContain('Pre-flight');
    expect(client.__originalCreate).not.toHaveBeenCalled();
  });

  // Task 2.8 / spec 1
  it('defaults to strict mode when complianceMode is omitted', async () => {
    const client = createMockClient();
    client.__originalCreate.mockResolvedValue(defaultResult);

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({});

    const wrapped = wrapOpenAI(client, { agentId: 'test-agent' });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toEqual(defaultResult);
    // Should have been called at least once (pre-flight + recording)
    expect(mockRecord).toHaveBeenCalled();
  });

  // ---- Phase 2 edge cases (openai-compliance) ----

  // S3: permissive pre-flight failure warns and proceeds (spec 3)
  it('S3: permissive pre-flight failure warns and proceeds', async () => {
    const client = createMockClient();
    client.__originalCreate.mockResolvedValue(defaultResult);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockRecord.mockReset();
    // Pre-flight fails, record succeeds
    mockRecord.mockRejectedValueOnce(new Error('Key not available'));
    mockRecord.mockResolvedValue({});

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'permissive',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toEqual(defaultResult);
    expect(client.__originalCreate).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Pre-flight check failed'),
    );

    warnSpy.mockRestore();
  });

  // S4: onComplianceError callback invoked on receipt failure (spec 4)
  it('S4: onComplianceError callback invoked on receipt failure', async () => {
    const client = createMockClient();
    client.__originalCreate.mockResolvedValue(defaultResult);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onError = vi.fn();

    mockRecord.mockReset();
    mockRecord.mockResolvedValueOnce({}); // pre-flight succeeds
    mockRecord.mockRejectedValueOnce(new Error('DB write failed')); // record fails

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'permissive',
      complianceConfig: { onComplianceError: onError },
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toEqual(defaultResult);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Receipt recording failed'),
    );

    warnSpy.mockRestore();
  });

  // S6: non-streaming permissive mode success path (spec 6)
  it('S6: non-streaming permissive mode success path', async () => {
    const client = createMockClient();
    client.__originalCreate.mockResolvedValue(defaultResult);

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({});

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'permissive',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toEqual(defaultResult);

    // Verify receipt recorded (not pre-flight)
    const recordCall = mockRecord.mock.calls.find(
      (args: any[]) => args[0]?.input !== '[preflight]',
    );
    expect(recordCall).toBeDefined();
    expect(recordCall[0].output).toBe('Hello back!');
  });

  // S10: missing usage in response → tokens omitted from receipt (spec 10)
  it('S10: missing usage in response → tokens omitted from receipt', async () => {
    const client = createMockClient();
    const resultWithoutUsage = {
      id: 'chat-1',
      choices: [
        {
          message: { content: 'No usage data', role: 'assistant' },
          finish_reason: 'stop',
        },
      ],
      model: 'gpt-4o',
      // no `usage` field
    };
    client.__originalCreate.mockResolvedValue(resultWithoutUsage);

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({});

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toEqual(resultWithoutUsage);

    // Verify receipt recorded without token fields
    const recordCall = mockRecord.mock.calls.find(
      (args: any[]) => args[0]?.input !== '[preflight]',
    );
    expect(recordCall).toBeDefined();
    expect(recordCall[0].tokensPrompt).toBeUndefined();
    expect(recordCall[0].tokensCompletion).toBeUndefined();
  });
});

// ===================================================================
// Phase 3: Streaming Support
// ===================================================================
describe('streaming support', () => {
  // Task 3.6 / spec 11
  it('streaming success: accumulates full content in receipt', async () => {
    const client = createMockClient();

    const chunks = [
      createChunk({
        id: 'chunk-1',
        choices: [
          {
            index: 0,
            delta: { content: 'Hello', role: 'assistant' },
            finish_reason: null,
          },
        ],
      }),
      createChunk({
        id: 'chunk-2',
        choices: [
          {
            index: 0,
            delta: { content: ' world', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
      }),
    ];

    client.__originalCreate.mockResolvedValue(mockStream(chunks));

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({});

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Say hi' }],
      stream: true,
    });

    // Verify the result is iterable and contains our chunks
    const received: any[] = [];
    for await (const c of result) {
      received.push(c);
    }
    expect(received).toHaveLength(2);
    expect(received[0].choices[0].delta.content).toBe('Hello');

    // Verify the receipt contains the accumulated content
    const recordCall = mockRecord.mock.calls.find(
      (args: any[]) => args[0]?.input !== '[preflight]',
    );
    expect(recordCall).toBeDefined();
    expect(recordCall[0].output).toBe('Hello world');
    expect(recordCall[0].metadata.finish_reason).toBe('stop');
  });

  // Task 3.7 / spec 16
  it('streaming with tool calls accumulates them in receipt metadata', async () => {
    const client = createMockClient();

    const chunks = [
      createChunk({
        id: 'chunk-1',
        choices: [
          {
            index: 0,
            delta: {
              content: '',
              role: 'assistant',
              tool_calls: [
                {
                  index: 0,
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'get_weather', arguments: '' },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      }),
      createChunk({
        id: 'chunk-2',
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  function: { arguments: '{"city":"London"}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
    ];

    client.__originalCreate.mockResolvedValue(mockStream(chunks));

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({});

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Weather?' }],
      stream: true,
    });

    // Consume the replay stream
    const received: any[] = [];
    for await (const c of result) {
      received.push(c);
    }
    expect(received).toHaveLength(2);

    // Verify tool calls in receipt metadata
    const recordCall = mockRecord.mock.calls.find(
      (args: any[]) => args[0]?.input !== '[preflight]',
    );
    expect(recordCall).toBeDefined();
    expect(recordCall[0].metadata.tool_calls).toBeDefined();
    expect(recordCall[0].metadata.tool_calls).toHaveLength(1);
    expect(recordCall[0].metadata.tool_calls[0].id).toBe('call_1');
    expect(recordCall[0].metadata.tool_calls[0].function?.name).toBe('get_weather');
    expect(recordCall[0].metadata.tool_calls[0].function?.arguments).toBe(
      '{"city":"London"}',
    );
  });

  // Task 3.8 / spec 17
  it('empty stream: receipt recorded with empty output', async () => {
    const client = createMockClient();
    client.__originalCreate.mockResolvedValue(mockStream([]));

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({});

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: '' }],
      stream: true,
    });

    // Consume empty stream
    const received: any[] = [];
    for await (const c of result) {
      received.push(c);
    }
    expect(received).toHaveLength(0);

    const recordCall = mockRecord.mock.calls.find(
      (args: any[]) => args[0]?.input !== '[preflight]',
    );
    expect(recordCall).toBeDefined();
    expect(recordCall[0].output).toBe('');
  });

  // Task 3.9 / spec 12
  it('stream receipt failure in strict mode throws ComplianceError', async () => {
    const client = createMockClient();

    const chunks = [
      createChunk({
        choices: [
          {
            index: 0,
            delta: { content: 'Hello', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
      }),
    ];

    client.__originalCreate.mockResolvedValue(mockStream(chunks));

    // pre-flight succeeds, actual record fails
    mockRecord.mockResolvedValueOnce({});
    mockRecord.mockRejectedValueOnce(new Error('DB error'));

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    await expect(
      wrapped.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      }),
    ).rejects.toMatchObject({ code: 'COMPLIANCE_ERROR' });
  });

  // Task 3.10 / spec 13
  it('stream receipt failure in permissive mode warns and returns result', async () => {
    const client = createMockClient();

    const chunks = [
      createChunk({
        choices: [
          {
            index: 0,
            delta: { content: 'Hello', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
      }),
    ];

    client.__originalCreate.mockResolvedValue(mockStream(chunks));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // pre-flight succeeds, actual record fails
    mockRecord.mockResolvedValueOnce({});
    mockRecord.mockRejectedValueOnce(new Error('DB error'));

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'permissive',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      stream: true,
    });

    // Stream should still be consumable
    const received: any[] = [];
    for await (const c of result) {
      received.push(c);
    }
    expect(received).toHaveLength(1);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Receipt recording failed'),
    );

    warnSpy.mockRestore();
  });

  // ---- Phase 3 edge cases (openai-compliance) ----

  // S14: stream throws mid-chunk in strict mode → error propagates, no receipt (spec 14)
  it('S14: stream throws mid-chunk in strict mode → error propagates, no receipt', async () => {
    const client = createMockClient();

    const firstChunk = createChunk({
      choices: [
        {
          index: 0,
          delta: { content: 'Partial', role: 'assistant' },
          finish_reason: null,
        },
      ],
    });

    const streamError = new Error('OpenAI connection lost');
    const throwingStream = {
      [Symbol.asyncIterator]() {
        let yielded = false;
        return {
          next(): Promise<IteratorResult<any>> {
            if (!yielded) {
              yielded = true;
              return Promise.resolve({ value: firstChunk, done: false });
            }
            return Promise.reject(streamError);
          },
        };
      },
    };

    client.__originalCreate.mockResolvedValue(throwingStream);

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({}); // pre-flight succeeds

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    await expect(
      wrapped.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      }),
    ).rejects.toThrow(streamError);

    // originalCreate should have been called
    expect(client.__originalCreate).toHaveBeenCalled();

    // Only pre-flight call — no receipt recorded
    const recordCalls = mockRecord.mock.calls.filter(
      (args: any[]) => args[0]?.input !== '[preflight]',
    );
    expect(recordCalls).toHaveLength(0);
  });

  // S15: stream throws mid-chunk in permissive mode → error propagates, partial receipt (spec 15)
  it('S15: stream throws mid-chunk in permissive mode → error propagates, partial receipt', async () => {
    const client = createMockClient();

    const firstChunk = createChunk({
      choices: [
        {
          index: 0,
          delta: { content: 'Partial', role: 'assistant' },
          finish_reason: null,
        },
      ],
    });

    const streamError = new Error('OpenAI connection lost');
    const throwingStream = {
      [Symbol.asyncIterator]() {
        let yielded = false;
        return {
          next(): Promise<IteratorResult<any>> {
            if (!yielded) {
              yielded = true;
              return Promise.resolve({ value: firstChunk, done: false });
            }
            return Promise.reject(streamError);
          },
        };
      },
    };

    client.__originalCreate.mockResolvedValue(throwingStream);

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({}); // pre-flight + record succeed

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'permissive',
    });

    // The promise rejects with the stream error
    await expect(
      wrapped.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      }),
    ).rejects.toThrow(streamError);

    // Receipt should have been recorded with partial content and stream_error flag
    const recordCall = mockRecord.mock.calls.find(
      (args: any[]) => args[0]?.input !== '[preflight]',
    );
    expect(recordCall).toBeDefined();
    expect(recordCall[0].output).toBe('Partial');
    expect(recordCall[0].metadata.stream_error).toBe(true);
  });

  // S18: final chunk usage → tokens set in receipt (spec 18)
  it('S18: final chunk usage → tokens set in receipt', async () => {
    const client = createMockClient();

    const chunks = [
      createChunk({
        id: 'chunk-1',
        choices: [
          {
            index: 0,
            delta: { content: 'Hello', role: 'assistant' },
            finish_reason: null,
          },
        ],
      }),
      createChunk({
        id: 'chunk-2',
        choices: [
          {
            index: 0,
            delta: { content: ' world', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }),
    ];

    client.__originalCreate.mockResolvedValue(mockStream(chunks));

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({});

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      stream: true,
    });

    // Consume the replay stream
    const received: any[] = [];
    for await (const c of result) {
      received.push(c);
    }
    expect(received).toHaveLength(2);

    // Verify receipt has token counts
    const recordCall = mockRecord.mock.calls.find(
      (args: any[]) => args[0]?.input !== '[preflight]',
    );
    expect(recordCall).toBeDefined();
    expect(recordCall[0].tokensPrompt).toBe(100);
    expect(recordCall[0].tokensCompletion).toBe(50);
  });

  // S30: single-chunk stream → receipt recorded (spec 30)
  it('S30: single-chunk stream → receipt recorded', async () => {
    const client = createMockClient();

    const chunks = [
      createChunk({
        id: 'chunk-1',
        choices: [
          {
            index: 0,
            delta: { content: 'Only chunk', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
      }),
    ];

    client.__originalCreate.mockResolvedValue(mockStream(chunks));

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({});

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      stream: true,
    });

    const received: any[] = [];
    for await (const c of result) {
      received.push(c);
    }
    expect(received).toHaveLength(1);
    expect(received[0].choices[0].delta.content).toBe('Only chunk');

    // Verify receipt
    const recordCall = mockRecord.mock.calls.find(
      (args: any[]) => args[0]?.input !== '[preflight]',
    );
    expect(recordCall).toBeDefined();
    expect(recordCall[0].output).toBe('Only chunk');
    expect(recordCall[0].metadata.finish_reason).toBe('stop');
  });

  // S31: stream with tool calls only (no text content) (spec 31)
  it('S31: stream with tool calls only (no text content)', async () => {
    const client = createMockClient();

    const chunks = [
      createChunk({
        id: 'chunk-1',
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              tool_calls: [
                {
                  index: 0,
                  id: 'call_abc',
                  type: 'function',
                  function: { name: 'search_tool', arguments: '' },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      }),
      createChunk({
        id: 'chunk-2',
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  function: { arguments: '{"query":"test"}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
    ];

    client.__originalCreate.mockResolvedValue(mockStream(chunks));

    mockRecord.mockReset();
    mockRecord.mockResolvedValue({});

    const wrapped = wrapOpenAI(client, {
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Search something' }],
      stream: true,
    });

    const received: any[] = [];
    for await (const c of result) {
      received.push(c);
    }
    expect(received).toHaveLength(2);

    // Verify receipt
    const recordCall = mockRecord.mock.calls.find(
      (args: any[]) => args[0]?.input !== '[preflight]',
    );
    expect(recordCall).toBeDefined();
    expect(recordCall[0].output).toBe(''); // No text content
    expect(recordCall[0].metadata.tool_calls).toBeDefined();
    expect(recordCall[0].metadata.tool_calls).toHaveLength(1);
    expect(recordCall[0].metadata.tool_calls[0].function?.name).toBe('search_tool');
    expect(recordCall[0].metadata.tool_calls[0].function?.arguments).toBe('{"query":"test"}');
    expect(recordCall[0].metadata.finish_reason).toBe('tool_calls');
  });
});
