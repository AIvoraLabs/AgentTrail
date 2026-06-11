# Tasks: OpenAI Compliance — Fail-closed & Streaming Support

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150–200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Type safety cleanup | PR 1 | Replace `any` types, fix Biome lint. Foundation for units 2–3. ~20 lines changed. |
| 2 | Compliance mode (fail-closed) | PR 2 | Extend config, pre-flight gate, strict/permissive error handling, remove `.catch(() => {})`. ~60 lines. |
| 3 | Streaming support | PR 3 | Detect `stream: true`, accumulate chunks, record receipt. ~80 lines. Depends on unit 2 for compliance wiring. |

## Phase 1: Type Safety Cleanup

- [x] 1.1 Import `ChatCompletionCreateParams` and `ChatCompletionChunk` from `openai/resources/chat/completions` in `packages/openai/src/index.ts`. Remove unused `AuditReceipt` import if restructured.
- [x] 1.2 Replace `(body: any, options?: any)` with `(body: ChatCompletionCreateParams, options?: RequestOptions)` in the `create` override.
- [x] 1.3 Replace `(result: any)` with `(result: ChatCompletion)` in the `.then()` handler. Remove `as ChatCompletion` cast on line 40.
- [x] 1.4 Run Biome lint on `packages/openai/src/index.ts` — verify zero errors/warnings. Fix any import ordering issues.
- [x] 1.5 **Test**: Run existing 4 tests — all must pass (no behavioral change).

**Spec scenarios covered**: 20, 21, 22, 23 (Type Safety requirement)
**Files**: `packages/openai/src/index.ts`

## Phase 2: Compliance Mode (Fail-closed)

- [x] 2.1 Extend `OpenAIConfig` in `packages/openai/src/index.ts` with `complianceMode?: ComplianceMode` and `complianceConfig?: ComplianceConfig`. Import both from `@aivoralabs/agenttrail`.
- [x] 2.2 Add pre-flight gate: instantiate `AuditReceipt` with `complianceConfig`, call `record()` with synthetic `[preflight]` payload. On failure in strict mode → throw `ComplianceError`. In permissive → `console.warn` via `onComplianceError` callback.
- [x] 2.3 Replace `.catch(() => {})` with compliance-mode-aware handler: strict → `throw new ComplianceError(...)`, permissive → invoke `onComplianceError` callback or `console.warn`.
- [x] 2.4 Default `complianceMode` to `'strict'` when omitted (spec scenario 1).
- [x] 2.5 **Test — Strict mode receipt failure** (spec 7, 24): Mock `AuditorReceipt.record()` to throw. Verify `ComplianceError` propagates. File: `packages/openai/__tests__/index.test.ts`.
- [x] 2.6 **Test — Permissive mode receipt failure** (spec 8, 25): Mock `record()` to throw. Verify result returned, `console.warn` or callback invoked.
- [x] 2.7 **Test — Pre-flight strict blocks** (spec 2, 32): Mock pre-flight `record()` to throw. Verify `ComplianceError` thrown before `originalCreate` called.
- [x] 2.8 **Test — Default strict mode** (spec 1): Call `wrapOpenAI` with no `complianceMode`. Verify receipt recorded on success.

**Spec scenarios covered**: 1, 2, 3, 4, 5, 6, 7, 8, 32 (Compliance Mode + Non-Streaming Receipt requirements)
**Files**: `packages/openai/src/index.ts`, `packages/openai/__tests__/index.test.ts`

## Phase 3: Streaming Support

- [x] 3.1 Add stream detection: check `body.stream === true` before calling `originalCreate`. If true, branch to streaming path.
- [x] 3.2 Implement streaming accumulation: `for await (const chunk of stream)` accumulate `chunk.choices[0]?.delta?.content` into `fullOutput` string and `chunk.choices[0]?.delta?.tool_calls` into tool calls array.
- [x] 3.3 Extract `usage` from final chunk (`chunk.usage`) and `finish_reason` from `chunk.choices[0]?.finish_reason`.
- [x] 3.4 Record receipt in `finally` block after stream exhaustion: `input` from `body.messages`, `output` from accumulated content, tool calls and finish reason in metadata.
- [x] 3.5 Wire compliance mode to streaming: strict mode → `throw ComplianceError` on `record()` failure after stream consumed; permissive → warn and return partial receipt.
- [x] 3.6 **Test — Streaming success, strict mode** (spec 11): Mock `create` to return async iterable of chunks. Verify receipt contains full accumulated content. File: `packages/openai/__tests__/index.test.ts`.
- [x] 3.7 **Test — Streaming with tool calls** (spec 16): Mock chunks with `delta.tool_calls`. Verify tool calls accumulated in receipt metadata.
- [x] 3.8 **Test — Empty stream** (spec 17): Mock zero chunks. Verify receipt recorded with empty output.
- [x] 3.9 **Test — Stream receipt failure, strict** (spec 12): Mock `record()` to throw after stream consumed. Verify `ComplianceError` propagates.
- [x] 3.10 **Test — Stream receipt failure, permissive** (spec 13): Mock `record()` to throw. Verify warning logged, stream consumed, result returned.

**Spec scenarios covered**: 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 26, 27, 29, 30, 31 (Streaming Support + Test Coverage requirements)
**Files**: `packages/openai/src/index.ts`, `packages/openai/__tests__/index.test.ts`

## Phase 4: Verification

- [x] 4.1 Run full test suite: `pnpm --filter @aivoralabs/agenttrail-openai test` — all tests green.
- [x] 4.2 Run Biome lint: `pnpm biome check packages/openai/src/index.ts` — zero errors.
- [x] 4.3 Run TypeScript type check: `pnpm --filter @aivoralabs/agenttrail-openai typecheck` — no type errors.
- [x] 4.4 Verify non-streaming regression: existing test "should intercept chat.completions.create and return original result" still passes unchanged.
