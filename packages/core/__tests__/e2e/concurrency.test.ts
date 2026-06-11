/**
 * Suite 9: Concurrency — proves that AgentTrail's audit receipt generation
 * is safe under concurrent multi-agent and multi-record workloads.
 *
 * EU AI Act Art. 12 requires that logging must be "comprehensive" and
 * "continuous" — meaning concurrent execution must not cause data loss,
 * chain corruption, or interleaved receipt corruption.
 *
 * No API key required. All tests run with isolated in-memory temp storage.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { AuditReceipt, JSONLFileWriter } from '@aivoralabs/agenttrail';
import { TestHarness, ReceiptVerifier } from '../helpers';

describe('Suite 9: Concurrency — safe parallel record execution', () => {
  const harness = new TestHarness('concurrency');

  afterAll(() => {
    harness.cleanup();
  });

  /**
   * 9.1 5 agents, 1 record each, Promise.all
   *
   * Proves that multiple independent agents writing one receipt each
   * do not interfere with each other. Each agent's file contains exactly
   * 1 receipt with the correct agent_id.
   */
  it('5 agents, 1 record each, Promise.all', async () => {
    const auditors = Array.from({ length: 5 }, (_, i) =>
      harness.createAuditor(`concurrent-agent-${i}`, { storage: true }),
    );

    await Promise.all(
      auditors.map((auditor) =>
        auditor.record({
          input: 'Hello',
          output: 'Hi there!',
          model: 'gpt-4o',
          provider: 'openai',
        }),
      ),
    );

    for (let i = 0; i < 5; i++) {
      const agentId = `concurrent-agent-${i}`;
      const receipts = await harness.readReceipts(agentId);
      expect(receipts.length).toBe(1);
      expect(receipts[0].agent_id).toBe(agentId);
    }
  });

  /**
   * 9.2 1 agent, 10 sequential records
   *
   * Proves that a single agent recording many interactions sequentially
   * maintains a valid hash chain with all 10 receipts intact.
   */
  it('1 agent, 10 sequential records', async () => {
    const auditor = harness.createAuditor('sequential-10', { storage: true });

    for (let i = 0; i < 10; i++) {
      await auditor.record({
        input: `Query ${i}`,
        output: `Response ${i}`,
        model: 'gpt-4o',
        provider: 'openai',
      });
    }

    const receipts = await harness.readReceipts('sequential-10');
    expect(receipts.length).toBe(10);
    await ReceiptVerifier.chainIsIntact(receipts);
  });

  /**
   * 9.3 10 agents, 5 records each, concurrent batches
   *
   * Proves that 10 agents each recording 5 receipts sequentially
   * (per-agent) while all 10 agents run concurrently via Promise.all
   * produce independent valid chains with no data loss or cross-agent
   * interference.
   *
   * Note: AuditReceipt.record() is not designed for concurrent calls
   * on the same instance (race condition on lastHash), so each agent's
   * records are sequential. The 10 agents run fully concurrently.
   */
  it('10 agents, 5 records each, concurrent batches', async () => {
    const auditors = Array.from({ length: 10 }, (_, i) =>
      harness.createAuditor(`batch-agent-${i}`, { storage: true }),
    );

    await Promise.all(
      auditors.map(async (auditor) => {
        for (let j = 0; j < 5; j++) {
          await auditor.record({
            input: `Batch query ${j}`,
            output: `Batch response ${j}`,
            model: 'gpt-4o',
            provider: 'openai',
          });
        }
      }),
    );

    for (let i = 0; i < 10; i++) {
      const agentId = `batch-agent-${i}`;
      const receipts = await harness.readReceipts(agentId);
      expect(receipts.length).toBe(5);
      await ReceiptVerifier.chainIsIntact(receipts);
    }
  });

  /**
   * 9.4 Concurrent writes to same agent file
   *
   * Proves that multiple JSONLFileWriter instances writing to the same
   * underlying file do not corrupt the JSONL format — every line is
   * valid JSON and all 5 receipts are present.
   */
  it('Concurrent writes to same agent file', async () => {
    const receipt1 = await harness
      .createAuditor('same-file', { storage: true })
      .record({
        input: 'First',
        output: 'First response',
        model: 'gpt-4o',
        provider: 'openai',
      });

    // Create 5 separate JSONLFileWriter instances pointing to the same path
    const basePath = `${harness.rootDir}/same-file`;
    const writers = Array.from({ length: 5 }, () => new JSONLFileWriter(basePath));

    const receiptsToWrite = Array.from({ length: 5 }, (_, i) => ({
      ...receipt1,
      receipt_id: `concurrent-write-${i}-${Date.now()}`,
    }));

    await Promise.all(
      writers.map((w, i) => w.append(receiptsToWrite[i])),
    );

    const agentId = 'same-file';
    const month = new Date().toISOString().slice(0, 7);
    const reader = new JSONLFileWriter(basePath);
    const stored = await reader.readRange(agentId, month);

    expect(stored.length).toBe(6); // 1 from createAuditor + 5 concurrent
    for (const receipt of stored) {
      expect(typeof receipt.receipt_id).toBe('string');
      expect(receipt.payload).toBeTruthy();
    }
  });
});
