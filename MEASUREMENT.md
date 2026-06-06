# Measurement Framework — AgentTrail

## 1. Technical Metrics

### 1.1 Integration Time (< 30 min target)

**Definición**: Tiempo desde `npm install @aivoralabs/agenttrail` hasta que se genera el primer receipt verificable.

**Measurement method**:
1. Script `scripts/benchmark-integration.sh` que:
   - Cronometra `npm install`
   - Cronometra integración con OpenAI wrapper
   - Cronometra primer receipt generado
   - Cronometra verificación del receipt
2. Ejecutar en CI semanalmente con un entorno limpio (Docker clean)
3. Ejecutar en diferentes OS (Ubuntu, macOS, Windows)

**Success criteria**:
- Tiempo total < 30 minutos para un desarrollador experado
- Tiempo de instalación < 3 minutos
- Tiempo de integración < 25 minutos (incluyendo tiempo de lectura de docs)

### 1.2 Added Latency (< 50ms target)

**Definición**: Sobrecarga añadida por el SDK middleware por cada llamada a LLM.

**Benchmark script design**:
```typescript
// scripts/benchmark-latency.ts
import { performance } from 'node:perf_hooks';
import { AuditReceipt } from '@aivoralabs/agenttrail';

const auditor = new AuditReceipt({ agentId: 'benchmark' });
const iterations = 1000;

// Benchmark sin SDK
const startWithout = performance.now();
for (let i = 0; i < iterations; i++) {
  await mockLLMCall();
}
const timeWithout = performance.now() - startWithout;

// Benchmark con SDK
const startWith = performance.now();
for (let i = 0; i < iterations; i++) {
  await mockLLMCall();
  await auditor.record({...});
}
const timeWith = performance.now() - startWith;

const overheadPerCall = (timeWith - timeWithout) / iterations;
console.log(`SDK overhead per call: ${overheadPerCall.toFixed(2)}ms`);
```

**Measurement method**:
- Ejecutar en CI con `vitest bench` o script dedicado
- Medir p50, p95, p99 del overhead
- Ejecutar en diferentes hardware (low-end, mid, high-end)

**Success criteria**:
- p95 overhead < 50ms
- p99 overhead < 100ms
- No regression > 10% entre versiones

### 1.3 Immutability (100% verifiable)

**Definición**: Cualquier alteración a nivel byte de un receipt rompe la cadena de hash.

**Test design**: 5 casos de prueba de alteración:
1. Modificar un carácter en `input`
2. Modificar un carácter en `output`
3. Cambiar `model`
4. Modificar `timestamp_start`
5. Modificar `prev_hash`

Cada caso debe:
- Generar una cadena válida de 3 receipts
- Alterar un campo del receipt #2
- Verificar que `verifyChain()` retorna `false`

**Success criteria**:
- Todos los 5 tests de alteración pasan
- `verifyChain()` retorna `false` para cada alteración
- Tests ejecutados en CI en cada PR

---

## 2. Business Metrics

### 2.1 Falso Positivo Definition

#### En Producto (audit trail alarms)
Un falso positivo es una alarma de integridad del hash chain que se dispara por un bug del SDK (no por alteración real del receipt). Ejemplo: canonical JSON roto genera hashes diferentes para payloads idénticos → `verifyChain()` retorna `false` cuando no hubo alteración.

**Cómo mitigar**: Tests de regresión en CI que verifican cadenas conocidas válidas.

#### En Ventas (PMF signals)
Un falso positivo es un signup que parece indicar demanda pero no conduce a receipts generados. Ejemplo: un CTO firma para probar pero nunca integra el SDK → no es un verdadero usuario activo.

**Cómo medir**: Trackear `integration completion rate` — cuántos de los que instalan llegan a generar el primer receipt.

#### En Compliance (auditor reviewing receipts)
Un falso positivo es un auditor que acepta como válido un receipt que tiene defectos no detectados. Ejemplo: hash chain verifica pero el receipt no contiene suficiente información para Article 12.

**Cómo mitigar**: Validación de schema del receipt contra los requisitos del Artículo 12.

