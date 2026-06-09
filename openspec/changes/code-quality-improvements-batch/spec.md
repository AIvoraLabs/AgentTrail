# Spec: Code Quality & Security Batch

Hardens AgentTrail pre-1.0: 2 bug fixes, 4 security features, 4 conventions.

### BF-1: Recursive canonicalJSON

| Req | Str |
|-----|-----|
| `canonicalJSON(value: unknown)` sorts keys at all depths | MUST |
| Deterministic: same payload, same string | MUST |
| Handles objects, arrays, primitives, null | MUST |
| Performance within 2× JSON.stringify | SHOULD |

Signature: `Record<string, unknown>` → `unknown`.

- `{ z: { b: 2, a: 1 } }` → `{"z":{"a":1,"b":2}}`
- `[{ b: 1 }, { a: 2 }]` → element keys sorted
- Deep payload 1000× → ≤ 2× JSON.stringify

### BF-2: Safe bytesToBase64

| Req | Str |
|-----|-----|
| Accepts Uint8Array 0–500K+ | MUST |
| No spread `...bytes` | MUST NOT |
| Matches current output <125K | MUST |

500K array → valid base64, no RangeError

### ADR-001: ComplianceMode

| Req | Str |
|-----|-----|
| `ComplianceMode = 'strict'|'permissive'`, default strict | MUST |
| Both vercel-ai and openai accept in config | MUST |
| `onComplianceError` callback | MUST |
| Strict: fail-closed | MUST |
| Permissive: fail-open (console.warn) | MUST |
| Zero new deps | MUST |

`AuditReceiptConfig` gains `complianceMode`.

- strict + record() throws → error propagates
- permissive + record() throws → console.warn, continues

### TS-001: SecureClock

| Req | Str |
|-----|-----|
| `now()` returns `{ iso, monotonic_ns, drift_detected }` | MUST |
| Uses `process.hrtime.bigint()` | MUST |
| Detects drift > threshold | MUST |
| `driftThresholdMs` default 1000 | SHOULD |
| Thread-safe | MUST |

Schema v1.1: `ReceiptPayload` adds `monotonic_ns`, `clock_drift_detected`. Genesis hash includes `monotonic_ns`. Old verifiers ignore new fields.

- Drift >100ms → `drift_detected` true
- Sequential calls → second monotonic_ns > first
- 10 concurrent workers → all valid

### SEC-001: Key Rotation

| Req | Str |
|-----|-----|
| `AuditReceipt` manages key stack (array) | MUST |
| `rotateKey()` generates Ed25519, pushes | MUST |
| Signing uses latest key | MUST |
| Verification tries all active keys | MUST |
| Pubkey fingerprint in metadata as `key_id` | MUST |
| Rotation recorded as receipt entry | MUST |
| Max keys configurable (default 3) | MUST |
| `getPublicKey(): string` | MUST |
| Never exposes private key | MUST NOT |

- 2 keys, verify receipt from key 0 → passes
- maxKeys=2, 2 exist, rotateKey() → oldest evicted

### SEC-002: PII Redaction

| Req | Str |
|-----|-----|
| `redactPII(data: unknown, rules?): unknown` | MUST |
| Default rules: email, phone, credit card | MUST |
| `redactRules` overrides defaults | MAY |
| Redaction throw → receipt fails (fail-closed) | MUST |
| `input_hash` = SHA-256 of redacted JSON | MUST |

- `"user@example.com"` → email replaced
- Throwing rule → receipt write rejects

### PQ-1: Custom Error Types

| Req | Str |
|-----|-----|
| 4 error classes with unique codes | MUST |
| Each with `cause?: unknown` | MUST |
| All exported from core | MUST |

Codes: COMPLIANCE_ERROR, SIGNATURE_ERROR, CHAIN_ERROR, CLOCK_ERROR.

- Caught SignatureError → instanceof true, code matches

### PQ-2: Type Safety

| Req | Str |
|-----|-----|
| No `any` in exports or middleware | MUST |
| Public APIs have explicit return types | MUST |

- `tsc --noEmit` → zero implicitAny

### PQ-3: Input Validation

| Req | Str |
|-----|-----|
| Payload fields validated at `record()` entry | MUST |
| Invalid input throws TypeError | MUST |
| Key material validated at construction | MUST |

- Empty `model` → record() throws TypeError

### PQ-4: Regression Tests

| Req | Str |
|-----|-----|
| Each deliverable includes tests catching original issue | MUST |
| All pass `pnpm test` | MUST
