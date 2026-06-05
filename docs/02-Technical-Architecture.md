# Technical Architecture — Agent Audit Receipts

> **Documento de Arquitectura Técnica**
> Versión: 1.0
> Estado: Borrador pre-MVP
> Basado en: VCP v1.1 (VeritasChain Protocol), EU AI Act Article 12,
> e investigaciones en `market-research/analyses/`

---

## 1. Principios arquitectónicos

| Principio | Decisión | Justificación |
|-----------|----------|---------------|
| **Zero-modification** | El SDK intercepta sin modificar el código del agente | Si el desarrollador tiene que tocar su lógica, no lo va a adoptar |
| **Immutabilidad forense** | Hash chaining + Ed25519 signatures | Artículo 12 exige trazabilidad no alterable |
| **Latencia mínima** | Operaciones síncronas locales, sin llamadas HTTP en hot path | 11μs de sobrecarga es el benchmark de Bifrost (ver Doc Mapa Competitivo) |
| **Privacidad por diseño** | PII redactada en origen, datos desacoplados | GDPR vs Artículo 12: tensión legal resuelta técnicamente |
| **Formato legible** | JSON estructurado + resumen en lenguaje natural | Un auditor humano debe entenderlo sin ayuda técnica |

---

## 2. Arquitectura de alto nivel

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Application                      │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ User Input   │───▶│ AI Agent     │───▶│ Output     │ │
│  └──────────────┘    └──────┬───────┘    └────────────┘ │
│                             │                             │
│                    ┌────────▼────────┐                   │
│                    │ Agent Audit SDK │                   │
│                    │ (Middleware)    │                   │
│                    └────────┬────────┘                   │
└─────────────────────────────┼───────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Audit Receipt      │
                    │  (JSON + Hash Chain) │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Storage Layer      │
                    │  (Append-only log)  │
                    └─────────────────────┘
```

**Decisión**: El SDK se ejecuta como middleware en el mismo proceso que el agente. No como servicio externo.

**Justificación**: Doc 2 (Vigilens.ai) muestra que el estándar es "fail-closed" — si el sistema de auditoría falla, el agente no responde. Con middleware en-proceso, no hay latencia de red ni punto único de fallo externo.

---

## 3. Core: Hash Chaining (Inmutabilidad)

### 3.1 Algoritmo

Basado en VCP v1.1 (VeritasChain Protocol, ver `market-research/analyses/refutacion.md` sección de trazabilidad criptográfica):

```
H_0 = SHA256("AGENT_AUDIT_RECEIPT_V1" || genesis_timestamp)
H_i = SHA256(H_(i-1) || P_i)

Donde:
  H_0   = hash génesis (primer evento del sistema)
  H_i   = hash del receipt actual
  H_(i-1) = hash del receipt anterior
  P_i   = payload del receipt actual (JSON canónico)
  ||    = concatenación
