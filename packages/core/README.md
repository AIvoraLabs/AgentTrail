# @aivoralabs/agenttrail

[![npm version](https://img.shields.io/npm/v/@aivoralabs/agenttrail?color=CB3837&logo=npm)](https://www.npmjs.com/package/@aivoralabs/agenttrail)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![EU AI Act](https://img.shields.io/badge/EU_AI_Act-Art._12-003399)](https://artificialintelligenceact.eu/article/12/)

**Cryptographic audit trail SDK for AI agents. EU AI Act Article 12 compliance.**

AgentTrail generates tamper-proof audit receipts for every AI agent interaction. SHA-256 hash chain + Ed25519 signatures. Zero data retention — receipts stay in your infrastructure.

This package (`@aivoralabs/agenttrail`) is the **core SDK**. It provides hash chaining, receipt building, Ed25519 signing, PII redaction, and JSONL storage.

Part of the [AgentTrail monorepo](https://github.com/AIvoraLabs/agenttrail).

**Other packages:**
- [`@aivoralabs/agenttrail-openai`](https://www.npmjs.com/package/@aivoralabs/agenttrail-openai) — OpenAI SDK wrapper
- [`@aivoralabs/agenttrail-vercel`](https://www.npmjs.com/package/@aivoralabs/agenttrail-vercel) — Vercel AI SDK middleware
- [`@aivoralabs/agenttrail-cli`](https://www.npmjs.com/package/@aivoralabs/agenttrail-cli) — CLI auditor tool

---

## Installation

```bash
npm install @aivoralabs/agenttrail
# or
pnpm add @aivoralabs/agenttrail
# or
yarn add @aivoralabs/agenttrail
```

Requires **Node.js >= 22**.

---

## Quick Start

```typescript
import { AuditReceipt, JSONLFileWriter } from '@aivoralabs/agenttrail';

const auditor = new AuditReceipt({
  agentId: 'legal-ai',
  storage: new JSONLFileWriter('./audit-logs'),
  complianceConfig: {
    mode: 'strict',           // fail-closed: agent won't respond if receipt fails
    redactPII: true,          // redact emails, phones, SSNs before storage
  },
});

const receipt = await auditor.record({
  input: 'Review contract clause 3.2 regarding liability limits',
  output: 'Clause 3.2 limits liability to $500,000. Recommend flagging for legal review.',
  model: 'gpt-4o',
  provider: 'openai',
  toolCalls: [],
  metadata: { reviewType: 'contract-analysis' },
});

console.log(receipt.receipt_id); // UUIDv7, time-sortable
console.log(receipt.hash);       // SHA-256 hash
```

---

## API Reference

### `AuditReceipt`

The main class. Constructor options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `agentId` | `string` | Yes | Unique identifier for this agent |
| `storage` | `IReceiptStorage` | Yes | Storage backend (e.g., `JSONLFileWriter`) |
| `complianceConfig` | `ComplianceConfig` | No | Compliance mode and PII settings |
| `keyStore` | `IKeyStore` | No | Ed25519 key management |

**`complianceConfig` options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'strict' \| 'permissive'` | `'strict'` | `strict`: fail-closed. `permissive`: log warning but continue |
| `redactPII` | `boolean` | `false` | Enable PII redaction before storage |

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `record()` | `(interaction: Interaction) => Promise<Receipt>` | Generate a signed receipt for an interaction |
| `getChainLength()` | `() => number` | Number of receipts in the chain |

### `JSONLFileWriter`

Stores receipts as JSONL files with monthly rotation.

```typescript
new JSONLFileWriter(baseDir: string)
```

Files are named `audit-log-{agentId}-{YYYY-MM}.jsonl`.

### `verifyChains()`

```typescript
async function verifyChains(
  receipts: Receipt[],
  options?: { verifySignatures?: boolean; publicKeys?: KeyEntry[] }
): Promise<Map<string, VerifyResult>>
```

Verifies hash chain integrity and optionally Ed25519 signatures for one or more agents.

### `redactPII()`

```typescript
function redactPII(
  text: string,
  config?: RedactConfig
): { redacted: string; found: string[] }
```

Configurable PII redaction with regex rules. Default rules cover emails, phones, SSNs, credit cards.

---

## Receipt Structure

```typescript
interface Receipt {
  receipt_id: string;        // UUIDv7, time-sortable (RFC 9562)
  agent_id: string;          // Agent identifier
  prev_hash: string | null;  // Hash of previous receipt (null = genesis)
  hash: string;              // SHA-256(prev_hash || canonicalJSON(payload))
  signature: string;         // Ed25519 signature of hash
  payload: {
    input: string;           // PII-redacted if configured
    output: string;          // LLM response
    input_hash: string;      // SHA-256 of original input (pre-redaction)
    timestamp_start: string; // ISO 8601 - interaction start
    timestamp_end: string;   // ISO 8601 - response received
    tokens: { prompt: number; completion: number; total: number };
    model: string;           // e.g., 'gpt-4o'
    provider: string;        // e.g., 'openai'
    tool_calls: ToolCall[];  // Function calling records
    policy_check: PolicyCheck | null; // Compliance gate result
    key_id: string;          // Ed25519 key identifier
    human_verifier: string | null; // Art. 14 human oversight
  };
  metadata: Record<string, unknown>; // Max 50 keys, depth ≤ 4
}
```

---

## Hash Chain Algorithm

Each receipt's hash is computed as:

```
H₀ = SHA-256(canonicalJSON(Receipt₀.payload))
H₁ = SHA-256(H₀ || canonicalJSON(Receipt₁.payload))
H₂ = SHA-256(H₁ || canonicalJSON(Receipt₂.payload))
...
```

`canonicalJSON` recursively sorts object keys before serialization — guaranteeing deterministic output across any JavaScript engine.

Any modification to a receipt changes its hash and breaks the entire subsequent chain. Verify with:

```typescript
import { verifyChains } from '@aivoralabs/agenttrail';

const result = await verifyChains(receipts);
// { hashChainIntact: true, signaturesValid: true, verifiedSignatures: 150 }
```

---

## Error Handling

| Error | When |
|-------|------|
| `ComplianceError` | Strict mode: receipt generation failed |
| `ValidationError` | Invalid interaction input |
| `StorageError` | JSONL write/read failure |
| `KeyStoreError` | Ed25519 key generation failure |

In `strict` mode, `ComplianceError` prevents the agent from responding (fail-closed). In `permissive` mode, it's logged as a warning.

---

## Links

- 🌐 [agenttrail.aivoralabs.org](https://agenttrail.aivoralabs.org)
- 🐙 [GitHub: AiVoraLabs/agenttrail](https://github.com/AIvoraLabs/agenttrail)
- 📄 [EU AI Act Article 12](https://artificialintelligenceact.eu/article/12/)

**License:** MIT
