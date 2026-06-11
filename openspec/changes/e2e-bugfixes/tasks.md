# Tasks: E2E Bugfixes — 4 Compliance Test Failures

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | size:exception |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Fix verifyChains test property access | PR 1 | Single test file fix, ~5 lines |
| 2 | Fix undefined metadata in wrapper + core | PR 1 | 3 files, ~30 lines, includes 2 new tests |
| 3 | Serialize tool_calls to flatten depth | PR 1 | 3 files, ~15 lines |
| 4 | Wrap HTTP errors in ComplianceError | PR 1 | 3 files, ~45 lines, includes 1 new test |
| 5 | Run full test suite + lint | PR 1 | Verification, no code changes |

## Phase 1: Fix verifyChains Test (Bug 4)

- [x] 1.1 In `packages/core/__tests__/e2e/icp-multi-provider.test.ts:171-174`, rename `result` to `chainResult` and change `result.valid` → `chainResult.result.valid`, `result.hashChainIntact` → `chainResult.result.hashChainIntact`

**Spec scenarios**: Suite 12.4 — verifyChains with 3 ICP agents returns valid chains
**Acceptance**: Suite 12.4 passes without assertion errors

## Phase 2: Fix Undefined Metadata (Bug 1)

- [x] 2.1 In `packages/openai/src/index.ts:195-201`, replace `stream_error: streamError ? true : undefined` with `...(streamError ? { stream_error: true } : {})` and `tool_calls: accumulatedToolCalls` with `...(accumulatedToolCalls ? { tool_calls: accumulatedToolCalls } : {})`
- [x] 2.2 In `packages/core/src/receipt.ts`, add `stripUndefinedValues()` helper before `validateMetadata()` in `record()` — iterate entries, skip `value === undefined`
- [x] 2.3 In `packages/core/__tests__/validate.test.ts`, add test: `validateMetadata({ key: undefined })` throws TypeError; add test: cleaned metadata without undefined passes

**Spec scenarios**: Suite 8.2 streaming receipt valid; Suite 8.3 tool calling receipt valid
**Acceptance**: Suites 8.2 and 8.3 pass; new unit tests for undefined rejection pass

## Phase 3: Fix Tool Calls Depth (Bug 2)

- [x] 3.1 In `packages/openai/src/index.ts`, wrap `accumulatedToolCalls` array in `JSON.stringify()` for streaming path (line ~224), and wrap `outputMessage.tool_calls` in `JSON.stringify()` for non-streaming path (line ~243)
- [x] 3.2 In `packages/core/src/receipt.ts`, auto-serialize `metadata.tool_calls` if it's an array: `if (Array.isArray(interaction.metadata?.tool_calls)) { interaction.metadata = { ...interaction.metadata, tool_calls: JSON.stringify(interaction.metadata.tool_calls) }; }`
- [x] 3.3 In `packages/core/src/types.ts`, add JSDoc to `Interaction.metadata` documenting max depth ≤ 4 and advising serialization of provider-specific objects

**Spec scenarios**: Suite 8.3 tool calling metadata passes depth validation
**Acceptance**: Suite 8.3 passes; metadata depth stays ≤ 4 for tool_calls payloads

## Phase 4: Wrap HTTP Errors in ComplianceError (Bug 3)

- [x] 4.1 In `packages/openai/src/index.ts` streaming path, add try/catch around `originalCreate` call: catch re-throws as `ComplianceError` when `complianceMode === 'strict'`
- [x] 4.2 In `packages/openai/src/index.ts` non-streaming path, add `.catch()` at top level of the promise chain: re-throws as `ComplianceError` when `complianceMode === 'strict'`
- [x] 4.3 In `packages/vercel-ai/src/index.ts`, wrap `doGenerate()` in `wrapGenerate` and `doStream()` in `wrapStream` with try/catch: re-throw as `ComplianceError` when `complianceMode === 'strict'`
- [x] 4.4 In `packages/core/__tests__/e2e/real-llm-e2e.test.ts`, add test: invalid API key + strict + streaming → `ComplianceError`

**Spec scenarios**: Suite 8.5 invalid key non-streaming → ComplianceError; new test streaming path
**Acceptance**: Suite 8.5 passes; new streaming invalid-key test passes

## Phase 5: Verification

- [ ] 5.1 Run full test suite (`pnpm -r test`) — confirm 226/226 pass
- [ ] 5.2 Run Biome on modified source files (`packages/openai/src/index.ts`, `packages/core/src/receipt.ts`, `packages/core/src/types.ts`, `packages/vercel-ai/src/index.ts`) — zero lint errors
- [ ] 5.3 Confirm no unintended changes to core hash-chain or signing logic — diff review of `packages/core/src/hash-chain.ts`, `packages/core/src/signer.ts` shows zero changes
