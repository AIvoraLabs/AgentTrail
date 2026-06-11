import { z } from 'zod';
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
    throw new TypeError(`Expected object for Interaction, got ${typeof input}`);
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.model !== 'string' || obj.model.length === 0) {
    throw new TypeError('Interaction.model must be a non-empty string');
  }

  if (typeof obj.provider !== 'string' || obj.provider.length === 0) {
    throw new TypeError('Interaction.provider must be a non-empty string');
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

// --- Metadata validation ---

/** Valid metadata value types. */
export type MetadataValue =
  | string
  | number
  | boolean
  | null
  | MetadataValue[]
  | { [key: string]: MetadataValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate a single metadata value recursively.
 * Returns null if valid, or an error message string if invalid.
 */
function validateMetadataValue(value: unknown, depth: number): string | null {
  if (depth > 4) {
    return `Metadata nesting depth exceeds maximum of 4 (found depth ${depth})`;
  }

  // null is always valid
  if (value === null) return null;

  // Check for non-JSON-safe types
  if (
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint' ||
    typeof value === 'undefined'
  ) {
    return 'Metadata values must be strings, numbers, booleans, null, arrays, or plain objects';
  }

  // Primitive valid types
  if (typeof value === 'string') {
    if (value.length > 1000) {
      return 'Metadata string values must not exceed 1000 characters';
    }
    return null;
  }
  if (typeof value === 'number') return null;
  if (typeof value === 'boolean') return null;

  // Array
  if (Array.isArray(value)) {
    if (value.length > 100) {
      return 'Metadata array values must not exceed 100 items';
    }
    for (let i = 0; i < value.length; i++) {
      const err = validateMetadataValue(value[i], depth + 1);
      if (err) return err;
    }
    return null;
  }

  // Plain object
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return 'Metadata contains forbidden keys (__proto__, constructor, or prototype)';
      }
      const err = validateMetadataValue(value[key], depth + 1);
      if (err) return err;
    }
    return null;
  }

  // Fallback — reject unknown types
  return 'Metadata values must be strings, numbers, booleans, null, arrays, or plain objects';
}

const metadataSchema = z.record(z.string(), z.unknown()).superRefine((data, ctx) => {
  // Check top-level key count ≤ 50
  const keys = Object.keys(data);
  if (keys.length > 50) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Metadata has ${keys.length} top-level keys, maximum is 50`,
      path: [],
    });
    return;
  }

  // Recurse through values for depth and type safety
  for (const key of keys) {
    const err = validateMetadataValue(data[key], 2);
    if (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err,
        path: [],
      });
      return;
    }
  }
});

/**
 * Validate that metadata conforms to safety constraints.
 *
 * - Max 50 top-level keys
 * - Nesting depth ≤ 4
 * - No `__proto__` / `constructor` / `prototype` keys
 * - Values must be JSON-safe: strings, numbers, booleans, null, arrays, plain objects
 * - Strings ≤ 1000 chars
 * - Arrays ≤ 100 items
 *
 * Undefined or null metadata passes through (optional field).
 * Throws {@link TypeError} on violation.
 */
export function validateMetadata(
  metadata: unknown,
): asserts metadata is Record<string, MetadataValue> {
  if (metadata === undefined || metadata === null) {
    return;
  }

  // Pre-check: reject non-object types immediately
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new TypeError('Metadata must be a plain object');
  }

  // Pre-check: scan for forbidden keys on raw input.
  // Zod strips __proto__ keys internally (prototype pollution protection),
  // so we must check the raw input before Zod processes it.
  const rawObj = metadata as Record<string, unknown>;
  for (const key of Object.keys(rawObj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new TypeError(
        'Metadata contains forbidden keys (__proto__, constructor, or prototype)',
      );
    }
  }

  const result = metadataSchema.safeParse(metadata);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new TypeError(firstIssue.message);
  }
}
