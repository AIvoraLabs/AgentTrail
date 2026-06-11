# PRD — AgentTrail

> **Nota histórica**: Este PRD fue escrito antes de la implementación. La API actual puede diferir. Ver MIGRATION.md para detalles.

> **Product Requirements Document**
> Versión: 1.0
> Estado: Borrador pre-MVP
> Basado en: `knowledge-base/PLAN.md` e investigaciones en `market-research/analyses/`

---

## 1. Resumen ejecutivo

**AgentTrail** (`@aivoralabs/agenttrail`) es un SDK de TypeScript/Node que convierte los logs técnicos de agentes de IA en **audit trails inmutables y legibles** que cumplen con el Artículo 12 del EU AI Act. A diferencia de OneTrust ($50k-200k/año) y ServiceNow (18-33 meses de implementación), nuestro producto se instala en < 30 minutos y cuesta $99/mes por agente monitoreado.

**Problema**: Compliance officers y CTOs de SaaS europeos (50-500 empleados) con agentes de IA en producción arriesgan multas de hasta €15M o 3% de facturación global porque:
- OneTrust/ServiceNow son prohibitivos en costo y complejidad
- Datadog/Splunk no ofrecen inmutabilidad jurídica ni formato legible para auditor

**Solución**: Un SDK que intercepta las llamadas a modelos de IA, genera un hash chain SHA-256 de cada interacción, y produce "recibos de auditoría" exportables (JSON + PDF) que un auditor humano puede leer sin asistencia técnica.

**Justificación de mercado** (ver `market-research/analyses/3.Investigacion precioos publicos.md`):
- Gap de precio claro: ComplyJet $5k → Sprinto $15k → Vanta $20k → OneTrust $50k+
- El software GRC representa solo 4-10% del costo total de compliance
- Big 4 cobran £130k-£250k por programa completo
- 21 propuestas de compliance en programa DIGITAL-2025-AI-08 (ver Doc 4)

---

## 2. Problema

### 2.1 El problema del cliente

> *"Cuando la gente dice 'audit trail', generalmente se refieren a 'tenemos logs en alguna parte'. No es una pista que demuestre si alguien la ha manipulado y no es fácil de buscar, que es exactamente lo que exige el Artículo 12."*
> — CTO anónimo en Reddit (Fuente: `market-research/analyses/2.Búsqueda de Dolor en Cumplimiento IA.md`)

### 2.2 Evidencia del dolor

| Fuente | Cita / Dato | Severidad |
|--------|------------|-----------|
| Doc 2 — Reddit r/startups | *"Si estás construyendo un wrapper de IA en 2026, el Artículo 12 podría matar tu startup"* | Alta |
| Doc 2 — HN | *"No podría demostrar exactamente qué sucedió con una decisión de IA específica hace X meses"* | Alta |
| Doc 1 — G2 | OneTrust: aumentos de 468% en renovaciones, mínimo $10k/año | Alta |
| Doc 1 — TrustRadius | ServiceNow: *"Renuncié a mi trabajo por cuánto odiaba trabajar en ServiceNow"* | Alta |
| Doc 5 — Implementación | OneTrust requiere 3-6 meses + consultores. ServiceNow requiere 18-33 meses. | Alta |

### 2.3 ¿Por qué no lo resuelven las soluciones existentes?

| Solución | Por qué NO resuelve el problema | Costo |
|----------|--------------------------------|-------|
| **OneTrust AI Governance** | $50k-200k/año. Implementación 3-6 meses. Overkill para mid-market. Requiere consultores. | $50k-200k/año |
| **ServiceNow AI Control Tower** | 18-33 meses de madurez. Solo viable si ya usas ServiceNow. Consultores certificados obligatorios. | $100k+ solo en implementación |
| **Datadog/Splunk** | Sin inmutabilidad jurídica. Logs no legibles para auditores. Costosos para retención multianual. | $15k-50k/año + costos de ingesta |
| **Vanta/Drata** | GRC general, no específicos para Article 12. No generan receipts de auditoría. | $15k-35k/año |
| **Consultoría Big 4** | £130k-£250k por programa. No escala. No es automatizable. | £130k-250k |

