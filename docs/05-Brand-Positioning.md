# Brand & Positioning — AgentTrail

> **Brand & Positioning Document**
> Versión: 1.0
> Estado: Borrador pre-MVP

---

## 1. Posicionamiento

### 1.1 One-liner

> **Audit trails inmutables para agentes de IA. En minutos, no meses.**

### 1.2 Elevator pitch

*"OneTrust cuesta $50k al año y ServiceNow requiere 18 meses de implementación. Si eres un CTO europeo con agentes de IA en producción, necesitas audit trails para el Artículo 12 del EU AI Act. Nuestro SDK se instala en 30 minutos, cuesta $99/mes por agente, y genera receipts inmutables que cualquier auditor puede leer."*

### 1.3 Tagline candidates

| Tagline | Evaluación |
|---------|-----------|
| "Compliance receipts for AI agents" | Claro, directo. **Elegido para MVP.** |
| "Your AI agent's tamper-proof audit trail" | Más descriptivo, más largo. |
| "Ship agents. We'll handle the receipts." | Más aspiracional, menos claro. |
| "Article 12 compliance, done." | Directo al dolor regulatorio. |

**Decisión**: Usar "Compliance receipts for AI agents" como tagline principal en MVP. Es descriptivo y posiciona el producto claramente.

### 1.4 Positioning against competitors

| Competidor | Nosotros | Por qué ganamos en mid-market |
|-----------|----------|------------------------------|
| **OneTrust** ($50k-200k/año) | $1k/mes ($12k/año) | 4x-16x más barato |
| **ServiceNow** (18-33 meses) | < 30 minutos de integración | Tiempo de implementación 99.9% menor |
| **Datadog/Splunk** (logs técnicos) | Receipts legibles para auditor | Diferente caso de uso |
| **Vanta/Drata** (GRC general) | Enfocado en Article 12 | Especialización vs generalización |
| **Big 4** (£130k-250k/año) | $12k/año + automatización | 10x-20x más barato + escalable |

---

## 2. Nombre

### 2.1 Propuesta

**AgentTrail**

| Componente | Significado |
|------------|-------------|
| **Agent** | Para agentes de IA (el target son equipos con agentes en producción) |
| **Trail** | Audit trail. Rastro de auditoría legible e inmutable. |

**Decisión**: Nombre corto, memorable. Funciona en inglés y se entiende en contexto B2B europeo.

---

## 3. Tono y voz

### 3.1 Principios

| Principio | Aplicación |
|-----------|------------|
| **Técnico pero accesible** | Hablamos el lenguaje del CTO/desarrollador, pero el output lo entiende un compliance officer |
| **Urgente pero no alarmista** | El deadline del EU AI Act es real. Lo mencionamos, pero no vendemos miedo. Vendemos solución. |
| **Honesto sobre limitaciones** | MVP es SDK, no plataforma. Lo decimos claro. |
| **Directo** | Sin marketing vacío. "Esto es lo que hace, esto es lo que no hace, esto cuesta." |

### 3.2 Ejemplos de tono

| Situación | Correcto | Incorrecto |
|-----------|----------|------------|
| README | "Agent Audit Receipts captures every AI agent interaction and generates tamper-proof audit trails for EU AI Act compliance." | "Revolutionize your compliance infrastructure with our cutting-edge AI-powered governance platform." |
| Pricing | "$99/mo per agent. Install in 30 minutes." | "Contact us for a customized enterprise quote." |
| Technical docs | "Uses SHA-256 hash chaining with Ed25519 signatures. Each receipt links to the previous one cryptographically." | "Military-grade encryption keeps your data 100% safe." |

---

## 4. Nombre del paquete NPM

```bash
npm install @aivoralabs/agenttrail
```

**Decisión**: `@aivoralabs/agenttrail` es el paquete principal bajo el holding AivoraLabs. Paquetes adicionales seguirán el patrón `@aivoralabs/agenttrail-{plugin}`.

---

## 5. README header (mockup)

```markdown
# AgentTrail

Compliance receipts for AI agents.

AgentTrail is an open-core SDK that automatically captures every AI agent 
interaction and generates tamper-proof audit receipts compliant with EU AI Act Article 12.

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
import { auditReceiptMiddleware } from '@aivoralabs/agenttrail';

const model = wrapLanguageModel({
  model: yourModel,
  middleware: auditReceiptMiddleware({ agentId: 'my-agent' }),
});
```

## Documentation

- [PRD](./01-PRD.md)
- [Architecture](./02-Technical-Architecture.md)
- [Data Schema](./03-Data-Schema.md)
- [Integration Spec](./04-Integration-Spec.md)
```

---

## 6. Cliente ideal (ICP)

| Dimensión | Descripción |
|-----------|-------------|
| **Rol** | CTO o Head of AI |
| **Empresa** | SaaS europeo, 50-500 empleados |
| **Stack** | Node/TypeScript, OpenAI, Vercel, LangChain |
| **Dolor** | "OneTrust es demasiado caro y ServiceNow es demasiado complejo" |
| **Trigger** | Auditoría inminente o consulta de cliente enterprise sobre compliance |
| **Objeción común** | "¿Por qué no usar Datadog para esto?" → Respuesta: Datadog no ofrece inmutabilidad jurídica ni formato legible para auditor |

---

## 7. Canales de distribución (MVP)

| Canal | Prioridad | Por qué |
|-------|-----------|---------|
| **GitHub (open-source core)** | Alta | Construye credibilidad técnica. El target (CTOs) confía más en código abierto que en marketing. |
| **HN / Reddit r/euaiact** | Alta | Comunidad ya está discutiendo este dolor (ver Doc 2). Publicar "Show HN" con el SDK. |
| **LinkedIn (CTOs europeos)** | Media | Outreach directo a CTOs de SaaS mid-market. |
| **Product Hunt** | Baja | No en MVP. Demasiado ruido, poca conversión B2B. |

---

## 8. Pricing page (copy draft)

```
# Simple pricing. No hidden fees.

## Starter — $99/mo per agent
- SDK with full receipt generation
- SHA-256 hash chaining
- Ed25519 digital signatures
- JSON export
- Community support

## Team — $1k/mo (up to 3 agents)
- Everything in Starter
- Priority support
- Multi-agent dashboard (coming soon)

## Enterprise — Custom
- Everything in Team
- On-premise deployment
- SSO / SAML
- Custom integrations
- SLA

*Why we're cheaper: OneTrust spends millions on sales and marketing. 
We spend on code. Same compliance outcome at 5% of the cost.*
```

---

## 9. Referencias

- `knowledge-base/PLAN.md` — Validación de mercado y target profile
- `market-research/analyses/3.Investigacion precioos publicos.md` — Gap de pricing
- `market-research/analyses/2.Búsqueda de Dolor en Cumplimiento IA.md` — Dolor real de la comunidad
- `market-research/analyses/Mapa Competitivo EU AI Act.md` — Competidores
