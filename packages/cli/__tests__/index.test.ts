import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuditReceipt, verifyChains } from '@aivoralabs/agenttrail';
import type { KeyEntry, AuditReport } from '@aivoralabs/agenttrail';
import { readReceiptsFile } from '../src/index';
import * as fs from 'node:fs';

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

describe('CLI - verifyChains multi-agent', () => {
  it('should detect multiple agents', async () => {
    const auditorA = new AuditReceipt({ agentId: 'agent-alpha' });
    const auditorB = new AuditReceipt({ agentId: 'agent-beta' });

    const r1 = await auditorA.record({ input: 'a', output: 'b', model: 'gpt-4o', provider: 'openai' });
    const r2 = await auditorB.record({ input: 'c', output: 'd', model: 'gpt-4o', provider: 'openai' });
    const r3 = await auditorA.record({ input: 'e', output: 'f', model: 'gpt-4o', provider: 'openai' });

    const results = await verifyChains([r1, r2, r3]);

    expect(results.size).toBe(2);
    expect(results.has('agent-alpha')).toBe(true);
    expect(results.has('agent-beta')).toBe(true);
    expect(results.get('agent-alpha')!.receipts).toHaveLength(2);
    expect(results.get('agent-beta')!.receipts).toHaveLength(1);
    expect(results.get('agent-alpha')!.result.valid).toBe(true);
    expect(results.get('agent-beta')!.result.valid).toBe(true);
  });

  it('should handle empty receipts array', async () => {
    const results = await verifyChains([]);
    expect(results.size).toBe(0);
  });
});

describe('CLI - --output flag', () => {
  const inputPath = '/tmp/agenttrail-test-input.json';
  const outputPath = '/tmp/agenttrail-test-output.json';

  afterEach(() => {
    try {
      const { unlinkSync } = require('node:fs');
      unlinkSync(inputPath);
    } catch { /* ignore */ }
    try {
      const { unlinkSync } = require('node:fs');
      unlinkSync(outputPath);
    } catch { /* ignore */ }
  });

  it('should write AuditReport JSON with correct structure', async () => {
    const auditor = new AuditReceipt({
      agentId: 'test',
      redactConfig: { rules: [{ pattern: /test/g }] },
    });
    const r1 = await auditor.record({ input: 'test', output: 'b', model: 'gpt-4o', provider: 'openai' });

    const { writeFileSync, readFileSync, unlinkSync } = await import('node:fs');
    writeFileSync(inputPath, JSON.stringify([r1]));

    const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const originalArgv = process.argv;
    process.argv = ['node', 'audit-receipt', 'verify', inputPath, '--output', outputPath];

    // Import main dynamically to avoid hoisting issues
    const { main } = await import('../src/index');
    await main();

    process.argv = originalArgv;
    exitMock.mockRestore();

    const reportContent = readFileSync(outputPath, 'utf-8');
    const report: AuditReport = JSON.parse(reportContent);

    expect(report.report_version).toBe('1.0');
    expect(report.tool).toBe('audit-receipt verify');
    expect(report.source_file).toBe(inputPath);
    expect(report.summary.verdict).toBe('intact');
    expect(report.summary.total_receipts).toBe(1);
    expect(report.summary.hash_chain_intact).toBe(true);
    expect(report.agents).toHaveLength(1);
    expect(report.agents[0].agent_id).toBe('test');
    expect(report.agents[0].receipts_count).toBe(1);
    expect(report.agents[0].verdict).toBe('intact');
    expect(report.per_receipt).toHaveLength(1);
    expect(report.per_receipt[0].receipt_id).toBe(r1.receipt_id);

    // Clean up
    unlinkSync(inputPath);
    unlinkSync(outputPath);
  });
});

describe('CLI - tampered chain detection', () => {
  it('should detect broken chain and show brokenAtIndex', async () => {
    const auditor = new AuditReceipt({ agentId: 'test' });
    const r1 = await auditor.record({ input: 'a', output: 'b', model: 'gpt-4o', provider: 'openai' });
    const r2 = await auditor.record({ input: 'c', output: 'd', model: 'gpt-4o', provider: 'openai' });
    const r3 = await auditor.record({ input: 'e', output: 'f', model: 'gpt-4o', provider: 'openai' });

    // Tamper the middle receipt
    r2.payload.output = 'TAMPERED';

    const results = await verifyChains([r1, r2, r3]);
    const result = results.get('test')!.result;

    expect(result.valid).toBe(false);
    expect(result.hashChainIntact).toBe(false);
    // The hash mismatch should be detected at index 1 (r2's hash doesn't match recomputed hash)
    expect(result.brokenAtIndex).toBe(1);
  });

  it('should detect broken chain at genesis index 0', async () => {
    const auditor = new AuditReceipt({ agentId: 'test' });
    const r1 = await auditor.record({ input: 'a', output: 'b', model: 'gpt-4o', provider: 'openai' });
    const r2 = await auditor.record({ input: 'c', output: 'd', model: 'gpt-4o', provider: 'openai' });

    // Tamper the genesis receipt
    r1.payload.output = 'TAMPERED';

    const results = await verifyChains([r1, r2]);
    const result = results.get('test')!.result;

    expect(result.valid).toBe(false);
    expect(result.hashChainIntact).toBe(false);
    expect(result.brokenAtIndex).toBe(0);
  });
});
