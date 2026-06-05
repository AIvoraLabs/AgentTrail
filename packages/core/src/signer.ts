import * as ed from '@noble/ed25519';

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
export async function sign(
  hash: string,
  privateKeyBase64: string,
): Promise<string> {
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
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
