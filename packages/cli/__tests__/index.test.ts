import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditReceipt } from '@aivoralabs/agenttrail';
import { readReceiptsFile } from '../src/index';

describe('CLI - readReceiptsFile', () => {
  it('should parse a valid JSON file with receipts array', async () => {
    const data = JSON.stringify([
      { receipt_id: '1', hash: 'abc', payload: { input: 'hi' } },
    ]);
    const result = await readReceiptsFile(data);
    expect(result).toHaveLength(1);
    expect(result[0].receipt_id).toBe('1');
  });

  it('should parse a JSONL file (one receipt per line)', async () => {
    const data = [
      JSON.stringify({ receipt_id: '1', hash: 'abc' }),
      JSON.stringify({ receipt_id: '2', hash: 'def' }),
    ].join('\n');
    const result = await readReceiptsFile(data);
    expect(result).toHaveLength(2);
    expect(result[0].receipt_id).toBe('1');
    expect(result[1].receipt_id).toBe('2');
  });

  it('should throw on empty input', async () => {
    await expect(readReceiptsFile('')).rejects.toThrow('empty');
  });

  it('should throw on invalid JSON', async () => {
    await expect(readReceiptsFile('not json')).rejects.toThrow();
  });
});

describe('CLI - verify output formatting', () => {
  it('should report valid chain', async () => {
    const auditor = new AuditReceipt({ agentId: 'test' });
    const r1 = await auditor.record({ input: 'a', output: 'b', model: 'gpt-4o', provider: 'openai' });
    const r2 = await auditor.record({ input: 'c', output: 'd', model: 'gpt-4o', provider: 'openai' });

    const valid = await AuditReceipt.verifyChain([r1, r2]);
    expect(valid).toBe(true);
  });

  it('should detect tampered chain', async () => {
    const auditor = new AuditReceipt({ agentId: 'test' });
    const r1 = await auditor.record({ input: 'a', output: 'b', model: 'gpt-4o', provider: 'openai' });
    const r2 = await auditor.record({ input: 'c', output: 'd', model: 'gpt-4o', provider: 'openai' });

    r2.payload.output = 'TAMPERED';

    const valid = await AuditReceipt.verifyChain([r1, r2]);
    expect(valid).toBe(false);
  });

  it('should report empty chain as valid', async () => {
    const valid = await AuditReceipt.verifyChain([]);
    expect(valid).toBe(true);
  });
});
