import { verify } from './signer';
import type { KeyEntry, Receipt, VerificationResult } from './types';

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
 * Compute SHA-256 hash of arbitrary input text.
 */
export async function computeHash(input: string): Promise<string> {
  return sha256(input);
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
export async function chainHash(prevHash: string, canonicalPayload: string): Promise<string> {
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
      (k) => `${JSON.stringify(k)}:${canonicalJSON((value as Record<string, unknown>)[k])}`,
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
      const genesisHash = await createGenesisHash(receipt.payload.timestamp_start);
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

/**
 * Result of a per-agent chain verification within {@link verifyChains}.
 */
interface AgentChainResult {
  receipts: Receipt[];
  result: VerificationResult;
}

/**
 * Verify hash chains for multiple agents from a mixed list of receipts.
 *
 * Receipts are grouped by `agent_id`, then each agent's chain is verified
 * independently. Returns a Map keyed by agent_id.
 *
 * @param receipts - Array of receipts that may belong to different agents.
 * @param options  - Optional verification options (signature verification, etc.).
 */
export async function verifyChains(
  receipts: Receipt[],
  options?: {
    verifySignatures?: boolean;
    publicKeys?: KeyEntry[];
  },
): Promise<Map<string, AgentChainResult>> {
  // Group receipts by agent_id
  const grouped = new Map<string, Receipt[]>();
  for (const receipt of receipts) {
    const agentId = receipt.agent_id;
    const existing = grouped.get(agentId) ?? [];
    existing.push(receipt);
    grouped.set(agentId, existing);
  }

  const results = new Map<string, AgentChainResult>();

  for (const [agentId, agentReceipts] of grouped) {
    // Run hash chain verification
    const hashResult = await verifyChain(agentReceipts);

    // Signature verification
    let signaturesValid = true;
    let verifiedSignatures = 0;
    const signatureErrors: { receiptId: string; error: string }[] = [];

    if (options?.verifySignatures && options?.publicKeys) {
      for (const receipt of agentReceipts) {
        const matchingKey = options.publicKeys.find((k) => k.keyId === receipt.payload.key_id);
        if (!matchingKey) {
          signaturesValid = false;
          signatureErrors.push({
            receiptId: receipt.receipt_id,
            error: `No matching public key found for key_id: ${receipt.payload.key_id}`,
          });
          continue;
        }

        try {
          const isValid = await verify(receipt.hash, receipt.signature, matchingKey.publicKey);
          if (isValid) {
            verifiedSignatures++;
          } else {
            signaturesValid = false;
            signatureErrors.push({
              receiptId: receipt.receipt_id,
              error: 'Signature verification failed',
            });
          }
        } catch (err) {
          signaturesValid = false;
          signatureErrors.push({
            receiptId: receipt.receipt_id,
            error: `Signature verification threw: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }

    // Find brokenAtIndex
    let brokenAtIndex: number | undefined;
    if (!hashResult && agentReceipts.length > 0) {
      for (let i = 0; i < agentReceipts.length; i++) {
        const singleChain = await verifyChain(agentReceipts.slice(0, i + 1));
        if (!singleChain) {
          brokenAtIndex = i;
          break;
        }
      }
    }

    results.set(agentId, {
      receipts: agentReceipts,
      result: {
        valid: hashResult && signaturesValid,
        hashChainIntact: hashResult,
        signaturesValid,
        verifiedSignatures,
        signatureErrors,
        brokenAtIndex,
      },
    });
  }

  return results;
}
