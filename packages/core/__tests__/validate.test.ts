import { describe, it, expect } from 'vitest';
import { validateInteraction, validateKeyMaterial, validateMetadata } from '../src/validate';
import type { Interaction } from '../src/types';

describe('validateInteraction', () => {
  it('should accept a valid Interaction object', () => {
    const interaction: Interaction = {
      input: 'hello',
      output: 'world',
      model: 'gpt-4o',
      provider: 'openai',
    };
    // Should not throw
    validateInteraction(interaction);
  });

  it('should accept a valid Interaction with all optional fields', () => {
    const interaction: Interaction = {
      input: 'hello',
      output: 'world',
      model: 'gpt-4o',
      provider: 'openai',
      tokensPrompt: 100,
      tokensCompletion: 50,
      metadata: { source: 'test' },
    };
    expect(() => validateInteraction(interaction)).not.toThrow();
  });

  it('should throw TypeError for null', () => {
    expect(() => validateInteraction(null)).toThrow(TypeError);
  });

  it('should throw TypeError for undefined', () => {
    expect(() => validateInteraction(undefined)).toThrow(TypeError);
  });

  it('should throw TypeError for non-object types', () => {
    expect(() => validateInteraction('string')).toThrow(TypeError);
    expect(() => validateInteraction(42)).toThrow(TypeError);
    expect(() => validateInteraction(true)).toThrow(TypeError);
  });

  it('should throw TypeError when model is missing', () => {
    expect(() =>
      validateInteraction({
        input: 'hello',
        output: 'world',
        provider: 'openai',
      } as unknown as Interaction),
    ).toThrow('Interaction.model must be a non-empty string');
  });

  it('should throw TypeError when model is empty string', () => {
    expect(() =>
      validateInteraction({
        input: 'hello',
        output: 'world',
        model: '',
        provider: 'openai',
      } as Interaction),
    ).toThrow('Interaction.model must be a non-empty string');
  });

  it('should throw TypeError when model is not a string', () => {
    expect(() =>
      validateInteraction({
        input: 'hello',
        output: 'world',
        model: 123,
        provider: 'openai',
      } as unknown as Interaction),
    ).toThrow('Interaction.model must be a non-empty string');
  });

  it('should throw TypeError when provider is missing', () => {
    expect(() =>
      validateInteraction({
        input: 'hello',
        output: 'world',
        model: 'gpt-4o',
      } as unknown as Interaction),
    ).toThrow('Interaction.provider must be a non-empty string');
  });

  it('should throw TypeError when provider is empty string', () => {
    expect(() =>
      validateInteraction({
        input: 'hello',
        output: 'world',
        model: 'gpt-4o',
        provider: '',
      } as Interaction),
    ).toThrow('Interaction.provider must be a non-empty string');
  });

  it('should throw TypeError when provider is not a string', () => {
    expect(() =>
      validateInteraction({
        input: 'hello',
        output: 'world',
        model: 'gpt-4o',
        provider: null,
      } as unknown as Interaction),
    ).toThrow('Interaction.provider must be a non-empty string');
  });

  it('should narrow the type after successful validation', () => {
    const raw: unknown = {
      input: 'test input',
      output: 'test output',
      model: 'claude-3',
      provider: 'anthropic',
    };

    validateInteraction(raw);
    // After assertion, `raw` should be narrowed to Interaction
    expect((raw as Interaction).model).toBe('claude-3');
    expect((raw as Interaction).provider).toBe('anthropic');
  });
});

