import { describe, it, expect, vi } from 'vitest';
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
});
