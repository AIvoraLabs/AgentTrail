import type { Receipt } from './types';

const GENESIS_PREFIX = 'AGENT_AUDIT_RECEIPT_V1';

/**
 * Compute SHA-256 hash of input string.
 * Uses Web Crypto API (native, zero-dep).
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create the genesis hash H_0 for a chain.
 * H_0 = SHA256("AGENT_AUDIT_RECEIPT_V1" || genesis_timestamp)
 */
export async function createGenesisHash(timestamp: string): Promise<string> {
  return sha256(`${GENESIS_PREFIX}${timestamp}`);
}

/**
 * Chain a new hash from the previous hash and the canonical payload.
 * H_i = SHA256(H_(i-1) || P_i)
 */
export async function chainHash(
  prevHash: string,
  canonicalPayload: string,
): Promise<string> {
  return sha256(`${prevHash}${canonicalPayload}`);
}

/**
 * Serialize a value to canonical JSON (sorted keys) for deterministic hashing.
 *
 * Recursively sorts object keys so that nested objects and arrays of objects
 * produce deterministic output regardless of insertion order.
 */
export function canonicalJSON(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJSON).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys.map(
      (k) =>
        `${JSON.stringify(k)}:${canonicalJSON((value as Record<string, unknown>)[k])}`,
    );
    return `{${pairs.join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Verify the integrity of an entire hash chain.
 * Returns true if all receipts are valid and unbroken.
 */
export async function verifyChain(receipts: Receipt[]): Promise<boolean> {
  if (receipts.length === 0) return true;

  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];
    const isGenesis = i === 0;

    // Genesis: prev_hash must be null
    if (isGenesis) {
      if (receipt.prev_hash !== null) return false;
      const genesisHash = await createGenesisHash(
        receipt.payload.timestamp_start,
      );
      const expectedHash = await chainHash(
        genesisHash,
        canonicalJSON(receipt.payload as unknown as Record<string, unknown>),
      );
      if (receipt.hash !== expectedHash) return false;
    } else {
      // Non-genesis: prev_hash must match the previous receipt's hash
      const prevReceipt = receipts[i - 1];
      if (receipt.prev_hash !== prevReceipt.hash) return false;

      const expectedHash = await chainHash(
        receipt.prev_hash,
        canonicalJSON(receipt.payload as unknown as Record<string, unknown>),
      );
      if (receipt.hash !== expectedHash) return false;
    }
  }

  return true;
}
