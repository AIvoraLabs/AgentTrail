# 📓 Bitácora de Validación: agenttrail
**Holding:** Sí | **Inicio:** 2026-06-07

---

## 🎯 Hipótesis Activa — H2 (Pivot — post-descarte de H1)

Responsables de compliance en empresas europeas con agentes de IA en producción no pueden generar audit trails legibles para el EU AI Act de forma automatizada, y están pagando consultoría manual o usando logs técnicos crudos (SIEM/Splunk) que un auditor no puede leer directamente, lo que las expone a penalizaciones desde agosto 2026.

---

## 🔍 Investigación Externa

✅ **Completada** — 9 investigaciones ejecutadas (4 para H1 descartada + 5 para H2 activa). Ver secciones ✅ Investigaciones Completadas abajo.

---

## ⚖️ Filtro Holding & Regulación Chile

✅ **Completado** — Análisis de estructura societaria (Chile SpA → Estonia OÜ), ACTECO, CDI, VAT, precios de transferencia, riesgos regulatorios. Ver sección "Filtro Holding & Regulación Chile — 2026-06-07 23:17" abajo.

---

## 📜 Historial de Pivots e Ideas Descartadas

✅ **Pivot registrado:** H1 (crawlers IA en SaaS LATAM) descartada → H2 activa (audit trails EU AI Act). Ver detalles abajo.


### 📋 Hipótesis Original (H1) — Descartada — 2026-06-07 22:41

**Hipótesis:**  
*"Los founders y responsables de growth de SaaS latinoamericanos con más de 500 visitas mensuales reciben tráfico creciente de crawlers de IA (GPTBot, ClaudeBot, PerplexityBot) sin saberlo, porque Google Analytics los agrupa como tráfico de bot genérico sin segmentación, impidiéndoles saber qué páginas leen estos agentes, qué información no encuentran, y por qué su marca no aparece cuando un usuario le pregunta a ChatGPT por herramientas de su categoría — perdiendo un canal de descubrimiento emergente sin ninguna métrica que les indique que lo están perdiendo."**

**Razón del descarte:**  
Tras confrontar la investigación adversarial (Documento A — refutación) y el mapa competitivo (Documento B), un audit técnico independiente ("Audit de Precisión Técnica del Documento A") verificó que:

1. **Técnicamente inviable**: GPTBot, ClaudeBot, PerplexityBot no ejecutan JavaScript → son invisibles para GA4, no "agrupados como genéricos".  
2. **Volumen irrelevante**: Sitios sin blog activo reciben ~41.6 visitas/mes de crawlers de IA — estadísticamente insignificante para SaaS de 500-10k visitas.  
3. **95% del crawling se concentra en retail, streaming y viajes** — no en SaaS B2B latinoamericanos.  
4. **Herramientas gratuitas resuelven**: Cloudflare AI Crawl Control, Google Search Console, Bing Webmaster Tools ya permiten monitorear visibilidad en IA.  
5. **El canal de descubrimiento en IA es marginal**: ~1% del tráfico web global vs ~56% de Google Search.

**Conclusión:** La evidencia empírica disponible favorece la refutación. No hay soporte para la hipótesis original.



### 🎯 Hipótesis Activa (H2 — Pivot) — 2026-06-07 22:41

**Hipótesis activa (post-pivot):**  
*"Responsables de compliance en empresas europeas con agentes de IA en producción no pueden generar audit trails legibles para el EU AI Act de forma automatizada, y están pagando consultoría manual o usando logs técnicos crudos (SIEM/Splunk) que un auditor no puede leer directamente, lo que las expone a penalizaciones desde agosto 2026."*

**Target:** Mid-market europeo (50-500 empleados) con agentes de IA en producción, que necesitan cumplir Artículo 12 del EU AI Act (deadline: agosto 2026). No pueden pagar OneTrust ($50k+/año) ni Big 4 (£1,400-£2,600/día).

**Estado:** Hipótesis activa — investigación adversarial y desk research completada. Pendiente de validación mediante customer discovery.



### ✅ Investigaciones Completadas — H1 (Original) — 2026-06-07 22:41

1. **Refutación (Abogado del Diablo)**  
   → Archivo: `recursos/investigaciones/hipo 1/Refutando Tráfico de Bots de IA.md`  
   → Estado: ✅ Completada. Evidencia sólida con fuentes verificadas (Cloudflare, Kinsta, Search Engine Journal, Gartner). Demuestra que H1 no se sostiene técnica ni estadísticamente.

