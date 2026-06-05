import { describe, it, expect } from 'vitest';
import { generateKeyPair, sign, verify } from '../src/signer';

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
});
