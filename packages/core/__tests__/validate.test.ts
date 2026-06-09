import { describe, it, expect } from 'vitest';
import { validateInteraction, validateKeyMaterial } from '../src/validate';
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