2. **Mapa Competitivo — Monitoreo de Crawlers IA**  
   → Archivo: `recursos/investigaciones/hipo 1/Mapa Competitivo Crawlers IA B2B_SaaS.md`  
   → Estado: ✅ Completada. Identifica 4 niveles (directos, indirectos, gratuitos, adyacentes). 20+ soluciones mapeadas con precios, tracción y limitaciones.

3. **Audit de Precisión Técnica (Confrontación A vs B)**  
   → Archivo: `recursos/conclucion-cowork/Audit de Precisión Técnica del Documento A.md`  
   → Estado: ✅ Completada. Veredicto: Documento A (refutación) es técnicamente sólido. Las 6 afirmaciones clave confirmadas con fuentes verificadas.

4. **Investigación Delegada (Openwork)**  
   → Archivo: `recursos/conclucion-cowork/Audit de Precisión Técnica del Documento A.md` (contiene la síntesis)  
   → Estado: ✅ Completada. La confrontación entre Doc A y Doc B favorece las conclusiones de A.



### ✅ Investigaciones Completadas — H2 (Pivot Activo) — 2026-06-07 22:41

1. **Reseñas de Software de IA — Quejas y Severidad**  
   → Archivo: `1.Reseñas de Software de IA_ Quejas y Severidad.md`  
   → Estado: ✅ Completada. Análisis de reviews verificadas en G2/Capterra sobre OneTrust, ServiceNow, Swept AI. Documenta quejas de precio (incrementos 275-468%), complejidad de implementación (3-6 meses), y sobredimensionamiento para mid-market.

2. **Búsqueda de Dolor en Cumplimiento IA**  
   → Archivo: `2.Búsqueda de Dolor en Cumplimiento IA.md`  
   → Estado: ✅ Completada. Identifica el rechazo de la industria a OneTrust/ServiceNow, la presión de costos del Artículo 12, y la adopción de compliance-as-code como tendencia.

3. **Investigación de Precios Públicos**  
   → Archivo: `3.Investigacion precioos publicos.md`  
   → Estado: ✅ Completada. Costo total anual mínimo para mid-market: €100k-€150k (recurrente) + €280k-€500k (setup). Herramientas GRC representan solo 4-10% (€10k-€25k/año). Existe punto de precio para nicho entre €5k-€20k/año.

4. **Licitaciones Públicas Europeas**  
   → Archivo: `4.licitaciones publicas.md`  
   → Estado: ✅ Completada. 250+ contratos de IA en sector público sueco (1,300M SEK). AI Office de Comisión Europea: 9M€ para evaluación de riesgos. Transición de consultoría a herramientas técnicas concretas.

5. **OneTrust vs ServiceNow — Cumplimiento EU AI Act**  
   → Archivo: `5.Cumplimiento EU AI Act- OneTrust vs. ServiceNow.md`  
   → Estado: ✅ Completada. Evaluación técnica detallada de ambas plataformas. OneTrust: precio prohibitivo, implementación lenta, sobredimensionado. ServiceNow AI Control Tower: integración nativa con CMDB, pero aún enterprise pricing.

6. **Mapa Competitivo EU AI Act (Documento A)**  
   → Archivo: `Mapa Competitivo EU AI Act.md`  
   → Estado: ✅ Completada. Identifica 20+ soluciones. Competidores directos: Swept AI, FireTail, Bifrost, Compliora, EPI/AgentAudit. Indirectos: Datadog, Splunk, Cloudflare. Brecha entre herramientas técnicas y GRC.

7. **Refutación (Documento B)**  
   → Archivo: `refutacion.md`  
   → Estado: ✅ Completada. Argumenta que el mercado está consolidado en OneTrust/ServiceNow/Big 4. Relación de gasto $735:1 ejecución vs gobernanza. Solo 18% usa herramientas automatizadas. Barreras de procurement insuperables para startups.

8. **Evaluación de Hipótesis (A vs B)**  
   → Archivo: `Evaluacion hipotesis..md`  
   → Estado: ✅ Completada. Confrontación estructurada de ambos documentos. Conclusión: la evidencia de B (refutación) es más fuerte en comportamiento de mercado, pero A tiene punto válido sobre costos. Ninguno presenta entrevistas directas con compliance officers. **Falta customer discovery.**

