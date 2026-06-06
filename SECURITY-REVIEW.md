# Security Review — AgentTrail

## Executive Summary

AgentTrail es un SDK bien arquitecturado con un modelo de seguridad sólido heredado de VCP v1.1 (VeritasChain Protocol). Los primitivos criptográficos son correctos: SHA-256 via Web Crypto API (nativo, zero-dep), Ed25519 signing via `@noble/ed25519` (auditado, pure-JS), y UUIDv7 para identificación de receipts. La intención central — audit trails inmutables con verificación criptográfica de cadena — está correctamente implementada a nivel algorítmico.

**Sin embargo, el código exhibe una violación arquitectónica crítica.** El principio de diseño declarado es **fail-closed** ("si el sistema de auditoría falla, el agente NO responde"), pero los tres wrappers de integración (OpenAI, Vercel generate, Vercel stream) tragan silenciosamente los errores de `auditor.record()` con `.catch(() => {})`. Esto significa que si la computación del hash chain, la firma, o la generación de claves falla, la respuesta del agente aun se retorna al usuario sin un receipt de auditoría — una condición fail-open que socava toda la propuesta de cumplimiento.

Además, hay tres preocupaciones adicionales de alta severidad: (1) la implementación de JSON canónico está rota para objetos anidados (haciendo que la verificación del hash chain no sea confiable para receipts con tool_calls o policy_check), (2) la redacción de PII está especificada en la arquitectura pero ausente del código, y (3) no hay validación de inputs en objetos `Interaction`, permitiendo tamaños de payload no controlados y tipos de contenido arbitrarios en el log inmutable.

---

## Findings

### CRITICAL — Fail-open behavior: `auditor.record()` errors are swallowed

- **Location**: `packages/openai/src/index.ts:58-60`, `packages/vercel-ai/src/index.ts:56-58,92-94`
- **Risk**: Si `record()` falla (Web Crypto API no disponible, Ed25519 sign falla, input malformado), el `.catch(() => {})` descarta silenciosamente el error y la respuesta del agente se retorna al usuario **sin receipt de auditoría**. Un atacante podría hacer DoS al subsystem de auditoría y todas las interacciones quedarían sin registrar.
- **Remediation**: Los wrappers deben (a) re-lanzar el error para que la llamada al agente falle, o (b) logear el fallo conspicuamente. Para auditoría compliance-grade, el agente NO debe responder si no puede generar el receipt.

### CRITICAL — Broken canonical JSON for nested objects

- **Location**: `packages/core/src/hash-chain.ts:41-43`
- **Risk**: `JSON.stringify(obj, Object.keys(obj).sort())` usa un replacer array que solo ordena claves de nivel superior. Para objetos anidados (`tool_calls`, `policy_check`), el orden de claves depende de la implementación del motor JS, produciendo hashes diferentes para payloads semánticamente idénticos.
- **Remediation**: Implementar recursive key sorting antes de serialización, o usar una librería de JSON canónico.

### HIGH — No input validation on Interaction

- **Location**: `packages/core/src/receipt.ts:55-149`
- **Risk**: `record()` acepta `Interaction` sin validación: strings de input/output sin límite de tamaño, `toolCalls` sin validación de count/campos, `metadata` con `Record<string, unknown>` sin restricciones (podría contener referencias circulares que crasheen `canonicalJSON`).
- **Remediation**: Agregar validación runtime con límites de tamaño (1MB max input/output, 100 max tool calls, 256 chars para model/provider).

### HIGH — PII not redacted (spec promises, code doesn't deliver)

- **Location**: `packages/core/src/types.ts:46-60`
- **Risk**: El doc de arquitectura (02-Technical-Architecture.md, Section 5, Step 3) exige: "PII redaction on input (SHA-256 if needed)". El código almacena el input/output completo sin redacción. Tensión entre EU AI Act Article 12 (retener traza completa) y GDPR Article 17 (derecho de borrado).
- **Remediation**: Implementar capa de redacción PII con opción `redactPII` en `AuditReceiptConfig`.

### HIGH — Private key held in memory as plain string

- **Location**: `packages/core/src/signer.ts:7-18`, `packages/core/src/receipt.ts:30-31`
- **Risk**: `AuditReceipt` almacena la clave privada Ed25519 como string plano. Sin enclave, sin key wrapping, sin encryptación en reposo. Un memory dump del proceso Node recuperaría la clave privada.
- **Remediation**: Documentar que las claves privadas deben tratarse como secretos. Para V2, considerar `crypto.subtle.importKey()` con `extractable: false`.

### MEDIUM — No runtime receipt validation in CLI

- **Location**: `packages/cli/src/index.ts:19,31`
- **Risk**: `JSON.parse(trimmed)` retorna `any`, luego `as Receipt[]` cast sin validación runtime. Un archivo malformado podría pasar parsing e entrar a `verifyChain` con campos faltantes o tipos incorrectos.
- **Remediation**: Agregar validación runtime de la estructura del receipt antes de llamar a `verifyChain`.

