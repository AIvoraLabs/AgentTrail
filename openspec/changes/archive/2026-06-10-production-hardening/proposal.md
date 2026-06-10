# Proposal: Production Hardening

## Intent

EU AI Act Art. 26(6) mandates 6-month retention, but receipts are in-memory only. Metadata has zero structural validation — insecure. No E2E test proves the pipeline works for ICP demos. 5 Biome lint issues remain in vercel-ai.

## Scope

### In Scope
- `StorageBackend` interface + `JSONLFileWriter` (monthly rotation, append-only)
- Metadata safety validation (Zod — strings, numbers, booleans, nested plain objects, no `__proto__`, max depth 4, max 50 keys)
- E2E test: agent call → receipt → file → CLI read → CLI verify
- Biome lint fixes for vercel-ai (4 `any` types, 1 unused var)
- Wire storage through openai + vercel-ai middleware configs

### Out of Scope
- Pino structured logging
- Roughtime / Estonia OÜ
- Property-based testing
- Performance benchmarks

## Capabilities

### New Capabilities
- `storage-backend`: Persistent audit trail storage. `StorageBackend` interface + `JSONLFileWriter` with monthly rotation.
- `metadata-validation`: Runtime metadata safety via Zod. Validates structure, depth, key count, blocks `__proto__` injection.

### Modified Capabilities
- `openai-integration`: Accept `storage` in `OpenAIConfig`; pass to `AuditReceipt` so receipts persist to disk.

## Approach

1. **Storage**: Define `StorageBackend` interface (`append(receipt)` + `readRange(agentId, month)`). `JSONLFileWriter` implements it — `audit-log-{agentId}-{YYYY-MM}.jsonl`, one receipt JSON line per append. Hook into `AuditReceipt.record()` via optional `storage` config param.
2. **Validation**: Add `validateMetadata()` with Zod schema. Call in `record()` before building receipt. Reject on structural violation with `TypeError`.
3. **E2E Test**: Real `AuditReceipt` + real hash chain + real JSONL file I/O + real CLI parse/verify in one test. Timeout 30s.
4. **Biome**: Fix 4 `any` types + 1 unused var in `packages/vercel-ai/src/index.ts`.
5. **Deps**: Add `zod` as production dep of core. **Justification**: first new runtime dep — `validateMetadata()` runs in `record()` hot path at runtime, not at build time. Consumer applications need the validation available without bundling zod themselves.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/core/src/storage.ts` | New | `StorageBackend` + `JSONLFileWriter` |
| `packages/core/src/receipt.ts` | Modify | Hook storage into `record()`, accept config |
| `packages/core/src/types.ts` | Modify | Add `StorageBackend`, `StorageConfig` |
| `packages/core/src/validate.ts` | Modify | Add `validateMetadata()` with Zod |
| `packages/core/package.json` | Modify | Add `zod` production dep |
| `packages/vercel-ai/src/index.ts` | Modify | Accept `storage`, fix Biome lint |
| `packages/openai/src/index.ts` | Modify | Accept `storage` in config |
| `__tests__/e2e/pipeline.test.ts` | New | Full pipeline E2E test |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Zod adds ~40KB to bundle | Low | Tree-shakeable; only used in validation path |
| JSONL rotation edge at month boundary | Low | Test month transition, use UUID not sequence |
| E2E slow in CI (real crypto + I/O) | Med | 30s timeout, skip if no OPENAI_API_KEY |

## Rollback Plan

Revert `storage.ts`, `receipt.ts`, `validate.ts`, `types.ts`, `package.json`, vercel-ai and openai changes. Remove `zod` from deps. Remove E2E test file. No public API breakage — `storage` is optional everywhere.

## Dependencies

- `zod` ^3.23 — production dependency for runtime metadata validation (first new runtime dep for core)

## Success Criteria

- [ ] `record()` writes receipt to JSONL file when storage configured
- [ ] Malicious metadata (`__proto__`, functions, depth >4, >50 keys) rejected with `TypeError`
- [ ] E2E test passes with real file I/O and CLI verify
- [ ] Zero Biome lint errors in vercel-ai
- [ ] All existing unit tests pass unchanged
