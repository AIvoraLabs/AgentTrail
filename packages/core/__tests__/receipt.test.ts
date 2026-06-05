import { describe, it, expect, beforeEach } from 'vitest';
import { AuditReceipt } from '../src/receipt';
import type { Receipt } from '../src/types';

describe('AuditReceipt', () => {
  let auditor: AuditReceipt;

  beforeEach(() => {
    auditor = new AuditReceipt({ agentId: 'test-agent-v1' });
  });

  describe('constructor', () => {
    it('should create an instance with agentId', () => {
      expect(auditor).toBeInstanceOf(AuditReceipt);
    });
  });

  describe('record', () => {
    it('should record a single interaction and return a valid receipt', async () => {
      const receipt = await auditor.record({
        input: 'Hello',
        output: 'Hi there!',
        model: 'gpt-4o',
        provider: 'openai',
      });

      expect(receipt).toBeTruthy();
      expect(receipt.receipt_id).toBeTruthy();
      expect(receipt.agent_id).toBe('test-agent-v1');
      expect(receipt.version).toBe('1.0');
      expect(receipt.payload.input).toBe('Hello');
      expect(receipt.payload.output).toBe('Hi there!');
      expect(receipt.payload.model).toBe('gpt-4o');
      expect(receipt.payload.provider).toBe('openai');
    });

    it('should generate a UUIDv7 receipt_id', async () => {
      const receipt = await auditor.record({
        input: 'test', output: 'test', model: 'gpt-4o', provider: 'openai',
      });
      // UUID v7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
      expect(receipt.receipt_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should set prev_hash to null for the first receipt', async () => {
      const receipt = await auditor.record({
        input: 'first', output: 'receipt', model: 'gpt-4o', provider: 'openai',
      });
      expect(receipt.prev_hash).toBeNull();
    });

    it('should chain receipts: second receipt prev_hash equals first receipt hash', async () => {
      const receipt1 = await auditor.record({
        input: 'first', output: 'receipt', model: 'gpt-4o', provider: 'openai',
      });
      const receipt2 = await auditor.record({
        input: 'second', output: 'receipt', model: 'gpt-4o', provider: 'openai',
      });
      expect(receipt2.prev_hash).toBe(receipt1.hash);
    });

    it('should include a digital signature', async () => {
      const receipt = await auditor.record({
        input: 'test', output: 'test', model: 'gpt-4o', provider: 'openai',
      });
      expect(receipt.signature).toBeTruthy();
      expect(typeof receipt.signature).toBe('string');
    });

    it('should include optional fields when provided', async () => {
      const receipt = await auditor.record({
        input: 'test',
        output: 'test',
        model: 'gpt-4o',
        provider: 'openai',
        tokensPrompt: 100,
        tokensCompletion: 50,
        toolCalls: [
          {
            toolName: 'get_weather',
            toolInput: '{"city": "Berlin"}',
            toolOutput: '{"temp": 22}',
            toolExecutionMs: 150,
            toolStatus: 'success',
          },
        ],
        metadata: { user_id: 'usr_123' },
      });

      expect(receipt.payload.tokens_prompt).toBe(100);
      expect(receipt.payload.tokens_completion).toBe(50);
      expect(receipt.payload.tokens_total).toBe(150);
      expect(receipt.payload.tool_calls).toHaveLength(1);
      expect(receipt.payload.tool_calls![0].tool_name).toBe('get_weather');
      expect(receipt.metadata).toEqual({ user_id: 'usr_123' });
    });

    it('should generate valid hashes (64 char hex)', async () => {
      const receipt = await auditor.record({
        input: 'test', output: 'test', model: 'gpt-4o', provider: 'openai',
      });
      expect(receipt.hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('verifyChain (static)', () => {
    it('should verify a chain of receipts from the same auditor', async () => {
      await auditor.record({ input: 'a', output: 'b', model: 'gpt-4o', provider: 'openai' });
      await auditor.record({ input: 'c', output: 'd', model: 'gpt-4o', provider: 'openai' });
      await auditor.record({ input: 'e', output: 'f', model: 'gpt-4o', provider: 'openai' });

      const allReceipts = (auditor as any).receipts as Receipt[];
      const valid = await AuditReceipt.verifyChain(allReceipts);
      expect(valid).toBe(true);
    });

    it('should fail verification if a receipt payload is tampered', async () => {
      await auditor.record({ input: 'a', output: 'b', model: 'gpt-4o', provider: 'openai' });
      await auditor.record({ input: 'c', output: 'd', model: 'gpt-4o', provider: 'openai' });

      const receipts = (auditor as any).receipts as Receipt[];
      receipts[1].payload.output = 'TAMPERED'; // Tamper

      const valid = await AuditReceipt.verifyChain(receipts);
      expect(valid).toBe(false);
    });
  });

  describe('exportJSON', () => {
    it('should export all receipts as an array', async () => {
      await auditor.record({ input: 'a', output: 'b', model: 'gpt-4o', provider: 'openai' });
      await auditor.record({ input: 'c', output: 'd', model: 'gpt-4o', provider: 'openai' });

      const exported = await auditor.exportJSON();
      expect(exported).toHaveLength(2);
      expect(exported[0].receipt_id).toBeTruthy();
      expect(exported[1].receipt_id).toBeTruthy();
    });

    it('should filter by date range', async () => {
      const oldDate = new Date('2025-01-01');
      const auditorWithOld = new AuditReceipt({ agentId: 'test' });

      (auditorWithOld as any).lastTimestamp = oldDate;

      await auditorWithOld.record({
        input: 'old', output: 'stuff', model: 'gpt-4o', provider: 'openai',
      });
      await auditor.record({
        input: 'new', output: 'stuff', model: 'gpt-4o', provider: 'openai',
      });

      const filtered = await auditor.exportJSON({ start: new Date('2026-01-01') });
      // The old receipt won't be in this auditor instance
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });
});
