import type { Interaction } from './types';

/**
 * Assert that an unknown value is a valid {@link Interaction}.
 *
 * Checks that `model` and `provider` are non-empty strings.
 * Throws a {@link TypeError} with a descriptive message if validation fails.
 */
export function validateInteraction(input: unknown): asserts input is Interaction {
  if (input === null || input === undefined) {
    throw new TypeError('Interaction must not be null or undefined');
  }

  if (typeof input !== 'object') {
    throw new TypeError(
      `Expected object for Interaction, got ${typeof input}`,
    );
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.model !== 'string' || obj.model.length === 0) {
    throw new TypeError(
      'Interaction.model must be a non-empty string',
    );
  }

  if (typeof obj.provider !== 'string' || obj.provider.length === 0) {
    throw new TypeError(
      'Interaction.provider must be a non-empty string',
    );
  }
}

/**
 * Validate key material for signing operations.
 *
 * Both `publicKey` and `privateKey` must be non-empty strings.
 * Throws a {@link TypeError} with a descriptive message if validation fails.
 */
export function validateKeyMaterial(key: {
  publicKey?: string;
  privateKey?: string;
}): void {
  if (!key.publicKey || typeof key.publicKey !== 'string' || key.publicKey.length === 0) {
    throw new TypeError('publicKey must be a non-empty string');
  }

  if (!key.privateKey || typeof key.privateKey !== 'string' || key.privateKey.length === 0) {
    throw new TypeError('privateKey must be a non-empty string');
  }
}
