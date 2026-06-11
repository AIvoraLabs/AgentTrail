# AgentTrail

**Compliance receipts for AI agents — EU AI Act Article 12 audit trails.**

AgentTrail is an open-core SDK that automatically captures every AI agent interaction and generates **tamper-proof audit receipts**. Built for mid-market European companies (Legora, Bizneo HR, Velliv) that need to comply with the EU AI Act without paying €50K+/year for OneTrust.

```
LLM Call → AgentTrail intercepts → SHA-256 hash chain → Ed25519 signature → JSONL file → Auditor verifies
```

---

## Why AgentTrail?

If you deploy AI agents in the EU, **Article 12** requires:

| Requirement | AgentTrail |
|-------------|-----------|
| Automatic recording of every interaction | `wrapOpenAI()` / `auditReceiptMiddleware()` — zero code changes |
| Tamper-proof logs | SHA-256 hash chain + Ed25519 digital signatures |
| Start/end timestamps per interaction | `SecureClock` — monotonic + drift detection |
| PII redaction before storage | Regex-based `redactPII()` — configurable rules |
| Human oversight identification | `human_verifier` field in every receipt |
| 6-month minimum retention | JSONL monthly rotation (`audit-log-{agentId}-{YYYY-MM}.jsonl`) |
| Independent verifiability | CLI works 100% offline — no server needed |

**Target:** European mid-market (50-500 employees) with AI agents in production. LegalTech, HR Tech, InsurTech, FinTech, Logistics.

**Pricing:** $99/agent/month (vs OneTrust $50K+/year, FireTail $2K-$4K/month).

---

## Packages

| Package | npm | Description | Production deps |
|---------|-----|-------------|----------------|
| `@aivoralabs/agenttrail` | core | Hash chain, receipt builder, Ed25519 signer, PII redaction, storage, metadata validation | `@noble/ed25519` (5KB, Cure53 audit) + `uuid` (RFC 9562) + `zod` |
| `@aivoralabs/agenttrail-openai` | openai wrapper | Intercepts `chat.completions.create` — streaming + non-streaming + tool calls + compliance modes | `@aivoralabs/agenttrail` + `openai` |
| `@aivoralabs/agenttrail-vercel` | vercel ai middleware | Intercepts `generateText`/`streamText` — compliance modes, pre-flight gate | `@aivoralabs/agenttrail` + `ai` |
| `@aivoralabs/agenttrail-cli` | cli | `audit-receipt verify` — chain integrity, signature verification, HTML audit report | `@aivoralabs/agenttrail` |

---

## Quick Start

### 1. Core SDK — Manual receipt recording

```bash
npm install @aivoralabs/agenttrail
```

```typescript
import { AuditReceipt, JSONLFileWriter } from '@aivoralabs/agenttrail';

const auditor = new AuditReceipt({
  agentId: 'my-agent',
  storage: new JSONLFileWriter('./audit-logs'),
  complianceConfig: { mode: 'strict' },   // fail-closed by default
  redactConfig: { rules: [                // PII redaction
    { pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, replacement: '[EMAIL REDACTED]' },
  ]},
});

const receipt = await auditor.record({
  input: 'Evaluate candidate John (john@email.com) for Senior Developer',
  output: 'Candidate meets 8/10 criteria.',
  model: 'gpt-4o',
  provider: 'openai',
  tokensPrompt: 45,
  tokensCompletion: 120,
  toolCalls: [{ toolName: 'check_resume', toolInput: 'resume.pdf', toolOutput: 'Match', toolExecutionMs: 800, toolStatus: 'success' }],
  policyCheck: { policyName: 'EU-AI-ACT-HIGH-RISK', status: 'pass', details: 'Article 12 compliance verified' },
  metadata: { session_id: 'conv-001', turn: 1 },
});

// Verificación
const receipts = await auditor.exportJSON();
const result = await AuditReceipt.verifyChain(receipts);
console.log('Chain intact:', result.valid); // true
```

### 2. OpenAI SDK — Automatic interception

```bash
npm install @aivoralabs/agenttrail-openai
```

