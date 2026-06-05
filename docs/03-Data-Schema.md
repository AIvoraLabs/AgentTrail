# Data Schema — Agent Audit Receipts

> **Data Schema / API Spec Document**
> Versión: 1.0
> Estado: Borrador pre-MVP
> Basado en: VCP v1.1 (VeritasChain Protocol), EU AI Act Article 12,
> RFC 9562 (UUIDv7), RFC 3161 (timestamps)

---

## 1. Principios de diseño del schema

| Principio | Decisión | Justificación |
|-----------|----------|---------------|
| **Autocontenido** | Cada receipt contiene todo lo necesario para verificarlo | No requiere DB externa ni estado compartido |
| **Canónico** | JSON serializado en orden lexicográfico de claves | El hash debe ser determinista: mismo payload → mismo hash siempre |
| **Extensible** | Campo `metadata` opcional para datos específicos del cliente | El Artículo 12 no especifica un schema fijo. Diferentes sistemas necesitan diferentes campos. |
| **Legible** | Campos con nombres descriptivos (no abreviaturas crípticas) | Un auditor humano debe entenderlo |

---

## 2. Schema del Receipt

### 2.1 Estructura raíz

```typescript
interface AuditReceipt {
  // --- Identificación ---
  receipt_id: string;           // UUIDv7 - time-sortable unique ID
  agent_id: string;             // Identificador del agente monitoreado
  version: string;              // Schema version (ej. "1.0")
  
  // --- Hash Chain ---
  prev_hash: string | null;     // SHA-256 del receipt anterior (null = genesis)
  hash: string;                 // SHA-256(prev_hash || canonical(payload))
  signature: string;            // Ed25519(hash) - firma digital
  
  // --- Payload (contenido auditado) ---
  payload: ReceiptPayload;
  
  // --- Metadata adicional ---
  metadata?: Record<string, unknown>;
}
```

**Decisión**: `prev_hash` puede ser `null` solo para el primer receipt (génesis).

**Justificación**: VCP v1.1 define H_0 como hash del primer evento con un string de génesis. Nosotros usamos `null` por simplicidad — el primer receipt se verifica contra sí mismo.

### 2.2 Payload

```typescript
interface ReceiptPayload {
  // --- Timestamps ---
  timestamp_start: string;       // ISO 8601 - inicio de la interacción
  timestamp_end: string;         // ISO 8601 - fin de la interacción
  
  // --- Interacción ---
  input: string;                 // Input del usuario (redactado si contiene PII)
  output: string;                // Output del agente
  input_hash?: string;           // SHA-256 del input original (si fue redactado)
  
  // --- Modelo ---
  model: string;                 // Model ID (ej. "gpt-4o", "claude-3-opus")
  provider: string;              // Provider (ej. "openai", "anthropic")
  
  // --- Uso ---
  tokens_prompt?: number;        // Tokens del prompt
  tokens_completion?: number;    // Tokens de la completion
  tokens_total?: number;         // Tokens totales
  
  // --- Tool calls (si aplica) ---
  tool_calls?: ToolCall[];
  
  // --- Compliance ---
  policy_check?: PolicyCheck;    // Resultado de verificación de políticas (opcional)
  human_verifier?: string;       // ID del humano que verificó (Artículo 14)
}
```

**Decisión**: `input` y `output` son strings. Para modelos multimodales, se almacena el texto y un hash del contenido no-textual.

**Justificación**: VCP v1.1 usa el mismo enfoque. El hash chain opera sobre representación textual canónica.

### 2.3 Tool calls

```typescript
interface ToolCall {
  tool_name: string;             // Nombre del tool
  tool_input: string;            // Input del tool (JSON serializado)
  tool_output: string;           // Output del tool
  tool_execution_ms: number;     // Tiempo de ejecución
  tool_status: 'success' | 'error';
}
```

### 2.4 Policy check

```typescript
interface PolicyCheck {
  policy_name: string;           // Nombre de la política evaluada
  status: 'pass' | 'fail' | 'review';
  details?: string;              // Razón del resultado
}
```

### 2.5 Ejemplo completo

```json
{
  "receipt_id": "0192a4d3-7e8f-7b2c-9d4e-1f6a3b8c5d2e",
  "agent_id": "customer-support-v2",
  "version": "1.0",
  "prev_hash": "a3f8b2c1d4e5f6789012345678901234567890abcdef0123456789abcdef0123",
  "hash": "b4c9d3e2f5a6b7890123456789012345678901abcdef01234567890abcdef01",
  "signature": "ed25519:MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...",
  "payload": {
    "timestamp_start": "2026-06-05T14:30:45.123Z",
    "timestamp_end": "2026-06-05T14:30:47.456Z",
    "input": "¿Cuál es el estado de mi orden #12345?",
    "output": "Tu orden #12345 fue enviada el 3 de junio y está programada para entrega el 8 de junio.",
    "model": "gpt-4o",
    "provider": "openai",
    "tokens_prompt": 145,
    "tokens_completion": 32,
    "tokens_total": 177,
    "tool_calls": [
      {
        "tool_name": "get_order_status",
        "tool_input": "{\"order_id\": \"12345\"}",
        "tool_output": "{\"status\": \"shipped\", \"estimated_delivery\": \"2026-06-08\"}",
        "tool_execution_ms": 234,
        "tool_status": "success"
      }
    ],
    "policy_check": {
      "policy_name": "pii_redaction",
      "status": "pass",
      "details": "No PII detected in output"
    }
  },
  "metadata": {
    "environment": "production",
    "user_id": "usr_abc123",
    "session_id": "sess_xyz789"
  }
}
```