describe('validateKeyMaterial', () => {
  it('should accept valid key material', () => {
    expect(() =>
      validateKeyMaterial({
        publicKey: 'abc123',
        privateKey: 'def456',
      }),
    ).not.toThrow();
  });

  it('should throw TypeError when publicKey is missing', () => {
    expect(() =>
      validateKeyMaterial({
        privateKey: 'def456',
      }),
    ).toThrow('publicKey must be a non-empty string');
  });

  it('should throw TypeError when publicKey is empty', () => {
    expect(() =>
      validateKeyMaterial({
        publicKey: '',
        privateKey: 'def456',
      }),
    ).toThrow('publicKey must be a non-empty string');
  });

  it('should throw TypeError when privateKey is missing', () => {
    expect(() =>
      validateKeyMaterial({
        publicKey: 'abc123',
      }),
    ).toThrow('privateKey must be a non-empty string');
  });

  it('should throw TypeError when privateKey is empty', () => {
    expect(() =>
      validateKeyMaterial({
        publicKey: 'abc123',
        privateKey: '',
      }),
    ).toThrow('privateKey must be a non-empty string');
  });

  it('should throw TypeError when publicKey is not a string', () => {
    expect(() =>
      validateKeyMaterial({
        publicKey: 123 as unknown as string,
        privateKey: 'def456',
      }),
    ).toThrow('publicKey must be a non-empty string');
  });
});

describe('validateMetadata', () => {
  it('should reject __proto__ injection', () => {
    // JSON.parse is required because object literal __proto__ triggers the prototype setter,
    // not an own property — JSON.parse creates a true data property as an attacker would
    const meta = JSON.parse('{"__proto__":{"admin":true}}');
    expect(() => validateMetadata(meta)).toThrow(TypeError);
  });

  it('should reject constructor key', () => {
    const meta = { constructor: { admin: true } };
    expect(() => validateMetadata(meta)).toThrow(TypeError);
  });

  it('should reject prototype key', () => {
    const meta = { prototype: { polluted: true } };
    expect(() => validateMetadata(meta)).toThrow(TypeError);
  });

  it('should reject metadata with more than 50 top-level keys', () => {
    const meta: Record<string, number> = {};
    for (let i = 0; i < 60; i++) {
      meta[`key${i}`] = i;
    }
    expect(() => validateMetadata(meta)).toThrow(TypeError);
  });

  it('should reject nesting depth greater than 4', () => {
    const meta = {
      a: {
        b: {
          c: {
            d: {
              e: 'too deep',
            },
          },
        },
      },
    };
    expect(() => validateMetadata(meta)).toThrow(TypeError);
  });

  it('should reject function values', () => {
    const meta = { fn: () => 'evil' };
    expect(() => validateMetadata(meta)).toThrow(TypeError);
  });

  it('should reject string longer than 1000 characters', () => {
    const meta = { longString: 'x'.repeat(1001) };
    expect(() => validateMetadata(meta)).toThrow(TypeError);
  });

  it('should reject array with more than 100 items', () => {
    const meta = { bigArray: new Array(150).fill('item') };
    expect(() => validateMetadata(meta)).toThrow(TypeError);
  });

  it('should pass valid metadata', () => {
    const meta = {
      userId: 'usr_123',
      sessionId: 456,
      isActive: true,
      tags: ['a', 'b'],
      nested: { key: 'value' },
      empty: null,
    };
    expect(() => validateMetadata(meta)).not.toThrow();
  });

  it('should pass through undefined metadata', () => {
    expect(() => validateMetadata(undefined)).not.toThrow();
  });

  it('should pass through null metadata', () => {
    expect(() => validateMetadata(null)).not.toThrow();
  });

  it('should reject symbol values', () => {
    const meta = { sym: Symbol('hidden') };
    expect(() => validateMetadata(meta)).toThrow(TypeError);
  });

  it('should reject BigInt values', () => {
    const meta = { big: BigInt(9007199254740991) };
    expect(() => validateMetadata(meta)).toThrow(TypeError);
  });

  it('should reject metadata with undefined values', () => {
    expect(() => validateMetadata({ key: undefined })).toThrow(TypeError);
  });

  it('should accept metadata after stripping undefined values', () => {
    const cleaned = Object.fromEntries(
      Object.entries({ key: 'value', empty: undefined }).filter(([, v]) => v !== undefined),
    );
    expect(() => validateMetadata(cleaned)).not.toThrow();
  });
});
