# AgentTrail

**AI made decisions. We keep the receipts.**

AgentTrail is an open-source SDK that generates tamper-proof cryptographic audit trails for every AI agent interaction. Built for EU AI Act Article 12 compliance — and for anyone who wants to know what their AI actually did.

```
LLM Call → SDK intercepts → SHA-256 hash chain → Ed25519 signature → Your storage → CLI verification
```

---

## The Problem

The EU AI Act requires that every high-risk AI system automatically records its interactions — tamper-proof, auditable, and independently verifiable (Article 12). 

Companies today have two bad options:

1. **Consulting-driven compliance** — Big 4 firms charge €1,400–€2,600/day to produce manual audit documentation. It's expensive, slow, and doesn't scale with your AI.

2. **Technical logs** — Splunk, Datadog, ELK. They give you raw logs that your engineering team understands but no auditor will accept as a compliance artifact.

**Result:** Most companies deploying AI in Europe have no idea what their agents actually decided — and no way to prove otherwise.

---

## How AgentTrail Works

AgentTrail intercepts every decision your AI agent makes and generates a cryptographic receipt. Each receipt is hashed (SHA-256) and chained to the previous one — forming an immutable audit trail.

```typescript
import { AuditReceipt, JSONLFileWriter } from '@aivoralabs/agenttrail';

const auditor = new AuditReceipt({
  agentId: 'my-agent',
  storage: new JSONLFileWriter('./audit-logs'),
  complianceConfig: { mode: 'strict' },
});

// Every decision generates a tamper-proof receipt
const receipt = await auditor.record({
  input: 'Evaluate candidate profile',
  output: 'Candidate meets 8/10 criteria',
  model: 'gpt-4o',
});
```

**Zero data retention.** The receipts stay in your infrastructure — S3, GCS, local filesystem. AgentTrail never sees them.

**Independent verification.** The CLI works 100% offline:

```bash
npx agenttrail verify audit-log.jsonl --output report.html
```

Open `report.html` in a browser. Green badge = chain intact. Red badge = tampered.

---

## Quick Start

```bash
npm install @aivoralabs/agenttrail
```

```typescript
import { wrapOpenAI } from '@aivoralabs/agenttrail-openai';

const client = wrapOpenAI(new OpenAI(), {
  agentId: 'my-agent',
  storage: new JSONLFileWriter('./audit-logs'),
});

// Every API call automatically generates a receipt
const result = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Review contract clause 3.2' }],
});
```

That's it. Every decision is now traceable, verifiable, and audit-ready.

---

## AgentTrail vs Alternatives

| | AgentTrail | OneTrust | Splunk | ServiceNow |
|---|---|---|---|---|
| **Purpose-built for AI agents** | ✅ Yes | ❌ No (GRC platform) | ❌ No (log aggregator) | ❌ No (ITSM) |
| **Open-source core** | ✅ MIT | ❌ Proprietary | ❌ Proprietary | ❌ Proprietary |
| **Price** | $99/agent/month | €50K+/year | $2K–$4K/month | Enterprise pricing |
| **Implementation time** | Minutes | 3–6 months | Weeks | Weeks |
| **Offline verification** | ✅ CLI, full offline | ❌ Cloud-dependent | ❌ Cloud-dependent | ❌ Cloud-dependent |
| **Audit-ready output** | ✅ HTML report | ✅ Yes | ❌ Raw logs | ❌ Raw logs |

OneTrust is built for enterprise GRC — risk assessments, data mapping, vendor management. It's overkill if all you need is Article 12 compliance for your AI agents.

Splunk and Datadog are observability tools. Their logs are great for debugging, but an auditor needs a structured, signed, verifiable chain — not a raw timestamp.

AgentTrail does one thing: cryptographically prove what your AI agents decided, who reviewed it, and that the record hasn't been tampered with.

---

## Open Source — MIT

The SDK is and always will be MIT. Free to use, audit, fork, and integrate.

AgentTrail Cloud (dashboard, analytics, SSO) is a separate paid product for teams that want managed compliance at scale.

[agenttrail.cloud](https://agenttrail.cloud) · [Docs →](#) · [Contributing →](CONTRIBUTING.md)

---

## Roadmap

| Quarter | Feature |
|---------|---------|
| Q3 2026 | Roughtime timestamps (Google's signed timestamp protocol) |
| Q4 2026 | Compliance Mode — strict / permissive configurable per-agent |
| Q1 2027 | RFC 3161 TSA integration (trusted timestamp authority) |

---

## Badges

[MIT License](LICENSE) · [npm version](https://www.npmjs.com/package/@aivoralabs/agenttrail) · Build status · Coverage

---

**AgentTrail — AI made decisions. We keep the receipts.**