9. **Demanda No Atendida — Mid-Market Europeo**  
   → Archivo: `recursos/conclucion-cowork/Demanda No Atendida en Audit Trails de IA para Mid-Market Europeo Bajo el EU AI Act.md`  
   → Estado: ✅ Completada. Evidencia verificable de: 67% sin plan, costos desproporcionados (€12k/sistema), quejas sobre OneTrust, alternativas open source insuficientes. Conclusión: existe demanda no atendida en mid-market (50-500 empleados).



### 🟡 Brechas Detectadas — Lo que Falta para Validar — 2026-06-07 22:41

Según el flujo del **The-Founders-Playbook-IA-native.md (Capítulo 3 — Idea Stage)**, después de la investigación adversarial y el mapeo competitivo, el siguiente paso es **customer discovery con entrevistas directas a compradores potenciales**.

**Lo que SÍ tenemos (desk research completa):**
- Refutación adversarial ✅
- Mapa competitivo por tiers ✅
- Análisis de precios públicos ✅
- Licitaciones públicas europeas ✅
- Reviews de usuarios verificadas ✅
- Evaluación de demanda no atendida ✅

**Lo que FALTA (customer discovery):**  
1. ❌ **Entrevistas con compliance officers europeos** (10-15 mínimo) — validar si la brecha técnica se traduce en dolor de compra real.  
2. ❌ **Entrevistas con CIOs/CTOs de mid-market europeo** (50-500 empleados) — entender procesos de procurement, presupuestos asignados para Artículo 12.  
3. ❌ **Validación de disposición a pagar** por herramienta de nicho en rango €5k-€20k/año.  
4. ❌ **Análisis de fracasos concretos** de startups similares — validar si la advertencia del Documento B (consolidación GRC) es la norma o la excepción.

**🛑 Estado del pipeline: PAUSADO**  
No se puede avanzar al filtro Holding (Paso 4 del protocolo) sin validación primaria de la hipótesis activa mediante customer discovery.



### 🔧 ADRs — Architectural Decision Records — 2026-06-07 22:47

### ADR-001 — Streaming con Compliance Mode configurable

**Status:** Propuesto · **Deciders:** Yechua (AivoraLabs)

**Problema:** El `wrapStream` actual en `vercel-ai.ts` usa `.catch(() => {})` que hace fail-open: si `record()` falla, el agente responde sin receipt.

**Decisión:** Eliminar el `.catch(() => {})` y reemplazar con `complianceMode` configurable:
- `strict` → Fail-closed: si el receipt falla, el stream termina con error visible
- `permissive` (default) → Log obligatorio pero no interrumpe la respuesta del agente

**Trade-off:** Strict garantiza compliance al 100% pero puede degradar UX si storage local falla. Para EU AI Act, la decisión correcta es `strict` por defecto en producción. El archivo afectado es `packages/vercel-ai/src/index.ts`.

---

### ADR-002 — Timestamps confiables con Roughtime

**Status:** Propuesto · **Deciders:** Yechua (AivoraLabs)

**Problema:** El código usa `new Date().toISOString()` que depende del reloj del servidor. Un reloj manipulado invalida el audit trail. RFC 3161 (TSA) requiere HTTP por receipt — inaceptable en hot path.

**Decisión:** Drift caching con Roughtime (UDP, ~50ms) + fallback degradado:
- Roughtime sincroniza cada 1 hora, calcula drift vs reloj local
- Cada receipt incluye `metadata.timestamp_source` ("roughtime" o "local") + drift calculado
- Si Roughtime falla, drift = 0 + warning visible

**Estrategia:** Roughtime es suficiente para EU AI Act actual (demostrar reloj no manipulado). RFC 3161 queda como opción post-MVP.

---

### ADR-003 — Zero Data Retention + arquitectura de confianza europea

**Status:** Propuesto · **Deciders:** Yechua (AivoraLabs)

**Problema:** El plan original de almacenar metadata en DynamoDB es barrera de adopción para CTOs europeos (GDPR + soberanía de datos).

