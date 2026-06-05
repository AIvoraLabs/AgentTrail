import { describe, it, expect } from 'vitest';
import { createGenesisHash, chainHash, verifyChain, canonicalJSON } from '../src/hash-chain';
import type { Receipt } from '../src/types';

describe('hash-chain', () => {
  describe('createGenesisHash', () => {
    it('should create a deterministic genesis hash from a timestamp', async () => {
      const hash = await createGenesisHash('2026-06-05T00:00:00.000Z');
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 hex = 64 chars
    });

    it('should produce different hashes for different timestamps', async () => {
      const hash1 = await createGenesisHash('2026-06-05T00:00:00.000Z');
      const hash2 = await createGenesisHash('2026-06-06T00:00:00.000Z');
      expect(hash1).not.toBe(hash2);
    });

    it('should be deterministic for the same input', async () => {
      const hash1 = await createGenesisHash('2026-06-05T00:00:00.000Z');
      const hash2 = await createGenesisHash('2026-06-05T00:00:00.000Z');
      expect(hash1).toBe(hash2);
    });
  });

  describe('chainHash', () => {
    it('should chain a new hash from previous hash and payload', async () => {
      const prevHash = await createGenesisHash('2026-06-05T00:00:00.000Z');
      const payload = JSON.stringify({ input: 'hello', output: 'world' });
      const nextHash = await chainHash(prevHash, payload);
      expect(nextHash).toBeTruthy();
      expect(nextHash.length).toBe(64);
    });

    it('should produce different hashes for different payloads', async () => {
      const prevHash = await createGenesisHash('2026-06-05T00:00:00.000Z');
      const hash1 = await chainHash(prevHash, JSON.stringify({ a: 1 }));
      const hash2 = await chainHash(prevHash, JSON.stringify({ a: 2 }));
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different prev hashes', async () => {
      const prevHash1 = await createGenesisHash('2026-06-05T00:00:00.000Z');
      const prevHash2 = await createGenesisHash('2026-06-06T00:00:00.000Z');
      const payload = JSON.stringify({ input: 'hello' });
      const hash1 = await chainHash(prevHash1, payload);
      const hash2 = await chainHash(prevHash2, payload);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyChain', () => {
    it('should verify a valid chain of receipts', async () => {
      const receipts: Receipt[] = [
        {
          receipt_id: '1',
          agent_id: 'test-agent',
          version: '1.0',
          prev_hash: null,
          hash: 'a',
          signature: 'sig1',
          payload: {
            timestamp_start: '2026-01-01T00:00:00.000Z',
            timestamp_end: '2026-01-01T00:00:01.000Z',
            input: 'hello',
            output: 'world',
            model: 'gpt-4o',
            provider: 'openai',
          },
        },
      ];

      // Calculate the actual genesis hash for the first receipt
      const genesisHash = await createGenesisHash(
        receipts[0].payload.timestamp_start,
      );
      receipts[0].hash = await chainHash(
        genesisHash,
        canonicalJSON(receipts[0].payload as unknown as Record<string, unknown>),
      );

      const valid = await verifyChain(receipts);
      expect(valid).toBe(true);
    });

    it('should detect a tampered payload', async () => {
      const genesisHash = await createGenesisHash('2026-01-01T00:00:00.000Z');
      const payloadObj = { input: 'hello', output: 'world', timestamp_start: '2026-01-01T00:00:00.000Z', timestamp_end: '2026-01-01T00:00:01.000Z', model: 'gpt-4o', provider: 'openai' };
      const validHash = await chainHash(genesisHash, canonicalJSON(payloadObj));

      const receipts: Receipt[] = [
        {
          receipt_id: '1',
          agent_id: 'test-agent',
          version: '1.0',
          prev_hash: null,
          hash: validHash,
          signature: 'sig1',
          payload: {
            timestamp_start: '2026-01-01T00:00:00.000Z',
            timestamp_end: '2026-01-01T00:00:01.000Z',
            input: 'hello',
            output: 'TAMPERED_OUTPUT', // <-- tampered
            model: 'gpt-4o',
            provider: 'openai',
          },
        },
      ];

      const result = await verifyChain(receipts);
      expect(result).toBe(false);
    });

    it('should detect a broken chain link', async () => {
      const genesisHash = await createGenesisHash('2026-01-01T00:00:00.000Z');
      const payloadObj1 = { input: 'a', output: 'b', timestamp_start: '2026-01-01T00:00:00.000Z', timestamp_end: '2026-01-01T00:00:01.000Z', model: 'gpt-4o', provider: 'openai' };
      const payloadObj2 = { input: 'c', output: 'd', timestamp_start: '2026-01-01T00:00:02.000Z', timestamp_end: '2026-01-01T00:00:03.000Z', model: 'gpt-4o', provider: 'openai' };
      const payload1 = canonicalJSON(payloadObj1);
      const payload2 = canonicalJSON(payloadObj2);

      const hash1 = await chainHash(genesisHash, payload1);
      const hash2 = await chainHash(hash1, payload2);

      const receipts: Receipt[] = [
        {
          receipt_id: '1', agent_id: 'test', version: '1.0', prev_hash: null, hash: hash1, signature: 'sig', payload: { timestamp_start: '2026-01-01T00:00:00.000Z', timestamp_end: '2026-01-01T00:00:01.000Z', input: 'a', output: 'b', model: 'gpt-4o', provider: 'openai' },
        },
        {
          receipt_id: '2', agent_id: 'test', version: '1.0', prev_hash: 'INVALID_PREV_HASH', hash: hash2, signature: 'sig', payload: { timestamp_start: '2026-01-01T00:00:02.000Z', timestamp_end: '2026-01-01T00:00:03.000Z', input: 'c', output: 'd', model: 'gpt-4o', provider: 'openai' },
        },
      ];

      const result = await verifyChain(receipts);
      expect(result).toBe(false);
    });

    it('should return true for an empty array', async () => {
      const result = await verifyChain([]);
      expect(result).toBe(true);
    });
  });
});