*Fuente: `market-research/analyses/1.Reseñas de Software de IA_ Quejas y Severidad.md` y `market-research/analyses/5.Cumplimiento EU AI Act- OneTrust vs. ServiceNow.md`*

---

## 3. Usuario target

### 3.1 Perfil primario

| Dimensión | Definición | Justificación |
|-----------|-----------|---------------|
| **Empresa** | SaaS/tech europea, 50-500 empleados | Son las que tienen agentes en producción pero no pueden pagar OneTrust (Doc 3: gap de precio en $5k-$20k) |
| **Cargo** | CTO / Head of AI / Compliance Officer | Ellos deciden tools de infraestructura y compliance |
| **Geografía** | Unión Europea | Donde aplica el EU AI Act (Doc 4: licitaciones públicas masivas en UE) |
| **Dolor** | "Necesito audit trails pero OneTrust es demasiado caro/complejo" | Validado por reviews G2 (Doc 1) y comunidades (Doc 2) |
| **Presupuesto** | €5k-€25k/año | Basado en precios de herramientas mid-market (Doc 3) |

### 3.2 Perfil secundario

| Dimensión | Definición |
|-----------|-----------|
| **Empresa** | Startup UE (< 50 emp) con agentes en producción |
| **Cargo** | Founder técnico / CTO |
| **Dolor** | "Estamos arriesgando multas porque no tenemos presupuesto para compliance" |
| **Trigger** | Primera auditoría o consulta de cliente enterprise |

---

## 4. MVP Scope

### 4.1 Incluido en MVP (Must have)

| # | Feature | Descripción | Criterio de éxito | Prioridad |
|---|---------|-------------|-------------------|-----------|
| 1 | **SDK TypeScript** | Librería NPM que intercepta llamadas a modelos de IA | Instalación `npm install @aivoralabs/agenttrail` | P0 |
| 2 | **Audit receipt automático** | Por cada interacción, genera un receipt JSON firmado | Cada llamada produce un receipt verificable | P0 |
| 3 | **Hash chaining SHA-256** | Cada receipt se encadena criptográficamente al anterior | Alterar un receipt rompe toda la cadena posterior | P0 |
| 4 | **Export JSON** | Receipts exportables como JSON estructurado | Un auditor puede leer el JSON | P0 |
| 5 | **Integración Vercel AI SDK** | Middleware que envuelve llamadas vía `wrapLanguageModel()` | Funciona sin modificar el código del agente | P0 |
| 6 | **Integración OpenAI SDK** | Wrapper sobre `chat.completions.create()` | Capture automática de input/output | P0 |

### 4.2 Excluido de MVP (Won't have)

| # | Feature | Razón de exclusión |
|---|---------|-------------------|
| ❌ | Plataforma GRC completa | Competiríamos con OneTrust/Vanta. Nos enfocamos en audit trails. |
| ❌ | Evaluaciones de impacto (FRIA) | Requiere expertise legal, no técnico. Post-MVP. |
| ❌ | Dashboard de compliance | Añade complejidad sin validar primero el core. Post-MVP. |
| ❌ | Gestión de inventario de IA | Scope creep. No es el problema principal. |
| ❌ | Multi-tenancy enterprise | Agrega complejidad operativa en MVP. V1 solo single-tenant. |
| ❌ | On-premise deployment | Doc 2 confirma que es barrera. Empezamos SaaS cloud. |

### 4.3 Post-MVP (Nice to have)

| # | Feature | Trigger para construir |
|---|---------|----------------------|
| 1 | Integración LangChain | Clientes pidiéndolo (está en roadmap V2) |
| 2 | Integración OpenAI Agents SDK | Lo mismo |
| 3 | Export PDF | "Necesito imprimir esto para un auditor" |
| 4 | Dashboard web | Más de 10 clientes activos |
| 5 | Alertas de compliance (real-time) | Validación de que el core funciona |

---

## 5. Criterios de éxito del MVP

### 5.1 Técnicos

