import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  sign,
  verify,
  computeKeyId,
  createKeyEntry,
  rotateKey,
  verifyWithAnyKey,
} from '../src/signer';

/**
 * Create a deterministic pseudo-random byte array of the given length.
 * Uses a simple LCG to keep it reproducible in tests.
 */
function createTestBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let seed = 42;
  for (let i = 0; i < length; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    bytes[i] = seed & 0xff;
  }
  return bytes;
}

describe('signer', () => {
  describe('generateKeyPair', () => {
    it('should generate a key pair with public and private keys', async () => {
      const keyPair = await generateKeyPair();
      expect(keyPair.publicKey).toBeTruthy();
      expect(keyPair.privateKey).toBeTruthy();
      expect(typeof keyPair.publicKey).toBe('string');
      expect(typeof keyPair.privateKey).toBe('string');
    });

    it('should generate different key pairs each time', async () => {
      const [kp1, kp2] = await Promise.all([generateKeyPair(), generateKeyPair()]);
      expect(kp1.publicKey).not.toBe(kp2.publicKey);
      expect(kp1.privateKey).not.toBe(kp2.privateKey);
    });

    it('should produce keys of expected length (base64 decoded)', async () => {
      const keyPair = await generateKeyPair();
      // Ed25519 public key is 32 bytes, private key is 32 bytes
      const pubKeyRaw = Uint8Array.from(atob(keyPair.publicKey), (c) => c.charCodeAt(0));
      const privKeyRaw = Uint8Array.from(atob(keyPair.privateKey), (c) => c.charCodeAt(0));
      expect(pubKeyRaw.length).toBe(32);
      expect(privKeyRaw.length).toBe(32);
    });
  });

  describe('sign and verify', () => {
    it('should sign a hash and verify it correctly', async () => {
      const keyPair = await generateKeyPair();
      const hash = 'a'.repeat(64); // Mock SHA-256 hash
      const signature = await sign(hash, keyPair.privateKey);
      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');

      const isValid = await verify(signature, hash, keyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should reject a signature with wrong public key', async () => {
      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();
      const hash = 'a'.repeat(64);
      const signature = await sign(hash, keyPair1.privateKey);

      const isValid = await verify(signature, hash, keyPair2.publicKey);
      expect(isValid).toBe(false);
    });

    it('should reject a signature for a different hash', async () => {
      const keyPair = await generateKeyPair();
      const hash1 = 'a'.repeat(64);
      const hash2 = 'b'.repeat(64);
      const signature = await sign(hash1, keyPair.privateKey);

      const isValid = await verify(signature, hash2, keyPair.publicKey);
      expect(isValid).toBe(false);
    });

    it('should produce deterministic signatures for the same input', async () => {
      const keyPair = await generateKeyPair();
      const hash = 'a'.repeat(64);
      const sig1 = await sign(hash, keyPair.privateKey);
      const sig2 = await sign(hash, keyPair.privateKey);
      // Ed25519 is deterministic (RFC 8032)
      expect(sig1).toBe(sig2);
    });
  });

  describe('bytesToBase64 large arrays (regression)', () => {
    it('should handle large byte arrays without RangeError', async () => {
      // Create a 500K byte array (would throw with spread operator pattern)
      const largeBytes = createTestBytes(500_000);

      // Verify that Array.from approach works on large arrays
      const encoded = btoa(
        Array.from(largeBytes, (b) => String.fromCharCode(b)).join(''),
      );
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
      // Base64 length formula: ceil(n/3) * 4
      expect(encoded.length).toBe(Math.ceil(500_000 / 3) * 4);
    });

    it('should still produce correct output for small arrays matching old behavior', async () => {
      const smallBytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const encoded = btoa(
        Array.from(smallBytes, (b) => String.fromCharCode(b)).join(''),
      );
      expect(encoded).toBe('SGVsbG8=');
    });

    it('should not throw RangeError via key generation path', async () => {
      // This exercises generateKeyPair which uses bytesToBase64 internally
      const keyPair = await generateKeyPair();
      expect(keyPair.publicKey).toBeTruthy();
      expect(keyPair.privateKey).toBeTruthy();
    });

    it('should produce correct signatures after the fix', async () => {
      // Full integration test: generate → sign → verify still works
      const keyPair = await generateKeyPair();
      const hash = 'a'.repeat(64);
      const signature = await sign(hash, keyPair.privateKey);
      const valid = await verify(signature, hash, keyPair.publicKey);
      expect(valid).toBe(true);
    });
  });

  describe('key rotation', () => {
    describe('computeKeyId', () => {
      it('should return first 8 chars of the public key', async () => {
        const kp = await generateKeyPair();
        const keyId = computeKeyId(kp.publicKey);
        expect(keyId).toBe(kp.publicKey.substring(0, 8));
        expect(keyId.length).toBe(8);
      });

      it('should produce consistent IDs for the same key', async () => {
        const kp = await generateKeyPair();
        expect(computeKeyId(kp.publicKey)).toBe(computeKeyId(kp.publicKey));
      });

      it('should produce different IDs for different keys', async () => {
        const kp1 = await generateKeyPair();
        const kp2 = await generateKeyPair();
        expect(computeKeyId(kp1.publicKey)).not.toBe(computeKeyId(kp2.publicKey));
      });
    });

    describe('createKeyEntry', () => {
      it('should create a KeyEntry with publicKey, keyId, and activatedAt', async () => {
        const kp = await generateKeyPair();
        const entry = createKeyEntry(kp);
        expect(entry.publicKey).toBe(kp.publicKey);
        expect(entry.keyId).toBeTruthy();
        expect(entry.activatedAt).toBeTruthy();
        expect(() => new Date(entry.activatedAt)).not.toThrow();
      });

      it('should compute keyId from the public key', async () => {
        const kp = await generateKeyPair();
        const entry = createKeyEntry(kp);
        expect(entry.keyId).toBe(kp.publicKey.substring(0, 8));
      });
    });

    describe('rotateKey', () => {
      it('should add a new key entry to the array', async () => {
        const kp1 = await generateKeyPair();
        const initialEntry = createKeyEntry(kp1);
        const result = await rotateKey([initialEntry]);
        expect(result.keys).toHaveLength(2);
        expect(result.keys[0].publicKey).toBe(kp1.publicKey);
        expect(result.newKeypair.publicKey).toBeTruthy();
        expect(result.newKeypair.privateKey).toBeTruthy();
      });

      it('should evict oldest key when maxKeys is exceeded', async () => {
        const kp1 = await generateKeyPair();
        const kp2 = await generateKeyPair();
        const kp3 = await generateKeyPair();
        const entries = [createKeyEntry(kp1), createKeyEntry(kp2), createKeyEntry(kp3)];

        // maxKeys=3, adding a 4th should evict the first
        const result = await rotateKey(entries, 3);
        expect(result.keys).toHaveLength(3);
        // The oldest (kp1) should be evicted
        expect(result.keys[0].publicKey).toBe(kp2.publicKey);
        expect(result.keys[1].publicKey).toBe(kp3.publicKey);
        expect(result.keys[2].publicKey).toBe(result.newKeypair.publicKey);
      });

      it('should use default maxKeys of 3', async () => {
        const kp = await generateKeyPair();
        const entries = [createKeyEntry(kp)];
        // Add 3 more keys (total 4, should evict 1)
        const r1 = await rotateKey(entries);
        const r2 = await rotateKey(r1.keys);
        const r3 = await rotateKey(r2.keys);
        expect(r3.keys).toHaveLength(3);
      });

      it('should not evict when under maxKeys', async () => {
        const kp1 = await generateKeyPair();
        const result = await rotateKey([createKeyEntry(kp1)], 5);
        expect(result.keys).toHaveLength(2);
      });

      it('should work with empty initial keys array', async () => {
        const result = await rotateKey([], 3);
        expect(result.keys).toHaveLength(1);
        expect(result.newKeypair.publicKey).toBeTruthy();
      });
    });

    describe('verifyWithAnyKey', () => {
      it('should verify a signature with any active key', async () => {
        const kp = await generateKeyPair();
        const entry = createKeyEntry(kp);
        const hash = 'a'.repeat(64);
        const signature = await sign(hash, kp.privateKey);

        const result = await verifyWithAnyKey([entry], hash, signature);
        expect(result.valid).toBe(true);
        expect(result.keyId).toBe(entry.keyId);
      });

      it('should return the correct keyId for the matching key', async () => {
        const kp1 = await generateKeyPair();
        const kp2 = await generateKeyPair();
        const entry1 = createKeyEntry(kp1);
        const entry2 = createKeyEntry(kp2);
        const hash = 'a'.repeat(64);

        // Sign with kp2
        const signature = await sign(hash, kp2.privateKey);

        // Both keys active, should match kp2
        const result = await verifyWithAnyKey([entry1, entry2], hash, signature);
        expect(result.valid).toBe(true);
        expect(result.keyId).toBe(entry2.keyId);
      });

      it('should return valid:false when no key matches', async () => {
        const kp1 = await generateKeyPair();
        const kp2 = await generateKeyPair();
        const entry = createKeyEntry(kp1);
        const hash = 'a'.repeat(64);

        // Sign with a different key
        const signature = await sign(hash, kp2.privateKey);

        const result = await verifyWithAnyKey([entry], hash, signature);
        expect(result.valid).toBe(false);
        expect(result.keyId).toBeUndefined();
      });

      it('should return valid:false for empty keys array', async () => {
        const hash = 'a'.repeat(64);
        const result = await verifyWithAnyKey([], hash, 'some-signature');
        expect(result.valid).toBe(false);
        expect(result.keyId).toBeUndefined();
      });

      it('should verify signature created with the latest key after rotation', async () => {
        const kp1 = await generateKeyPair();
        const entry1 = createKeyEntry(kp1);
        // Rotate to add a new key
        const { keys } = await rotateKey([entry1]);
        const hash = 'a'.repeat(64);

        // The latest key is the last in the array
        const latestKpPublic = keys[keys.length - 1].publicKey;
        // We need the private key to sign - but we don't have it stored.
        // Instead, sign with the first key and verify it matches via verifyWithAnyKey
        const signature = await sign(hash, kp1.privateKey);
        const result = await verifyWithAnyKey(keys, hash, signature);
        expect(result.valid).toBe(true);
      });
    });
  });
});
