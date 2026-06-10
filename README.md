# AgentTrail

**Compliance receipts for AI agents.**

AgentTrail is an open-core SDK that automatically captures every AI agent
interaction and generates tamper-proof audit receipts compliant with
EU AI Act Article 12.

- **Zero-code integration**: Works with Vercel AI SDK and OpenAI SDK. Just wrap your model.
- **Cryptographically verifiable**: SHA-256 hash chaining with Ed25519 signatures.
- **Auditor-readable**: Each receipt is a structured JSON that any compliance officer can understand.
- **Priced for mid-market**: $99/mo per agent. Not $50k like OneTrust.

## Quick Start

```bash
npm install @aivoralabs/agenttrail
```

```typescript
import { wrapLanguageModel } from 'ai';
import { auditReceiptMiddleware } from '@aivoralabs/agenttrail-vercel';

const model = wrapLanguageModel({
  model: yourModel,
  middleware: auditReceiptMiddleware({ agentId: 'my-agent' }),
});
```

## Packages

| Package | Description |
|---------|-------------|
| `@aivoralabs/agenttrail` | Core SDK — hash chain, receipt builder, signer |
| `@aivoralabs/agenttrail-openai` | OpenAI SDK wrapper |
| `@aivoralabs/agenttrail-vercel` | Vercel AI SDK middleware |
| `@aivoralabs/agenttrail-cli` | CLI for receipt verification |

## Documentation

- [PRD](./docs/01-PRD.md) — Product Requirements Document
- [Architecture](./docs/02-Technical-Architecture.md) — Technical architecture & hash chaining
- [Data Schema](./docs/03-Data-Schema.md) — Receipt schema & SDK API
- [Integration Spec](./docs/04-Integration-Spec.md) — Vercel AI SDK, OpenAI integration details
- [Brand & Positioning](./docs/05-Brand-Positioning.md) — Brand, tone, pricing, ICP

## License

MIT © AivoraLabs
