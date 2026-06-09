import * as ed from '@noble/ed25519';
import type { KeyEntry } from './types.js';

/**
 * Generate a new Ed25519 key pair.
 * Returns base64-encoded public and private keys.
 */
export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);

  return {
    publicKey: bytesToBase64(publicKey),
    privateKey: bytesToBase64(privateKey),
  };
}

/**
 * Sign a hash with the given private key.
 * Returns a base64-encoded Ed25519 signature.
 */
export async function sign(hash: string, privateKeyBase64: string): Promise<string> {
  const privateKey = base64ToBytes(privateKeyBase64);
  const hashBytes = new TextEncoder().encode(hash);
  const signature = await ed.signAsync(hashBytes, privateKey);
  return bytesToBase64(signature);
}

/**
 * Verify an Ed25519 signature against a hash and public key.
 */
export async function verify(
  signatureBase64: string,
  hash: string,
  publicKeyBase64: string,
): Promise<boolean> {
  try {
    const signature = base64ToBytes(signatureBase64);
    const publicKey = base64ToBytes(publicKeyBase64);
    const hashBytes = new TextEncoder().encode(hash);
    return await ed.verifyAsync(signature, hashBytes, publicKey);
  } catch {
    return false;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  // Use Array.from to avoid spread operator RangeError on large arrays
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

// --- Key rotation ---

/**
 * Compute a short key identifier from a base64-encoded public key.
 *
 * Uses the first 8 characters of the base64 key as a human-readable
 * fingerprint. Suitable for audit-log lookups and key_id fields.
 */
export function computeKeyId(publicKeyBase64: string): string {
  return publicKeyBase64.substring(0, 8);
}

/**
 * Create a {@link KeyEntry} from a generated key pair.
 *
 * @param keypair - The key pair (must include `publicKey`).
 * @returns A {@link KeyEntry} with the public key, a computed keyId, and the current time.
 */
export function createKeyEntry(keypair: { publicKey: string }): KeyEntry {
  return {
    publicKey: keypair.publicKey,
    keyId: computeKeyId(keypair.publicKey),
    activatedAt: new Date().toISOString(),
  };
}

/**
 * Rotate to a new signing key, evicting the oldest if the active set
 * exceeds `maxKeys`.
 *
 * Generates a new Ed25519 key pair, wraps it in a {@link KeyEntry}, and
 * appends it to the existing keys array. If the result exceeds `maxKeys`,
 * the oldest entries (from the front) are removed.
 *
 * @param existingKeys - The current set of active keys.
 * @param maxKeys - Maximum number of active keys (default: 3).
 * @returns The updated keys array and the new key pair.
 */
export async function rotateKey(
  existingKeys: KeyEntry[],
  maxKeys = 3,
): Promise<{ keys: KeyEntry[]; newKeypair: { publicKey: string; privateKey: string } }> {
  const newKeypair = await generateKeyPair();
  const entry = createKeyEntry(newKeypair);
  const keys = [...existingKeys, entry];

  // Evict oldest if at max capacity
  if (keys.length > maxKeys) {
    keys.splice(0, keys.length - maxKeys);
  }

  return { keys, newKeypair };
}

/**
 * Verify an Ed25519 signature against any of the provided active keys.
 *
 * Iterates through the keys array and returns the first successful
 * verification. If no key matches, returns `{ valid: false }`.
 *
 * @param keys - Active key entries to try.
 * @param hash - The hash that was signed.
 * @param signatureBase64 - The signature to verify (base64-encoded).
 * @returns The verification result and the matching keyId, if found.
 */
export async function verifyWithAnyKey(
  keys: KeyEntry[],
  hash: string,
  signatureBase64: string,
): Promise<{ valid: boolean; keyId?: string }> {
  for (const key of keys) {
    try {
      const result = await verify(signatureBase64, hash, key.publicKey);
      if (result) {
        return { valid: true, keyId: key.keyId };
      }
    } catch {
      // Try next key
    }
  }
  return { valid: false };
}