### MEDIUM — Streaming completions silently ignored (OpenAI)

- **Location**: `packages/openai/src/index.ts:39`
- **Risk**: La condición `if (result?.choices && Array.isArray(result.choices))` es falsa para responses de streaming. Las completions de streaming se ignoran silenciosamente sin generar receipt.
- **Remediation**: Detectar modo streaming (`body.stream === true`) y manejar apropiadamente, o lanzar error claro de que streaming no soportado.

### MEDIUM — Metadata blindly copied without filtering

- **Location**: `packages/core/src/receipt.ts:142`
- **Risk**: `metadata: interaction.metadata` pasa el objeto completo. Usuarios podrían almacenar API keys, tokens, o PII en metadata que queda permanentemente en el receipt inmutable.
- **Remediation**: Documentar claramente que metadata no debe contener secretos, o implementar blocklist/allowlist.

### LOW — `bytesToBase64` uses spread operator on Uint8Array

- **Location**: `packages/core/src/signer.ts:52-54`
- **Risk**: `String.fromCharCode(...bytes)` puede causar `RangeError: Maximum call stack size exceeded` para arrays > 125K elementos.
- **Remediation**: Usar `Array.from(bytes, (b) => String.fromCharCode(b)).join('')`.

### LOW — Empty chain returns true

- **Location**: `packages/core/src/hash-chain.ts:50`
- **Risk**: `verifyChain([])` retorna `true`. Una cadena vacía podría enmascarar un fallo del sistema de auditoría.
- **Remediation**: Documentar este comportamiento claramente.

### LOW — Error message leaks receipt content (CLI)

- **Location**: `packages/cli/src/index.ts:34`
- **Risk**: `throw new Error(\`Invalid JSONL line: ${line.slice(0, 80)}\`)` filtra contenido potencialmente sensible.
- **Remediation**: Usar mensaje genérico como "Invalid JSONL at line N".

---

## Dependency Scan

| Severity | Package | Version | Advisory | Affects | Remediation |
|----------|---------|---------|----------|---------|-------------|
| CRITICAL | vitest | 2.1.9 | GHSA-5xrq-8626-4rwp | Dev (all packages) | Upgrade to >=4.1.0 |
| MODERATE | esbuild | 0.21.5 | GHSA-67mh-4wv8-2f99 | Dev (transient via vitest) | Upgrade vitest |
| MODERATE | jsondiffpatch | 0.6.0 | GHSA-33vc-wfww-vjfv | Runtime (via `ai` in vercel-ai) | Upgrade `ai` to >=5.0.0 |
| MODERATE | vite | 5.4.21 | GHSA-4w7w-66w2-5vf9 | Dev (transient via vitest) | Upgrade vitest |
| LOW | ai | 4.3.19 | GHSA-rwvc-j5jr-mgvh | Runtime (vercel-ai) | Upgrade to >=5.0.52 |

**Nota**: Las dependencias core del SDK (`@noble/ed25519@2.3.0` y `uuid@11.1.1`) tienen **zero vulnerabilidades conocidas**. Los hallazgos críticos/moderados son en dependencias de dev/test (vitest) o transient del Vercel AI SDK.

---

## Recommendations

### Priority 1 (Fix before any production use)
1. Fix fail-closed behavior en todos los wrappers
2. Fix canonical JSON con recursive key sorting

### Priority 2 (Fix before public release)
3. Agregar input validation en Interaction
4. Implementar PII redaction
5. Agregar output size limit en Vercel stream wrapper

### Priority 3 (Medium term)
6. Runtime receipt validation en CLI
7. Metadata allowlist/blocklist
8. Key rotation capability
9. Fix `any` types en OpenAI wrapper

### Priority 4 (Low effort, good hygiene)
10. Fix `bytesToBase64` spread operator
11. Upgrade dev dependencies (vitest, vite)
12. Restrict public API exports
13. Evitar filtrar contenido de receipts en CLI error messages

---

## Conclusión

La base criptográfica de AgentTrail es sólida: hash chaining, Ed25519 signing, y UUIDv7 generation son correctos. La visión arquitectónica de fail-closed, PII-redacted, immutable audit trails está bien documentada y es el diseño correcto para EU AI Act compliance.

Sin embargo, hay una **brecha crítica entre la intención arquitectónica y el comportamiento runtime**: el sistema es fail-open, no fail-closed. Combinado con un canonical JSON serializer roto para objetos anidados, las garantías de seguridad podrían no sostenerse bajo condiciones adversarias.

La buena noticia: no son defectos de diseño fundamental — son gaps de implementación que están bien entendidos y son directos de resolver. Atender los items de Priority 1 y 2 antes de cualquier despliegue productivo alineará la implementación con la arquitectura y proporcionará el audit trail compliance-grade que el producto promete.