```typescript
import OpenAI from 'openai';
import { wrapOpenAI } from '@aivoralabs/agenttrail-openai';
import { JSONLFileWriter } from '@aivoralabs/agenttrail';

const client = wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), {
  agentId: 'legal-ai-assistant',
  storage: new JSONLFileWriter('./audit-logs'),
  complianceMode: 'strict',              // fail-closed (default)
  redactConfig: { rules: [...] },
});

// ¡Cada llamada genera un receipt automáticamente!
const result = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Review contract clause 3.2' }],
  tools: [{ type: 'function', function: { name: 'check_clause', parameters: {...} } }],
  stream: true,  // también funciona con streaming
});
```

**Compliance modes:**

| Mode | Behavior | Use case |
|------|----------|----------|
| `strict` | Receipt fails → agent does NOT respond (throws `ComplianceError`) | Production — EU AI Act Art. 12 |
| `permissive` | Receipt fails → warning logged, agent responds | Development / QA |

**Pre-flight gate:** In strict mode, a dry-run receipt is created BEFORE calling the LLM. If the compliance system itself fails, the LLM is never called.

### 3. Vercel AI SDK — Middleware

```bash
npm install @aivoralabs/agenttrail-vercel
```

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { auditReceiptMiddleware } from '@aivoralabs/agenttrail-vercel';
import { JSONLFileWriter } from '@aivoralabs/agenttrail';

const { wrapGenerate, wrapStream } = auditReceiptMiddleware({
  agentId: 'vercel-agent',
  storage: new JSONLFileWriter('./audit-logs'),
  complianceConfig: { mode: 'strict' },
});

// wrapGenerate: non-streaming
const result = await wrapGenerate!({
  doGenerate: () => generateText({ model: openai('gpt-4o'), prompt: 'Hello' }),
  params: { prompt: 'Hello' },
});

// wrapStream: streaming
const { stream } = await wrapStream!({
  doStream: () => streamText({ model: openai('gpt-4o'), prompt: 'Count to 5' }),
  params: { prompt: 'Count to 5' },
});
```

### 4. CLI — Auditor verification

```bash
npm install -g @aivoralabs/agenttrail-cli
```

```bash
# Basic chain verification
audit-receipt verify audit-log.jsonl

# With signature verification
audit-receipt verify audit-log.jsonl --verify-signatures --public-key <base64-public-key>

# Generate HTML audit report (for auditors)
audit-receipt verify audit-log.jsonl --output report.html --entity-name "Legora AB"

# Generate JSON report (for programmatic use)
audit-receipt verify audit-log.jsonl --output report.json
```

---

## The Audit Trail (How it works)

### Receipt structure

Every interaction generates one `Receipt` with:

```
receipt_id:       uuidv7 (RFC 9562, time-sortable)
agent_id:         your agent identifier
prev_hash:        previous receipt's hash (null if genesis)
hash:             SHA-256(prev_hash || canonicalJSON(payload))
signature:        Ed25519(hash) — signed with your private key
payload:
  ├ input:        user's question (PII-redacted if configured)
  ├ output:       LLM response
  ├ input_hash:   SHA-256 of original input (for integrity without storing PII)
  ├ timestamps:   start + end with monotonic_ns + drift detection
  ├ tokens:       prompt + completion + total
  ├ model/        model identifier and provider
  ├ tool_calls:   tools invoked (name, input, output, duration)
  ├ policy_check: regulatory checks applied
  ├ key_id:       which key signed this receipt
  └ human_verifier: who reviewed (Art. 14 human oversight)
metadata:         custom key-value data (max 50 keys, depth ≤ 4)
```

### Hash chain

```
H₀ = SHA-256("AGENT_AUDIT_RECEIPT_V1" || genesis_timestamp)
    │
    ▼
Receipt₀ → prev_hash: null, hash: H₀
    │
    ▼
Receipt₁ → prev_hash: H₀, hash: SHA-256(H₀ || canonicalJSON(payload₁))
    │
    ▼
Receipt₂ → prev_hash: H₁, hash: SHA-256(H₁ || canonicalJSON(payload₂))
    ⋮