**Decisión:** Separación total de planos:
- **Cloud AgentTrail almacena SOLO:** perfiles de cliente, API keys (hashed), contadores de uso mensual
- **Cliente almacena en su infraestructura:** receipts completos en JSONL (S3, GCS, local)
- **Validación de licencia:** Token opaco (HMAC) + contador — AgentTrail nunca ve receipt content ni agentId en texto claro
- **CLI de verificación:** `audit-receipt verify` funciona 100% offline, no llama a ningún servidor

**Consecuencia:** Cambia el modelo de negocio de "data warehouse" a "servicio de licencias + verificación pública".



### 🐛 Bugs Identificados en Código Existente — 2026-06-07 22:47

**Bug 1 — `canonicalJSON` solo ordena claves del nivel superior**  
→ Archivo: `hash-chain.ts` línea 41  
→ Problema: Cuando `payload` tiene `tool_calls` (array de objetos), las claves internas no se ordenan. Dos receipts con mismos datos pero distinto orden de claves producen hashes distintos.  
→ Fix: Función recursiva que ordena claves en todos los niveles anidados.

**Bug 2 — `bytesToBase64` puede causar stack overflow**  
→ Archivo: `signer.ts` línea 52  
→ Problema: `String.fromCharCode(...bytes)` causa RangeError si `bytes.length > 125K`.  
→ Fix: Usar `Array.from(bytes, b => String.fromCharCode(b)).join('')` en lugar del spread operator.

**Estado:** Ambos bugs identificados en SECURITY-REVIEW. Fix documentado pero no aplicado aún en el código.



### 💶 Pricing — Evolución y Modelo — 2026-06-07 22:47

**Investigación de mercado (desk research):**  
→ Rango identificado para nicho: €5k-€20k/año (basado en ComplyJet a $4,999, Sprinto a $15k, Luminos.AI a $19,995).

**Modelo propuesto en outreach (chat de engineering):**  
→ $99/month per agent — pricing más granular que permite escalar por cantidad de agentes.  
→ Ejemplo: 5 agentes = $495/mes (~€5,940/año) — dentro del rango de nicho validado.  
→ Contraste: OneTrust $50k+/año, FireTail $2k-$4k/mes.

**Implicación:** El precio de $99/agent/month es un punto de entrada agresivo vs OneTrust/FireTail, pero requiere volumen para ser rentable. La economía unitaria depende de cuántos agentes por cliente.



### 🏛️ Estructura Legal — Estrategia Europa — 2026-06-07 22:48

**Problema identificado:** CTOs europeos no comprarán compliance tooling de una entidad no-europea (GDPR, soberanía de datos, confianza).

**Decisión ADR-003:** Constituir `AgentTrail OÜ` en Estonia mediante E-Residency:
- Costo: ~€200 setup + ~€300/año en fees administrativos
- Tiempo: 3-5 días hábiles
- Presencia legal en UE sin requerir presencia física
- Domicilio fiscal en la UE → el hecho de operar desde Chile es irrelevante para el cliente
- Permite facturación intra-UE sin VAT complications

**Estado:** Estrategia documentada en ADR-003. Pendiente de constitución efectiva.



### 🎯 Customer Discovery — Progreso — 2026-06-07 22:48

**Pipeline de prospección iniciado mediante vibe-prospecting CLI** — se identificaron los siguientes targets:

### ICP perfecto encontrado: Legora 🇸🇪
- AI para abogados — decisiones legales = Anexo III EU AI Act = **alto riesgo** = audit trails obligatorios
- 1000+ clientes incluyendo firmas enterprise
- Respaldados por Accel, Bessemer, Y Combinator, General Catalyst
- 3 contactos clave identificados con LinkedIn outreach listo:
  - **Jacob Lauritzen** — Head of Engineering (Co-founder/CTO) → ángulo técnico, decisor de SDK
  - **Alex Fortescue-Webb** — Global Head of Legal Engineering → abogado + engineer, entiende compliance
  - **Sebastian Peters** — Director of Legal Engineering (Copenhagen) → EU-based, impacto directo AI Act

### Lead secundario: Bizneo HR 🇪🇸
- Software de RRHH con AI → decisiones de contratación = alto riesgo EU AI Act
- Ya usa Splunk y Datadog → objection handler preparado: "esos logs no generan audit trails legibles para auditor"

### Lead secundario: Shipsy 🇳🇱
- Logística con "Agentic AI at the centre" + Fortune 1000 clients

