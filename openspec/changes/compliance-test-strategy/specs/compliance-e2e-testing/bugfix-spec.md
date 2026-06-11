# Bugfix Spec: E2E Test Failures — Root Cause Fixes

**Change**: `compliance-test-strategy` · **Status**: Draft · **Date**: 2026-06-10
**Context**: 226 tests executed, 217 passed, 4 failed. All 4 bugs are in wrapper code or test assertions — NOT in the core hash-chain/signing logic.

---

## Bug 1: Streaming metadata con `undefined` — ComplianceError en `record()`

### Síntoma

El test suite 8.2 (streaming) lanza `ComplianceError: Receipt recording failed` cuando el wrapper intenta registrar el receipt. La grabación del receipt falla porque Zod rechaza `undefined` como valor de metadata.

### Causa Raíz

En `packages/openai/src/index.ts:200`:

```typescript
stream_error: streamError ? true : undefined,
```

Cuando `streamError` es `null` (no hubo error), esto produce `stream_error: undefined`. El objeto metadata se pasa a `auditor.record()` → `validateMetadata()` en `packages/core/src/receipt.ts:79` → `metadataSchema.safeParse()` en `packages/core/src/validate.ts:187`.

El `metadataSchema` usa `z.record(z.string(), z.unknown())` (line 124), pero `validateMetadataValue` (line 68-122) rechaza explícitamente `typeof value === 'undefined'` en la línea 81:

```typescript
if (
  typeof value === 'function' ||
  typeof value === 'symbol' ||
  typeof value === 'bigint' ||
  typeof value === 'undefined'  // ← AQUÍ
) {
  return 'Metadata values must be strings, numbers, booleans, null, arrays, or plain objects';
}
```

**Flujo completo del fallo**:
1. `wrapOpenAI` → `body.stream === true` → consume stream → `streamError = null`
2. `auditor.record({ metadata: { stream_error: undefined, ... } })`
3. `record()` llama `validateMetadata(interaction.metadata)` (receipt.ts:79)
4. `validateMetadata` → `metadataSchema.safeParse()` → `validateMetadataValue(undefined, 2)` → retorna error string
5. Zod agrega el issue → `safeParse` falla → `validateMetadata` lanza `TypeError`
6. El `catch` en receipt.ts:202 re-lanza → wrapper catch en line 203 envuelve en `ComplianceError`

### Análisis de Robustez

**¿Por qué NO alcanza con un parche superficial?**

Si solo corregimos el wrapper (cambiar `undefined` a conditional spread), el bug desaparece para OpenAI, pero:
- Cualquier otro wrapper futuro que pase `undefined` a metadata va a fallar igual
- El tipo `Record<string, unknown>` de `Interaction.metadata` (types.ts:27) **permite** `undefined` como value — es un agujero de tipo que Zod atrapa en runtime

**Patrón a evitar**: No confiar en que los wrappers van a pasar valores limpios al core. El core debe ser defensivo.

### Fix Propuesto (por capa)

**Nivel 1 — Wrapper (`packages/openai/src/index.ts`)**:

Cambiar línea 195-201 de:
```typescript
metadata: {
  timestamp_start: timestampStart,
  timestamp_end: timestampEnd,
  finish_reason: finishReason,
  tool_calls: accumulatedToolCalls,
  stream_error: streamError ? true : undefined,
},
```

A:
```typescript
metadata: {
  timestamp_start: timestampStart,
  timestamp_end: timestampEnd,
  finish_reason: finishReason,
  ...(accumulatedToolCalls ? { tool_calls: accumulatedToolCalls } : {}),
  ...(streamError ? { stream_error: true } : {}),
},
```

Esto asegura que ninguna clave con valor `undefined` llega al core.

**Nivel 2 — Core defensivo (`packages/core/src/receipt.ts`)**:

Antes de `validateMetadata()` en `record()` (línea 79), agregar una función helper que striped claves con valor `undefined`:

```typescript
// Strip undefined values from metadata to prevent Zod rejection.
// This is a safety net — wrappers SHOULD NOT pass undefined values,
// but we defend against it anyway.
function stripUndefinedValues(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
```

En `record()`, justo antes de la línea 79:
```typescript
if (interaction.metadata) {
  interaction.metadata = stripUndefinedValues(interaction.metadata);
}
validateMetadata(interaction.metadata);
```