---

## 3. Campos obligatorios por regulatoria

### 3.1 Mapeo al Artículo 12

| Requisito del Artículo 12 | Campo en el schema | ¿Obligatorio? |
|---------------------------|-------------------|--------------|
| Periodo de cada uso (start date/time, end date/time) | `payload.timestamp_start`, `payload.timestamp_end` | **Sí** |
| Base de datos de referencia | `payload.tool_calls[].tool_input` | Solo si aplica |
| Input data que produjo match | `payload.input` | **Sí** |
| Identificación del verificador humano | `payload.human_verifier` | Solo si aplica (Art. 14) |

### 3.2 Evidencia de integridad

| Requisito | Campo | Verificación |
|-----------|-------|-------------|
| Logs inmutables | `hash`, `prev_hash` | Hash chain: romper un eslabón = detectado |
| Firma digital | `signature` | Ed25519 verify |
| Sin alteración retroactiva | `prev_hash` apunta al anterior | Cada receipt verifica al anterior |

---

## 4. API del SDK

### 4.1 AuditReceipt class

```typescript
class AuditReceipt {
  constructor(config: {
    agentId: string;
    storageDir?: string;   // Default: ./audit-logs/
  })

  // Record a single interaction and return the receipt
  async record(interaction: {
    input: string;
    output: string;
    model: string;
    provider: string;
    tokensPrompt?: number;
    tokensCompletion?: number;
    toolCalls?: ToolCall[];
    policyCheck?: PolicyCheck;
    humanVerifier?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Receipt>

  // Verify chain integrity from a list of receipts
  static verifyChain(receipts: Receipt[]): boolean

  // Export receipts as JSON array
  async exportJSON(range?: {
    start?: Date;
    end?: Date;
  }): Promise<Receipt[]>
}
```

### 4.2 Vercel AI SDK middleware

```typescript
import { wrapLanguageModel } from 'ai';
import { auditReceiptMiddleware } from '@aivoralabs/agenttrail';

const model = wrapLanguageModel({
  model: yourModel,
  middleware: auditReceiptMiddleware({
    agentId: 'my-agent-v1',
  }),
});
```

### 4.3 OpenAI SDK wrapper

```typescript
import { createAuditWrapper } from '@aivoralabs/agenttrail';

const client = createAuditWrapper(new OpenAI(), {
  agentId: 'my-agent-v1',
});

const completion = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
});
// Receipt generado automáticamente
```

---

## 5. Export formats

### 5.1 JSON (MVP)

Archivo: `audit-log-{agentId}-{YYYY-MM}.jsonl`

Cada línea es un receipt JSON válido. Append-only. Sin delimitador entre líneas (JSONL estándar).

### 5.2 Receipt suelto

```json
{
  "format": "agent-audit-receipt-v1",
  "generated_at": "2026-06-05T14:30:48.000Z",
  "sdk_version": "1.0.0",
  "receipts": [ ... ],
  "chain_verified": true
}
```

---

## 6. Storage schema (archivos)

```
audit-logs/
├── agent-customer-support-v2/
│   ├── 2026-06.jsonl          # Junio 2026
│   ├── 2026-07.jsonl          # Julio 2026
│   └── ...
├── agent-invoice-processor-v1/
│   ├── 2026-06.jsonl
│   └── ...
└── .receipt-index             # Opcional: índice para búsqueda rápida
```

**Decisión**: Un archivo por mes por agente.

**Justificación**: El Artículo 26(6) exige retención mínima de 6 meses. Archivos mensuales facilitan la rotación y exportación por período.

---

## 7. Limitaciones conocidas del schema V1

| Limitación | Impacto | Plan |
|-----------|---------|------|
| No soporta streaming token-by-token | Se captura el output completo, no el stream | Post-MVP: chunk-level receipts |
| No soporta multi-modal (imágenes, audio) | Solo texto | Post-MVP: hash de contenido no-textual |
| Sin Merkle trees | Verificación O(n) en lugar de O(log n) | Post-MVP cuando volumen > 10k/día |
| Sin timestamps externos (RFC 3161) | Dependencia del reloj local | Post-MVP: TSA integration |

---

## 8. Referencias

- [VCP v1.1 Specification](https://veritaschain.org/blog/posts/2026-01-19-eu-ai-act-vcp-v1-1-cryptographic-audit-trails/) — Estructura de eventos y hash chain
- [EU AI Act Article 12](https://artificialintelligenceact.eu/article/12/) — Requisitos de logging
- `market-research/analyses/2.Búsqueda de Dolor en Cumplimiento IA.md` — JSONL format, retention requirements
- RFC 9562 — UUIDv7
- RFC 3161 — Timestamp Authority (post-MVP)
