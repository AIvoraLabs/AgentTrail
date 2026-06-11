import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { AuditReceipt, JSONLFileWriter } from '@aivoralabs/agenttrail';
import type { AuditReceiptConfig, ComplianceConfig, Receipt } from '@aivoralabs/agenttrail';
import type { AuditorOpts } from './types';

/**
 * Encapsulated test infrastructure: temp directories, auditor creation,
 * receipt reading, and cleanup. One instance per test suite.
 *
 * Manages a unique temporary root directory for each suite, ensuring
 * receipts written during tests are fully isolated and removed on cleanup.
 *
 * @example
 * ```typescript
 * const harness = new TestHarness('my-suite');
 * const auditor = harness.createAuditor('agent-1', { storage: true });
 * const receipts = await harness.readReceipts('agent-1');
 * harness.cleanup();
 * ```
 */
export class TestHarness {
  /** Absolute path to the temporary root directory for this test suite. */
  readonly rootDir: string;

  /**
   * Create a new test harness with a unique temporary directory.
   *
   * @param suiteName - Logical name for the test suite, embedded in the temp directory name for debuggability.
   * @example
   * ```typescript
   * const harness = new TestHarness('real-llm-e2e');
   * ```
   */
  constructor(suiteName: string) {
    this.rootDir = fs.mkdtempSync(path.join(os.tmpdir(), `agenttrail-${suiteName}-`));
  }

  /**
   * Create and return a configured {@link AuditReceipt} instance.
   *
   * When `opts.storage` is `true`, a {@link JSONLFileWriter} is created in a
   * subdirectory named after `agentId` and attached to the auditor. The
   * `opts.redactConfig` and `opts.complianceMode` are forwarded to the
   * {@link AuditReceipt} constructor.
   *
   * @param agentId - Unique agent identifier, used as both agent ID and storage subdirectory name.
   * @param opts    - Optional configuration (storage, redaction, compliance mode).
   * @returns A fully configured {@link AuditReceipt} instance.
   * @throws {Error} If the auditor cannot be constructed.
   *
   * @example
   * ```typescript
   * const auditor = harness.createAuditor('agent-1', {
   *   storage: true,
   *   complianceMode: 'strict',
   * });
   * const receipt = await auditor.record({ input: 'Hi', output: 'Hello', model: 'gpt-4o', provider: 'openai' });
   * ```
   */
  createAuditor(agentId: string, opts: AuditorOpts = {}): AuditReceipt {
    const config: AuditReceiptConfig = {
      agentId,
    };

    if (opts.complianceMode) {
      const complianceConfig: ComplianceConfig = { mode: opts.complianceMode };
      config.complianceConfig = complianceConfig;
    }

    if (opts.redactConfig) {
      config.redactConfig = opts.redactConfig;
    }

    if (opts.storage) {
      const storage = this.createStorage(agentId);
      config.storage = storage;
    }

    return new AuditReceipt(config);
  }

  /**
   * Create a {@link JSONLFileWriter} rooted at a subdirectory of the harness temp directory.
   *
   * @param subDir - Relative subdirectory under `rootDir` (e.g. an agent ID). When omitted, the root directory is used.
   * @returns A new {@link JSONLFileWriter} instance.
   *
   * @example
   * ```typescript
   * const storage = harness.createStorage('agent-1');
   * ```
   */
  createStorage(subDir?: string): JSONLFileWriter {
    const dir = subDir ? path.join(this.rootDir, subDir) : this.rootDir;
    fs.mkdirSync(dir, { recursive: true });
    return new JSONLFileWriter(dir);
  }

  /**
   * Read all stored receipts for a given agent.
   *
   * Calculates the current month in `YYYY-MM` format and delegates to
   * {@link JSONLFileWriter.readRange}. Returns an empty array if no
   * storage was configured for this agent or no receipts were found.
   *
   * @param agentId - The agent whose receipts to read.
   * @returns A promise that resolves to the array of stored receipts.
   *
   * @example
   * ```typescript
   * const receipts = await harness.readReceipts('agent-1');
   * expect(receipts.length).toBeGreaterThan(0);
   * ```
   */
  async readReceipts(agentId: string): Promise<Receipt[]> {
    const month = new Date().toISOString().slice(0, 7);
    const storage = this.createStorage(agentId);
    return storage.readRange(agentId, month);
  }

  /**
   * Remove the entire temporary root directory and all its contents.
   *
   * Must be called in `afterAll` / `afterEach` to prevent temp directory
   * accumulation. Safe to call multiple times — subsequent calls are no-ops.
   *
   * @example
   * ```typescript
   * afterAll(() => {
   *   harness.cleanup();
   * });
   * ```
   */
  cleanup(): void {
    fs.rmSync(this.rootDir, { recursive: true, force: true });
  }
}
