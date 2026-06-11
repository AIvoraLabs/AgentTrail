# Tasks: Compliance Test Strategy

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~530 (all new files, zero production changes) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (helpers + deps) → PR 2 (all 5 suites) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Helpers + types + deps (~250 lines) | PR 1 | Foundation: types, harness, verifier, simulator, formatter, barrel, package.json |
| 2 | All 5 E2E suites (~430 lines) | PR 2 | Stacked on PR 1. Suites 8-12, imports from Unit 1 helpers |

## Phase 1: Foundation — Types, Harness, Verifier

- [x] 1.1 Create `packages/core/__tests__/helpers/types.ts` — export interfaces: `AuditorOpts`, `AgentConfig`, `CandidateData`, `InvestmentScenario`. JSDoc with `@example` on each.
- [x] 1.2 Create `packages/core/__tests__/helpers/test-harness.ts` — `TestHarness` class. Methods: `createAuditor(agentId, opts)`, `readReceipts(agentId)`, `cleanup()`. JSDoc `@param`, `@returns`, `@throws`, `@example` on every public method.
- [x] 1.3 Create `packages/core/__tests__/helpers/receipt-verifier.ts` — `ReceiptVerifier` class. Static methods: `hasValidStructure(r)`, `chainIsIntact(rs)`, `piiIsRedacted(r, pii)`, `timestampsAreMonotonic(rs)`, `signaturesAreValid(rs, pk)`. Each uses `@aivoralabs/agenttrail` internals.
- [x] 1.4 Create `packages/core/__tests__/helpers/index.ts` — barrel re-export of types, TestHarness, ReceiptVerifier, AgentSimulator, FormatGenerator.

## Phase 2: Data & Simulation

- [x] 2.1 Create `packages/core/__tests__/helpers/format-generator.ts` — `FormatGenerator` class. Static methods: `emailVariants()` (8+), `phoneFormats()` (10+), `nestedJson(depth)`, `markdownWithCode()`, `unicodeStrings()`. JSDoc on every method.
- [x] 2.2 Create `packages/core/__tests__/helpers/agent-simulator.ts` — `AgentSimulator` class. Constructor takes Groq client + AgentConfig. Methods: `legalConsultation(topic)`, `hrDecision(candidate, role)`, `financialAdvice(scenario, riskLevel)`. Throws if no API key. JSDoc on every method.

## Phase 3: Dependencies

- [x] 3.1 Add 4 devDependencies to `packages/core/package.json`: `@faker-js/faker`, `fast-check`, `proper-lockfile`, `async-mutex`.
- [x] 3.2 Run `pnpm install` from repo root.

## Phase 4: Suite 8 — Real LLM E2E

- [ ] 4.1 Create `packages/core/__tests__/e2e/real-llm-e2e.test.ts` — Suite 8: 5 tests. Skip all if `GROQ_API_KEY` absent. 60s timeout. Tests: simple Q&A receipt chain, streaming, tool calling, multi-turn (3 calls linked), invalid key + strict mode throws `ComplianceError`. Imports: TestHarness, ReceiptVerifier, AgentSimulator.

## Phase 5: Suite 9 — Concurrency

- [ ] 5.1 Create `packages/core/__tests__/e2e/concurrency.test.ts` — Suite 9: 4 tests. No API key needed. Tests: 5 agents 1 record each, 1 agent 10 sequential, 10 agents 5 records each, concurrent writes same agent. Imports: TestHarness, ReceiptVerifier.

## Phase 6: Suite 10 — Real-World Formats

- [ ] 6.1 Create `packages/core/__tests__/e2e/real-formats.test.ts` — Suite 10: 12 tests. No API key needed. Tests: email in markdown, 10+ intl phone formats, custom phone rule, credit card, nested JSON depth 5, array 150 items, unicode/emoji, multiline code, 50 metadata keys, 51 keys, string >1000 chars, `__proto__` key. Imports: TestHarness, ReceiptVerifier, FormatGenerator.

## Phase 7: Suite 11 — Volume Stress

- [ ] 7.1 Create `packages/core/__tests__/e2e/volume-stress.test.ts` — Suite 11: 5 tests. Skip unless `RUN_STRESS_TESTS=1`. 120s timeout. Tests: 500 receipts 3 agents, verifyChain 1000 <5s, 1000 receipts <5MB, heap growth <50MB, tamper at receipt 500. Imports: TestHarness, ReceiptVerifier.

## Phase 8: Suite 12 — ICP Multi-Provider

- [ ] 8.1 Create `packages/core/__tests__/e2e/icp-multi-provider.test.ts` — Suite 12: 4 tests. Skip if no `GROQ_API_KEY`. Tests: Legora legal AI + tools, Bizneo HR PII + redaction, Velliv financial policy, verify all 3 chains independent. Imports: TestHarness, ReceiptVerifier, AgentSimulator.

## Phase 9: Verification

- [ ] 9.1 Run `pnpm test` — all 169 existing tests pass, all new suites pass (or skip gracefully).
- [ ] 9.2 Verify JSDoc on every public method of TestHarness, ReceiptVerifier, AgentSimulator, FormatGenerator.
- [ ] 9.3 Confirm zero production code changes: `git diff --name-only packages/core/src/` returns nothing.