| Criterio | Target | Cómo se mide |
|----------|--------|-------------|
| Tiempo de integración | < 30 minutos | Timer desde `npm install` hasta primer receipt |
| Latencia añadida | < 50ms por llamada | Comparación con/sin SDK en llamada típica |
| Inmutabilidad | 100% verificable | Test de alteración: cambiar un byte → hash chain se rompe |
| Receipt legible | Sí | Prueba: mostrar receipt a un no-técnico, debe entender qué pasó |
| Captura automática | Sin modificar código del agente | El middleware intercepta sin tocar la lógica del agente |

### 5.2 De negocio

| Criterio | Target | Plazo |
|----------|--------|-------|
| Clientes beta | 3-5 empresas usando el SDK | Semana 4 post-lanzamiento |
| Receipts generados | 1,000+ receipts válidos | Semana 8 |
| Feedback de auditor | Al menos 1 compliance officer confirma que el receipt es útil | Semana 6 |

---

## 6. User flow (MVP)

```
Desarrollador
  1. npm install @aivoralabs/agenttrail
  2. Envuelve su modelo con auditReceiptMiddleware()
  3. El SDK captura automáticamente cada interacción:
     input → agent_action → output → timestamp
  4. Genera receipt firmado con hash chain
  5. Exporta receipts como JSON (y opcionalmente PDF)
  
Auditor
  1. Recibe archivo .auditreceipt.json
  2. Abre con CLI: `audit-receipt verify <file>`
  3. Lee resumen: "El agente X procesó input Y y produjo output Z a las T"
  4. Verifica integridad: hash chain intacto
```

---

## 7. Pricing

| Plan | Precio | Incluye |
|------|--------|---------|
| **Starter** | $99/mes por agente | SDK, audit receipts, hash chain, export JSON |
| **Team** | $1k/mes (hasta 3 agentes) | Starter + soporte prioritario |
| **Enterprise** | Custom | Team + on-premise, SSO, custom integrations |

**Justificación de pricing** (Fuente: `market-research/analyses/3.Investigacion precioos publicos.md`):
- ComplyJet: $5k/año → muy simple
- OneTrust: $50k+/año → inalcanzable para mid-market
- Nuestro punto medio: $1k/mes = $12k/año → 4x menos que OneTrust
- El software GRC es solo 4-10% del costo total de compliance (€10k-€25k de €100k-€150k anuales)

---

## 8. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|------------|---------|-----------|
| Ciclo de ventas 3-9 meses | Media | Alto | Empezar con mid-market (ciclo más corto), evitar enterprise en V1 |
| Credibilidad de solo founder | Media | Alto | Open-source core para construir comunidad y credibilidad técnica |
| Competidores (OpenAI logs nativos) | Baja | Medio | No cubren Artículo 12. Son logs de uso, no audit trails compliance-grade. |
| Deadline movido (Digital Omnibus) | Alta | Bajo | Relaja urgencia pero no elimina necesidad. Artículo 12 sigue siendo obligatorio. |

*Fuente: `market-research/analyses/Mapa Competitivo EU AI Act.md` y `knowledge-base/PLAN.md`*

---

## 9. Referencias

- `knowledge-base/PLAN.md` — Documento de validación completo
- `market-research/analyses/Mapa Competitivo EU AI Act.md` — Competidores directos e indirectos
- `market-research/analyses/refutacion.md` — Abogado del diablo original
- `market-research/analyses/Evaluacion hipotesis..md` — Síntesis contradictoria OpenWork
- `market-research/analyses/1.Reseñas de Software de IA_ Quejas y Severidad.md` — Reviews G2/Capterra
- `market-research/analyses/2.Búsqueda de Dolor en Cumplimiento IA.md` — Comunidad Reddit/HN
- `market-research/analyses/3.Investigacion precioos publicos.md` — Precios y costos
- `market-research/analyses/4.licitaciones publicas.md` — Licitaciones y demanda pública
- `market-research/analyses/5.Cumplimiento EU AI Act- OneTrust vs. ServiceNow.md` — Implementación real
