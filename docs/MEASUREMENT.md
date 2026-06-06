# Measurement Framework — AgentTrail

> **Documento de Medición**
> Versión: 1.0
> Basado en: `01-PRD.md`, `02-Technical-Architecture.md`, `03-Data-Schema.md`, `04-Integration-Spec.md`

---

## 1. Technical Metrics

### 1.1 Integration Time (< 30 min target)

| Dimensión | Definición |
|-----------|------------|
| **Definición** | Tiempo desde que un desarrollador ejecuta `npm install @aivoralabs/agenttrail` hasta que el primer receipt JSON aparece en disco en `audit-logs/`. Incluye: instalación, import, configuración del middleware, ejecución de prueba que genera un receipt. Excluye: lectura de documentación, obtención de API keys, configuración de CI/CD. |
| **Métrica exacta** | `T_integration = T_first_receipt - T_npm_install` medido en minutos, cronometrado desde terminal. |
| **Benchmark script** | Script automatizado que ejecuta paso a paso: (1) `npm init -y && npm install @aivoralabs/agenttrail`, (2) escribir archivo minimalista que configura el middleware, (3) ejecutar y verificar que `audit-logs/*.jsonl` existe con al menos 1 receipt. El script reporta tiempo total. Se ejecuta 3 veces con diferentes versiones de Node (20, 22, 23) y se toma la mediana. |
| **Instrumentación** | El `AuditReceipt` constructor registra un evento `sdk.initialized` con timestamp en un log interno. El primer `record()` exitoso emite `receipt.first_generated`. Ambos eventos se exponen vía callback opcional `onMetrics(counter)` para que el script de benchmark los capture. |
| **Success** | P50 < 30 min en la primera ejecución (curva de aprendizaje). P95 < 45 min incluyendo errores de primer uso. |
| **Tracking** | Cada beta client reporta su tiempo de integración vía formulario (Typeform/Notion) o se mide automáticamente si usan el script de benchmark. Se almacena en una planilla con: `client_id`, `node_version`, `framework` (Vercel AI SDK / OpenAI SDK), `time_minutes`, `errors_encountered`. |
| **Trigger de alarma** | Si 2 de 5 beta clients exceden 45 min, se congela el feature set y se investigan bloqueos de adopción. |

### 1.2 Added Latency (< 50ms target)

| Dimensión | Definición |
|-----------|------------|
| **Definición** | Sobrecarga de tiempo que el SDK añade a una llamada típica a un modelo de IA. Se mide como `T_con_SDK - T_sin_SDK` para la misma llamada (mismo input, mismo modelo, misma configuración). |
| **Benchmark script** | Código en `packages/core/__tests__/latency.bench.ts` que ejecuta este protocolo: (1) 10 llamadas de calentamiento (descartadas), (2) 100 llamadas SIN SDK midiendo `performance.now()` antes/después de `chat.completions.create()`, (3) 100 llamadas CON SDK (mismo input, mismo modelo, mismo seed), (4) reporta p50, p95, p99 de la diferencia. Las llamadas son a un modelo real con input controlado (ej. "Say 'hello' and nothing else" para minimizar variabilidad del LLM). Se usa `openai/gpt-4o-mini` por consistencia. |
| **Qué medir exactamente** | `latency_added = (response_time_with_sdk - response_time_without_sdk)` para cada par. No es la latencia total de la llamada (que depende del modelo), sino el delta. |
| **Instrumentación** | El middleware acepta un flag `metrics: { emitPerformanceMetrics: true }` que hace que cada `record()` calcule y emita `_sdk_overhead_ms` en metadata. Esto permite monitoreo en producción sin scripts externos. |
| **Success** | P95 < 50ms. Target stretch: P99 < 100ms. |
| **Justificación del target** | La arquitectura técnica (sección 9) reporta < 100μs para el receipt completo (hash + firma + serialización). El cuello de botella real es la serialización JSON de payloads grandes. 50ms de margen es conservador para MVP y deja espacio para operaciones de I/O de disco. |
| **Trigger de alarma** | Si p95 excede 100ms en producción para cualquier cliente beta, se investiga inmediatamente. Si excede 200ms, se considera bloqueante para el release. |