```

**Justificación de SHA-256**: Especificado por VCP v1.1 y recomendado por ISO/IEC 24970 (en desarrollo). Suficiente para cumplir Artículo 12 sin sobrecarga computacional.

### 3.2 Verificación de integridad

```typescript
function verifyChain(receipts: Receipt[]): boolean {
  let prevHash = SHA256("AGENT_AUDIT_RECEIPT_V1" || receipts[0].timestamp);
  
  for (const receipt of receipts) {
    const expectedHash = SHA256(prevHash || canonicalJSON(receipt.payload));
    if (receipt.hash !== expectedHash) return false;
    prevHash = receipt.hash;
  }
  return true;
}
```

### 3.3 Detección de alteraciones

Si alguien modifica un receipt histórico:
- El `hash` de ese receipt ya no coincide con `SHA256(prevHash || payload_modificado)`
- Todos los receipts posteriores también fallan (porque su `prev_hash` apunta al hash incorrecto)
- El auditor detecta la ruptura inmediatamente

**Decisión**: No usamos Merkle trees en MVP. Solo hash chain lineal.

**Justificación**: VCP v1.1 define Merkle trees como capa de colección (L2). Para MVP, el hash chain lineal es suficiente. Post-MVP agregaremos Merkle batching cuando el volumen de eventos lo justifique (> 10k receipts/día).

---

## 4. Componentes del SDK

### 4.1 Módulos

```
@aivoralabs/agenttrail/
├── src/
│   ├── core/
│   │   ├── hash-chain.ts        # SHA-256 chaining logic
│   │   ├── receipt.ts           # Receipt builder & validator
│   │   └── signer.ts            # Ed25519 digital signature
│   ├── integrations/
│   │   ├── vercel-ai.ts         # Vercel AI SDK middleware
│   │   └── openai.ts            # OpenAI SDK wrapper
│   ├── storage/
│   │   └── append-only.ts       # JSONL append-only log writer
│   ├── export/
│   │   └── json-export.ts       # JSON receipt export
│   └── index.ts                 # Public API
```

**Decisión**: TypeScript/Node primero.

**Justificación**: El target (SaaS europeo, 50-500 emp) usa mayoritariamente Node/TypeScript. Las integraciones prioritarias (Vercel AI SDK, OpenAI SDK) son nativamente TS.

### 4.2 Receipt builder

```typescript
interface ReceiptBuilderConfig {
  agentId: string;
  version?: string;        // SDK version, default "1.0"
  storage?: StorageBackend; // default: local JSONL file
}

class AuditReceipt {
  constructor(config: ReceiptBuilderConfig)
  
  // Capture a single interaction
  async record(interaction: Interaction): Promise<Receipt>
  
  // Verify chain integrity
  static verifyChain(receipts: Receipt[]): boolean
  
  // Export as JSON
  toJSON(): AuditReceiptJSON
}
```

---

## 5. Flujo de datos: Input → Action → Output → Receipt

```
User Input (text)
    │
    ▼
┌─────────────────────────────────────────────────┐
│ Agent Audit SDK (Middleware)                      │
│                                                   │
│  1. Intercept input                                │
│  2. Timestamp T1                                   │
│  3. PII redaction on input (SHA-256 if needed)     │
│  4. Forward input to AI model                      │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ AI Model                                     │  │
│  │  (OpenAI / Anthropic / etc.)                  │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  5. Intercept output                               │
│  6. Timestamp T2                                   │
│  7. Build payload:                                  │
│     {                                              │
│       input, output, model,                        │
│       timestamp_start, timestamp_end,              │
│       tokens_used, agent_id,                       │
│       prev_hash,                                   │
│       policy_check (if applicable)                 │
│     }                                              │
│  8. Hash: H_i = SHA256(prev_hash || payload)       │
│  9. Sign: signature = Ed25519(H_i)                 │
│ 10. Build Receipt object                            │
│ 11. Append to JSONL log                             │
│ 12. Return receipt to caller (optional)            │
└─────────────────────────────────────────────────┘
    │
    ▼
Audit Receipt (JSON)
  {
    "receipt_id": "uuidv7",
    "prev_hash": "...",
    "hash": "...",
    "signature": "...",
    "payload": { ... },
    "timestamp": "ISO 8601"
  }
