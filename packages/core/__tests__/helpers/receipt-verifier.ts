import type { Receipt } from '@aivoralabs/agenttrail';
import { verify, verifyChain } from '@aivoralabs/agenttrail';
import { expect } from 'vitest';

/** Regex matching a UUID v7 format (hex groups 8-4-4-4-12). */
const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Regex matching a 64-character lowercase hex string (SHA-256). */
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

/** Regex matching an ISO 8601 timestamp (e.g. `2025-06-10T12:34:56.789Z`). */
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/** The default redaction marker used by AgentTrail's PII redactor. */
const REDACTION_MARKER = '[REDACTED]';

/**
 * Static assertion methods for compliance verification.
 *
 * Each method proves one compliance guarantee required by EU AI Act Article 12:
 * hash chain integrity, PII redaction, timestamp monotonicity, and digital signatures.
 *
 * All methods use Vitest `expect()` internally and throw on failure,
 * making them suitable for direct use inside `it()` blocks.
 *
 * @example
 * ```typescript
 * import { ReceiptVerifier } from '../helpers/receipt-verifier';
 *
 * await ReceiptVerifier.chainIsIntact(receipts);
 * ReceiptVerifier.hasValidStructure(receipts[0]);
 * ```
 *
 * biome-ignore lint/complexity/noStaticOnlyClass: intentional POO design per SDD spec
 */
export class ReceiptVerifier {
  /**
   * Assert that a single receipt has a valid cryptographic structure.
   *
   * Verifies:
   * - `receipt_id` is a UUID v7
   * - `hash` is a 64-character SHA-256 hex string
   * - `signature` is a non-empty string (base64 Ed25519 signature)
   * - `payload.timestamp_start` is a valid ISO 8601 string
   * - `payload.timestamp_end` is a valid ISO 8601 string
   *
   * @param receipt - The receipt to validate.
   * @throws {AssertionError} If any structural check fails.
   *
   * @example
   * ```typescript
   * ReceiptVerifier.hasValidStructure(receipt);
   * ```
   */
  static hasValidStructure(receipt: Receipt): void {
    expect(receipt.receipt_id).toMatch(UUID_V7_RE);
    expect(receipt.hash).toMatch(SHA256_HEX_RE);
    expect(receipt.signature).toBeTruthy();
    expect(typeof receipt.signature).toBe('string');
    expect(receipt.payload.timestamp_start).toMatch(ISO_TIMESTAMP_RE);
    expect(receipt.payload.timestamp_end).toMatch(ISO_TIMESTAMP_RE);
  }

  /**
   * Assert that a chain of receipts has not been tampered with.
   *
   * Delegates to {@link verifyChain} from `@aivoralabs/agenttrail` which
   * recomputes every hash from the genesis block forward and ensures
   * each receipt's `prev_hash` correctly links to its predecessor.
   *
   * @param receipts - Ordered array of receipts forming a chain (genesis first).
   * @throws {AssertionError} If the chain is broken or tampered.
   *
   * @example
   * ```typescript
   * await ReceiptVerifier.chainIsIntact(receipts);
   * ```
   */
  static async chainIsIntact(receipts: Receipt[]): Promise<void> {
    const valid = await verifyChain(receipts);
    expect(valid).toBe(true);
  }

  /**
   * Assert that PII patterns have been redacted from a receipt.
   *
   * Checks that none of the `rawPatterns` appear verbatim in the receipt
   * payload's `input` or `output` fields, and that the redaction marker
   * `[REDACTED]` is present.
   *
   * @param receipt     - The receipt to inspect.
   * @param rawPatterns - Array of raw PII strings (e.g. `['user@example.com', '+1-555-0100']`).
   * @throws {AssertionError} If raw PII is found or no redaction marker is present.
   *
   * @example
   * ```typescript
   * ReceiptVerifier.piiIsRedacted(receipt, ['jane.doe@example.com']);
   * ```
   */
  static piiIsRedacted(receipt: Receipt, rawPatterns: string[]): void {
    const combinedText = `${receipt.payload.input} ${receipt.payload.output}`;

    for (const pattern of rawPatterns) {
      expect(combinedText).not.toContain(pattern);
    }

    expect(combinedText).toContain(REDACTION_MARKER);
  }

  /**
   * Assert that `monotonic_ns` values are strictly increasing across a chain.
   *
   * Receipts are processed in the given order (expected to be genesis-first).
   * Every receipt after the first must have a `monotonic_ns` value greater
   * than the previous receipt's.
   *
   * @param receipts - Ordered array of receipts (genesis first).
   * @throws {AssertionError} If any timestamp is not monotonically increasing.
   *
   * @example
   * ```typescript
   * ReceiptVerifier.timestampsAreMonotonic(receipts);
   * ```
   */
  static timestampsAreMonotonic(receipts: Receipt[]): void {
    for (let i = 1; i < receipts.length; i++) {
      const prev = BigInt(receipts[i - 1].payload.monotonic_ns ?? '0');
      const curr = BigInt(receipts[i].payload.monotonic_ns ?? '0');
      expect(curr > prev).toBe(true);
    }
  }

  /**
   * Assert that all Ed25519 signatures in a chain verify against the given public key.
   *
   * Uses the `verify` function from `@aivoralabs/agenttrail` to check each
   * receipt's signature against its hash. Fails at the first invalid signature.
   *
   * @param receipts  - Array of receipts whose signatures to verify.
   * @param publicKey - Base64-encoded Ed25519 public key.
   * @throws {AssertionError} If any signature fails verification.
   *
   * @example
   * ```typescript
   * await ReceiptVerifier.signaturesAreValid(receipts, publicKey);
   * ```
   */
  static async signaturesAreValid(receipts: Receipt[], publicKey: string): Promise<void> {
    for (const receipt of receipts) {
      const valid = await verify(receipt.signature, receipt.hash, publicKey);
      expect(valid).toBe(true);
    }
  }
}
