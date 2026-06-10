# Delta: Production Hardening

**Change**: `production-hardening` · **EU AI Act**: Art. 12 (audit trail), Art. 26(6) (6-month retention)

## ADDED Requirements

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

### Requirement: Metadata Validation

Zod-based `validateMetadata(metadata: unknown): asserts metadata is Record<string, MetadataValue>` MUST run in `record()` BEFORE building receipt payload. Schema: max 50 top-level keys, nesting depth ≤4, no `__proto__`/`constructor`/`prototype` keys, no functions/symbols/bigints/undefined, strings ≤1000 chars, arrays ≤100 items. Empty/undefined metadata passes through. Violations throw `TypeError` with descriptive message. (Art. 12 §1 — data integrity)

| # | Scenario | Expect |
|---|----------|--------|
| 10 | `__proto__` injection attempt | `TypeError`, receipt NOT created |
| 11 | 60 top-level keys | `TypeError` |
| 12 | Nesting depth 5 | `TypeError` |
| 13 | Function value in metadata | `TypeError` |
| 14 | Valid metadata under all constraints | Passes, receipt created |
| 15 | Metadata undefined or `{}` | Passes through unmodified |
| 16 | String value >1000 chars | `TypeError` |
| 17 | Array with 150 items | `TypeError` |

## MODIFIED Requirements

### Requirement: Compliance Mode Configuration

(Previously: config exposed `complianceMode` + `complianceConfig` only)

`OpenAIConfig` and `VercelAIConfig` MUST expose `storage?: StorageBackend`. MUST pass `storage` to `AuditReceipt` constructor. Existing `complianceMode`/`complianceConfig` behavior unchanged. (Art. 12 §2, Art. 26(6))

| # | Scenario | Expect |
|---|----------|--------|
| 18 | `storage` provided, strict mode, success | Receipt recorded AND persisted to JSONL |
| 19 | `storage` + strict mode + write failure | `ComplianceError` thrown |

### Requirement: Type Safety

(Previously: only `packages/openai/src/index.ts` had zero Biome errors)

Replace 4 `any` types in `packages/vercel-ai/src/index.ts` with proper interfaces. Remove unused `err` variable in the `wrapStream` catch block. Zero Biome lint errors in both `packages/openai` and `packages/vercel-ai`.

| # | Scenario | Expect |
|---|----------|--------|
| 20 | Vercel middleware `doGenerate`/`doStream` params | Typed interfaces, no `any` |
| 21 | Unused `err` removed from catch | Biome `no-unused-vars` passes |
| 22 | Biome lint on `packages/vercel-ai/src/index.ts` | Zero errors, zero warnings |

### Requirement: E2E Pipeline Test

(Previously: no E2E test existed)

E2E test MUST create `AuditReceipt` with `JSONLFileWriter`, record 2-3 interactions, read JSONL file back, run CLI `verify` on the file, assert chain integrity and timestamps. Temp files MUST be cleaned up after test. 30s timeout. (Art. 12 §3 — full pipeline auditability)

| # | Scenario | Expect |
|---|----------|--------|
| 23 | Full pipeline: record → file → CLI verify | Chain intact, agent ID matches, timestamps present |
| 24 | Multiple receipts in single file | All receipts verifiable, chain continuous |
| 25 | Tampered JSONL line | CLI reports chain broken |
| 26 | Cleanup after test | Temp files deleted, no leftovers |
