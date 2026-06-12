# @aivoralabs/agenttrail-vercel

[![npm version](https://img.shields.io/npm/v/@aivoralabs/agenttrail-vercel?color=CB3837&logo=npm)](https://www.npmjs.com/package/@aivoralabs/agenttrail-vercel)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![EU AI Act](https://img.shields.io/badge/EU_AI_Act-Art._12-003399)](https://artificialintelligenceact.eu/article/12/)

**Vercel AI SDK middleware for EU AI Act Article 12 compliance.**

Wraps `generateText` and `streamText` with automatic cryptographic audit receipts. No code changes — middleware pattern.

Part of the [AgentTrail monorepo](https://github.com/AIvoraLabs/agenttrail). Requires [`@aivoralabs/agenttrail`](https://www.npmjs.com/package/@aivoralabs/agenttrail) and [`ai`](https://www.npmjs.com/package/ai) (Vercel AI SDK) as peer dependencies.

---

## Features

- ✅ `generateText` — automatic receipts for non-streaming completions
- ✅ `streamText` — receipts for streaming responses
- ✅ Compliance modes: `strict` (fail-closed) and `permissive`
- ✅ Pre-flight compliance gate in strict mode
- ✅ Compatible with any Vercel AI SDK provider

---

## Installation

```bash
npm install @aivoralabs/agenttrail-vercel @aivoralabs/agenttrail ai
```

---

## Quick Start

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { auditReceiptMiddleware } from '@aivoralabs/agenttrail-vercel';
import { JSONLFileWriter } from '@aivoralabs/agenttrail';

const { wrapGenerate, wrapStream } = auditReceiptMiddleware({
  agentId: 'hr-ai',
  storage: new JSONLFileWriter('./audit-logs'),
  complianceConfig: { mode: 'strict' },
});

const wrappedGenerate = wrapGenerate(generateText);

const result = await wrappedGenerate({
  model: openai('gpt-4o'),
  prompt: 'Evaluate candidate profile for senior engineer position.',
});

// Every generateText call now produces a signed audit receipt
console.log(result.text);
```

---

## API Reference

### `auditReceiptMiddleware(options)`

Returns `{ wrapGenerate, wrapStream }`.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `agentId` | `string` | Yes | Agent identifier |
| `storage` | `IReceiptStorage` | Yes | Receipt storage backend |
| `complianceConfig.mode` | `'strict' \| 'permissive'` | No | Default: `'strict'` |
| `complianceConfig.redactPII` | `boolean` | No | Enable PII redaction |
| `keyStore` | `IKeyStore` | No | Ed25519 key management |

### `wrapGenerate(generateText)`

Wraps the Vercel AI SDK `generateText` function. Returns a function with the same signature + automatic receipt generation.

### `wrapStream(streamText)`

Wraps the Vercel AI SDK `streamText` function. Accumulates the stream and generates a receipt when complete.

---

## Next.js Integration

```typescript
// app/api/chat/route.ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { auditReceiptMiddleware } from '@aivoralabs/agenttrail-vercel';
import { JSONLFileWriter } from '@aivoralabs/agenttrail';

const { wrapGenerate } = auditReceiptMiddleware({
  agentId: 'nextjs-chat',
  storage: new JSONLFileWriter('/tmp/audit-logs'),
  complianceConfig: { mode: 'strict' },
});

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const result = await wrapGenerate(generateText)({
    model: openai('gpt-4o'),
    prompt,
  });
  return Response.json({ text: result.text });
}
```

---

## Links

- 🌐 [agenttrail.aivoralabs.org](https://agenttrail.aivoralabs.org)
- 🐙 [GitHub: AiVoraLabs/agenttrail](https://github.com/AIvoraLabs/agenttrail)
- 📄 [EU AI Act Article 12](https://artificialintelligenceact.eu/article/12/)

**License:** MIT
