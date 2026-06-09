# Tasks: Code Quality & Security Batch

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450–550 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

## PR Breakdown

### PR 1: Foundation + Bug Fixes (~150 lines)
Targets: tracker/code-quality-improvements-batch

- [x] 1.1 Create `packages/core/src/errors.ts` — 4 typed error classes
- [x] 1.2 Add new types to `packages/core/src/types.ts`
- [x] 1.3 Create `packages/core/src/validate.ts`
- [x] 1.4 Fix `canonicalJSON` in `packages/core/src/hash-chain.ts`
- [x] 2.1 Fix `bytesToBase64` in `packages/core/src/signer.ts`
- [x] 2.2 Write tests for BF-1 and BF-2

### PR 2: New Features (~180 lines)
Targets: PR 1 branch

- [x] 3.1 Create `packages/core/src/timestamp.ts` — SecureClock
- [x] 3.2 Create `packages/core/src/redact.ts` — PII redaction
- [x] 3.3 Add key rotation to `packages/core/src/signer.ts`
- [x] 3.4 Write tests for SecureClock, PII, key rotation

### PR 3: Integration + Middleware + Tests (~140 lines)
Targets: PR 2 branch

- [ ] 4.1 Integrate SecureClock + PII into `receipt.ts`
- [ ] 4.2 Add ComplianceMode to `packages/vercel-ai/src/index.ts`
- [ ] 4.3 Add ComplianceMode to `packages/openai/src/index.ts`
- [x] 4.4 Export new modules from `packages/core/src/index.ts`
- [ ] 4.5 Write integration tests
- [ ] 5.1 Run `pnpm test`
- [ ] 5.2 Run `tsc --noEmit`
- [ ] 5.3 Verify backward compatibility

## Phase Details

### Phase 1: Foundation

**1.1** errors.ts — ComplianceError (COMPLIANCE_ERROR), SignatureError (SIGNATURE_ERROR), ChainError (CHAIN_ERROR), ClockError (CLOCK_ERROR). Each extends Error with `code` and `cause?: unknown`.

**1.2** types.ts additions — ComplianceMode, ComplianceConfig, KeyEntry, RedactRule, RedactConfig, TimestampResult. Extend AuditReceiptConfig with complianceConfig, redactConfig, secureClock, keyStack fields. Extend ReceiptPayload with monotonic_ns, clock_drift_detected, key_id, input_hash.

**1.3** validate.ts — validateInteraction() asserts input is Interaction with model/provider non-empty. validateKeyMaterial() asserts publicKey/privateKey are non-empty strings.

**1.4** hash-chain.ts — Replace top-level-only sort with recursive sort at all nesting levels. Handle objects, arrays, primitives, null.

### Phase 2: Core Fixes

**2.1** signer.ts — Replace `String.fromCharCode(...bytes)` with `Array.from(bytes, b => String.fromCharCode(b)).join('')`.

**2.2** Tests — nested object sorting, deep payload determinism, large array base64 encoding.

### Phase 3: New Features

**3.1** timestamp.ts — SecureClock class. `now()` returns `{ iso, monotonic_ns, drift_detected }`. Uses process.hrtime.bigint(), configurable driftThresholdMs (default 1000).

**3.2** redact.ts — redactPII(data, config?) with default rules (email, phone, credit card). Throw on redaction failure (fail-closed). Compute input_hash = SHA-256 of redacted JSON.

**3.3** signer.ts — KeyEntry type, keyStack array, rotateKey() generates Ed25519 and pushes, signing uses latest key, verification tries all active keys, maxKeys configurable (default 3).

**3.4** Tests — drift detection, monotonicity, default rules, custom rules, hash mode, multi-key verify, key eviction.

### Phase 4: Integration

**4.1** receipt.ts — Call redactPII before hashing. Use SecureClock.now() for timestamps. Include monotonic_ns/drift_detected in payload. Compute input_hash. Add key_id from active key.

**4.2-4.3** Middleware — Accept complianceConfig. Strict mode: let record() errors propagate. Permissive mode: catch and console.warn.

**4.4** index.ts exports — errors, validate, timestamp, redact, new types.

**4.5** Integration tests — ComplianceMode strict throws + permissive warns, receipt with SecureClock includes monotonic_ns, PII redaction flow.

### Phase 5: Verification

**5.1-5.3** — pnpm test, tsc --noEmit, backward compat check.
