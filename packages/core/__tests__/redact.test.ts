import { describe, it, expect } from 'vitest';
import { redactPII } from '../src/redact';
import type { RedactConfig } from '../src/types';

describe('redactPII', () => {
  describe('default patterns', () => {
    it('should redact email addresses in string values', () => {
      const input = { input: 'Contact me at user@example.com for info' };
      const result = redactPII(input);
      expect(result).toContain('[EMAIL REDACTED]');
      expect(result).not.toContain('user@example.com');
    });

    it('should redact multiple email addresses', () => {
      const input = { input: 'Emails: a@b.com and c@d.org' };
      const result = redactPII(input);
      expect(result).toContain('[EMAIL REDACTED]');
      // Both instances should be replaced
      const matches = result.match(/\[EMAIL REDACTED\]/g);
      expect(matches).toHaveLength(2);
    });

    it('should redact US phone numbers', () => {
      const input = { input: 'Call 555-123-4567 for support' };
      const result = redactPII(input);
      expect(result).toContain('[PHONE REDACTED]');
      expect(result).not.toContain('555-123-4567');
    });

    it('should redact phone numbers with dots as separators', () => {
      const input = { input: 'Call 555.123.4567' };
      const result = redactPII(input);
      expect(result).toContain('[PHONE REDACTED]');
    });

    it('should redact phone numbers without separators', () => {
      const input = { input: 'Call 5551234567' };
      const result = redactPII(input);
      expect(result).toContain('[PHONE REDACTED]');
    });

    it('should redact credit card numbers', () => {
      const input = { input: 'My card is 4111-1111-1111-1111' };
      const result = redactPII(input);
      expect(result).toContain('[CC REDACTED]');
      expect(result).not.toContain('4111-1111-1111-1111');
    });

    it('should redact credit card numbers without separators', () => {
      const input = { input: 'My card is 4111111111111111' };
      const result = redactPII(input);
      expect(result).toContain('[CC REDACTED]');
    });

    it('should redact credit card numbers with spaces', () => {
      const input = { input: 'My card is 4111 1111 1111 1111' };
      const result = redactPII(input);
      expect(result).toContain('[CC REDACTED]');
    });
  });

  describe('multiple patterns in one string', () => {
    it('should redact email and phone in the same input', () => {
      const input = {
        input: 'Email: user@test.com, Phone: 555-123-4567',
      };
      const result = redactPII(input);
      expect(result).toContain('[EMAIL REDACTED]');
      expect(result).toContain('[PHONE REDACTED]');
      expect(result).not.toContain('user@test.com');
      expect(result).not.toContain('555-123-4567');
    });

    it('should redact email, phone, and credit card in nested data', () => {
      const input = {
        user: {
          email: 'user@example.com',
          phone: '555-123-4567',
          card: '4111-1111-1111-1111',
        },
      };
      const result = redactPII(input);
      expect(result).toContain('[EMAIL REDACTED]');
      expect(result).toContain('[PHONE REDACTED]');
      expect(result).toContain('[CC REDACTED]');
    });
  });

  describe('no false positives', () => {
    it('should not modify strings without sensitive data', () => {
      const input = { input: 'Hello, this is a normal message' };
      const result = redactPII(input);
      expect(JSON.parse(result)).toEqual(input);
    });

    it('should not modify numbers', () => {
      const input = { value: 12345 };
      const result = redactPII(input);
      expect(JSON.parse(result)).toEqual(input);
    });

    it('should not modify booleans', () => {
      const input = { active: true, verified: false };
      const result = redactPII(input);
      expect(JSON.parse(result)).toEqual(input);
    });
  });

  describe('JSON structure preservation', () => {
    it('should preserve JSON structure after redaction', () => {
      const input = {
        message: 'Email: user@example.com',
        count: 42,
        tags: ['a', 'b'],
      };
      const resultStr = redactPII(input);
      const parsed = JSON.parse(resultStr);
      expect(parsed).toHaveProperty('message');
      expect(parsed).toHaveProperty('count', 42);
      expect(parsed).toHaveProperty('tags');
      expect(parsed.tags).toEqual(['a', 'b']);
    });

    it('should handle arrays of strings', () => {
      const input = ['user@example.com', '555-123-4567'];
      const result = redactPII(input);
      const parsed = JSON.parse(result);
      expect(parsed[0]).toBe('[EMAIL REDACTED]');
      expect(parsed[1]).toBe('[PHONE REDACTED]');
    });

    it('should handle deep nesting', () => {
      const input = {
        level1: {
          level2: {
            email: 'deep@example.com',
          },
        },
      };
      const result = redactPII(input);
      expect(result).toContain('[EMAIL REDACTED]');
      expect(JSON.parse(result).level1.level2).toBeTruthy();
    });
  });

  describe('custom rules', () => {
    it('should use custom rules when provided', () => {
      const config: RedactConfig = {
        rules: [
          { pattern: /secret-\d+/g, replacement: '[SECRET REDACTED]' },
        ],
      };
      const input = { key: 'secret-12345' };
      const result = redactPII(input, config);
      expect(result).toContain('[SECRET REDACTED]');
      expect(result).not.toContain('secret-12345');
    });

    it('should not apply default patterns when custom rules provided', () => {
      const config: RedactConfig = {
        rules: [
          { pattern: /foo/g, replacement: '[BAR]' },
        ],
      };
      const input = { email: 'test@example.com', value: 'foo' };
      const result = redactPII(input, config);
      // Custom rule should match 'foo'
      expect(result).toContain('[BAR]');
      // Default email rule should NOT apply
      expect(result).toContain('test@example.com');
    });

    it('should use default replacement when not specified', () => {
      const config: RedactConfig = {
        rules: [{ pattern: /secret/g }],
      };
      const input = { value: 'this is a secret value' };
      const result = redactPII(input, config);
      expect(result).toContain('[REDACTED]');
    });
  });

  describe('edge cases', () => {
    it('should handle null data', () => {
      const result = redactPII(null);
      expect(result).toBe('null');
    });

    it('should throw ComplianceError for undefined data', () => {
      // JSON.stringify(undefined) returns undefined (not a string), so the
      // .replace() call throws, which is wrapped in ComplianceError.
      expect(() => redactPII(undefined)).toThrow('PII redaction failed');
    });

    it('should handle empty object', () => {
      const result = redactPII({});
      expect(result).toBe('{}');
    });

    it('should handle empty string', () => {
      const result = redactPII('');
      expect(result).toBe('""');
    });

    it('should handle large inputs without errors', () => {
      const largeString = 'user@example.com '.repeat(100);
      const input = { input: largeString };
      const result = redactPII(input);
      expect(result).toContain('[EMAIL REDACTED]');
    });
  });

  describe('ComplianceError on failure', () => {
    it('should throw ComplianceError for circular references', () => {
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;

      expect(() => redactPII(circular)).toThrow('PII redaction failed');
    });
  });
});
