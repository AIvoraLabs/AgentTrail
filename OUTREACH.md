# Outreach Plan — AgentTrail

## 1. Target Profile

| Dimensión | Definición |
|-----------|------------|
| **Titles** | CTO, Head of AI, VP Engineering, Compliance Officer, Founder técnico |
| **Industries** | SaaS B2B, Fintech, Healthtech, Legaltech — cualquier empresa europea con agentes de IA en producción |
| **Geographies (EU Top 5)** | Alemania (mayor concentración de SaaS mid-market), Francia (second), Países Bajos (startup hub + regulación temprana), España (crecimiento rápido en AI), Suecia/Dinamarca (alta adopción tech + cumplimiento) |
| **Company size** | 50-500 empleados (core ICP). Startup < 50 con agentes en producción (secondary). |
| **Stack signals** | Node/TypeScript, OpenAI SDK, Vercel AI SDK, LangChain, PostgreSQL, Next.js. Public GitHub repos con agentes. Mencionan "production" + "AI agent" en perfiles. |
| **Pain triggers** | Auditoría interna inminente, cliente enterprise pide compliance documentation, departamento legal pregunta por EU AI Act Artículo 12, renovación de OneTrust con aumento 468%, deadline regulatorio del AI Act (implementación gradual 2025-2027). |

---

## 2. Channel Strategy

### Channel 1: LinkedIn (#1)

**Why #1?** CTOs/Heads of AI europeos están en LinkedIn, no en Twitter/X ni en comunidades dev-focused. Es el canal B2B más directo para mid-market. El algoritmo premia contenido técnico de nicho. Conexiones frías tienen ~20% acceptance cuando se personalizan bien. No requiere construir audiencia desde cero — puedes outreach directo.

**Connection strategy:** 20 conexiones/día. Máximo. Buscar CTOs de SaaS europeos que hayan posteado sobre AI compliance, EU AI Act, o agentes en producción. Personalizar cada solicitud mencionando un post suyo o un logro de su empresa. NO vender en la conexión. El objetivo es entrar en su red.

**Content strategy (2 posts/semana):**
- Technical posts: "How SHA-256 hash chaining works for AI audit trails" (credibilidad)
- Problem posts: "The hidden cost of EU AI Act compliance for mid-market SaaS" (dolor)
- Comparison posts: "OneTrust is $50k. Here's what you actually need for Article 12." (posicionamiento)
- Validation posts: "We asked 5 compliance officers to read our audit receipt. Here's what they said." (prueba social)

### Channel 2: Hacker News (Show HN)

**Why #2?** El target CTO/technical founder lee HN. Una buena campaña Show HN puede traer 500-2000 visits en 24h, y el feedback técnico es brutalmente honesto — exactamente lo que necesitas pre-MVP para validar o romper tu approach. Además Google indexa HN posts muy bien, dándote SEO duradero.

**Timing:** Martes o Miércoles, 11:00-13:00 UTC (peak de audiencia técnica europea). Evitar lunes (muy lleno) y viernes (poca atención). Launch en 30 minutos para aprovechar el algoritmo de ranking.

**Title format:** `Show HN: AgentTrail – Compliance receipts for AI agents (EU AI Act Article 12)`. Directo, descriptivo, incluye el regulation hook. NO clickbait — HN punish.

**Strategy:** El OP debe estar disponible en comments las primeras 3h para responder cada pregunta. La comunidad HN respeta founders que defienden su trabajo con argumentos técnicos. Esperar preguntas duras: "Why not just hash the logs yourself?", "Is this necessary or just compliance theater?", "What happens when you're acquired?"

### Channel 3: Reddit r/euaiact

**Why #3?** Comunidad pequeña (~3k members) pero extremadamente relevante: son compliance officers, legal tech, y CTOs que ya están discutiendo el EU AI Act activamente. Bajo volumen de posts = cada post tiene alta visibilidad. El tono es serio y regulatorio, ideal para posicionarse como solución.

**Community dynamics:** Usuarios son profesionales (no trolls). Apprecian substancia técnica y regulatoria. Rechazan marketing abierto. Las preguntas genuinas funcionan mejor que los anuncios. El upvote aquí requiere calidad real.

