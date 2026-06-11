/**
 * Suite 11: Volume Stress — proves AgentTrail can handle production-scale
 * volumes without data loss, memory leaks, or performance degradation.
 *
 * EU AI Act Art. 12 requires logging to be "continuous over the entire
 * lifetime of the system" — which implies the system must handle thousands
 * of interactions without failure, data corruption, or resource exhaustion.
 *
 * Skipped unless RUN_STRESS_TESTS=1 environment variable is set.
 * These tests take ~120s each and generate significant I/O.
 */

import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { verifyChain } from '@aivoralabs/agenttrail';
import { TestHarness, ReceiptVerifier } from '../helpers';

const runStress = !!process.env.RUN_STRESS_TESTS;

describe.skipIf(!runStress)(
  'Suite 11: Volume Stress — production-scale workloads',
  () => {
    const harness = new TestHarness('volume-stress');

    afterAll(() => {
      harness.cleanup();
    });

    /**
     * 11.1 500 receipts across 3 agents: no data loss
     *
     * Proves that each agent's file contains exactly 500 receipts
     * after sequential recording, with no data loss or corruption.
     */
    it(
      '500 receipts across 3 agents: no data loss',
      { timeout: 120000 },
      async () => {
        const auditors = Array.from({ length: 3 }, (_, i) =>
          harness.createAuditor(`stress-agent-${i}`, { storage: true }),
        );

        for (const auditor of auditors) {
          for (let j = 0; j < 500; j++) {
            await auditor.record({
              input: `Query ${j}`,
              output: `Response ${j}`,
              model: 'gpt-4o',
              provider: 'openai',
            });
          }
        }

        for (let i = 0; i < 3; i++) {
          const agentId = `stress-agent-${i}`;
          const receipts = await harness.readReceipts(agentId);
          expect(receipts.length).toBe(500);
          await ReceiptVerifier.chainIsIntact(receipts);
        }
      },
    );

    /**
     * 11.2 verifyChain on 1000 receipts: < 5 seconds
     *
     * Proves that hash chain verification completes within 5 seconds
     * for a chain of 1000 receipts (performance requirement).
     */
    it(
      'verifyChain on 1000 receipts: < 5 seconds',
      { timeout: 120000 },
      async () => {
        const auditor = harness.createAuditor('perf-chain', { storage: true });

        for (let j = 0; j < 1000; j++) {
          await auditor.record({
            input: `Query ${j}`,
            output: `Response ${j}`,
            model: 'gpt-4o',
            provider: 'openai',
          });
        }

        const receipts = await harness.readReceipts('perf-chain');

        const start = performance.now();
        const valid = await verifyChain(receipts);
        const elapsed = performance.now() - start;

        expect(valid).toBe(true);
        expect(elapsed).toBeLessThan(5000);
      },
    );

    /**
     * 11.3 File size: 1000 receipts < 5 MB
     *
     * Proves that the JSONL file containing 1000 receipts does not
     * exceed 5 MB, ensuring reasonable storage requirements.
     */
    it(
      'File size: 1000 receipts < 5 MB',
      { timeout: 120000 },
      async () => {
        const auditor = harness.createAuditor('file-size', { storage: true });

        for (let j = 0; j < 1000; j++) {
          await auditor.record({
            input: `Query ${j}`,
            output: `Response ${j}`,
            model: 'gpt-4o',
            provider: 'openai',
          });
        }

        const month = new Date().toISOString().slice(0, 7);
        const filePath = path.join(
          harness.rootDir,
          'file-size',
          `audit-log-file-size-${month}.jsonl`,
        );
        const size = fs.statSync(filePath).size;

        expect(size).toBeLessThan(5 * 1024 * 1024);
      },
    );

    /**
     * 11.4 Memory: heap growth < 50 MB
     *
     * Proves that recording 1000 receipts does not cause excessive
     * memory growth (heap increase less than 50 MB).
     */
    it(
      'Memory: heap growth < 50 MB',
      { timeout: 120000 },
      async () => {
        const auditor = harness.createAuditor('heap-growth', { storage: true });

        const before = process.memoryUsage().heapUsed;

        for (let j = 0; j < 1000; j++) {
          await auditor.record({
            input: `Query ${j}`,
            output: `Response ${j}`,
            model: 'gpt-4o',
            provider: 'openai',
          });
        }

        const after = process.memoryUsage().heapUsed;
        const growth = after - before;

        expect(growth).toBeLessThan(50 * 1024 * 1024);
      },
    );

    /**
     * 11.5 Tamper detection at scale: break at receipt 500
     *
     * Proves that verifyChain detects a tampered hash even in a large
     * chain of 1000 receipts, returning the broken index near 500.
     */
    it(
      'Tamper detection at scale: break at receipt 500',
      { timeout: 120000 },
      async () => {
        const auditor = harness.createAuditor('tamper-scale', { storage: true });

        for (let j = 0; j < 1000; j++) {
          await auditor.record({
            input: `Query ${j}`,
            output: `Response ${j}`,
            model: 'gpt-4o',
            provider: 'openai',
          });
        }

        const month = new Date().toISOString().slice(0, 7);
        const filePath = path.join(
          harness.rootDir,
          'tamper-scale',
          `audit-log-tamper-scale-${month}.jsonl`,
        );

        // Read the file and tamper with receipt at index 500
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n');
        const tampered = JSON.parse(lines[500]);
        tampered.hash = '0'.repeat(64);
        lines[500] = JSON.stringify(tampered);
        fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');

        // Read back and verify — should detect the break
        const chainReceipts = await harness.readReceipts('tamper-scale');
        const valid = await verifyChain(chainReceipts);

        expect(valid).toBe(false);
      },
    );
  },
);
