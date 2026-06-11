import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditReceipt } from '@aivoralabs/agenttrail';
import { auditReceiptMiddleware } from '../src/index';

describe('auditReceiptMiddleware', () => {
  it('should return a middleware object with wrapGenerate and wrapStream', () => {
    const middleware = auditReceiptMiddleware({ agentId: 'test-agent' });
    expect(middleware).toBeTruthy();
    expect(typeof middleware.wrapGenerate).toBe('function');
    expect(typeof middleware.wrapStream).toBe('function');
  });

  it('should intercept a generate call and return the original result', async () => {
    const middleware = auditReceiptMiddleware({ agentId: 'test-agent' });

    const mockResult = { text: 'Hello back!' };
    const mockDoGenerate = vi.fn().mockResolvedValue(mockResult);
    const mockParams = { prompt: [{ role: 'user', content: 'Hello' }], modelId: 'gpt-4o' };

    const result = await middleware.wrapGenerate!({
      doGenerate: mockDoGenerate,
      params: mockParams as any,
    });

    expect(result).toBe(mockResult);
    expect(mockDoGenerate).toHaveBeenCalledOnce();
  });

  it('should intercept a stream call and return a stream', async () => {
    const middleware = auditReceiptMiddleware({ agentId: 'test-agent' });

    // Create a simple readable stream
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-delta', delta: 'Hello' });
        controller.enqueue({ type: 'text-delta', delta: ' world' });
        controller.close();
      },
    });

    const mockDoStream = vi.fn().mockResolvedValue({ stream, warnings: undefined });
    const mockParams = { prompt: 'Hello', modelId: 'gpt-4o' };

    const result = await middleware.wrapStream!({
      doStream: mockDoStream,
      params: mockParams as any,
    });

    expect(result.stream).toBeInstanceOf(ReadableStream);
    expect(mockDoStream).toHaveBeenCalledOnce();
  });

  it('should accumulate text deltas in the stream wrapper', async () => {
    const middleware = auditReceiptMiddleware({ agentId: 'test-agent' });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-delta', delta: 'Hello' });
        controller.enqueue({ type: 'text-delta', delta: ' world' });
        controller.close();
      },
    });

    const mockDoStream = vi.fn().mockResolvedValue({ stream, warnings: undefined });

    const result = await middleware.wrapStream!({
      doStream: mockDoStream,
      params: { prompt: 'Hi', modelId: 'gpt-4o' } as any,
    });

    // Read the stream and verify content passes through
    const reader = result.stream.getReader();
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.type === 'text-delta') {
        chunks.push(value.delta);
      }
    }
    expect(chunks.join('')).toBe('Hello world');
  });

  it('should handle stream without modelId', async () => {
    const middleware = auditReceiptMiddleware({ agentId: 'test-agent' });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-delta', delta: 'test' });
        controller.close();
      },
    });

    const mockDoStream = vi.fn().mockResolvedValue({ stream });

    const result = await middleware.wrapStream!({
      doStream: mockDoStream,
      params: { prompt: 'test', modelId: undefined } as any,
    });

    expect(result.stream).toBeInstanceOf(ReadableStream);
  });

  it('should handle generate without modelId', async () => {
    const middleware = auditReceiptMiddleware({ agentId: 'test-agent' });

    const mockResult = { text: 'response' };
    const mockDoGenerate = vi.fn().mockResolvedValue(mockResult);

    const result = await middleware.wrapGenerate!({
      doGenerate: mockDoGenerate,
      params: { prompt: 'test', modelId: undefined } as any,
    });

    expect(result).toBe(mockResult);
  });

  describe('storage integration', () => {
    it('should call storage.append() when storage configured in generate', async () => {
      const storage = {
        append: vi.fn().mockResolvedValue(undefined),
        readRange: vi.fn(),
      };
      const middleware = auditReceiptMiddleware({ agentId: 'test-agent', storage });

      const mockResult = {
        text: 'Hello back!',
        usage: { promptTokens: 10, completionTokens: 5 },
      };

      await middleware.wrapGenerate!({
        doGenerate: vi.fn().mockResolvedValue(mockResult),
        params: {
          prompt: 'Hello',
          modelId: 'gpt-4o',
          providerMetadata: { some: 'meta' },
        } as any,
      });

      expect(storage.append).toHaveBeenCalledTimes(1);
    });

    it('should call storage.append() when storage configured in stream', async () => {
      const storage = { append: vi.fn().mockResolvedValue(undefined), readRange: vi.fn() };
      const middleware = auditReceiptMiddleware({ agentId: 'test-agent', storage });

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-delta', delta: 'Hello' });
          controller.enqueue({ type: 'text-delta', delta: ' world' });
          controller.close();
        },
      });

      const result = await middleware.wrapStream!({
        doStream: vi.fn().mockResolvedValue({ stream, warnings: undefined }),
        params: { prompt: 'Hi', modelId: 'gpt-4o' } as any,
      });

      // Read the stream to trigger flush
      const reader = result.stream.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      // Allow flush to complete
      await new Promise((r) => setTimeout(r, 10));

      expect(storage.append).toHaveBeenCalledTimes(1);
    });

    it('should not throw when storage omitted from config', async () => {
      const middleware = auditReceiptMiddleware({ agentId: 'test-agent' });

      const mockResult = { text: 'response' };

      await expect(
        middleware.wrapGenerate!({
          doGenerate: vi.fn().mockResolvedValue(mockResult),
          params: { prompt: 'test', modelId: 'gpt-4o' } as any,
        }),
      ).resolves.toBe(mockResult);
    });
  });
});