**How to contribute:** NO postear "check out my startup". En vez de eso, participar en hilos existentes sobre Article 12 con respuestas útiles que mencionen tu approach de manera orgánica. Después de 2-3 semanas de contribuciones valiosas, postear una pregunta genuina sobre implementación que posicione naturalmente AgentTrail.

---

## 3. Outreach Messages

### 3.1 LinkedIn Connection Message

> Appreciate your post on AI compliance — rare to see someone in SaaS tackling Article 12 head-on. Would love to connect and follow your work.

*(197 chars. Direct, references their content, zero friction, no pitch.)*

### 3.2 LinkedIn Follow-up

*(Send 3-5 days after connection accepted)*

> Thanks for connecting. Noticed [company] is working with AI agents in production — curious if Article 12 compliance is on your radar yet.
>
> We built AgentTrail (opensource SDK) that generates tamper-proof audit receipts for every AI agent interaction. SHA-256 hash chaining + Ed25519 signatures. Installs in 30 minutes, $99/mo per agent.
>
> No pitch — would genuinely value your take. If the approach sounds wrong or overkill, I'd rather hear it now.
>
> Open to a 10-min call this week?

*(~460 chars. References their work, explains value concisely, honest about limitations, low-friction ask.)*

### 3.3 Hacker News "Show HN" Post

**Title:** Show HN: AgentTrail – Compliance receipts for AI agents (EU AI Act Article 12)

**Body:**

> We're building an open-core SDK that generates tamper-proof audit receipts for every AI agent interaction.
>
> If you have AI agents in production serving EU users, Article 12 of the EU AI Act requires you to keep "automatically recorded logs" that demonstrate what your agent did, when, and why — and these logs must be "tamper-proof" and "auditor-readable."
>
> Current options: pay OneTrust $50k+/year, endure ServiceNow's 18-month implementation, or store plain logs that don't meet regulatory standards.
>
> AgentTrail intercepts model calls via middleware, generates SHA-256 chained receipts signed with Ed25519, and outputs JSON any compliance officer can read.
>
> ```ts
> import { auditReceiptMiddleware } from '@aivoralabs/agenttrail'
> const model = wrapLanguageModel({
>   model: yourModel,
>   middleware: auditReceiptMiddleware({ agentId: 'support-bot-v2' })
> })
> ```
>
> Works with Vercel AI SDK and OpenAI SDK today. LangChain integration coming.
>
> GitHub: [link] | Docs: [link]
>
> Honest about limitations: MVP is SDK-only (no dashboard), no on-prem, no multi-tenancy. Single-tenant cloud, $99/mo per agent.
>
> Would love feedback on: (1) Is hash-chain enough or do you need Merkle? (2) What's your biggest blocker for Article 12 compliance?

**First comment strategy (post immediately after submission):**

> Founder here. We're pre-revenue, pre-MVP validation stage. Open to any criticism — especially if you think this approach is wrong or if there's a simpler solution we're missing. The regulatory text is ambiguous, so I expect opinions will vary. Thanks in advance.

*(Sets tone of humble founder seeking truth, disarms hostility, invites genuine discussion.)*

### 3.4 Reddit r/euaiact Post

**Title:** Question for those implementing Article 12 — what format are your audit logs actually in?

**Body:**

> We're a small team building tooling around EU AI Act compliance for SaaS, specifically Article 12's "automatically recorded logs" requirement.
>
> I've been reading the technical standards and there's a gap I'm trying to understand: what format are your logs actually in right now, and has anyone actually reviewed them with a compliance officer or auditor yet?
>
> I've seen teams storing raw OpenAI API responses in S3 and calling it an "audit trail." Others are building custom hash chains. Most are doing nothing because the deadline feels far.
>
> We're building an opensource SDK (AgentTrail) that generates tamper-proof audit receipts with SHA-256 chaining and Ed25519 signatures, specifically formatted for auditor readability — but I genuinely want to know: what does your current setup look like? What's missing? What would make you adopt something like this vs building in-house?
>
> Not selling anything — genuinely trying to understand the gap before we invest more time in the wrong direction.

*(Genuine question. Positions expertise without selling. Invites discussion. Honest about building something. Community will respect the transparency.)*

