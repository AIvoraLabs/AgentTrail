# OpenAI Integration Specification

**Domain**: `openai-integration` · **Status**: Active · **EU AI Act**: Art. 12 (audit trail continuity)

## Purpose

Wrap the OpenAI SDK's `chat.completions.create` to produce signed audit receipts for every interaction. The wrapper MUST fail-closed in strict mode — no receipt, no response. Streaming MUST accumulate full output and record it on completion.

## Requirements

### Requirement: Compliance Mode Configuration

`OpenAIConfig` MUST expose `complianceMode?: ComplianceMode` (default: `'strict'`), `complianceConfig?: ComplianceConfig` for callback-based error handling, and `storage?: StorageBackend` for persistent audit trail storage. Pre-flight check MUST validate auditor availability in strict mode. `storage` MUST be passed to `AuditReceipt` constructor. (Art. 12 §2 — continuous verifiability, Art. 26(6) — retention)

| # | Scenario | Expect |
|---|----------|--------|
| 1 | `complianceMode` omitted, call succeeds | Defaults to `'strict'`, receipt recorded |
| 2 | `complianceMode: 'strict'`, pre-flight fails | `ComplianceError` thrown, agent never calls OpenAI |
| 3 | `complianceMode: 'permissive'`, pre-flight fails | Warning logged via `onComplianceError` callback, call proceeds |
| 4 | `complianceConfig.onComplianceError` provided | Callback invoked on receipt failures, never thrown |
| 5 | `storage` provided, strict mode, success | Receipt recorded AND persisted to JSONL |
| 6 | `storage` + strict mode + write failure | `ComplianceError` thrown |

### Requirement: Non-Streaming Receipt Recording

For non-streaming calls (`stream` undefined or false), the wrapper MUST record input/output/tokens/model/provider and timestamps. Output MUST come from `choices[0].message.content`; tool calls from `choices[0].message.tool_calls`. (Art. 12 §1 — record per interaction)

| # | Scenario | Expect |
|---|----------|--------|
| 7 | Non-streaming success, `complianceMode: 'strict'` | Receipt recorded, result returned unchanged |
| 8 | Non-streaming success, `complianceMode: 'permissive'` | Receipt recorded, result returned unchanged |
| 9 | `record()` throws in strict mode | `ComplianceError` propagates, agent response blocked |
| 10 | `record()` throws in permissive mode | Warning logged, result returned (backward compatible) |
| 11 | No messages in body | Receipt recorded with empty `input` string, no crash |
| 12 | `usage` missing from response | Receipt recorded with `tokensPrompt`/`tokensCompletion` omitted |

### Requirement: Streaming Support

When `body.stream === true`, the wrapper MUST consume the `Stream<ChatCompletionChunk>` via `for await...of`, accumulate `choices[0].delta.content` and `choices[0].delta.tool_calls`, then record the full receipt after stream exhaustion. (Art. 12 §1 — continuous record for streamed output)

| # | Scenario | Expect |
|---|----------|--------|
| 13 | `stream: true`, strict mode, success | Full accumulated content recorded in receipt, stream consumed completely |
| 14 | `stream: true`, strict mode, receipt `record()` fails | `ComplianceError` thrown after stream fully consumed |
| 15 | `stream: true`, permissive mode, receipt `record()` fails | Warning logged, stream consumed, partial receipt recorded |
| 16 | `stream: true`, OpenAI stream throws mid-chunk in strict mode | Error propagates, no receipt recorded |
| 17 | `stream: true`, OpenAI stream throws mid-chunk in permissive mode | Error propagates, partial accumulated output recorded |
| 18 | `stream: true` with tool calls (delta.tool_calls) | Tool calls accumulated and included in receipt metadata |
| 19 | Empty stream (zero chunks) | Receipt recorded with empty output, finish_reason captured |
| 20 | Final chunk includes `usage` | `tokensPrompt`/`tokensCompletion` set from final chunk usage |
| 21 | Final chunk includes `choices[0].finish_reason` | Finish reason captured in receipt metadata |

### Requirement: Type Safety

The wrapper MUST replace all `any` types with proper OpenAI SDK types. Import ordering MUST follow Biome lint rules. Zero Biome lint errors in `packages/openai/src/index.ts`.

| # | Scenario | Expect |
|---|----------|--------|
| 22 | Type check on `chat.completions.create` params | Uses `ChatCompletionCreateParams` from OpenAI SDK |
| 23 | Type check on stream response | Uses `Stream<ChatCompletionChunk>` |
| 24 | Type check on non-stream response | Uses `ChatCompletion` |
| 25 | Biome lint run on `packages/openai/src/index.ts` | Zero errors, zero warnings |

### Requirement: Test Coverage

Tests MUST verify compliance modes, streaming paths, error handling, and non-streaming regression.

| # | Scenario | Expect |
|---|----------|--------|
| 26 | Strict mode: receipt failure throws | Promise rejected with `ComplianceError` |
| 27 | Permissive mode: receipt failure warns | Promise resolved, `console.warn` or callback invoked |
| 28 | Streaming: full output captured in receipt | Receipt output equals concatenated chunk deltas |
| 29 | Streaming error: proper propagation | Error from stream reaches caller |
| 30 | Non-streaming: existing behavior preserved | Receipt recorded, result matches OpenAI response |
| 31 | Tool calls in streaming: correctly accumulated | All `delta.tool_calls` present in receipt metadata |
| 32 | Edge: single-chunk stream | Receipt recorded with single chunk content |
| 33 | Edge: stream with tool calls only (no content) | Receipt output empty, tool calls in metadata |
| 34 | Pre-flight check: strict mode blocks on auditor failure | `ComplianceError` thrown before `originalCreate` called |
