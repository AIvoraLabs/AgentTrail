# 🧪 AgentTrail — Guía de Tests de Compliance

Guía completa para ejecutar y entender los tests de compliance del SDK AgentTrail.

---

## Requisitos previos

| Requisito | Versión mínima | Verificar |
|-----------|---------------|-----------|
| Node.js | 22 LTS | `node --version` |
| pnpm | 9+ | `pnpm --version` |
| Groq API Key | — | `console.groq.com` (gratis) |

### Obtener tu API Key de Groq

1. Ir a [console.groq.com](https://console.groq.com)
2. Crear cuenta (gratis)
3. Ir a **API Keys** → **Create API Key**
4. Copiar la key (empieza con `gsk_`)
5. Agregarla al `.env` del proyecto:

```bash
GROQ_API_KEY=gsk_tu_key_aqui
```

---

## Cómo ejecutar los tests

### Todos los tests (todos los paquetes)

```bash
pnpm test
```

Ejecuta los tests de `core`, `openai`, `vercel-ai` y `cli`.

### Solo tests del core (incluye E2E con Groq)

```bash
pnpm --filter @aivoralabs/agenttrail test
```

### Solo una suite específica

```bash
# Suite 8: E2E con LLM real (Groq)
pnpm --filter @aivoralabs/agenttrail test -- --reporter=verbose real-llm-e2e

# Suite 12: Multi-provider ICP
pnpm --filter @aivoralabs/agenttrail test -- --reporter=verbose icp-multi-provider

# Suite 9: Concurrencia
pnpm --filter @aivoralabs/agenttrail test -- --reporter=verbose concurrency

# Suite 10: Formatos reales
pnpm --filter @aivoralabs/agenttrail test -- --reporter=verbose real-formats
```

### Tests de volumen (stress)

```bash
# Activar en .env
RUN_STRESS_TESTS=1

# Ejecutar
pnpm --filter @aivoralabs/agenttrail test -- --reporter=verbose volume-stress
```

### Script rápido de E2E

```bash
./e2e-test.sh           # Resumen
./e2e-test.sh --verbose # Detallado
```

---

## Qué esperar en la terminal

### Salida típica (sin API key)

```
 ✓ __tests__/validate.test.ts (31 tests)        18ms
 ✓ __tests__/hash-chain.test.ts (15 tests)       15ms
 ↓ __tests__/e2e/real-llm-e2e.test.ts (5 tests | 5 skipped)
 ↓ __tests__/e2e/icp-multi-provider.test.ts (4 tests | 4 skipped)
 ↓ __tests__/e2e/volume-stress.test.ts (5 tests | 5 skipped)
 ...
 Test Files  11 passed | 3 skipped (14)
      Tests  163 passed | 14 skipped (177)
```

### Salida típica (con GROQ_API_KEY)

```
 ✓ __tests__/validate.test.ts (31 tests)         18ms
 ↓ __tests__/e2e/volume-stress.test.ts (5 skipped)     # Requiere RUN_STRESS_TESTS=1
 ✓ __tests__/e2e/real-llm-e2e.test.ts (5 tests)        # ← AHORA CORREN
 ✓ __tests__/e2e/icp-multi-provider.test.ts (4 tests)  # ← AHORA CORREN
 ...
 Test Files  11 passed | 1 skipped (14)
      Tests  168 passed | 5 skipped (177)
```

### Leyenda de símbolos

| Símbolo | Significado |
|---------|------------|
| `✓` | Test pasó |
| `×` | Test falló |
| `↓` | Test saltado (skip) |
| `❯` | Suite con fallos (muestra los tests que fallaron) |

---

## Qué caso de uso cubre cada suite

| Suite | Archivo | Caso de uso ICP | Qué prueba |
|-------|---------|----------------|-----------|
| 1 | `validate.test.ts` | Todos | Validación de input, metadata, interacciones |
| 2 | `hash-chain.test.ts` | Todos | Encadenamiento SHA-256, integridad del chain |
| 3 | `storage.test.ts` | Todos | Escritura/lectura de receipts en disco |
| 4 | `redact.test.ts` | Bizneo HR | Redacción automática de PII (emails, phones, SSN) |
| 5 | `receipt.test.ts` | Todos | Construcción y estructura de receipts |
| 6 | `signer.test.ts` | Legora, Velliv | Firma digital Ed25519 y verificación |
| 7 | `errors.test.ts` | Todos | Manejo de errores y códigos de error |
| **8** | **`real-llm-e2e.test.ts`** | **Todos** | **E2E con Groq real: Q&A, streaming, tool calling, multi-turn** |
| 9 | `concurrency.test.ts` | Mid-market | Múltiples agentes concurrentes sin corrupción |
| 10 | `real-formats.test.ts` | Todos | Formatos reales de LLM (JSON, markdown, código) |
| **11** | **`volume-stress.test.ts`** | **Production** | **100+ receipts, rendimiento, sin memory leaks** |
| **12** | **`icp-multi-provider.test.ts`** | **Legora/Bizneo/Velliv** | **3 agentes ICP con chains independientes verificables** |

### Detalle de las suites E2E (8 y 12)

#### Suite 8: Real LLM E2E

| Test | Qué hace | Tiempo típico |
|------|---------|--------------|
| 8.1 Simple Q&A | Llama a Groq → receipt → chain intact | ~700ms |
| 8.2 Streaming | Stream real → accumulated output → receipt | ~300ms |
| 8.3 Tool calling | Function call → tool_calls en metadata | ~300ms |
| 8.4 Multi-turn | 3 llamadas secuenciales → hash chain linkage | ~1.5s |
| 8.5 Invalid key | API key inválida + strict → ComplianceError | ~80ms |

#### Suite 12: ICP Multi-Provider

| Test | ICP | Qué simula |
|------|-----|-----------|
| 12.1 Legora | Legal AI | Consulta legal con tool calling para análisis regulatorio |
| 12.2 Bizneo HR | HR AI | Evaluación de candidato con PII (email, nombre) |
| 12.3 Velliv | Financial AI | Asesoría de inversión con check de compliance |
| 12.4 verifyChains | Todos | Verifica que las 3 cadenas son independientes y válidas |

---

## Cómo leer los resultados de los receipts

### Estructura de un receipt

```json
{
  "receipt_id": "rcpt_01JXQK2M8A9D7F6B3E5G4H2J1",
  "agent_id": "legora-legal-ai",
  "timestamp": "2026-06-09T19:00:00.000Z",
  "prev_hash": null,
  "hash": "a1b2c3d4e5f6...",
  "payload": {
    "input": "[{\"role\":\"user\",\"content\":\"...\"}]",
    "output": "Based on EU AI Act Article 12...",
    "model": "llama-3.3-70b-versatile",
    "provider": "openai",
    "tokens_total": 245
  },
  "signature": null
}
```

### Campos clave

| Campo | Significado |
|-------|------------|
| `receipt_id` | ID único del receipt (UUID v7) |
| `agent_id` | Identificador del agente que generó el receipt |
| `hash` | SHA-256 del receipt actual (cadena con el anterior) |
| `prev_hash` | Hash del receipt anterior (`null` si es el primero) |
| `payload.input` | Input enviado al LLM (serializado) |
| `payload.output` | Output recibido del LLM |
| `payload.tokens_total` | Total de tokens consumidos |

### Verificación de integridad

Un receipt es válido cuando:
1. `hash` === SHA-256 del contenido del receipt
2. `prev_hash` === `hash` del receipt anterior (o `null` si es el primero)
3. No hay gaps en la cadena

### Verificar manualmente

```bash
# Verificar un solo receipt
pnpm --filter @aivoralabs/agenttrail-cli verify /ruta/al/receipt.json

# Verificar toda una cadena
pnpm --filter @aivoralabs/agenttrail-cli verify /ruta/al/directorio/
```

---

## Interpretación de resultados

### ✅ PASS

El test verificó que:
- El receipt se generó correctamente
- El hash chain está intacto
- La metadata es válida
- La firma es correcta (cuando aplica)

### ❌ FAIL

Posibles causas:
- **"Receipt recording failed"**: El SDK no pudo generar el receipt (metadata inválida, storage error)
- **"expected error to be instance of ComplianceError"**: El error no fue envuelto correctamente
- **"expected undefined to be true"**: La función retornó un resultado inesperado

### ⏭ SKIP

El test se saltó porque:
- **Suites 8/12**: `GROQ_API_KEY` no está configurada
- **Suite 11**: `RUN_STRESS_TESTS` no está configurada

---

## Troubleshooting

### "SKIP" en suites 8/12

```bash
# Verificar que la key está en .env
grep GROQ_API_KEY .env

# Si no está, agregarla
echo 'GROQ_API_KEY=gsk_...' >> .env
```

### Timeouts (> 30 segundos)

La API de Groq puede estar lenta. Reintentar:
```bash
pnpm --filter @aivoralabs/agenttrail test
```

### Rate limits (429)

Groq tiene rate limits en el tier gratuito:
- **Tier gratuito**: 30 requests/minuto, 133,333 tokens/minuto
- **Esperar 1 minuto** y reintentar

### Error "Metadata nesting depth exceeds maximum"

Los tool calls de LLMs anidados profundo pueden exceder el límite de profundidad de metadata (4 niveles). Esto es un bug conocido — revisar el issue tracker.

### Error "Metadata values must be strings..."

Valores `undefined` en la metadata no son válidos. Verificar que no se pasen campos `undefined` al `record()`.

### Cyclic dependency error al correr `pnpm test`

Si turbo bloquea por dependencias cíclicas, correr cada paquete individualmente:
```bash
pnpm --filter @aivoralabs/agenttrail test
pnpm --filter @aivoralabs/agenttrail-openai test
pnpm --filter @aivoralabs/agenttrail-vercel test
pnpm --filter @aivoralabs/agenttrail-cli test
```

---

## Resumen de cobertura por proveedor

| Proveedor | Key | Tests que activa | Tier gratuito |
|-----------|-----|-----------------|---------------|
| Groq | `GROQ_API_KEY` | Suites 8, 12 | ✅ 30 req/min |
| Cerebras | `CEREBRAS_API_KEY` | (futuro) | ✅ Disponible |
| Gemini | `GEMINI_API_KEY` | (futuro) | ✅ Disponible |
| OpenRouter | `OPENROUTER_API_KEY` | No usar en MVP | ⚠️ Limitado |

---

## Referencia rápida

```bash
# Ejecutar todo
pnpm test

# Solo core (con E2E)
pnpm --filter @aivoralabs/agenttrail test

# Solo E2E verbose
pnpm --filter @aivoralabs/agenttrail test -- --reporter=verbose real-llm-e2e

# Stress tests
RUN_STRESS_TESTS=1 pnpm --filter @aivoralabs/agenttrail test

# Script rápido
./e2e-test.sh --verbose

# Verificar receipts generados
pnpm --filter @aivoralabs/agenttrail-cli verify ./test-results/
```
