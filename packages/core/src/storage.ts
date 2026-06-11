import type { Receipt } from './types';

/**
 * Storage backend interface for persisting audit trail receipts.
 * Implementations handle the actual I/O and storage format.
 */
export interface StorageBackend {
  /** Append a single receipt to persistent storage. */
  append(receipt: Receipt): Promise<void>;
  /** Read all receipts for a given agent and month (YYYY-MM format). */
  readRange(agentId: string, month: string): Promise<Receipt[]>;
}

/**
 * JSONL file writer — stores one JSON receipt per line in monthly files.
 *
 * File naming: audit-log-{agentId}-{YYYY-MM}.jsonl
 * Directory auto-created on first write (recursive).
 */
export class JSONLFileWriter implements StorageBackend {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async append(receipt: Receipt): Promise<void> {
    const month = this.getMonth(receipt);
    const filePath = this.filePath(receipt.agent_id, month);
    const dir = this.getDir(filePath);

    try {
      // Ensure directory exists
      const fs = await import('node:fs');
      fs.mkdirSync(dir, { recursive: true });

      const line = `${JSON.stringify(receipt)}\n`;
      fs.appendFileSync(filePath, line, 'utf-8');
    } catch (cause) {
      throw new Error(
        `Failed to write receipt to ${filePath}: ${cause instanceof Error ? cause.message : String(cause)}`,
        { cause },
      );
    }
  }

  async readRange(agentId: string, month: string): Promise<Receipt[]> {
    const filePath = this.filePath(agentId, month);

    try {
      const fs = await import('node:fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      const receipts: Receipt[] = [];

      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        try {
          receipts.push(JSON.parse(trimmed) as Receipt);
        } catch {
          // Skip malformed lines
        }
      }

      return receipts;
    } catch {
      // File doesn't exist or can't be read — return empty
      return [];
    }
  }

  private getMonth(receipt: Receipt): string {
    // Extract YYYY-MM from timestamp_start
    const date = receipt.payload.timestamp_start.slice(0, 7);
    return date;
  }

  private filePath(agentId: string, month: string): string {
    return `${this.basePath}/audit-log-${agentId}-${month}.jsonl`;
  }

  private getDir(filePath: string): string {
    const lastSep = filePath.lastIndexOf('/');
    return lastSep >= 0 ? filePath.slice(0, lastSep) : '.';
  }
}
