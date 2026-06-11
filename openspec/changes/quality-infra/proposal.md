# Proposal: Quality Infrastructure — Benchmarks & Property Testing

## Intent

Architecture §9 defines performance targets (<50ms p95, <100μs per receipt) but nothing measures them. Hash chain integrity relies on hand-crafted cases only — no adversarial fuzzing. Without benchmarks, regressions go undetected; without property tests, edge-case tampering goes uncaught. This change adds the measurement infrastructure the architecture already mandates.

## Scope

### In Scope
- 5 Vitest `bench()` tests: `computeHash`, `sign`, `canonicalJSON`, `record` full cycle, `verifyChain` (100-receipt chain)
- 5 `@fast-check/vitest` property-based tests: deterministic `canonicalJSON`, deterministic `chainHash`, `verifyChain` catches tampering, `verifyChain` accepts valid chains, sign/verify round-trip
- `@fast-check/vitest` as devDependency in `packages/core/package.json`

### Out of Scope
- Production code changes (ZERO)
- Pino logging, Roughtime, Estonia OÜ (post-MVP)
- Integration benchmarks (openai/vercel wrappers) — core only

## Capabilities

### New Capabilities
None — this is test infrastructure only. No new behavioral contract exposed to consumers.

### Modified Capabilities
None — no spec-level behavior changes. All existing spec contracts (`storage-backend`, `metadata-validation`, `openai-integration`, `vercel-ai-integration`) remain identical.

## Approach

1. Add `@fast-check/vitest` to core devDependencies (vitest `bench()` already available natively)
2. Create `packages/core/__tests__/receipt.bench.ts`: 5 `bench()` functions using `perf_hooks` for microsecond precision. Each measures p50/p95 across 1000+ iterations. Assert targets match Architecture §9.
3. Create `packages/core/__tests__/hash-chain-fuzz.test.ts`: 5 `@fast-check/vitest` properties. `fc.array(fc.anything())` generates random payloads; `fc.integer({ min: 1, max: 50 })` random chain lengths.
4. Wire into CI: `vitest bench` runs alongside `vitest run`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/core/package.json` | Modified | Add `@fast-check/vitest` devDependency |
| `packages/core/__tests__/receipt.bench.ts` | **New** | 5 benchmark tests |
| `packages/core/__tests__/hash-chain-fuzz.test.ts` | **New** | 5 property-based tests |
| `packages/core/src/hash-chain.ts` | Unchanged | Functions under test only |
| `packages/core/src/signer.ts` | Unchanged | Functions under test only |
| `packages/core/src/receipt.ts` | Unchanged | Functions under test only |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| fast-check flaky on random seed | Low | Pin seed in CI, use `@fast-check/vitest` native integration |
| Benchmarks variance across hardware | Med | Run in CI only (controlled environment). Targets per Architecture §9 are aspirational, not blocking. |

## Rollback Plan

Revert `package.json` devDependency addition and delete the two new test files. Zero consumer impact — no production code touched.

## Dependencies

- `@fast-check/vitest` (devDependency only, ~150KB)
- No production dependency changes

## Success Criteria

- [ ] `vitest bench --run` exits 0 with all 5 benchmarks reporting sub-ms targets
- [ ] `vitest run` exits 0 with all 5 property tests passing across 100+ random runs
- [ ] `vitest bench` added to CI pipeline (no regression >10% between versions per MEASUREMENT.md §1.2)