### 1.3 Immutability (100% verifiable)

| Dimensión | Definición |
|-----------|------------|
| **Definición** | Capacidad del sistema para detectar cualquier modificación no autorizada en los receipts. Se verifica mediante hash chain: si un solo byte de cualquier receipt se altera, el hash de ese receipt deja de coincidir y todos los receipts posteriores también fallan. |
| **Test de alteración** | Script automatizado que: (1) genera una cadena de 10 receipts con datos realistas, (2) copia la cadena, (3) modifica un solo byte en posiciones específicas (primer byte del payload, último byte, byte en medio de un hash, byte en un timestamp), (4) ejecuta `verifyChain()` sobre la cadena modificada, (5) verifica que retorna `false`. Se prueba cada posición de modificación por separado. |
| **Casos de prueba específicos** | (a) Modificar 1 byte en `payload.input` del receipt #3 → toda la cadena debe fallar. (b) Modificar 1 byte en `hash` del receipt #5 → ese receipt y todos los posteriores fallan. (c) Eliminar un receipt del medio de la cadena → `prev_hash` del siguiente no coincide. (d) Reordenar receipts → el `prev_hash` deja de apuntar al anterior. (e) Reemplazar un receipt por otro válido pero de otra cadena → `prev_hash` no coincide. |
| **Success** | 100% de los casos de prueba pasan. CERO falsos negativos: ninguna alteración detectable pasa desapercibida. |
| **Falsos positivos tolerables** | Si `verifyChain()` falla por corrupción del archivo JSONL (no por alteración maliciosa), se considera falso positivo. El sistema debe distinguir entre: (1) archivo corrupto (formato JSON inválido → error de parseo, reportar como "corrupted", no "tampered"), (2) hash mismatch (alteración real → reportar como "tampered"), (3) firma inválida (clave incorrecta → reportar como "forged"). El test debe verificar los tres casos. |
| **CI Gate** | El test de alteración se ejecuta en CI (GitHub Actions) en cada PR. Si falla, el PR no se mergea. |

---

## 2. Business Metrics

### 2.1 Falso Positivo Definition

#### Producto — Audit trail alarms