---

## 4. Discovery Interview Script

### Question 1: Current State

**Question:** "How are you currently handling audit logging for your AI agents?"

**Signal you're looking for:** Specificity. Do they name tools (OneTrust, Datadog, custom)? Do they admit they have nothing?

**Strong prospect:** "We're using [X] and it's not working because [Y]" or "We don't have anything and I'm worried." **Weak prospect:** "We've got it covered with our existing logging" (no specific tool, no pain).

### Question 2: Regulatory Pressure

**Question:** "Has your legal or compliance team raised Article 12 specifically, or is this still on your radar as a future concern?"

**Signal you're looking for:** Internal pressure. Is someone above them asking? Do they have a deadline?

**Strong prospect:** "Our legal team asked about this last quarter" or "A customer required it in their security review." **Weak prospect:** "We'll deal with it when the deadline is closer" (no internal driver).

### Question 3: Build vs Buy

**Question:** "Have you considered building this in-house? What would make you buy vs build?"

**Signal you're looking for:** Do they understand the effort? Have they tried?

**Strong prospect:** "We started building something but it's more complex than we thought" or "We don't have the bandwidth to become compliance experts." **Weak prospect:** "We can just hash the logs ourselves" (doesn't understand scope) or "We'll wait for OpenAI to add this natively."

### Question 4: Budget

**Question:** "If a tool existed that handled this for $99/month per agent, would that fit your budget?"

**Signal you're looking for:** Does the price feel right? Do they compare to something?

**Strong prospect:** "That's nothing compared to OneTrust" or "That's within our discretionary spend." **Weak prospect:** "That's too expensive for just logs" (doesn't value compliance) or "I'd need to get approval from [someone else]" (not a decision-maker).

### Question 5: Purchase Trigger

**Question:** "What specific event would make you prioritize this? What's the trigger that turns this from 'nice to have' to 'must have'?"

**Signal you're looking for:** Concrete, imminent trigger vs vague future concern. Also helps you time your sales motion.

**Strong prospect:** "Our next SOC 2 audit is in 3 months" or "We have a client from [regulated industry] onboarding next quarter." **Weak prospect:** "Maybe when the EU starts enforcing" (distant, unclear timeline).

---

## 5. Success Criteria

| Métrica | Target | Acción |
|---------|--------|--------|
| **LinkedIn conversations** | 15 qualified conversations (CTO/Head of AI, SaaS EU, 50-500 emp) | Validar ICP y mensajes. Si tasa de aceptación < 15%, pivotar copy. |
| **HN upvotes** | > 50 upvotes + 30+ comment threads | Validar positioning técnico. Si < 20 upvotes, el approach técnico no resuena. |
| **Reddit engagement** | > 10 comments, > 80% upvote ratio | Validar que el community entiende el problema. Si downvotes o críticas duras, revisar approach. |
| **Discovery calls booked** | > 5 calls from outreach | Suficientes para identificar patrones en respuestas. Si < 3 calls, el mensaje no convierte. |
| **Qualified lead definition** | CTO/Head of AI en SaaS europeo 50-500 emp, con trigger concreto (auditoría/customer request) en < 6 meses, dispuesto a probar SDK, presupuesto > $k/mes | Si después de 5 calls nadie cumple estos criterios, redefinir ICP o pivotar. |

### When to iterate

Después de 15 conversations o 5 discovery calls (lo que ocurra primero), review findings. Look for patterns in objections and adjust messaging. If 3+ prospects give the same objection ("Why not Datadog?"), add that answer to all outreach.

### When to pivot

Si después de 30 días:
- Menos de 10 conexiones aceptadas en LinkedIn → cambiar strategy o target
- HN post < 30 upvotes → el problema no resuena con technical audience
- 0 discovery calls booked → el mensaje no conecta, rewrites needed
- 3+ prospects confirman que el deadline es demasiado lejano → pivot a compliance officers en lugar de CTOs, o esperar

### Hard stop

Si después de 60 días no hay al menos 2 empresas dispuestas a beta test el SDK gratis, el problema no es suficientemente urgente para este ICP. Re-evaluar si vender a compliance officers directamente (menos técnicos, más dolor) es mejor ruta.
