# StorageBackend Specification

**Domain**: `storage-backend` · **Status**: New · **EU AI Act**: Art. 12 (audit trail continuity), Art. 26(6) (6-month retention)

## Purpose

Provide persistent audit trail storage for compliance receipts. The `StorageBackend` interface enables pluggable storage backends, with `JSONLFileWriter` as the initial implementation for local filesystem storage.

## Requirements

### Requirement: StorageBackend Interface

`StorageBackend` MUST define `append(receipt: Receipt): Promise<void>` and `readRange(agentId: string, month: string): Promise<Receipt[]>`. `JSONLFileWriter` MUST implement it: path `audit-log-{agentId}-{YYYY-MM}.jsonl`, append-only, one JSON line per receipt, auto-create directory, monthly rotation. Write failures MUST throw (fail-closed philosophy). (Art. 26(6) — retention)

| # | Scenario | Expect |
|---|----------|--------|
| 1 | `record()` with storage configured | Receipt appended to correct monthly file |
| 2 | Month boundary | New file created, old file intact |
| 3 | Directory missing | Auto-created before first write |
| 4 | Write failure in strict mode | Error propagates, agent response blocked |
| 5 | Write failure in permissive mode | Warning via `onComplianceError`, agent continues |
| 6 | `readRange` for existing agent+month | All matching receipts returned |

`AuditReceiptConfig` MUST expose optional `storage?: StorageBackend`. `record()` MUST call `this.storage.append(receipt)` after in-memory push and before returning. `VercelAIConfig` and `OpenAIConfig` MUST expose `storage?: StorageBackend` and pass to `AuditReceipt` constructor.

| # | Scenario | Expect |
|---|----------|--------|
| 7 | `storage` omitted | In-memory only — existing behavior preserved |
| 8 | `storage` via `VercelAIConfig` | Receipts persisted to disk |
| 9 | `storage` via `OpenAIConfig` | Receipts persisted to disk |