```

Any modification to any receipt breaks the chain. `verifyChain()` detects the exact index of the break.

### Storage format

```
audit-logs/
├── audit-log-legora-legal-ai-2026-06.jsonl    ← one JSON line per receipt
├── audit-log-legora-legal-ai-2026-07.jsonl    ← monthly rotation
├── audit-log-bizneo-hr-agent-2026-06.jsonl
└── ...
```

---

## Auditor Workflow (Demo)

### 1. Generate real receipts

```bash
cd packages/core
npx vitest run __tests__/e2e/icp-multi-provider.test.ts --reporter=verbose
```

This runs 4 tests with a real Groq LLM, simulating:
- **Legora** 🇸🇪: legal AI with tool calling (2915ms)
- **Bizneo HR** 🇪🇸: HR AI with PII redaction (2250ms)
- **Velliv** 🇩🇰: financial AI with policy checks (2203ms)
- **Multi-agent**: verifyChains validates all 3 independently (7640ms)

Each test generates a real SHA-256 hash chain, real Ed25519 signatures, and real JSONL files.

### 2. Generate the audit report

```bash
audit-receipt verify audit-log.jsonl --output audit-report.html --entity-name "Legora AB"
```

Open `audit-report.html` in a browser. The report:
- Shows a large **✓ ÍNTEGRO** (green) or **✗ ALTERADO** (red) verdict badge
- Lists every agent with interaction count, period, and status
- Shows each interaction: timestamp, truncated input/output, duration, tools used
- Collapsible technical details: receipt IDs, SHA-256 hashes, Ed25519 signatures, key IDs
- Includes the exact CLI command for reproducibility
- Has a space for the auditor's signature
- Auto-adapts to dark mode
- Is print-ready with page breaks between agents

### 3. Verify independently

The report footer includes the exact command to regenerate it. Any auditor can:

```bash
# Copy the command from the report footer
audit-receipt verify original-audit-log.jsonl --output independent-report.html
```

If the hash doesn't match, the chain was tampered.

---

## Testing Strategy

180 tests across 12 suites — including real LLM calls (Groq), concurrency, and volume stress.

### Test files

```
packages/core/__tests__/
├── helpers/                    # OOP test infrastructure (reusable)
│   ├── types.ts                # Shared interfaces
│   ├── test-harness.ts         # Temp dirs, auditor creation, cleanup
│   ├── receipt-verifier.ts     # Static compliance assertions
│   ├── agent-simulator.ts      # Wraps real Groq client for ICP scenarios
│   ├── format-generator.ts     # Edge-case data (emails, phones, unicode)
│   └── index.ts                # Barrel exports
├── e2e/
│   ├── real-llm-e2e.test.ts    # Suite 8: Real Groq API — 6 tests
│   ├── concurrency.test.ts     # Suite 9: 10 agents simultaneously — 4 tests
│   ├── real-formats.test.ts    # Suite 10: PII, unicode, depth — 12 tests
│   ├── volume-stress.test.ts   # Suite 11: 1000+ receipts — 5 tests (opt-in)
│   └── icp-multi-provider.test.ts # Suite 12: Legora/Bizneo/Velliv — 4 tests
├── hash-chain.test.ts          # Core hash chain tests
├── receipt.test.ts             # Core receipt tests
├── signer.test.ts              # Ed25519 sign/verify tests
├── redact.test.ts              # PII redaction tests
├── validate.test.ts            # Metadata validation tests
└── ...                         # timestamp, errors, storage, pipeline
```

### Running tests

```bash
# All core tests (unit + E2E with Groq)
pnpm --filter @aivoralabs/agenttrail test

# Groq E2E only (needs GROQ_API_KEY in .env)
cd packages/core && npx vitest run __tests__/e2e/

# Volume stress (opt-in — adds RUN_STRESS_TESTS=1 to .env)
RUN_STRESS_TESTS=1 npx vitest run __tests__/e2e/volume-stress.test.ts

