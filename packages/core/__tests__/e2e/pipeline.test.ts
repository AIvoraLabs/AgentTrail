import { describe, it, expect, afterAll } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { AuditReceipt, JSONLFileWriter, verifyChain } from '@aivoralabs/agenttrail';

describe('E2E: Audit pipeline', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenttrail-e2e-'));

  afterAll(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it('should persist receipts and verify chain integrity', { timeout: 30000 }, async () => {
    const tempDir = path.join(rootDir, 'integrity');
    const storage = new JSONLFileWriter(tempDir);
    const agentId = 'integrity-test';
    const auditor = new AuditReceipt({
      agentId,
      complianceConfig: { mode: 'permissive' },
      storage,
    });

    await auditor.record({
      input: 'Hello, how are you?',
      output: 'I am fine, thank you!',
      model: 'gpt-4o',
      provider: 'openai',
    });

    await auditor.record({
      input: 'What is the capital of France?',
      output: 'Paris is the capital of France.',
      model: 'gpt-4o',
      provider: 'openai',
    });

    await auditor.record({
      input: 'Tell me a joke.',
      output: 'Why did the chicken cross the road?',
      model: 'gpt-4o',
      provider: 'openai',
    });

    const month = new Date().toISOString().slice(0, 7);
    const stored = await storage.readRange(agentId, month);

    expect(stored.length).toBe(3);
    for (const receipt of stored) {
      expect(receipt.agent_id).toBe(agentId);
      expect(receipt.payload.timestamp_start).toBeTruthy();
      expect(receipt.payload.timestamp_end).toBeTruthy();
    }

    const valid = await verifyChain(stored);
    expect(valid).toBe(true);
  });

  it('should detect tampered receipts', { timeout: 30000 }, async () => {
    const tempDir = path.join(rootDir, 'tamper');
    const storage = new JSONLFileWriter(tempDir);
    const agentId = 'tamper-test';
    const auditor = new AuditReceipt({
      agentId,
      complianceConfig: { mode: 'permissive' },
      storage,
    });

    await auditor.record({
      input: 'First message',
      output: 'First response',
      model: 'gpt-4o',
      provider: 'openai',
    });

    await auditor.record({
      input: 'Second message',
      output: 'Second response',
      model: 'gpt-4o',
      provider: 'openai',
    });

    const month = new Date().toISOString().slice(0, 7);
    const filePath = path.join(tempDir, `audit-log-${agentId}-${month}.jsonl`);

    // Read and tamper with the first receipt's hash
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const tampered = JSON.parse(lines[0]);
    tampered.hash = '0'.repeat(64); // Invalid hash
    lines[0] = JSON.stringify(tampered);
    fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');

    // Read back — verifyChain should detect the tamper
    const stored = await storage.readRange(agentId, month);
    const valid = await verifyChain(stored);
    expect(valid).toBe(false);
  });
});