| Contexto | Definición de FP |
|----------|------------------|
| **¿Qué es una señal positiva?** | El hash chain detecta una alteración y el sistema genera una alarma al desarrollador/compliance officer. |
| **Falso positivo** | El sistema reporta "chain integrity breached" pero el receipt no fue alterado. Causas posibles: bug en el algoritmo de canonical JSON (dos representaciones del mismo JSON producen distintos hashes — ej. cambio de orden de claves que no se normalizó correctamente), corrupción del archivo JSONL por corte de escritura (crash a mitad de `append`), diferencia de encoding (UTF-8 vs ASCII en el mismo string), o diferencia en el formato de timestamp entre máquinas. |
| **Impacto del FP** | El compliance officer investiga una falsa alarma → pierde confianza en el sistema → eventualmente ignora alarmas reales (efecto "cry wolf"). Para MVP, tasa de FP debe ser < 0.1% de receipts verificados. |
| **Mitigación** | El schema especifica JSON canónico con orden lexicográfico de claves (03-Data-Schema.md, principio #2). El test de alteración debe incluir casos de canonical JSON vs no-canonical para asegurar que inputs no-canónicos se rechazan. En producción, si `verifyChain()` detecta una ruptura, el sistema debe re-verificar con parseo relajado antes de alarmar. |

#### Sales — PMF signals

| Contexto | Definición de FP |
|----------|------------------|
| **¿Qué es una señal positiva?** | Un lead firma contrato, instala el SDK, genera receipts reales. |
| **Falso positivo** | Un lead se registra, instala el SDK, genera receipts de prueba ("hello world") y nunca escala a producción. Las métricas muestran "3 clientes activos" pero 0 tienen agentes en producción real. El equipo celebra tracción que no existe. |
| **Indicadores de FP** | (a) Receipts con input "test" o "hello" > 50% del total. (b) Agente activo por < 48 horas desde instalación. (c) Receipts generados solo en horario laboral del vendor (no del cliente, sugiere demo). (d) Volumen de receipts < 10/día consistente (no hay uso real). |
| **Mitigación** | Definir "cliente activo" como: (1) >= 100 receipts válidos, (2) distribuidos en >= 3 días diferentes, (3) inputs no-triviales (longitud > 20 chars). Estas tres condiciones juntas filtran demos y pruebas. |
| **Trigger de alarma** | Si el equipo reporta "N clientes activos" pero > 30% no cumplen las 3 condiciones, es hora de redefinir el criterio de activación en las métricas semanales. |

#### Compliance — Auditor reviewing receipts

| Contexto | Definición de FP |
|----------|------------------|
| **¿Qué es una señal positiva?** | Un auditor externo revisa un receipt y confirma que cumple con el Artículo 12 del EU AI Act. |
| **Falso positivo** | El equipo cree que el receipt es compliance-grade (hash chain intacto, firma válida, timestamps, payload completo) pero el auditor lo rechaza por: (a) falta de campo obligatorio no contemplado en el schema V1, (b) redacción de PII demasiado agresiva que elimina contexto necesario, (c) formato de exportación que el auditor no puede abrir, (d) falta de anclaje temporal externo (RFC 3161) que el auditor exige — el receipt es técnicamente correcto pero legalmente insuficiente. |
| **Impacto del FP** | Falsa confianza en compliance. El cliente asume que está cubierto pero una auditoría real revela deficiencias. Riesgo de multa y pérdida de credibilidad del producto. |
| **Mitigación** | El MVP documenta explícitamente (en el receipt y en la documentación) qué requisitos del Artículo 12 cubre y cuáles NO cubre. El CLI `verify` incluye un modo `--auditor-report` que enumera: campos presentes, campos ausentes, limitaciones conocidas. Esto evita que el cliente asuma compliance completo. |

### 2.2 Day 7 Targets

| Métrica | Target Day 7 | Definición | Cómo se mide |
|---------|-------------|------------|--------------|
| **Receipts generados** | > 500 | Receipts totales acumulados entre todos los beta clients. Cada receipt se cuenta una vez. | Suma de `count(receipt_id)` en todos los archivos JSONL reportados. Los clientes pueden optar por enviar métricas agregadas (no los receipts mismos) mediante un heartbeat opcional. |
| **Unique agent_ids** | > 5 | Agentes distintos monitoreados, identificados por `agent_id` en los receipts. Misma empresa puede tener múltiples agent_ids. | SELECT DISTINCT agent_id de los heartbeats recibidos. |
| **Tasa de integración completa** | > 60% | Porcentaje de leads que completaron la instalación y generaron al menos 1 receipt válido, sobre el total de leads que solicitaron acceso beta. | `clients_con_receipt / clients_que_pidieron_acceso * 100`. Se mide con un webhook opcional al momento de `npm install` (pérdida de privacidad: el cliente debe consentir). Alternativa: formulario de autoevaluación. |
| **Support tickets** | < 3 | Tickets de soporte técnico relacionados con instalación, configuración, o errores del SDK. Excluye tickets de feature requests o preguntas sobre pricing. | Conteo en el canal de soporte (Discord/Slack/Email) categorizado manualmente al cierre. |

**Racional de los targets**: Basado en 3-5 beta clients (PRD sección 5.2) generando ~100-200 receipts/día en pruebas y uso ligero. 500 receipts en 7 días es ~70 receipts/día/client, consistente con agentes en staging/pre-prod.

### 2.3 Day 30 Targets

| Métrica | Target Day 30 | Definición | Cómo se mide |
|---------|--------------|------------|--------------|
| **Instalaciones activas** | > 5 | Clientes que han generado receipts en los últimos 7 días. No basta con haber instalado. | Heartbeat diario que reporta: `{ agent_id, receipts_count, last_receipt_timestamp, sdk_version }`. Se considera activo si `last_receipt_timestamp` < 7 días. |
| **Receipts totales** | > 3,000 | Receipts acumulados desde Day 0. Premisa: ~5 clientes activos × ~20 receipts/día × 30 días = 3,000. Si un cliente escala a producción, este número debe ser mayor. | Misma mecánica que Day 7. |
| **Chain verification success rate** | > 99.9% | Porcentaje de receipts que pasan `verifyChain()` sin errores. Se verifica al exportar o al hacer auditoría interna. | `receipts_con_chain_valido / total_receipts * 100`. El equipo ejecuta semanalmente `audit-receipt verify` sobre los logs de un cliente beta (con su consentimiento). |
| **Feedback de compliance** | ≥ 1 feedback positivo | Al menos 1 compliance officer o auditor externo confirma que el receipt es útil y comprensible. | Entrevista estructurada de 30 min con el compliance officer. Criterio de éxito: (1) entiende qué pasó en la interacción, (2) entiende que el hash chain garantiza integridad, (3) confirmaría por escrito que "esto es útil para una auditoría del Artículo 12". |
| **Churn rate** | 0% | Clientes beta que desinstalan o dejan de generar receipts sin aviso. | Si un cliente no envía heartbeat por 14 días consecutivos, se contacta para entender por qué. |

### 2.4 PMF Signals

#### Weak signals (sugieren dirección correcta, no confirman)

| Señal | Qué observar | Por qué es débil |
|-------|-------------|------------------|
| **Instalación sin soporte** | Un lead instala el SDK sin contactar al equipo. | Puede ser un curioso, no un comprador. |
| **Feedback positivo en demo** | "Esto es justo lo que necesitamos" en llamada de ventas. | Cortesía profesional. El 80% de los prospects dicen esto y no compran. |
| **Receipts en staging** | Cliente genera receipts pero no en producción. | Staging no paga. Producción paga. |
| **Feature requests específicas** | "Necesito exportación PDF" o "¿Soporta Anthropic?" | Indica interés genuino pero también que el producto actual no es suficiente. |
| **Un cliente recomienda a otro** | Referral inbound sin pedirlo. | Señal temprana de que algo están haciendo bien. |

#### Strong signals (indican que el producto resuelve un problema real)

| Señal | Qué observar | Confirmación |
|-------|-------------|--------------|
| **Producción real** | Cliente migra de staging a producción con agentes reales atendiendo usuarios reales. | Se verifica por volumen de receipts (> 100/día), inputs no triviales, y agent_id con nombres de producción (no "test", "demo"). |
| **Compra sin descuento** | Cliente beta acepta pagar $99/mes/agente sin negociar. | Factura emitida y cobrada. El precio es el publicado, no discount. |
| **Auditor acepta receipt** | Compliance officer externo confirma que el receipt es válido para Artículo 12. | Email o documento escrito del auditor. No feedback verbal. |
| **Integración interna** | Cliente construye tooling propio alrededor del SDK (scripts de exportación, dashboards internos, integraciones CI/CD). | Se detecta por patrones de uso: llamadas frecuentes a `exportJSON()`, múltiples agent_ids, metadata personalizada. |
| **Reinstalación después de caída** | Cliente cuyo agente dejó de generar receipts (por bug o deploy) y voluntariamente lo reinstala sin que el equipo lo contacte. | Heartbeat muestra gap > 48h y luego reanudación sin intervención del equipo de AgentTrail. |

#### Critical mass thresholds (lo que necesitamos para levantar ronda/contratar)

| Threshold | Métrica compuesta | Condición |
|-----------|-------------------|-----------|
| **Minimal** (validar problema) | 3 clientes en producción, 1 confirmación de auditor | Suficiente para PRD seeded round o angel. El producto resuelve un problema real para al menos 3 empresas. |
| **Growth** (validar solución) | 10 clientes pagando, < 5% churn mensual, NPS > 30 | Suficiente para Seed/Series A. El producto no solo resuelve el problema, sino que la gente paga por él y no se va. |
| **Scale** (validar mercado) | 50 clientes pagando, $50k MRR, > 100k receipts/día procesados | Suficiente para Series A. Existe un mercado real, no solo early adopters. |

---

## 3. Suggested Dashboard

### Tools (Free Tier for MVP)

| Herramienta | Uso | Free tier |
|-------------|-----|-----------|
| **PostHog** | Eventos de producto (instalaciones, receipts, errores). Auto-captura de usage patterns. | 1M eventos/mes gratis. Self-hosted opción ilimitada. |
| **Metabase** | Dashboard interno sobre DB de métricas. Queries SQL directly. | Open source, self-hosted gratis. |
| **GitHub Projects / Notion** | Tracking de hitos y targets semanales. Kanban de bugs y features. | Incluido en GitHub Free / Notion Free. |
| **Google Sheets** | Planilla compartida para métricas de beta clients (tiempo de integración, feedback). | Gratis. |
| **Healthchecks.io** | Heartbeat de agentes: si un agente deja de reportar, salta alerta. | 20 checks gratis. |
| **Uptime Robot** | Monitoreo de heartbeat endpoint. | 50 monitores gratis. |

### Charts / Graphs

| Gráfico | Datos | Frecuencia | Propósito |
|---------|-------|-----------|-----------|
| **Receipts over time** | Eje X: días desde launch. Eje Y: receipts acumulados (stacked por cliente). | Actualización diaria. | Ver tracción general. Una curva plana = nadie usa el producto. |
| **Active installations** | Eje X: semanas. Eje Y: número de agent_ids únicos que reportaron heartbeat en los últimos 7 días. | Semanal. | Ver adopción real. Si sube, el producto se usa. Si baja, algo pasa. |
| **Integration time funnel** | Pipeline: (1) leads que pidieron beta → (2) instalaron npm → (3) generaron primer receipt → (4) generaron > 100 receipts → (5) en producción. | Semanal. | Identificar dónde se pierden los leads. Si (2)→(3) es < 50%, la documentación o el SDK tienen fricción. |
| **Latency p95 scatter** | Eje X: fecha. Eje Y: p95 de `_sdk_overhead_ms`. Un punto por deployment. | Por release. | Ver si nuevas versiones degradan performance. |
| **Chain verification pass rate** | Eje X: semanas. Eje Y: % de cadenas verificadas exitosamente. Línea roja en 99.9%. | Semanal. | Detectar si bugs introducen falsos positivos de integridad. |
| **Support tickets by category** | Stacked bar: installation / runtime / export / other. | Semanal. | Identificar qué duele más a los usuarios. |

### Cadence

| Frecuencia | Qué se revisa | Quién |
|-----------|--------------|-------|
| **Diario (auto)** | Heartbeat de agentes, alertas de Healthchecks.io, errores en logs. | CI / Monitoreo. Nadie revisa manualmente. |
| **Semanal** | Dashboard de métricas (receipts, active installations, integration funnel). Targets de Day 7/Day 30 vs real. | Founder + dev. Se revisa en Monday async. |
| **Quincenal** | Feedback de clientes (entrevistas, tickets, feature requests). PMF signal review (weak vs strong). | Founder. Se decide si pivotear o perseverar. |
| **Mensual** | Reporte de métricas a advisors/inversores. Churn, NPS, revenue (si aplica). | Founder. |
| **Post-release** | Benchmark de latencia e integración completo. | Dev. Se ejecuta después de cada release que toque el core. |

---

## 4. Risks

| Riesgo | Probabilidad | Impacto | Descripción | Mitigación |
|--------|-------------|---------|-------------|------------|
| **Auto-reporting bias** | Alta | Medio | Las métricas dependen de heartbeats voluntarios. Clientes pueden no enviarlos o enviarlos incorrectamente. Los datos serán incompletos. | Métricas son complementarias, no la fuente de verdad. El equipo debe mantener contacto directo con cada beta client (entrevistas semanales/quincenales). Nunca tomar decisiones basadas solo en dashboards sin validación cualitativa. |
| **Datos insuficientes en Day 7/30** | Alta | Alto | Si los beta clients son lentos en integrarse, los targets numéricos se quedan cortos. No es necesariamente señal de fracaso — puede ser que el ciclo de integración es más largo de lo esperado. | Los targets son aspiracionales. Si no se cumplen, el equipo investiga por qué: (a) el producto es muy complejo de instalar, (b) el problema no duele lo suficiente, (c) el target customer no es el correcto. La respuesta es "investigar, no alarmarse". |
| **Falsos positivos de integridad** | Media | Alto | Si `verifyChain()` produce falsos positivos (reporta alteración cuando no la hay), el compliance officer pierde confianza y el producto pierde su propuesta de valor central. | El test de alteración en CI debe cubrir canonical JSON edge cases. En producción, una doble verificación con parseo relajado antes de emitir la alarma. Documentar la distinción entre "corrupted", "tampered", y "forged" (sección 1.3). |
| **Hawthorne effect (beta)** | Alta | Medio | Los beta clients saben que están siendo observados y pueden comportarse de manera no representativa: integran más rápido, usan más el producto, reportan menos problemas. Las métricas de beta no predicen métricas de mercado abierto. | No extrapolar métricas de beta a proyecciones de mercado. Usar beta para aprender, no para validar tamaño de mercado. Documentar explícitamente "esto es con 3-5 clientes que nos quieren ayudar". |
| **Cliente beta fantasma** | Media | Medio | Un cliente "activo" que en realidad solo generó receipts de prueba el primer día. Infla métricas de adopción. | Aplicar el filtro de 3 condiciones: >= 100 receipts, >= 3 días distintos, inputs > 20 chars. Revisar semanalmente quién califica como activo real. |
| **Latencia variable por dependencias externas** | Media | Bajo | La latencia añadida depende de la velocidad de I/O del disco local. SSD vs HDD, sistema de archivos, carga del sistema. Benchmarks pueden no reflejar condiciones reales del cliente. | El benchmark script debe ejecutarse en un entorno controlado (GitHub Actions runner) pero también reportar el hardware subyacente. En producción, la métrica `_sdk_overhead_ms` se reporta por cliente para detectar outliers. |
| **Confusión de unidad económica** | Media | Alto | La métrica "receipts generados" puede confundirse con "valor para el cliente". Más receipts no significa más valor — puede significar más ruido. Un cliente que genera 10k receipts de autotest no vale más que uno que genera 100 receipts de producción real. | Separar "receipts totales" (métrica de volumen) de "clientes activos en producción" (métrica de salud). Nunca reportar receipts como proxy de revenue o engagement. La unidad económica real es "agente monitoreado en producción", no "receipt". |
| **Time-to-validation too long** | Media | Alto | El feedback de compliance (Day 30 target) depende de que un auditor externo revise los receipts. Los auditores no trabajan en semanas beta — pueden tardar meses. El target Day 30 puede ser poco realista. | Preparar un "auditor pack" (guía de 5 páginas + 3 receipts de ejemplo + script de verificación) que el compliance officer pueda entregar a su auditor. Si no hay feedback en Day 30, no es fracaso — es que el ciclo auditor es más largo. Ajustar expectativas en el roadmap. |