### Mensajes de Outreach
- Mensajes de LinkedIn personalizados redactados para los 3 contactos de Legora
- Estrategia: connection request (179-196 chars) + follow-up con pain trigger específico

**Estado:** ✅ Pipeline de prospección iniciado. Pendiente de ejecución de outreach y entrevistas.



### 🟢 Brechas Actualizadas — Estado al 2026-06-07 (2da actualización) — 2026-06-07 22:48

**Actualización de brechas tras nueva data de engineering + prospecting:**

### Brechas Originales

1. ❌ **Entrevistas con compliance officers europeos (10-15 mínimo)**  
   → Estado: **NO RESUELTA**. No se ha ejecutado ninguna entrevista aún.

2. ~~❌ **Entrevistas con CIOs/CTOs de mid-market europeo**~~  
   → Estado: **COMPLETADA PARCIALMENTE** ✅↗️  
   → Pipeline de prospección iniciado vía vibe-prospecting CLI. 3 contactos de Legora identificados (Jacob Lauritzen, Alex Fortescue-Webb, Sebastian Peters). Mensajes de LinkedIn redactados.  
   → **Falta**: Ejecutar outreach, obtener respuestas, realizar las entrevistas y documentar hallazgos.

3. ❌ **Validación de disposición a pagar por herramienta de nicho (€5k-€20k/año)**  
   → Estado: **NO RESUELTA**. El pricing de $99/agent/month está propuesto pero no validado con clientes reales.

4. ❌ **Análisis de fracasos concretos de startups similares**  
   → Estado: **NO RESUELTA**. No se ha investigado aún.

### Brechas NUEVAS detectadas en la nueva data:

5. ❌ **Bug#1 canonicalJSON no recursivo** — Fix documentado pero no aplicado.  
6. ❌ **Bug#2 bytesToBase64 stack overflow** — Fix documentado pero no aplicado.  
7. ❌ **Estonia E-Residency** — Estrategia definida pero no constituida.  
8. ❌ **ADR-001 (Compliance Mode)** — Propuesto pero no implementado.  
9. ❌ **ADR-002 (Roughtime)** — Propuesto pero no implementado.  
10. ❌ **ADR-003 (Zero Data Retention)** — Propuesto pero no implementado (cambia modelo de negocio completo).

### Resumen General
| Tipo | Total | Resueltas | Pendientes |
|------|-------|-----------|------------|
| Brechas de validación (customer discovery) | 4 | 1 (parcial) | 3 |
| Brechas de ingeniería (bugs + ADRs) | 5 | 0 | 5 |
| Brechas legales (Estonia OÜ) | 1 | 0 | 1 |
| **TOTAL** | **10** | **1 parcial** | **9** |

**Estado del pipeline:** PAUSADO (validación) + código avanzando en paralelo (ingeniería).



### Filtro Holding & Regulación Chile — 2026-06-07 23:17


## Análisis de Estructura Societaria — AgentTrail

### Estructura Recomendada

```
Chile SpA (Matriz Holding — IP centralizada)
  └── Licencia de IP (Arm's Length) + Management Fee
        └── Estonia OÜ (Filial Directa 99% — cara al cliente EU)
              └── Facturación EUR a clientes B2B
```

**La IP NO puede estar en la OÜ.** Se centraliza en la Matriz SpA chilena y se licencia a la filial. Esto protege el activo en caso de quiebra de la filial, demandas de clientes o disputas regulatorias (Ley N° 20.720).

### Alternativas Evaluadas y Descartadas

| Alternativa | Veredicto | Razón |
|---|---|---|
| SpA → directo a clientes EU | ❌ Descartada | Barrera de confianza: CTOs europeos no compran compliance tooling de entidad no-EU |
| SpA → OÜ → Países Bajos/Luxemburgo | ❌ Sobredimensionado | Costo sin beneficio para una sola filial operativa |
| SpA → Delaware C-Corp → OÜ | ❌ Innecesario | Mercado EU-first desde día 1, costo de mantenimiento injustificado |
| SpA + OÜ como estructuras espejo | ❌ Inviable | Rechazo de inversionistas, pérdida crédito Art. 41 A LIR |

### Implicaciones Fiscales

**CDI Chile-Estonia vigente.** Tasas aplicables:

