/**
 * Suite 10: Real-World Formats — proves that AgentTrail's PII redaction,
 * canonical JSON serialization, and metadata validation handle edge-case
 * real-world data correctly.
 *
 * EU AI Act Art. 12 requires "comprehensive" logging — this suite proves
 * that unusual but valid formats (unicode, deep nesting, code blocks, etc.)
 * are handled without data loss or corruption.
 *
 * No API key required.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { TestHarness, ReceiptVerifier, FormatGenerator } from '../helpers';

describe('Suite 10: Real-World Formats — edge-case data handling', () => {
  const harness = new TestHarness('real-formats');

  afterAll(() => {
    harness.cleanup();
  });

  /**
   * 10.1 Email in markdown link: [text](mailto:user@domain.com)
   *
   * Proves that PII redaction catches email addresses embedded inside
   * markdown link syntax with mailto: protocol.
   */
  it('Email in markdown link: [text](mailto:user@domain.com)', async () => {
    const auditor = harness.createAuditor('markdown-email', {
      storage: true,
      redactConfig: {
        rules: [
          {
            pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            replacement: '[REDACTED]',
          },
        ],
      },
    });

    const testInput = FormatGenerator.emailVariants().find(
      (e) => e.includes('mailto'),
    )!;

    const receipt = await auditor.record({
      input: testInput,
      output: 'Email processed',
      model: 'gpt-4o',
      provider: 'openai',
    });

    ReceiptVerifier.piiIsRedacted(receipt, ['user@example.com']);
  });

  /**
   * 10.2 10+ international phone formats — documented gap
   *
   * Proves that the default redaction does NOT cover all international
   * phone formats (documented limitation). This test passes by
   * demonstrating the gap — at least one format is NOT redacted.
   */
  it('10+ international phone formats — documented gap', async () => {
    const auditor = harness.createAuditor('phone-gap', {
      storage: true,
    });

    const phones = FormatGenerator.phoneFormats();
    expect(phones.length).toBeGreaterThanOrEqual(10);

    const receipt = await auditor.record({
      input: phones.join(', '),
      output: 'Phones processed',
      model: 'gpt-4o',
      provider: 'openai',
    });

    // At least one phone format is NOT redacted with default rules
    // (documented gap — the default redactor only catches common patterns)
    const combined = `${receipt.payload.input} ${receipt.payload.output}`;
    const allRedacted = phones.every((p) => !combined.includes(p));

    // This assertion documents the gap: not all formats are caught
    // by the default redaction rules
    expect(allRedacted).toBe(false);
  });

  /**
   * 10.3 Custom phone redact rule: all formats redacted
   *
   * Proves that with an appropriately broad custom regex pattern,
   * ALL international phone formats can be reliably redacted.
   */
  it('Custom phone redact rule: all formats redacted', async () => {
    const auditor = harness.createAuditor('phone-custom', {
      storage: true,
      redactConfig: {
        rules: [
          {
            pattern: /\+?[\d\s\-().]{7,20}/g,
            replacement: '[PHONE REDACTED]',
          },
        ],
      },
    });

    const phones = FormatGenerator.phoneFormats();
    const receipt = await auditor.record({
      input: phones.join(', '),
      output: 'Phones processed',
      model: 'gpt-4o',
      provider: 'openai',
    });

    // Custom replacement marker differs from default [REDACTED],
    // so we verify manually: raw phone numbers absent, marker present
    const combined = `${receipt.payload.input} ${receipt.payload.output}`;
    for (const phone of phones) {
      expect(combined).not.toContain(phone);
    }
    expect(combined).toContain('[PHONE REDACTED]');
  });

  /**
   * 10.4 Credit card with spaces: redacted
   *
   * Proves that credit card numbers with space delimiters (common in
   * real-world data entry) are caught by PII redaction.
   */
  it('Credit card with spaces: redacted', async () => {
    const auditor = harness.createAuditor('credit-card', {
      storage: true,
      redactConfig: {
        rules: [
          {
            pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
            replacement: '[REDACTED]',
          },
        ],
      },
    });

    const receipt = await auditor.record({
      input: 'Card: 4111 1111 1111 1111',
      output: 'Payment processed',
      model: 'gpt-4o',
      provider: 'openai',
    });

    ReceiptVerifier.piiIsRedacted(receipt, ['4111 1111 1111 1111']);
  });

  /**
   * 10.5 Nested JSON output (depth 5)
   *
   * Proves that canonical JSON serialization handles deeply nested
   * objects (depth 5) without truncation or hash corruption.
   */
  it('Nested JSON output (depth 5)', async () => {
    const auditor = harness.createAuditor('nested-json', {
      storage: true,
    });

    const deepObject = FormatGenerator.nestedJson(5);

    const receipt = await auditor.record({
      input: 'Generate report',
      output: JSON.stringify(deepObject),
      model: 'gpt-4o',
      provider: 'openai',
    });

    expect(receipt).toBeTruthy();
    ReceiptVerifier.hasValidStructure(receipt);

    const chainReceipts = await harness.readReceipts('nested-json');
    await ReceiptVerifier.chainIsIntact(chainReceipts);
  });

  /**
   * 10.6 Array 150 items in metadata → TypeError
   *
   * Proves that metadata validation rejects arrays exceeding the
   * 100-item limit (defined in validateMetadata).
   */
  it('Array 150 items in metadata → TypeError', async () => {
    const auditor = harness.createAuditor('meta-array-limit', {
      storage: true,
    });

    await expect(
      auditor.record({
        input: 'test',
        output: 'test',
        model: 'gpt-4o',
        provider: 'openai',
        metadata: {
          items: Array.from({ length: 150 }, (_, i) => i),
        },
      }),
    ).rejects.toThrow(TypeError);
  });

  /**
   * 10.7 Unicode/emoji in I/O
   *
   * Proves that Unicode text (CJK, emoji, accented Latin, RTL, math symbols)
   * is preserved exactly in the receipt without corruption.
   */
  it('Unicode/emoji in I/O', async () => {
    const auditor = harness.createAuditor('unicode', {
      storage: true,
    });

    const unicodeInput = FormatGenerator.unicodeStrings().join(' | ');

    const receipt = await auditor.record({
      input: unicodeInput,
      output: '🚀 Unicode response: 你好世界 — Crème brûlée ✓',
      model: 'gpt-4o',
      provider: 'openai',
    });

    expect(receipt.payload.input).toBe(unicodeInput);
    expect(receipt.payload.output).toBe(
      '🚀 Unicode response: 你好世界 — Crème brûlée ✓',
    );
  });

  /**
   * 10.8 Multiline code block in output
   *
   * Proves that markdown with code fences, inline code, and rich text
   * is preserved exactly in the receipt.
   */
  it('Multiline code block in output', async () => {
    const auditor = harness.createAuditor('code-block', {
      storage: true,
    });

    const mdContent = FormatGenerator.markdownWithCode();

    const receipt = await auditor.record({
      input: 'Show me the install guide',
      output: mdContent,
      model: 'gpt-4o',
      provider: 'openai',
    });

    expect(receipt.payload.output).toBe(mdContent);

    const chainReceipts = await harness.readReceipts('code-block');
    await ReceiptVerifier.chainIsIntact(chainReceipts);
  });

  /**
   * 10.9 50 metadata keys (at limit) → passes
   *
   * Proves that metadata with exactly 50 top-level keys is accepted
   * (the configured limit).
   */
  it('50 metadata keys (at limit) → passes', async () => {
    const auditor = harness.createAuditor('meta-50-keys', {
      storage: true,
    });

    const metadata: Record<string, unknown> = {};
    for (let i = 0; i < 50; i++) {
      metadata[`key_${i}`] = `value_${i}`;
    }

    const receipt = await auditor.record({
      input: 'test',
      output: 'test',
      model: 'gpt-4o',
      provider: 'openai',
      metadata,
    });

    expect(receipt.metadata).toBeDefined();
    expect(Object.keys(receipt.metadata!).length).toBe(50);
  });

  /**
   * 10.10 51 metadata keys → TypeError
   *
   * Proves that metadata with 51 top-level keys is rejected
   * (exceeds the limit of 50).
   */
  it('51 metadata keys → TypeError', async () => {
    const auditor = harness.createAuditor('meta-51-keys', {
      storage: true,
    });

    const metadata: Record<string, unknown> = {};
    for (let i = 0; i < 51; i++) {
      metadata[`key_${i}`] = `value_${i}`;
    }

    await expect(
      auditor.record({
        input: 'test',
        output: 'test',
        model: 'gpt-4o',
        provider: 'openai',
        metadata,
      }),
    ).rejects.toThrow(TypeError);
  });

  /**
   * 10.11 String >1000 chars in metadata → TypeError
   *
   * Proves that metadata string values exceeding 1000 characters
   * are rejected.
   */
  it('String >1000 chars in metadata → TypeError', async () => {
    const auditor = harness.createAuditor('meta-long-string', {
      storage: true,
    });

    await expect(
      auditor.record({
        input: 'test',
        output: 'test',
        model: 'gpt-4o',
        provider: 'openai',
        metadata: { long: 'x'.repeat(1001) },
      }),
    ).rejects.toThrow(TypeError);
  });

  /**
   * 10.12 __proto__ key in metadata → TypeError
   *
   * Proves that metadata containing the forbidden __proto__ key
   * is rejected (prototype pollution protection).
   *
   * Note: We use Object.defineProperty because { __proto__: { x: 1 } }
   * in JS sets the object's prototype rather than creating an own
   * property, which would bypass validation.
   */
  it('__proto__ key in metadata → TypeError', async () => {
    const auditor = harness.createAuditor('meta-proto', {
      storage: true,
    });

    const forbiddenMetadata: Record<string, unknown> = {};
    Object.defineProperty(forbiddenMetadata, '__proto__', {
      value: { x: 1 },
      enumerable: true,
      configurable: true,
      writable: true,
    });

    await expect(
      auditor.record({
        input: 'test',
        output: 'test',
        model: 'gpt-4o',
        provider: 'openai',
        metadata: forbiddenMetadata,
      }),
    ).rejects.toThrow(TypeError);
  });
});
