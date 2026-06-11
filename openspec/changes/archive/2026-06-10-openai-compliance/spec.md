# OpenAI Integration Specification

**Domain**: `openai-integration` · **Status**: New · **EU AI Act**: Art. 12 (audit trail continuity)

## Purpose

Wrap the OpenAI SDK's `chat.completions.create` to produce signed audit receipts for every interaction. The wrapper MUST fail-closed in strict mode — no receipt, no response. Streaming MUST accumulate full output and record it on completion.

## Requirements

### Requirement: Compliance Mode Configuration

`OpenAIConfig` MUST expose `complianceMode?: ComplianceMode` (default: `'strict'`) and `complianceConfig?: ComplianceConfig` for callback-based error handling. Pre-flight check MUST validate auditor availability in strict mode. (Art. 12 §2 — continuous verifiability)

| # | Scenario | Expect |
|---|----------|--------|
| 1 | `complianceMode` omitted, call succeeds | Defaults to `'strict'`, receipt recorded |
| 2 | `complianceMode: 'strict'`, pre-flight fails | `ComplianceError` thrown, agent never calls OpenAI |
| 3 | `complianceMode: 'permissive'`, pre-flight fails | Warning logged via `onComplianceError` callback, call proceeds |
| 4 | `complianceConfig.onComplianceError` provided | Callback invoked on receipt failures, never thrown |

### Requirement: Non-Streaming Receipt Recording

For non-streaming calls (`stream` undefined or false), the wrapper MUST record input/output/tokens/model/provider and timestamps. Output MUST come from `choices[0].message.content`; tool calls from `choices[0].message.tool_calls`. (Art. 12 §1 — record per interaction)

| # | Scenario | Expect |
|---|----------|--------|
| 5 | Non-streaming success, `complianceMode: 'strict'` | Receipt recorded, result returned unchanged |
| 6 | Non-streaming success, `complianceMode: 'permissive'` | Receipt recorded, result returned unchanged |
| 7 | `record()` throws in strict mode | `ComplianceError` propagates, agent response blocked |
| 8 | `record()` throws in permissive mode | Warning logged, result returned (backward compatible) |
| 9 | No messages in body | Receipt recorded with empty `input` string, no crash |
| 10 | `usage` missing from response | Receipt recorded with `tokensPrompt`/`tokensCompletion` omitted |

### Requirement: Streaming Support

When `body.stream === true`, the wrapper MUST consume the `Stream<ChatCompletionChunk>` via `for await...of`, accumulate `choices[0].delta.content` and `choices[0].delta.tool_calls`, then record the full receipt after stream exhaustion. (Art. 12 §1 — continuous record for streamed output)

| # | Scenario | Expect |
|---|----------|--------|
| 11 | `stream: true`, strict mode, success | Full accumulated content recorded in receipt, stream consumed completely |
| 12 | `stream: true`, strict mode, receipt `record()` fails | `ComplianceError` thrown after stream fully consumed |
| 13 | `stream: true`, permissive mode, receipt `record()` fails | Warning logged, stream consumed, partial receipt recorded |
| 14 | `stream: true`, OpenAI stream throws mid-chunk in strict mode | Error propagates, no receipt recorded |
| 15 | `stream: true`, OpenAI stream throws mid-chunk in permissive mode | Error propagates, partial accumulated output recorded |
| 16 | `stream: true` with tool calls (delta.tool_calls) | Tool calls accumulated and included in receipt metadata |
| 17 | Empty stream (zero chunks) | Receipt recorded with empty output, finish_reason captured |
| 18 | Final chunk includes `usage` | `tokensPrompt`/`tokensCompletion` set from final chunk usage |
| 19 | Final chunk includes `choices[0].finish_reason` | Finish reason captured in receipt metadata |

### Requirement: Type Safety

The wrapper MUST replace all `any` types with proper OpenAI SDK types. Import ordering MUST follow Biome lint rules. Zero Biome lint errors in `packages/openai/src/index.ts`.

| # | Scenario | Expect |
|---|----------|--------|
| 20 | Type check on `chat.completions.create` params | Uses `ChatCompletionCreateParams` from OpenAI SDK |
| 21 | Type check on stream response | Uses `Stream<ChatCompletionChunk>` |
| 22 | Type check on non-stream response | Uses `ChatCompletion` |
| 23 | Biome lint run on `packages/openai/src/index.ts` | Zero errors, zero warnings |

### Requirement: Test Coverage

Tests MUST verify compliance modes, streaming paths, error handling, and non-streaming regression.

| # | Scenario | Expect |
|---|----------|--------|
| 24 | Strict mode: receipt failure throws | Promise rejected with `ComplianceError` |
| 25 | Permissive mode: receipt failure warns | Promise resolved, `console.warn` or callback invoked |
| 26 | Streaming: full output captured in receipt | Receipt output equals concatenated chunk deltas |
| 27 | Streaming error: proper propagation | Error from stream reaches caller |
| 28 | Non-streaming: existing behavior preserved | Receipt recorded, result matches OpenAI response |
| 29 | Tool calls in streaming: correctly accumulated | All `delta.tool_calls` present in receipt metadata |
| 30 | Edge: single-chunk stream | Receipt recorded with single chunk content |
| 31 | Edge: stream with tool calls only (no content) | Receipt output empty, tool calls in metadata |
| 32 | Pre-flight check: strict mode blocks on auditor failure | `ComplianceError` thrown before `originalCreate` called |
