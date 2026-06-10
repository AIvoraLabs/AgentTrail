# Proposal: OpenAI Compliance — Fail-closed & Streaming Support

## Intent

Two P0 gaps block EU mid-market adoption under AI Act Art. 12:
1. **Fail-open**: `.catch(() => {})` swallows receipt errors — agent responds without audit record
2. **No streaming**: `stream: true` returns `Stream<ChatCompletionChunk>`, silently ignored, zero receipts

Both are illegal under Art. 12 (audit trail must be continuous and verifiable).

## Scope

**In scope:** Add `ComplianceConfig` to `OpenAIConfig`; fix fail-open (strict→throw, permissive→warn); streaming accumulation via `for await...of`; Biome lint fixes (`any` types, imports); 6+ unit tests.

**Out of scope:** Persistent storage; integration tests; LangChain/Anthropic/Google AI integrations.

## Capabilities

### New Capabilities
- `openai-integration`: OpenAI SDK wrapper — compliance modes, streaming, error handling, receipt lifecycle

### Modified Capabilities
None — no existing `openspec/specs/`.

## Approach

1. Extend `OpenAIConfig` with `complianceMode?: ComplianceMode`
2. Pre-flight compliance gate + conditional error propagation
3. Streaming branch: detect `body.stream`, accumulate `choices[0].delta.content`, record in `finally`
4. Replace `any` with proper types; fix import ordering
5. Follow Vercel AI middleware pattern adapted for OpenAI SDK's `Stream` API

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/openai/src/index.ts` | Modified | Compliance modes, streaming, error handling, types |
| `packages/openai/__tests__/index.test.ts` | Modified | 6+ new test cases |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stream edge case missed | Low | Follow OpenAI stream typing; test with real chunk shapes |
| Breaking non-streaming API | Low | Non-streaming path unchanged except error propagation |
| New deps | None | Zero new dependencies |

## Rollback Plan

Revert `packages/openai/src/index.ts` and tests. Non-streaming behavior is unchanged — safe rollback.

## Dependencies

- `@aivoralabs/agenttrail` core — for `ComplianceMode`, `ComplianceConfig`, `ComplianceError`
- OpenAI SDK `^4.0.0` — for `Stream<ChatCompletionChunk>`

## Success Criteria

- [ ] `complianceMode: 'strict'` throws when receipt fails (fail-closed)
- [ ] `complianceMode: 'permissive'` warns, does not throw
- [ ] `stream: true` produces receipt with full accumulated output
- [ ] Stream error in strict mode blocks agent response
- [ ] Non-streaming path produces correct receipt (regression)
- [ ] Zero Biome lint errors in `packages/openai/src/index.ts`