**Nivel 3 — Tests que prevengan regresión**:

Agregar test unitario en `packages/core/__tests__/validate.test.ts` (o crear si no existe):
```typescript
it('should reject metadata with undefined values', () => {
  expect(() => validateMetadata({ key: undefined })).toThrow(TypeError);
});

it('should accept metadata after stripping undefined values', () => {
  // Simulates what the core does internally
  const cleaned = Object.fromEntries(
    Object.entries({ key: 'value', empty: undefined }).filter(([, v]) => v !== undefined)
  );
  expect(() => validateMetadata(cleaned)).not.toThrow();
});
```

### Archivos Afectados

| Archivo | Cambio |
|---------|--------|
| `packages/openai/src/index.ts` | Conditional spread para `tool_calls` y `stream_error` |
| `packages/core/src/receipt.ts` | Helper `stripUndefinedValues` + llamada antes de `validateMetadata` |
| `packages/core/__tests__/validate.test.ts` | Tests para `undefined` en metadata |

### Tests que lo cubren

- **Suite 8.2** (`real-llm-e2e.test.ts` línea 75-113): Streaming con Groq real → receipt válido
- **Suite 8.3** (`real-llm-e2e.test.ts` línea 122-176): Tool calling → receipt con metadata válida
- **Nuevo test unitario**: `validateMetadata` rechaza `undefined` explícitamente

---

## Bug 2: Tool calls depth excede límite de 4 niveles

### Síntoma

El test suite 8.3 (tool calling) falla con `ComplianceError` porque `validateMetadata` rechaza la metadata por exceder la profundidad máxima de 4 niveles.

### Causa Raíz

En `packages/openai/src/index.ts:199`:

```typescript
tool_calls: accumulatedToolCalls,
```

Donde `accumulatedToolCalls` tiene esta estructura (construida en líneas 179-184):

```typescript
[
  {
    index: 0,
    id: "call_abc123",
    type: "function",
    function: {
      name: "get_weather",
      arguments: '{"city":"Berlin"}'
    }
  }
]
```

Cuando `validateMetadata` recursa con depth inicial = 2 (validate.ts:138):

```
depth 2: metadata object
  → key "tool_calls" → array (depth 3)
    → [0] object (depth 4)
      → key "function" → object (depth 5) ← EXCEDE LÍMITE
        → key "name" would be depth 6
```

La validación en `validateMetadataValue` (validate.ts:69) rechaza `depth > 4`:

```typescript
if (depth > 4) {
  return `Metadata nesting depth exceeds maximum of 4 (found depth ${depth})`;
}
```

**Nota**: El depth check empieza en 2 (validate.ts:138) porque metadata misma ya es depth 1 (el objeto raíz) y sus values empiezan en depth 2.

### Análisis de Robustez

**¿Por qué NO alcanza con un parche superficial?**

Si solo serializamos tool_calls en el wrapper OpenAI:
- El wrapper de Vercel AI podría tener el mismo problema si agrega tool calls
- El límite de depth 4 es razonable para metadata de negocio genérico, pero los objetos de LLM providers (tool_calls, function_call) son inherentemente profundos
- Subir el límite a 6+ debilita la protección contra payload injection

**Patrón a evitar**: No meter objetos de dominio de providers directamente en metadata. Serializarlos a strings planos.

### Fix Propuesto (por capa)

**Nivel 1 — Wrapper OpenAI (`packages/openai/src/index.ts`)**:

Serializar `accumulatedToolCalls` como JSON string antes de ponerlo en metadata:

Líneas 179-184, cambiar de:
```typescript
const accumulatedToolCalls =
  toolCallAccumulator.size > 0
    ? Array.from(toolCallAccumulator.entries())
        .sort(([a], [b]) => a - b)
        .map(([index, tc]) => ({ index, ...tc }))
    : undefined;
```

A:
```typescript
const accumulatedToolCalls =
  toolCallAccumulator.size > 0
    ? JSON.stringify(
        Array.from(toolCallAccumulator.entries())
          .sort(([a], [b]) => a - b)
          .map(([index, tc]) => ({ index, ...tc }))
      )
    : undefined;
```

Y en la metadata (línea 199):
```typescript
tool_calls: accumulatedToolCalls, // ahora es string, depth = 3
```

Esto aplana la profundidad a 3: `metadata → tool_calls (string)`.

