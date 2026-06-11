# Tasks: Production Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~480 (230 core impl + 130 tests + 80 middleware + 40 E2E) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (storage + validation, ~350 lines) → PR 2 (middleware + E2E + biome, ~130 lines) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Storage backend + types + receipt hook + tests | PR 1 | Base: main; tests bundled |
| 2 | Metadata validation + Zod + tests | PR 1 | Bundled with unit 1 in PR 1 (sequential commit) |
| 3 | Middleware wiring (vercel-ai + openai) + tests | PR 2 | Depends on PR 1; base: main after PR 1 merge |
| 4 | E2E pipeline test | PR 2 | Depends on units 1-3; base: main after PR 1 merge |
| 5 | Biome lint cleanup | PR 2 | Independent; bundled with PR 2 |

---

## Phase 1: Storage Backend (Foundation)

- [x] 1.1 Add `zod ^3.23` to `packages/core/package.json` dependencies — production dep for runtime validation
- [x] 1.2 Create `packages/core/src/storage.ts`: define `StorageBackend` interface with `append(receipt: Receipt): Promise<void>` and `readRange(agentId: string, month: string): Promise<Receipt[]>`
- [x] 1.3 Implement `JSONLFileWriter` class in `storage.ts`: constructor takes `basePath`, `append()` writes one JSON line to `audit-log-{agentId}-{YYYY-MM}.jsonl`, auto-creates directory, throws on write failure
- [x] 1.4 Add `StorageBackend` interface and `storage?: StorageBackend` to `AuditReceiptConfig` in `packages/core/src/types.ts`
- [x] 1.5 Hook `storage.append(receipt)` in `packages/core/src/receipt.ts` `record()` — after `this.receipts.push(receipt)`, before return; wrap in try/catch per complianceMode (strict→throw, permissive→warn)
- [x] 1.6 Re-export `StorageBackend` from `packages/core/src/index.ts`
- [x] 1.7 Write tests in `packages/core/__tests__/storage.test.ts`: append writes correct file, month rotation creates new file, directory autocreate, readRange returns matching receipts, write failure in strict mode throws, write failure in permissive mode warns

## Phase 2: Metadata Validation (Security)

- [x] 2.1 Add `validateMetadata()` to `packages/core/src/validate.ts` using Zod: max 50 keys, depth ≤4, no `__proto__`/`constructor`/`prototype`, no functions/symbols/bigints/undefined, strings ≤1000 chars, arrays ≤100 items; empty/undefined passes through
- [x] 2.2 Call `validateMetadata(interaction.metadata)` in `packages/core/src/receipt.ts` `record()` — BEFORE building receipt payload, after `validateInteraction(interaction)`
- [x] 2.3 Write tests in `packages/core/__tests__/validate.test.ts` (add `describe('validateMetadata')` block): `__proto__` injection→TypeError, 60 keys→TypeError, depth 5→TypeError, function value→TypeError, valid metadata passes, undefined/empty passes, string >1000 chars→TypeError, array 150 items→TypeError

## Phase 3: Middleware Wiring (Integration)

- [x] 3.1 Add `storage?: StorageBackend` to `VercelAIConfig` in `packages/vercel-ai/src/index.ts`, pass `config.storage` to all `new AuditReceipt({ ... })` constructors (wrapGenerate and wrapStream flush). Also added `complianceConfig` for consistency.
- [x] 3.2 Add `storage?: StorageBackend` to `OpenAIConfig` in `packages/openai/src/index.ts`, pass `config.storage` to all `new AuditReceipt({ ... })` constructors (pre-flight, streaming, non-streaming). Also added `complianceConfig` for consistency.
- [x] 3.3 Write tests for vercel-ai: mock `StorageBackend`, verify `append()` called when storage configured; verify no error when storage omitted (3 tests added)
- [x] 3.4 Write tests for openai: mock `StorageBackend`, verify `append()` called when storage configured; verify no error when storage omitted (2 tests added)

## Phase 4: E2E Pipeline Test

- [x] 4.1 Create `__tests__/e2e/pipeline.test.ts`: instantiate `AuditReceipt` with `JSONLFileWriter`, record 2-3 interactions, read JSONL file back, run `verifyChain` on parsed receipts, assert chain intact + agent ID matches + timestamps present; cleanup temp dir in `afterAll`
- [x] 4.2 Add tamper detection test: record receipts, modify one JSONL line, verify chain broken
- [x] 4.3 Verify 30s timeout covers real crypto + file I/O in CI (set via `{ timeout: 30000 }` on both E2E tests)

## Phase 5: Biome Lint Cleanup

- [x] 5.1 In `packages/vercel-ai/src/index.ts`: replace all `any` types in `VercelMiddleware` interface with typed interfaces (`GenerateParams`, `StreamParams`, `GenerateResult`). Zero `any` remaining.
- [x] 5.2 No unused `err` variable existed in catch blocks (already using `() => {}`). Pre-existing issue verified clean.
- [x] 5.3 `pnpm biome check packages/vercel-ai/src/index.ts` — zero errors

---

## Dependency Graph

```
Phase 1 (storage) ──────┐
                        ├─→ Phase 3 (middleware) ─→ Phase 4 (E2E)
Phase 2 (validation) ───┘
Phase 5 (biome) ──────── independent (can run anytime)
```

Phase 1 and Phase 2 are independent and can run in parallel.
Phase 3 depends on both Phase 1 (storage types) and Phase 2 (validation).
Phase 4 depends on Phases 1-3.
Phase 5 is fully independent.