| Flujo | Tasa |
|---|---|
| Dividendos (≥25% ownership) | 5% WHT Estonia |
| Regalías/Licencias IP | 10% WHT (Art. 12 CDI) |
| Management Fee | 0% WHT (Art. 7 CDI — sin PE) |
| Utilidad retenida en OÜ | 0% CIT Estonia |
| Dividendo distribuido a Chile | ~24% efectivo (20% CIT + 5% WHT) |

**Ventaja fiscal clave:** ~25% de ahorro anual sobre utilidades reinvertidas vs. estructura 100% chilena (IDPC 25-27%).

### VAT Europeo

- Cliente intra-EU: **Reverse charge** — el cliente declara VAT local
- Cliente fuera de EU: 0% VAT
- Umbral registro VAT Estonia: €40,000 anuales (~34 agentes a $99/agent/month)
- OSS recomendado si hay clientes B2C

### Precios de Transferencia

| Flujo | Método | Obligación F-1907 |
|---|---|---|
| Royalty IP (OÜ → SpA) | TNMM o CUP | >$200M CLP/año (~€200K) |
| Management Fee (SpA → OÜ) | Cost Plus 5% | >$200M CLP/año |

### Riesgos Regulatorios

**AgentTrail NO es un sistema de IA de alto riesgo bajo EU AI Act** — es middleware de logging sin modelo ni toma de decisiones. No requiere notificación a la Comisión Europea.

**Riesgos identificados:**
1. **GDPR**: OÜ debe tener DPA con cada cliente. ADR-003 (Zero Data Retention) mitiga al no almacenar datos personales.
2. **Supervisory Authority**: Andmekaitse Inspektsioon (Estonia) — ventajoso vs. BfDI alemana.
3. **Responsabilidad**: La OÜ es la entidad contractual; la IP está protegida en Chile (Matriz Centralizadora).

### Timing de Constitución

| Fase | Acción | Plazo | Costo |
|---|---|---|---|
| Fase 0 — Inmediato | Registrar marca INAPI + DDI + cesión IP devs | 2-4 semanas | ~0,35 UTM + 6-8 UF |
| Fase 1 — Pre-ventas | Constituir/activar SpA o facturar desde Chile | 1-3 semanas | ~€350-600 |
| Fase 2 — 1er cliente pago | E-Residency + OÜ + cuenta bancaria | 4-10 semanas | ~€700-1,100 |
| **Cuello de botella** | Cuenta bancaria OÜ (Wise/LHV/Holvi) | 2-8 semanas | — |

### Costos Operativos Mensuales (etapa temprana)

| Concepto | Chile SpA | Estonia OÜ |
|---|---|---|
| Contabilidad | ~€80-150/mes | €100-300/mes |
| VAT compliance | Incluido | €50-100/mes |
| Virtual office | ~€50/mes | €10-25/mes |
| **Total combinado** | | **~€250-450/mes** |

### Riesgos Altos (requieren acción antes de constituir)

1. **🔴 Cuenta bancaria OÜ**: Contactar Wise Business/LHV antes de pagar constitución. Alternativa: Payabl (Lituania).
2. **🔴 Transfer Pricing**: Contrato de licencia IP + Management Fee por escrito antes de cualquier flujo.
3. **🟡 Sustancia OÜ**: Debe tener director, cuenta bancaria y actividad real. El director puede ser remoto.

### Conclusiones

1. La estructura **Chile SpA → Estonia OÜ** es la correcta y está alineada con la estrategia global del holding.
2. **No avanzar con la OÜ hasta validar customer discovery** — cualquier estructura es prematura sin validación de demanda.
3. **Sí se puede avanzar en paralelo**: registro DDI, cesión IP con devs, y solicitar E-Residency estonia (toma 2-6 semanas y no requiere inversión significativa).
4. El royalty de licencia IP debe definirse (típicamente 2-8% de ingresos brutos para SaaS).



### 📢 Plan de Campaña — Marketing — 2026-06-09 15:20

## 📢 Plan de Campaña — Marketing

**Fecha:** 2026-06-09 | **Estado:** Aprobado (Gate 2)

---

### ICP Final Aprobado