**Nivel 2 — Wrapper non-streaming (líneas 242-244)**:

Mismo patrón para el path non-streaming. Actualmente:
```typescript
...(outputMessage?.tool_calls !== undefined
  ? { tool_calls: outputMessage.tool_calls }
  : {}),
```

Cambiar a:
```typescript
...(outputMessage?.tool_calls !== undefined
  ? { tool_calls: JSON.stringify(outputMessage.tool_calls) }
  : {}),
```

**Nivel 3 — Core defensivo (`packages/core/src/receipt.ts`)**:

Opcional pero recomendado: si `interaction.metadata?.tool_calls` es un array de objetos con función anidada, serializarlo automáticamente. Esto protege contra cualquier wrapper futuro que meta tool calls como objetos:

```typescript
// In record(), before validateMetadata:
if (Array.isArray(interaction.metadata?.tool_calls)) {
  interaction.metadata = {
    ...interaction.metadata,
    tool_calls: JSON.stringify(interaction.metadata.tool_calls),
  };
}
```

**Nivel 4 — Documentación (`packages/core/src/types.ts`)**:

Agregar JSDoc a `Interaction.metadata`:
```typescript
/**
 * Optional key-value metadata attached to the receipt.
 *
 * Constraints:
 * - Max 50 top-level keys
 * - Nesting depth ≤ 4 (counting from metadata object as depth 1)
 * - Values must be JSON-safe: strings, numbers, booleans, null, arrays, plain objects
 * - Strings ≤ 1000 chars, arrays ≤ 100 items
 *
 * **Important**: Do NOT nest provider-specific objects (e.g., OpenAI tool_calls)
 * directly. Serialize them as JSON strings first to stay within depth limits.
 */
metadata?: Record<string, unknown>;
```

### Archivos Afectados

| Archivo | Cambio |
|---------|--------|
| `packages/openai/src/index.ts` | Serializar tool_calls como JSON string (streaming + non-streaming) |
| `packages/core/src/receipt.ts` | Auto-serializar tool_calls array si existe en metadata |
| `packages/core/src/types.ts` | JSDoc documentando constraints de depth |

### Tests que lo cubren

- **Suite 8.3** (`real-llm-e2e.test.ts` línea 122-176): Tool calling con Groq real → receipt con metadata válida
- **Suite 10** (`real-world-formats.test.ts`): Nested JSON depth 5 → receipt recorded (si aplica)
- **Suite 12.1** (`icp-multi-provider.test.ts` línea 41-66): Legora legal AI con tool calling

---

## Bug 3: Invalid API key no retorna ComplianceError

### Síntoma

El test suite 8.5 (`real-llm-e2e.test.ts` línea 233-254) espera que un API key inválido en strict mode lance `ComplianceError`. El test falla porque el error es un `Error` genérico (de la API de Groq), no un `ComplianceError`.

### Causa Raíz

En `packages/openai/src/index.ts:224`:

```typescript
return originalCreate(body, options).then((result: ChatCompletion) => {
  // ... record receipt ...
}).catch((error: Error) => {
  // Solo captura errores de .record(), no de originalCreate
});
```

El flujo es:
1. Pre-flight check pasa (usa auditor separado con datos dummy, no la API real)
2. `originalCreate(body, options)` → llama a Groq con key inválida → Groq retorna 401
3. El `.then()` nunca se ejecuta porque `originalCreate` rechaza la promesa
4. El `.catch()` en línea 248 solo está dentro del encadenamiento de `auditor.record().then().catch()`, NO captura el rechazo de `originalCreate`

En realidad, mirando más de cerca el código:

```typescript
return originalCreate(body, options).then((result: ChatCompletion) => {
  // ...
  return auditor.record({...})
    .then(() => result)
    .catch((error: Error) => { ... });
});
```

Cuando `originalCreate` falla, la promesa se rechaza y el `.then()` nunca se ejecuta. No hay `.catch()` en el nivel superior de esta promesa. El error se propaga como `Error` genérico de OpenAI/Groq.

El test espera:
```typescript
await expect(
  wrapped.chat.completions.create({...})
).rejects.toThrow(ComplianceError);
```

Pero recibe un `Error` con mensaje de la API (e.g., "Incorrect API key provided").

### Análisis de Robustez

**¿Por qué NO alcanza con un parche superficial?**

