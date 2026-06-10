# Vercel AI Integration Specification

**Domain**: `vercel-ai-integration` · **Status**: New · **EU AI Act**: Art. 12 (audit trail continuity), Art. 26(6) (6-month retention)

## Purpose

Wrap Vercel AI SDK's `generateText` and `streamText` to produce signed audit receipts for every interaction. The wrapper MUST fail-closed in strict mode — no receipt, no response.

## Requirements

### Requirement: Compliance Mode Configuration

`VercelAIConfig` MUST expose `complianceMode?: ComplianceMode` (default: `'strict'`), `complianceConfig?: ComplianceConfig`, and `storage?: StorageBackend`. Pre-flight check MUST validate auditor availability in strict mode. `storage` MUST be passed to `AuditReceipt` constructor. (Art. 12 §2 — continuous verifiability, Art. 26(6) — retention)

| # | Scenario | Expect |
|---|----------|--------|
| 1 | `complianceMode` omitted, call succeeds | Defaults to `'strict'`, receipt recorded |
| 2 | `complianceMode: 'strict'`, pre-flight fails | `ComplianceError` thrown, agent never calls AI |
| 3 | `complianceMode: 'permissive'`, pre-flight fails | Warning logged via `onComplianceError`, call proceeds |
| 4 | `storage` provided, strict mode, success | Receipt recorded AND persisted |

### Requirement: Storage Integration

`VercelAIConfig` MUST expose `storage?: StorageBackend`. MUST pass `storage` to `AuditReceipt` constructor in both `wrapGenerate` and `wrapStream` flush paths. Existing `complianceMode`/`complianceConfig` behavior unchanged.

| # | Scenario | Expect |
|---|----------|--------|
| 5 | `storage` provided | Receipts persisted to disk via `append()` |
| 6 | `storage` omitted | In-memory only — existing behavior preserved |
| 7 | `storage` + strict mode + write failure | `ComplianceError` thrown |

### Requirement: Type Safety

Middleware MUST use typed interfaces (no `any`) for `doGenerate`/`doStream` params. No unused variables. Zero Biome lint errors in `packages/vercel-ai/src/index.ts`.

| # | Scenario | Expect |
|---|----------|--------|
| 8 | Vercel middleware `doGenerate`/`doStream` params | Typed interfaces, no `any` |
| 9 | Unused variables | Biome `no-unused-vars` passes |
| 10 | Biome lint on `packages/vercel-ai/src/index.ts` | Zero errors, zero warnings |