| Dimensión | Target |
|---|---|
| Países | Suecia, Países Bajos, Alemania, España, Dinamarca |
| Roles | Head of Compliance/CCO, CTO/VP Engineering, Head of AI, Head of Legal Engineering |
| Tamaño | 50-500 empleados |
| Industrias | LegalTech, HR Tech, InsurTech, FinTech, Logística con IA |
| Keywords | EU AI Act, AI audit trail, AI compliance, AI governance |

### Segmentación — B2B

| Tier | Lead | Pain Trigger | Canal |
|---|---|---|---|
| T1 | Legora — Jacob Lauritzen (Head of Engineering) | Legal AI = Anexo III, deadline Art. 12 | LinkedIn |
| T1 | Legora — Alex Fortescue-Webb (Global Head Legal Engineering) | Puente legal/engineering, mismo deadline | LinkedIn |
| T1 | Legora — Sebastian Peters (Director Legal Engineering, CPH) | Enforcement danés, misma urgencia | LinkedIn |
| T1 | Bizneo HR (Head of Eng/CTO) | Splunk/Datadog no generan audit trails, HR AI = alto riesgo | LinkedIn |
| T1 | Excelia (CTO/CISO) | OneTrust sobredimensionado (€50K+/año), mid-market exacto | LinkedIn |
| T1 | Mads Juul Eegholm — Velliv (CLO) | Financiera danesa con AI, enforcement EU AI Act | LinkedIn |
| T2 | Oscar González — BC Digital Services (CTO) | CTO con email validado, calificar AI agents | Email + LinkedIn |
| T2 | Dennis G. Jansen — Staffbase (CLO) | AI Law skills, calificar profundidad AI | LinkedIn |
| T2 | Juan Verdú Lázaro — Holcim (Compliance Officer) | Discovery enterprise procurement | LinkedIn |
| T2 | Carmen Morato — AENOR (CLO) | Referencia/credibilidad, no compradora directa | LinkedIn |
| T2 | Shipsy | Logistics agentic AI, señal débil | LinkedIn nurture |
| T3 | JobLeads, leads industriales | Señal insuficiente | Lista fría |

### Creators

| Creator | Subs | Nicho | Acción |
|---|---|---|---|
| GRC Solutions | 14.8K 🇬🇧 | GRC/compliance | DM colaboración → video Art. 12 |
| Responsible AI Studio | 1.15K 🇳🇿 | AI governance | DM guest post |

### Mensajes Clave — Pain Triggers por Lead

- **Legora trio:** "Legal AI = Anexo III alto riesgo. Splunk/Datadog generan logs técnicos, no audit trails legibles para auditor. AgentTrail es SDK open-source con hash chain + zero data retention."
- **Bizneo HR:** "Stack Splunk + Datadog. HR AI = decisiones de contratación = alto riesgo. OneTrust es €50K+/año. AgentTrail desde $99/agent/month."
- **Excelia:** "Ya pagan OneTrust (€50K+/año). Sobredimensionado para mid-market. AgentTrail como alternativa ágil."
- **Mads (Velliv):** "Instituciones financieras con AI en decisiones de inversión = alto riesgo Anexo III. Enforcement danés agresivo."

### Timing

| Semana | Acciones |
|---|---|
| S1 | Connection requests Legora trio + Mads + Bizneo + Excelia + Oscar + Dennis. DM creators |
| S2 | Follow-ups conexiones aceptadas. Email Oscar González |
| S3 | Discovery Holcim/AENOR. Nurture Shipsy. Segunda ronda outreach |

### Métricas de Éxito

| Métrica | Objetivo |
|---|---|
| Connection acceptance rate | >50% |
| Follow-up reply rate | >25% |
| Demo calls booked | ≥3 de Tier 1 |
| Email reply rate (Oscar) | >15% |
| Creator reply rate | >30% |
| Discovery interviews | ≥2 |

### Tools Utilizadas

- `mc_vp_fetch_prospects` — vibeprospecting B2B
- `mc_vp_fetch_businesses` — señales de intención
- `mc_vp_enrich` — enriquecimiento de leads
- `mc_li_profile_search` — LinkedIn profile search (Apify HarvestAPI)
- `mc_li_company_employees` — LinkedIn company employees (Apify HarvestAPI)
- `mc_li_post_search` — LinkedIn post search (Apify HarvestAPI)
- `mc_youtube_search` — YouTube creator discovery
- `mc_apify_search` — Instagram/TikTok creator discovery