Si solo envolvemos el error en el wrapper OpenAI:
- Vercel AI wrapper tiene el mismo problema (line 69: `const result = await doGenerate()` sin try/catch para errores HTTP)
- El contrato de "fail-closed" en strict mode (AGENTS.md: "Si falla la escritura del receipt, el agente NO responde") se extiende a errores HTTP: si el agente no pudo responder (401, 429, 500), el error debe ser `ComplianceError` para que el caller pueda distinguir "falla de compliance" de "falla de la aplicación"

**Patrón a evitar**: No asumir que los errores HTTP van a ser capturados por los catch internos del wrapper. El error HTTP viene de `originalCreate`, no de `record()`.

### Fix Propuesto (por capa)

**Nivel 1 — Wrapper OpenAI streaming (`packages/openai/src/index.ts`)**:

El branch de streaming (línea 137-221) ya maneja esto correctamente — si `originalCreate` falla en streaming, el error se propaga y el wrapper lo re-lanza. Pero en strict mode debería ser `ComplianceError`.

Agregar catch después del streaming branch (línea 138):

```typescript
if (body.stream === true) {
  let result: ChatCompletion;
  try {
    result = await originalCreate(body, options) as unknown as ChatCompletion;
  } catch (err) {
    if (complianceMode === 'strict') {
      throw new ComplianceError('LLM provider call failed', { cause: err });
    }
    throw err;
  }
  const stream = result as Stream<ChatCompletionChunk>;
  // ... rest of streaming logic
```

**Nivel 2 — Wrapper OpenAI non-streaming (`packages/openai/src/index.ts`)**:

El branch non-streaming (línea 224) necesita un catch de nivel superior:

```typescript
// --- Non-streaming branch ---
return originalCreate(body, options)
  .then((result: ChatCompletion) => {
    // ... existing record logic ...
  })
  .catch((error: Error) => {
    // If the LLM call itself failed (not record), wrap in ComplianceError for strict mode
    if (complianceMode === 'strict') {
      throw new ComplianceError('LLM provider call failed', { cause: error });
    }
    throw error;
  });
```

**Nivel 3 — Wrapper Vercel AI (`packages/vercel-ai/src/index.ts`)**:

Aplicar el mismo patrón en `wrapGenerate` (línea 67-100):

```typescript
wrapGenerate: async ({ doGenerate, params }) => {
  const timestampStart = new Date().toISOString();
  let result: GenerateResult;
  try {
    result = await doGenerate();
  } catch (err) {
    if (complianceMode === 'strict') {
      throw new ComplianceError('LLM provider call failed', { cause: err });
    }
    throw err;
  }
  const timestampEnd = new Date().toISOString();
  // ... rest of record logic
```

**Nivel 4 — Tests que prevengan regresión**:

El test 8.5 ya existe y es correcto. Adicionalmente, agregar un test para el path de streaming:

```typescript
it('Invalid key + strict streaming → ComplianceError', { timeout: 15000 }, async () => {
  const invalidClient = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: 'sk-invalid-key-for-testing',
  });
  const wrapped = wrapOpenAI(invalidClient, {
    agentId: 'invalid-key-stream-test',
    complianceMode: 'strict',
  });
  await expect(
    wrapped.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: true,
    }),
  ).rejects.toThrow(ComplianceError);
});
```

### Archivos Afectados

| Archivo | Cambio |
|---------|--------|
| `packages/openai/src/index.ts` | Catch errores de `originalCreate` en ambos paths (streaming + non-streaming) |
| `packages/vercel-ai/src/index.ts` | Catch errores de `doGenerate` en `wrapGenerate` |
| `packages/core/__tests__/e2e/real-llm-e2e.test.ts` | Test 8.5 ya existe; agregar test streaming |

### Tests que lo cubren

- **Suite 8.5** (`real-llm-e2e.test.ts` línea 233-254): Invalid key + strict → ComplianceError (non-streaming)
- **Nuevo test**: Invalid key + strict + streaming → ComplianceError

---

## Bug 4: verifyChains test accede a propiedad incorrecta

### Síntoma

El test suite 12.4 (`icp-multi-provider.test.ts` línea 149-182) falla porque `result.valid` es `undefined`. El test debería acceder a `result.result.valid`.

### Causa Raíz

En `packages/core/__tests__/e2e/icp-multi-provider.test.ts:171-174`:

