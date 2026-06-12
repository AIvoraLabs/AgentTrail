# @aivoralabs/agenttrail-openai

[![npm version](https://img.shields.io/npm/v/@aivoralabs/agenttrail-openai?color=CB3837&logo=npm)](https://www.npmjs.com/package/@aivoralabs/agenttrail-openai)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![EU AI Act](https://img.shields.io/badge/EU_AI_Act-Art._12-003399)](https://artificialintelligenceact.eu/article/12/)

**Drop-in OpenAI SDK wrapper for EU AI Act Article 12 compliance. Zero code changes.**

Automatically generates tamper-proof audit receipts for every `chat.completions.create` call — non-streaming, streaming, and tool calls.

Part of the [AgentTrail monorepo](https://github.com/AIvoraLabs/agenttrail). Requires [`@aivoralabs/agenttrail`](https://www.npmjs.com/package/@aivoralabs/agenttrail) as a peer dependency.

---

## Features

- ✅ Non-streaming completions (`stream: false`)
- ✅ Streaming completions (`stream: true`)
- ✅ Tool calls / function calling
- ✅ Compliance modes: `strict` (fail-closed) and `permissive`
- ✅ Pre-flight compliance gate in strict mode
- ✅ PII redaction before storage
- ✅ Works with any OpenAI-compatible API (Groq, Cerebras, Gemini)

---

## Installation

```bash
npm install @aivoralabs/agenttrail-openai @aivoralabs/agenttrail
```

---

## Quick Start

```typescript
import OpenAI from 'openai';
import { wrapOpenAI } from '@aivoralabs/agenttrail-openai';
import { JSONLFileWriter } from '@aivoralabs/agenttrail';

const originalClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const client = wrapOpenAI(originalClient, {
  agentId: 'legal-ai',
  storage: new JSONLFileWriter('./audit-logs'),
  complianceConfig: { mode: 'strict' },
});

// Every call automatically generates a tamper-proof receipt
const result = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Review contract clause 3.2' }],
});

// Receipt is already written to ./audit-logs/audit-log-legal-ai-2026-06.jsonl
console.log(result.choices[0].message.content);
```

---

## Compliance Modes

### `strict` (default — production)

Fail-closed: if receipt generation fails, the agent does NOT respond.

```typescript
const client = wrapOpenAI(openai, {
  agentId: 'production-agent',
  storage: new JSONLFileWriter('./audit-logs'),
  complianceConfig: { mode: 'strict' },
});
```

### `permissive` (development / QA)

Logs warnings but allows the agent to respond even if receipt generation fails.

```typescript
const client = wrapOpenAI(openai, {
  agentId: 'dev-agent',
  storage: new JSONLFileWriter('./audit-logs'),
  complianceConfig: { mode: 'permissive' },
});
```

---

## Pre-flight Compliance Gate (Strict Mode)

In `strict` mode, AgentTrail performs a dry-run before calling the LLM:

1. Validates the interaction structure
2. Verifies the storage backend is writable
3. Checks Ed25519 key availability

If the pre-flight fails, the agent call is blocked entirely — no request is sent to the LLM.

---

## Streaming Support

```typescript
const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Summarize Article 12' }],
  stream: true,
});

let fullResponse = '';
for await (const chunk of stream) {
  fullResponse += chunk.choices[0]?.delta?.content || '';
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}

// When the stream completes, a receipt is automatically generated
// with the full accumulated response.
```

---

## OpenAI-Compatible APIs

Works with any provider that implements the OpenAI `/v1/chat/completions` endpoint:

| Provider | Base URL | Status |
|----------|----------|--------|
| **OpenAI** | (default) | Fully supported |
| **Groq** | `https://api.groq.com/openai/v1` | Tested in E2E suite |
| **Cerebras** | `https://api.cerebras.ai/v1` | Compatible |
| **Gemini** | Via OpenAI-compatible endpoint | Compatible |

```typescript
const groqClient = wrapOpenAI(
  new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY }),
  { agentId: 'groq-agent', storage: new JSONLFileWriter('./audit-logs') }
);
```

---

## API Reference

### `wrapOpenAI(client, options)`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `agentId` | `string` | Yes | Agent identifier |
| `storage` | `IReceiptStorage` | Yes | Receipt storage backend |
| `complianceConfig.mode` | `'strict' \| 'permissive'` | No | Default: `'strict'` |
| `complianceConfig.redactPII` | `boolean` | No | Enable PII redaction |
| `keyStore` | `IKeyStore` | No | Ed25519 key management |

Returns a proxy of the original OpenAI client with the same interface.

---

## Links

- 🌐 [agenttrail.aivoralabs.org](https://agenttrail.aivoralabs.org)
- 🐙 [GitHub: AiVoraLabs/agenttrail](https://github.com/AiVoraLabs/agenttrail)
- 📄 [EU AI Act Article 12](https://artificialintelligenceact.eu/article/12/)

**License:** MIT