### 2.2 Day 7 Targets

| Métrica | Target | Cómo medir |
|---------|--------|------------|
| Receipts generados | 500+ | Conteo de receipts en almacenamiento |
| Agent IDs únicos | 5+ | Conteo de agent_id distintos |
| Integration completion rate | 60%+ | (instalaciones con primer receipt) / instalaciones totales |
| Support tickets | < 3 | Conteo de issues en GitHub |

### 2.3 Day 30 Targets

| Métrica | Target | Cómo medir |
|---------|--------|------------|
| Instalaciones activas | 5+ | Agents con receipts en últimos 7 días |
| Receipts totales | 3,000+ | Conteo acumulado |
| Chain verification success rate | 99.9%+ | (receipts válidos) / (receipts totales) |
| Feedback de auditor | 1+ confirmación | Entrevista con compliance officer |

### 2.4 PMF Signals

#### Weak Signal (estamos en la dirección correcta)
- 3+ CTOs aceptan connection en LinkedIn
- HN post > 50 upvotes
- Reddit discussion > 10 comments
- Alguien dice "esto es exactamente lo que necesito"

#### Strong Signal (hay demanda real)
- 5+ empresas prueban el SDK (aunque sea gratis)
- 1+ empresa paga por el servicio
- Alguien recomienda AgentTrail a otro CTO sin que lo pidamos
- Un auditor confirma que el receipt es útil

#### Critical Mass (PMF declarado)
- 10+ empresas activas
- 10,000+ receipts generados
- 1+ case study publicado por un cliente
- Retención mes a mes > 80%

---

## 3. Suggested Dashboard

### 3.1 Tools (Free Tier for MVP)

| Tool | Uso | Tier |
|------|-----|------|
| **PostHog** | Analytics de integración, métricas de uso | Free (1M events/month) |
| **GitHub Issues** | Tracking de bugs y feature requests | Free |
| **Metabase** | Dashboard de métricas de negocio | Free (local) |
| **Healthchecks.io** | Monitoring de uptime del sistema | Free (20 checks) |

### 3.2 Charts/Graphs

1. **Receipts over time** (daily line chart) — trending up = good
2. **Unique agent_ids over time** (daily line chart) — trending up = good
3. **Latency p50/p95/p99** (histogram) — should stay under 50ms p95
4. **Error rate in middleware** (daily line chart) — should be 0
5. **Chain verification pass rate** (daily line chart) — should be 100%
6. **Integration completion funnel** (funnel chart) — install → first receipt → daily use

### 3.3 Cadence

| Métrica | Frecuencia | Quién revisa |
|---------|------------|-------------|
| Receipts generados | Diario | Dashboard automático |
| Latency benchmarks | Semanal | CI pipeline |
| Chain verification rate | Diario | Dashboard automático |
| Integration completion | Semanal | Founder |
| Customer feedback | Quincenal | Founder |
| Full review | Mensual | Founder + advisor |

---

## 4. Risks

1. **Auto-reporting bias**: Las métricas auto-reportadas pueden estar sesgadas. Mitigar con métricas externas (GitHub stars, npm downloads).
2. **Insufficient data**: Con < 5 usuarios, las métricas no son estadísticamente significativas. Mitigar con entrevistas cualitativas.
3. **False positives en métricas**: Un test que genera receipts automáticamente infla el conteo sin反映ar uso real.
4. **Hawthorne effect**: Los usuarios saben que están siendo medidos → comportamiento diferente. Mitigar con métricas pasivas.
5. **Ghost clients**: Empresas que instalan pero nunca usan. Mitigar con tracking de actividad real.
6. **Unit economics confusion**: Confundir "receipts generados" con "valor percibido". Mitigar con métricas de satisfacción.
7. **Measurement overhead**: El propio tracking puede añadir latencia. Mitigar con métricas async.
8. **Tool sprawl**: Usar demasiadas herramientas de tracking. Mitigar consolidando en PostHog.
9. **Data retention**: Los receipts contienen datos sensibles. Mitigar con políticas de retención claras.
