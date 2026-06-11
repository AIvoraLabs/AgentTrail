import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JSONLFileWriter } from '../src/storage';
import type { Receipt } from '../src/types';

function makeReceipt(overrides?: Partial<Receipt>): Receipt {
  return {
    receipt_id: overrides?.receipt_id ?? '0195d917-3f8a-7663-8d4c-6d1f8b3e7c9a',
    agent_id: overrides?.agent_id ?? 'test-agent',
    version: '1.0',
    prev_hash: overrides?.prev_hash ?? null,
    hash: 'abc123',
    signature: 'sig123',
    payload: {
      timestamp_start: overrides?.payload?.timestamp_start ?? '2026-06-10T12:00:00.000Z',
      timestamp_end: overrides?.payload?.timestamp_end ?? '2026-06-10T12:00:01.000Z',
      input: overrides?.payload?.input ?? 'hello',
      output: overrides?.payload?.output ?? 'world',
      model: overrides?.payload?.model ?? 'gpt-4o',
      provider: overrides?.payload?.provider ?? 'openai',
    },
    metadata: overrides?.metadata,
  };
}

describe('JSONLFileWriter', () => {
  let tmpDir: string;
  let writer: JSONLFileWriter;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `agenttrail-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    writer = new JSONLFileWriter(tmpDir);
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should append a receipt to the correct monthly file', async () => {
    const receipt = makeReceipt();
    await writer.append(receipt);

    const filePath = join(tmpDir, 'audit-log-test-agent-2026-06.jsonl');
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, 'utf-8').trim();
    const lines = content.split('\n');
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]) as Receipt;
    expect(parsed.receipt_id).toBe(receipt.receipt_id);
    expect(parsed.agent_id).toBe('test-agent');
  });

  it('should create directory automatically when missing', async () => {
    // tmpDir is freshly created in beforeEach and won't have subdirectories
    // Use a nested path that doesn't exist
    const nestedDir = join(tmpDir, 'nested', 'deep');
    const nestedWriter = new JSONLFileWriter(nestedDir);

    const receipt = makeReceipt();
    await nestedWriter.append(receipt);

    const filePath = join(nestedDir, 'audit-log-test-agent-2026-06.jsonl');
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, 'utf-8').trim();
    expect(content.length).toBeGreaterThan(0);

    // Cleanup
    rmSync(nestedDir, { recursive: true, force: true });
  });

  it('should rotate file on month boundary', async () => {
    const juneReceipt = makeReceipt({
      payload: {
        timestamp_start: '2026-06-10T12:00:00.000Z',
        timestamp_end: '2026-06-10T12:00:01.000Z',
        input: 'june',
        output: 'receipt',
        model: 'gpt-4o',
        provider: 'openai',
      },
    });
    const julyReceipt = makeReceipt({
      receipt_id: '0195d917-3f8a-7663-8d4c-6d1f8b3e7c9b',
      payload: {
        timestamp_start: '2026-07-01T00:00:00.000Z',
        timestamp_end: '2026-07-01T00:00:01.000Z',
        input: 'july',
        output: 'receipt',
        model: 'gpt-4o',
        provider: 'openai',
      },
    });

    await writer.append(juneReceipt);
    await writer.append(julyReceipt);

    const junePath = join(tmpDir, 'audit-log-test-agent-2026-06.jsonl');
    const julyPath = join(tmpDir, 'audit-log-test-agent-2026-07.jsonl');

    expect(existsSync(junePath)).toBe(true);
    expect(existsSync(julyPath)).toBe(true);

    const juneLines = readFileSync(junePath, 'utf-8').trim().split('\n');
    const julyLines = readFileSync(julyPath, 'utf-8').trim().split('\n');
    expect(juneLines).toHaveLength(1);
    expect(julyLines).toHaveLength(1);
    expect(JSON.parse(juneLines[0]).payload.input).toBe('june');
    expect(JSON.parse(julyLines[0]).payload.input).toBe('july');
  });

  it('should readRange return receipts for a given agent and month', async () => {
    const receipt1 = makeReceipt({
      receipt_id: '0195d917-3f8a-7663-8d4c-6d1f8b3e7c9a',
      payload: {
        timestamp_start: '2026-06-10T12:00:00.000Z',
        timestamp_end: '2026-06-10T12:00:01.000Z',
        input: 'first',
        output: 'receipt',
        model: 'gpt-4o',
        provider: 'openai',
      },
    });
    const receipt2 = makeReceipt({
      receipt_id: '0195d917-3f8a-7663-8d4c-6d1f8b3e7c9b',
      payload: {
        timestamp_start: '2026-06-15T12:00:00.000Z',
        timestamp_end: '2026-06-15T12:00:01.000Z',
        input: 'second',
        output: 'receipt',
        model: 'gpt-4o',
        provider: 'openai',
      },
    });

    await writer.append(receipt1);
    await writer.append(receipt2);

    const results = await writer.readRange('test-agent', '2026-06');
    expect(results).toHaveLength(2);
    expect(results[0].receipt_id).toBe(receipt1.receipt_id);
    expect(results[1].receipt_id).toBe(receipt2.receipt_id);
  });

  it('should readRange return empty array for non-existent month', async () => {
    const results = await writer.readRange('test-agent', '2099-12');
    expect(results).toEqual([]);
  });

  it('should throw on write failure', async () => {
    // Create a dir and make it read-only to trigger a write failure
    const readOnlyDir = join(tmpDir, 'readonly');
    mkdirSync(readOnlyDir, { recursive: true });
    chmodSync(readOnlyDir, 0o444);

    const readOnlyWriter = new JSONLFileWriter(readOnlyDir);

    const receipt = makeReceipt();
    await expect(readOnlyWriter.append(receipt)).rejects.toThrow();

    // Restore permissions for cleanup
    chmodSync(readOnlyDir, 0o755);
  });

  it('should append multiple receipts to same file', async () => {
    const receipt1 = makeReceipt({
      receipt_id: '0195d917-3f8a-7663-8d4c-6d1f8b3e7c9a',
    });
    const receipt2 = makeReceipt({
      receipt_id: '0195d917-3f8a-7663-8d4c-6d1f8b3e7c9b',
    });

    await writer.append(receipt1);
    await writer.append(receipt2);

    const filePath = join(tmpDir, 'audit-log-test-agent-2026-06.jsonl');
    const content = readFileSync(filePath, 'utf-8').trim();
    const lines = content.split('\n');
    expect(lines).toHaveLength(2);

    const parsed1 = JSON.parse(lines[0]) as Receipt;
    const parsed2 = JSON.parse(lines[1]) as Receipt;
    expect(parsed1.receipt_id).toBe(receipt1.receipt_id);
    expect(parsed2.receipt_id).toBe(receipt2.receipt_id);
  });
});