describe('auditReceiptMiddleware - compliance mode', () => {
  let stream: ReadableStream;

  beforeEach(() => {
    vi.restoreAllMocks();
    stream = new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-delta', delta: 'Hello' });
        controller.close();
      },
    });
  });

  it('should throw on pre-flight failure in strict mode', async () => {
    vi.spyOn(AuditReceipt.prototype, 'record').mockRejectedValue(
      new Error('Compliance system unavailable'),
    );

    const middleware = auditReceiptMiddleware({
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    const mockDoStream = vi.fn().mockResolvedValue({ stream });

    await expect(
      middleware.wrapStream!({
        doStream: mockDoStream,
        params: { prompt: 'test', modelId: 'gpt-4o' } as any,
      }),
    ).rejects.toThrow('Compliance system unavailable');

    // doStream should NOT be called when pre-flight fails in strict mode
    expect(mockDoStream).not.toHaveBeenCalled();
  });

  it('should continue on pre-flight failure in permissive mode', async () => {
    vi.spyOn(AuditReceipt.prototype, 'record').mockRejectedValue(
      new Error('Compliance system unavailable'),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const middleware = auditReceiptMiddleware({
      agentId: 'test-agent',
      complianceMode: 'permissive',
    });

    const mockDoStream = vi.fn().mockResolvedValue({ stream });

    const result = await middleware.wrapStream!({
      doStream: mockDoStream,
      params: { prompt: 'test', modelId: 'gpt-4o' } as any,
    });

    expect(result.stream).toBeInstanceOf(ReadableStream);
    expect(mockDoStream).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('pre-flight'),
    );

    warnSpy.mockRestore();
  });

  it('should work normally when pre-flight passes in strict mode', async () => {
    const middleware = auditReceiptMiddleware({
      agentId: 'test-agent',
      complianceMode: 'strict',
    });

    const mockDoStream = vi.fn().mockResolvedValue({ stream });

    const result = await middleware.wrapStream!({
      doStream: mockDoStream,
      params: { prompt: 'test', modelId: 'gpt-4o' } as any,
    });

    expect(result.stream).toBeInstanceOf(ReadableStream);
    expect(mockDoStream).toHaveBeenCalled();
  });

  it('should propagate errors from wrapGenerate when record fails', async () => {
    vi.spyOn(AuditReceipt.prototype, 'record').mockRejectedValue(
      new Error('Record failed'),
    );

    const middleware = auditReceiptMiddleware({ agentId: 'test-agent' });

    const mockResult = { text: 'Hello' };
    const mockDoGenerate = vi.fn().mockResolvedValue(mockResult);

    await expect(
      middleware.wrapGenerate!({
        doGenerate: mockDoGenerate,
        params: { prompt: 'test', modelId: 'gpt-4o' } as any,
      }),
    ).rejects.toThrow('Record failed');
  });
});