# All packages
pnpm test
```

### Test results

| Suite | Tests | Mock boundary | What it proves |
|-------|-------|---------------|----------------|
| 8 — Real LLM | 6 ✅ | HTTP only | End-to-end with real Groq provider |
| 9 — Concurrency | 4 ✅ | None | 10 agents writing simultaneously |
| 10 — Formats | 12 ✅ | None | PII edge cases, unicode, depth limits |
| 11 — Volume | 5 ✅ | None | 1000+ receipts, heap, file size, tamper |
| 12 — ICP | 4 ✅ | HTTP only | Legora, Bizneo HR, Velliv scenarios |
| Core unit | ~150 ✅ | None | Hash chain, signing, redaction, validation |

**Total: 180 tests — 175 pass (5 skipped = volume, opt-in)**

---

## .env Configuration

Copy `.env.template` to `.env` and fill in at least `GROQ_API_KEY` for E2E tests:

```bash
# Primary — Groq (free, no credit card: https://console.groq.com)
GROQ_API_KEY=gsk_your_key_here

# Optional — multi-provider simulation
CEREBRAS_API_KEY=csk_your_key_here
GEMINI_API_KEY=your_key_here

# Enable volume stress tests (not for CI)
# RUN_STRESS_TESTS=1
```

All 3 providers (Groq, Cerebras, Gemini via OpenAI-compatible endpoint) work with `wrapOpenAI()` — no code changes needed.

---

## EU AI Act Compliance Mapping

| Article | Requirement | AgentTrail feature | Verified by |
|---------|-------------|-------------------|-------------|
| Art. 12(1) | Automatic recording of events | `wrapOpenAI` / `auditReceiptMiddleware` | Suite 8 (real LLM) |
| Art. 12(1) | Tamper-proof logs | SHA-256 hash chain + Ed25591 | Suite 8.4 (multi-turn chain) |
| Art. 12(1) | Start/end timestamps | `SecureClock.now()` — monotonic, drift detection | Suite 1c (timestamps test) |
| Art. 12(1) | Input data reference | `payload.input` with `payload.input_hash` | Suite 1a (pipeline test) |
| Art. 12(1) | Human oversight (Art. 14) | `human_verifier` field | Suite 12.3 (Velliv scenario) |
| Art. 14 | Human oversight | `humanVerifier` in `Interaction` | Suite 12 |
| Art. 26(6) | 6-month retention | Monthly JSONL rotation | Storage spec |
| GDPR Art. 17 | Right to erasure vs immutability | PII redaction via SHA-256 hash before write | Suite 1b (PII redaction) |
| — | Fail-closed on error | `complianceMode: 'strict'` throws `ComplianceError` | Suite 8.5-8.6 (invalid key) |
| — | Independent verifiability | CLI works 100% offline | Suite 4 (CLI verify pipeline) |

---

## Architecture Decisions (Immutable)

- **Hash chain**: LINEAL (SHA-256), no Merkle tree (post-MVP)
- **Runtime**: In-process middleware, not external service
- **PII redaction**: BEFORE immutable log write
- **Fail-closed**: If receipt write fails, agent does NOT respond
- **Receipts**: Self-contained — each receipt has everything needed for verification
- **Storage**: Local filesystem (JSONL), not cloud (post-MVP)

### What's NOT in scope (MVP)

- ❌ No GRC platform, dashboards, or FRIA evaluations
- ❌ No multi-tenancy or SSO
- ❌ No cloud storage (S3, GCS)
- ❌ No LangChain, Anthropic, or Google AI integrations (post-MVP)
- ❌ No Merkle trees (post-MVP)
- ❌ No Roughtime (ADR-002, post-MVP)
- ❌ No Zero Data Retention cloud (ADR-003, post-MVP)

---

## Developing

```bash
# Setup
git clone https://github.com/AiVoraLabs/agenttrail.git
cd agenttrail
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

### Stack

| Technology | Version |
|------------|---------|
| Runtime | Node 22 LTS |
| Language | TypeScript strict (ES2022) |
| Package manager | pnpm (workspaces) |
| Build | tsup (ESM + DTS) |
| Test | Vitest v2 |
| Lint/Format | Biome v1.9 |
| Pipeline | Turbo |

---

## License

MIT © AivoraLabs