```

**Decisión**: La redacción de PII ocurre en el paso 3, ANTES de escribir al log inmutable.

**Justificación**: Doc 2 describe la paradoja GDPR vs Artículo 12. La redacción en origen evita almacenar datos personales en el registro inmutable, cumpliendo ambos reglamentos (ver `market-research/analyses/2.Búsqueda de Dolor en Cumplimiento IA.md` — sección "La Paradoja del Cumplimiento").

---

## 6. Almacenamiento

### 6.1 MVP: Local JSONL append-only

```typescript
interface AppendOnlyStore {
  append(receipt: Receipt): Promise<void>;
  readAll(): AsyncIterable<Receipt>;
  getByRange(start: Date, end: Date): Promise<Receipt[]>;
}
```

**Formato de archivo**: `audit-log-{agentId}-{YYYY-MM}.jsonl`

Cada línea es un JSON de receipt. Append-only. Sin modificación retroactiva.

**Decisión**: Archivo local en MVP.

**Justificación**: El Artículo 12 no exige un backend específico. Para MVP, el archivo local es suficiente. Post-MVP agregaremos almacenamiento cloud (S3 con Object Lock para cumplir con requisitos WORM, como describe Doc 2).

### 6.2 Post-MVP: S3 Object Lock (WORM)

El Doc 2 especifica una arquitectura de defensa en profundidad en 3 niveles:
1. **Infraestructura**: Bucket S3 con Object Lock (Compliance Mode) — ni el admin puede borrar
2. **Aplicación**: Verificación constante de hash chain via middleware
3. **Anclaje temporal**: OpenTimestamps o RFC 3161 (post-MVP)

---

## 7. Seguridad

| Aspecto | Decisión | Justificación |
|---------|----------|---------------|
| **Firma digital** | Ed25519 (curva 25519) | VCP v1.1. Especificación estándar para audit trails. Llave custodiada fuera del agente. |
| **PII en logs** | SHA-256 hash de un solo sentido | GDPR Artículo 17 vs Artículo 12: hash permite verificar sin retener dato original |
| **Fail-closed** | Si falla la escritura del receipt, el agente no responde | Doc 2: "fail-closed es el estándar" |
| **UUID** | UUIDv7 (RFC 9562) | Time-sortable. No requiere DB centralizada para IDs únicos. |

---

## 8. Stack tecnológico

| Componente | Tecnología | Justificación |
|-----------|-----------|---------------|
| **Lenguaje** | TypeScript 5.x | Target usa Node/TS. Integraciones nativas con Vercel AI SDK y OpenAI SDK. |
| **Hash** | Web Crypto API (`crypto.subtle.digest`) | Nativo en Node y browsers. Sin dependencias. |
| **Firma** | `@noble/ed25519` | Librería pure-js, auditable, sin dependencias nativas. |
| **UUID** | `uuid@11` con `v7()` | Estándar RFC 9562. |
| **Testing** | Vitest + Playwright | Tests unitarios + integración real con modelos. |

---

## 9. Performance targets

| Operación | Target | Benchmark |
|-----------|--------|-----------|
| Hash SHA-256 | < 1μs | Web Crypto API es nativa |
| Firma Ed25519 | < 50μs | @noble/ed25519 optimizado |
| Receipt completo | < 100μs | Hash + firma + serialización |
| Sobrecarga en llamada | < 50ms | Comparado con Bifrost (11μs) somos más pesados, pero aceptable para MVP |

---

## 10. Roadmap técnico

| Fase | Hito | Dependencias |
|------|------|-------------|
| **Pre-MVP** | Hash chain + Receipt builder + File storage + OpenAI integration | Ninguna |
| **MVP** | Vercel AI SDK middleware + Export JSON + CLI verification | Core estable |
| **V2** | LangChain integration + PDF export + Cloud storage (S3) | Validación de mercado |
| **V3** | Multi-tenancy + Dashboard + Alertas + SSO | Demanda enterprise |

---

## 11. Referencias

- `knowledge-base/PLAN.md` — Documento de validación
- `market-research/analyses/refutacion.md` — Trazabilidad criptográfica y VCP v1.1
- `market-research/analyses/2.Búsqueda de Dolor en Cumplimiento IA.md` — Hash chain formula, fail-closed, GDPR vs Artículo 12
- `market-research/analyses/Mapa Competitivo EU AI Act.md` — Benchmarks de latencia (Bifrost 11μs)
- [VCP v1.1 Specification](https://veritaschain.org/blog/posts/2026-01-19-eu-ai-act-vcp-v1-1-cryptographic-audit-trails/) — Estándar criptográfico de referencia
- [EU AI Act Article 12](https://artificialintelligenceact.eu/article/12/) — Texto oficial
