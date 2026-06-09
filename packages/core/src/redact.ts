import { ComplianceError } from './errors.js';
import type { RedactConfig, RedactRule } from './types.js';

/**
 * Default PII patterns as specified by EU AI Act Article 12 compliance:
 * - Email addresses
 * - US phone numbers (with or without separators)
 * - Credit card numbers (16-digit, with or without separators)
 */
const DEFAULT_RULES: RedactRule[] = [
  {
    pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
    replacement: '[EMAIL REDACTED]',
  },
  {
    pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    replacement: '[PHONE REDACTED]',
  },
  {
    pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    replacement: '[CC REDACTED]',
  },
];

/**
 * Redact PII (Personally Identifiable Information) from an interaction payload.
 *
 * Serializes the input data to JSON, applies the configured regex rules, and
 * returns the redacted JSON string. The caller is responsible for hashing the
 * result (e.g., via `hashChain.chainHash()`) for the `input_hash` field.
 *
 * **Fail-closed**: If serialization fails, a {@link ComplianceError} is thrown.
 *
 * @param data - The interaction payload to redact (typically an `Interaction` object).
 * @param config - Optional configuration for custom rules.
 * @returns The redacted JSON string.
 *
 * @example
 * ```typescript
 * const redacted = redactPII({
 *   input: 'email me at test@example.com',
 *   output: 'ok',
 * });
 * // redacted: '{"input":"email me at [EMAIL REDACTED]","output":"ok"}'
 * ```
 */
export function redactPII(data: unknown, config?: RedactConfig): string {
  const rules = config?.rules ?? DEFAULT_RULES;

  try {
    const json = JSON.stringify(data);
    let redacted = json;

    for (const rule of rules) {
      redacted = redacted.replace(rule.pattern, rule.replacement ?? '[REDACTED]');
    }

    return redacted;
  } catch (e) {
    throw new ComplianceError('PII redaction failed', { cause: e });
  }
}
