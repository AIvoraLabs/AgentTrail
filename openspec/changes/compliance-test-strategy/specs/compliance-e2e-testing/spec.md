# Compliance E2E Testing

**Domain**: `compliance-e2e-testing` · **Status**: New · **EU AI Act**: Art. 12 (traceability), Art. 26(6) (retention)

## Purpose

Prove AgentTrail generates immutable audit receipts under real provider and production conditions. Each suite maps to a compliance guarantee auditable from spec to test. Zero production code modified.

## Requirements

### Helper Classes

`TestHarness` encapsulates setup/cleanup. `ReceiptVerifier` provides static assertions. `AgentSimulator` wraps real LLMs via `wrapOpenAI` (skip if `GROQ_API_KEY` absent). `FormatGenerator` provides edge-case data. Zero runtime deps.

| Scenarios | Expect |
|-----------|--------|
| `new TestHarness('suite')` | Unique temp dir |
| `harness.createAuditor('a1', {storage})` | `AuditReceipt` + `JSONLFileWriter` |
| `createAuditor('a1', {redactConfig})` | PII redaction |
| `createAuditor('a1', {complianceMode:'strict'})` | Strict mode |
| `harness.readReceipts('a1')` | All agent receipts |
| `harness.cleanup()` | Temp dir removed |
| `hasValidStructure(r)` | UUIDv7, 64-char hash, sig, timestamps |
| `chainIsIntact(rs)` | `verifyChain` true |
| `piiIsRedacted(r, ['e@m.c'])` | Raw PII absent |
| `timestampsAreMonotonic(rs)` | `monotonic_ns` increasing |
| `signaturesAreValid(rs, pk)` | Ed25519 sigs verify |
| `new AgentSimulator(groq, {agentId,storage})` | Wrapped client, pre-flight passes |
| `sim.legalConsultation('review')` | Legal system prompt |
| `sim.hrDecision({candidate,role})` | HR system prompt |
| `sim.financialAdvice({scenario,risk})` | Financial system prompt |
| No API key configured | Constructor ok, methods throw |
| `emailVariants()` | 8+ formats |
| `phoneFormats()` | 10+ intl patterns |
| `nestedJson(5)` | Depth 5 object |
| `markdownWithCode()` | Fences + inline |
| `unicodeStrings()` | CJK, emoji, accents |

### Suite 8 — Real LLM E2E

`wrapOpenAI` + real Groq → `AuditReceipt` → `JSONLFileWriter` → valid chain. Skip if `GROQ_API_KEY` absent. 60s timeout.

| Scenarios | Expect |
|-----------|--------|
| Simple Q&A → receipt → chain | Intact, output non-empty |
| Streaming (`stream:true`) | Receipt matches chunks |
| Tool calling | `tool_calls` populated |
| Multi-turn (3 calls) | 3 receipts, `prev_hash` linked |
| Invalid key + strict mode | `ComplianceError` thrown |

### Suite 9 — Concurrency

Proves concurrent `AuditReceipt` writes without data loss or chain corruption.

| Scenarios | Expect |
|-----------|--------|
| 5 agents, 1 record each | Each file has 1 receipt |
| 1 agent, 10 sequential | Chain intact, 10 receipts |
| 10 agents, 5 records each | All chains intact |
| Concurrent writes, same agent | All lines valid JSON |

### Suite 10 — Real-World Formats

Proves redaction handles edge cases, canonicalJSON handles nesting, metadata rejects boundaries.

| Scenarios | Expect |
|-----------|--------|
| Email in markdown link | Redacted |
| 10+ intl phone formats | Gap: defaults insufficient |
| Custom phone redact rule | All redacted |
| Credit card with spaces | Redacted |
| Nested JSON (depth 5) | Receipt recorded |
| Array 150 items in metadata | `TypeError` |
| Unicode/emoji in I/O | Preserved, hash valid |
| Multiline code block | Preserved, chain valid |
| 50 metadata keys (limit) | Passes |
| 51 metadata keys | `TypeError` |
| String > 1000 chars | `TypeError` |
| `__proto__` key | `TypeError` |

### Suite 11 — Production Volume

500+ receipts without data loss or memory issues. Skip unless `RUN_STRESS_TESTS=1`. 120s timeout.

| Scenarios | Expect |
|-----------|--------|
| 500 receipts, 3 agents | Each file has 500 |
| `verifyChain` on 1000 | True < 5s |
| 1000 receipts file | < 5 MB |
| Heap growth at 1000 | < 50 MB |
| Tamper receipt 500 | Chain broken at 500 |

### Suite 12 — ICP Multi-Provider

3 ICP scenarios (Legora, Bizneo, Velliv) with independent chains. Skip if `GROQ_API_KEY` absent.

| Scenarios | Expect |
|-----------|--------|
| Legora: legal AI + tools | `tool_calls`, chain intact |
| Bizneo HR: PII + redaction | Email redacted, chain intact |
| Velliv financial: policy check | Policy in receipt, chain intact |
| Verify all 3 agent chains | All independent chains valid |