```typescript
for (const [agentId, result] of results) {
  expect(result.valid).toBe(true);        // ← BUG
  expect(result.hashChainIntact).toBe(true); // ← BUG
}
```

La función `verifyChains()` (hash-chain.ts:116-201) retorna `Promise<Map<string, AgentChainResult>>`, donde:

```typescript
interface AgentChainResult {
  receipts: Receipt[];
  result: VerificationResult;
}
```

Y `VerificationResult` (types.ts:105-112):

```typescript
export interface VerificationResult {
  valid: boolean;
  hashChainIntact: boolean;
  signaturesValid: boolean;
  // ...
}
```

Entonces `result` (del Map) es `AgentChainResult`, que tiene:
- `result.receipts` → Receipt[]
- `result.result` → VerificationResult

El test accede a `result.valid` (que no existe en `AgentChainResult`) en lugar de `result.result.valid`.

### Análisis de Robustez

**¿Por qué NO alcanza con un parche superficial?**

El fix es directo — corregir las propiedades en el test. Pero el análisis relevante es:
- La API de `verifyChains` es confusa: el Map entry se desestructura como `[agentId, result]` donde `result` es `AgentChainResult`, pero el campo interno también se llama `result` → naming conflict
- Esto sugiere que la interfaz `AgentChainResult` debería tener un nombre más claro para el campo `result`, e.g., `verification` o `verdict`

Sin embargo, cambiar la interfaz es un breaking change. El fix correcto para ahora es corregir el test.

### Fix Propuesto (por capa)

**Nivel 1 — Test (`packages/core/__tests__/e2e/icp-multi-provider.test.ts`)**:

Cambiar líneas 171-174 de:
```typescript
for (const [agentId, result] of results) {
  expect(result.valid).toBe(true);
  expect(result.hashChainIntact).toBe(true);
}
```

A:
```typescript
for (const [agentId, entry] of results) {
  expect(entry.result.valid).toBe(true);
  expect(entry.result.hashChainIntact).toBe(true);
}
```

**Nivel 2 — Renombrar para claridad (opcional, no breaking)**:

En el test, renombrar la variable para evitar confusión:
```typescript
for (const [agentId, chainResult] of results) {
  expect(chainResult.result.valid).toBe(true);
  expect(chainResult.result.hashChainIntact).toBe(true);
}
```

### Archivos Afectados

| Archivo | Cambio |
|---------|--------|
| `packages/core/__tests__/e2e/icp-multi-provider.test.ts` | Corregir `result.valid` → `result.result.valid` |

### Tests que lo cubren

- **Suite 12.4** (`icp-multi-provider.test.ts` línea 149-182): verifyChains con 3 agentes ICP

---

## Resumen de Fixes por Archivo

| Archivo | Bugs | Cambios |
|---------|------|---------|
| `packages/openai/src/index.ts` | #1, #2, #3 | Conditional spread metadata, serialize tool_calls, catch errors HTTP |
| `packages/core/src/receipt.ts` | #1, #2 | Strip undefined values, auto-serialize tool_calls array |
| `packages/core/src/types.ts` | #2 | JSDoc documentando depth constraints |
| `packages/vercel-ai/src/index.ts` | #3 | Catch errores HTTP en wrapGenerate |
| `packages/core/__tests__/e2e/icp-multi-provider.test.ts` | #4 | Corregir propiedades en loop |
| `packages/core/__tests__/e2e/real-llm-e2e.test.ts` | #3 | Agregar test streaming invalid key |
| `packages/core/__tests__/validate.test.ts` | #1 | Tests para undefined en metadata |

## Orden de Implementación

1. **Bug 4** (test fix) — 5 minutos, zero risk, desbloquea suite 12
2. **Bug 1** (undefined metadata) — 30 minutos, low risk, desbloquea suite 8.2
3. **Bug 2** (tool calls depth) — 30 minutos, low risk, desbloquea suite 8.3
4. **Bug 3** (ComplianceError en HTTP errors) — 45 minutos, medium risk, desbloquea suite 8.5

## Criterios de Validación

- [ ] 226 tests ejecutados, 226 pasan (0 fallos)
- [ ] Ningún test existente se rompe por los cambios
- [ ] Los fixes son defensivos: no dependen de que wrappers pasen valores limpios
- [ ] Commits convencionales: `fix(openai)`, `fix(core)`, `test(e2e)`
