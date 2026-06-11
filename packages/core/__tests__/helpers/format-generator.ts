/**
 * Edge-case test data generators for compliance E2E testing.
 *
 * Purely static, zero-dependency utility methods that produce test
 * data arrays and objects for parametrized test scenarios. Every method
 * uses hardcoded template strings — no external data generators.
 *
 * @example
 * ```typescript
 * const emails = FormatGenerator.emailVariants();
 * const phones = FormatGenerator.phoneFormats();
 * const deep = FormatGenerator.nestedJson(5);
 * ```
 *
 * biome-ignore lint/complexity/noStaticOnlyClass: intentional POO design per SDD spec
 */
export class FormatGenerator {
  /**
   * Return 8+ email address variants that commonly appear in real-world data.
   *
   * Includes plain addresses, markdown link format, angle-bracket headers,
   * multiple recipients, and edge-case TLDs.
   *
   * @returns An array of unique email string variants.
   *
   * @example
   * ```typescript
   * const variants = FormatGenerator.emailVariants();
   * expect(variants.length).toBeGreaterThanOrEqual(8);
   * ```
   */
  static emailVariants(): string[] {
    return [
      'user@example.com',
      'jane.doe@company.co.uk',
      'contact@startup.io',
      'test+alias@sub.domain.org',
      'admin@localhost',
      'firstname.lastname@museum.museum',
      // markdown link with mailto
      'Send email to [user@example.com](mailto:user@example.com)',
      // angle bracket format (RFC 5322 header style)
      '<support@example.com>',
      // multiple recipients comma-separated
      'alice@example.com, bob@example.com',
      // unicode domain (internationalized)
      'user@münchen.de',
      // very long local part
      'this.is.a.really.long.email.address.that.exceeds.standard.limits@example.com',
    ];
  }

  /**
   * Return 10+ international phone number formats.
   *
   * Includes US, Spanish, German, French, UK, Japanese, Chinese,
   * Brazilian, Mexican, and Argentine formats with various
   * delimiters and prefixes.
   *
   * @returns An array of unique phone string formats.
   *
   * @example
   * ```typescript
   * const phones = FormatGenerator.phoneFormats();
   * expect(phones.length).toBeGreaterThanOrEqual(10);
   * ```
   */
  static phoneFormats(): string[] {
    return [
      // US: +1 (555) 123-4567
      '+1 (555) 123-4567',
      // Spain: +34 91 123 45 67
      '+34 91 123 45 67',
      // Germany: +49 30 12345678
      '+49 30 12345678',
      // France: +33 1 23 45 67 89
      '+33 1 23 45 67 89',
      // UK: +44 20 7946 0958
      '+44 20 7946 0958',
      // Japan: +81 3-1234-5678
      '+81 3-1234-5678',
      // China: +86 138 0013 8000
      '+86 138 0013 8000',
      // Brazil: +55 11 91234-5678
      '+55 11 91234-5678',
      // Mexico: +52 55 1234 5678
      '+52 55 1234 5678',
      // Argentina: +54 9 11 1234-5678
      '+54 9 11 1234-5678',
      // Dots format: +1.555.123.4567
      '+1.555.123.4567',
      // Dashes no parens: +1-555-123-4567
      '+1-555-123-4567',
    ];
  }

  /**
   * Generate a nested JSON object with configurable depth.
   *
   * At each level the object contains a `data` key with a string value
   * and a `next` key pointing to the next level (or `null` at the bottom).
   *
   * @param depth - Number of nesting levels (>= 0). Depth 0 returns a flat object with `next: null`.
   * @returns A nested object of the specified depth.
   *
   * @example
   * ```typescript
   * const obj = FormatGenerator.nestedJson(3);
   * // { data: 'level-0', next: { data: 'level-1', next: { data: 'level-2', next: { data: 'level-3', next: null } } } }
   * ```
   */
  static nestedJson(depth: number): object {
    function build(level: number): Record<string, unknown> | null {
      if (level > depth) return null;
      return {
        data: `level-${level}`,
        next: build(level + 1),
      };
    }
    return build(0) ?? {};
  }

  /**
   * Return a markdown string containing code fences, inline code,
   * links, bold, and italic formatting.
   *
   * Useful for testing that AgentTrail's canonical JSON hashing
   * correctly handles rich text markup.
   *
   * @returns A multi-line markdown string.
   *
   * @example
   * ```typescript
   * const md = FormatGenerator.markdownWithCode();
   * expect(md).toContain('```');
   * ```
   */
  static markdownWithCode(): string {
    return [
      '# Installation',
      '',
      'Run the following command to install the package:',
      '',
      '```bash',
      'npm install @aivoralabs/agenttrail',
      '```',
      '',
      'Then import it in your project:',
      '',
      '```typescript',
      "import { AuditReceipt } from '@aivoralabs/agenttrail';",
      '```',
      '',
      'For more details, see the [documentation](https://agenttrail.aivoralabs.org).',
      '',
      '**Note**: The SDK requires Node.js 22 or later.',
      '',
      'The `AuditReceipt` class is the *core* building block.',
      '',
      'Inline `code` snippets are preserved as-is.',
    ].join('\n');
  }

  /**
   * Return an array of Unicode strings: CJK characters, emoji,
   * accented Latin, right-to-left, and mathematical symbols.
   *
   * @returns An array of unique unicode string values.
   *
   * @example
   * ```typescript
   * const strings = FormatGenerator.unicodeStrings();
   * expect(strings).toEqual(expect.arrayContaining([expect.stringContaining('🚀')]));
   * ```
   */
  static unicodeStrings(): string[] {
    return [
      // CJK (Chinese)
      '你好世界，这是测试文本',
      // Japanese
      'こんにちは世界',
      // Korean
      '안녕하세요 세계',
      // Emoji
      'Hello 👋 World 🌍 Rocket 🚀 Party 🎉',
      // Accented Latin
      'Crème brûlée, señor, über cool, à la carte',
      // Right-to-left (Arabic)
      'مرحبا بالعالم',
      // Mathematical symbols
      '∀ ∃ ∉ ∑ ∏ ∫ ∂ √ ∞ ≈ ≠ ≤ ≥',
      // Mixed: CJK + emoji + Latin
      '日本語と🚀とEnglishの混ざり文',
    ];
  }
}
