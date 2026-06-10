# Integration Specification — Agent Audit Receipts

> **Integration Spec Document**
> Versión: 1.0
> Estado: Borrador pre-MVP
> Basado en: Documentación oficial de Vercel AI SDK, OpenAI SDK,
> e investigaciones en `market-research/analyses/`

---

## 1. Principios de integración

| Principio | Decisión | Justificación |
|-----------|----------|---------------|
| **Middleware, no fork** | Interceptamos sin modificar el código del usuario | Facilita adopción: `npm install` + 3 líneas de código |
| **Zero-touch** | El SDK captura automáticamente input/output | Si requiere configuración manual, no lo adopta un equipo ocupado |
| **Provider-agnostic** | Soporte multi-provider desde V1 | OpenAI y Anthropic son los más usados por el target |
| **Fail-closed** | Strict mode: si falla la escritura del receipt, el agente NO responde. Permissive mode: se genera receipt degradado y el agente continúa. | Compliance-grade requiere fail-closed. El modo permissivo es para desarrollo/QA. |

---

## 2. Integración con Vercel AI SDK (P0 — MVP)

### 2.1 Enfoque

Usamos `wrapLanguageModel()` con `LanguageModelV4Middleware`. Este es el mecanismo oficial de Vercel AI SDK para interceptar y extender llamadas a modelos.

**Justificación**: La documentación oficial de Vercel AI SDK proporciona `wrapGenerate` y `wrapStream` hooks que capturan params (input) y result (output) de cada llamada. Es el mecanismo más limpio y no requiere fork.

### 2.2 Implementación

```typescript
// @aivoralabs/agenttrail/src/integrations/vercel-ai.ts

import type { LanguageModelV4Middleware } from '@ai-sdk/provider';
import { AuditReceipt, ReceiptBuilder } from '../core/receipt';

interface VercelAIConfig {
  agentId: string;
  storageDir?: string;
}

export function auditReceiptMiddleware(config: VercelAIConfig): LanguageModelV4Middleware {
  const receiptBuilder = new ReceiptBuilder({
    agentId: config.agentId,
    storage: config.storageDir,
  });

  return {
    specificationVersion: 'v3',

    wrapGenerate: async ({ doGenerate, params }) => {
      const timestampStart = new Date().toISOString();
      const result = await doGenerate();
      const timestampEnd = new Date().toISOString();

      await receiptBuilder.record({
        input: JSON.stringify(params.prompt),
        output: result.text ?? '',
        model: params.modelId ?? 'unknown',
        provider: 'vercel-ai',
        tokensPrompt: result.usage?.promptTokens,
        tokensCompletion: result.usage?.completionTokens,
        metadata: {
          timestamp_start: timestampStart,
          timestamp_end: timestampEnd,
          settings: params?.providerMetadata,
        },
      });

      return result;
    },

    wrapStream: async ({ doStream, params }) => {
      const timestampStart = new Date().toISOString();
      const { stream, ...rest } = await doStream();

      let fullOutput = '';

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          if (chunk.type === 'text-delta') {
            fullOutput += chunk.delta;
          }
          controller.enqueue(chunk);
        },
        async flush() {
          const timestampEnd = new Date().toISOString();
          await receiptBuilder.record({
            input: JSON.stringify(params.prompt),
            output: fullOutput,
            model: params.modelId ?? 'unknown',
            provider: 'vercel-ai',
          });
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    },
  };
}
```

### 2.3 Uso del desarrollador

```typescript
import { wrapLanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
import { auditReceiptMiddleware } from '@aivoralabs/agenttrail-vercel';

const model = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: auditReceiptMiddleware({
    agentId: 'customer-support-v1',
  }),
});

// A partir de acá, todas las llamadas se registran automáticamente
const { text } = await generateText({ model, prompt: 'Hello!' });
```

### 2.4 Dependencias

- `ai` >= 4.0 (SDK core)
- `@ai-sdk/provider` >= 1.0 (LanguageModelV4Middleware type)

---

## 3. Integración con OpenAI SDK (P0 — MVP)

### 3.1 Enfoque

Creamos un wrapper que intercepta `chat.completions.create()` usando proxying. El OpenAI SDK soporta eventos (`on('chatCompletion')`) que podemos usar para capturar el resultado.

**Justificación**: El SDK de OpenAI expone eventos en `stream()` y `runTools()`, pero para consistencia creamos un proxy que envuelve el método `create()`. Esto funciona tanto para streaming como para no-streaming.

### 3.2 Implementación

```typescript
// @aivoralabs/agenttrail/src/integrations/openai.ts

import OpenAI from 'openai';
import { AuditReceipt } from '../core/receipt';

interface OpenAIConfig {
  agentId: string;
}

export function wrapOpenAI(client: OpenAI, config: OpenAIConfig): OpenAI {
  const receiptBuilder = new ReceiptBuilder({ agentId: config.agentId });

  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  // Override create method
  client.chat.completions.create = async (...args: Parameters<typeof originalCreate>) => {
    const [params] = args;
    const timestampStart = new Date().toISOString();

    const result = await originalCreate(...args);
    const timestampEnd = new Date().toISOString();

    // Extract messages for audit
    const inputMessages = params.messages ?? [];
    const outputMessage = result.choices?.[0]?.message;

    receiptBuilder.record({
      input: JSON.stringify(inputMessages),
      output: outputMessage?.content ?? '',
      model: params.model ?? 'unknown',
      provider: 'openai',
      tokensPrompt: result.usage?.prompt_tokens,
      tokensCompletion: result.usage?.completion_tokens,
      metadata: {
        timestamp_start: timestampStart,
        timestamp_end: timestampEnd,
        finish_reason: result.choices?.[0]?.finish_reason,
        tool_calls: outputMessage?.tool_calls,
      },
    });

    return result;
  };

  return client;
}
```

### 3.3 Uso del desarrollador

```typescript
import OpenAI from 'openai';
import { wrapOpenAI } from '@aivoralabs/agenttrail-openai';

const client = wrapOpenAI(new OpenAI(), {
  agentId: 'customer-support-v1',
});

// Todo se registra automáticamente
const completion = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### 3.4 Dependencias

- `openai` >= 4.0 (SDK Node.js)

---

## 4. Integración con LangChain (Post-MVP — V2)

### 4.1 Enfoque

Implementamos un `BaseCallbackHandler` personalizado que LangChain ejecuta en cada paso del agente.

**Justificación**: LangChain usa un sistema de callbacks para tracing y logging. `BaseCallbackHandler` puede interceptar `on_llm_start`, `on_llm_end`, `on_tool_start`, `on_tool_end`.

### 4.2 Implementación planificada

```typescript
// @aivoralabs/agenttrail/src/integrations/langchain.ts (V2)

import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

export class AuditReceiptHandler extends BaseCallbackHandler {
  name = 'agent_audit_receipt';
  
  async onLLMStart({ prompts }: { prompts: string[] }) {
    // Store start time and prompts
  }
  
  async onLLMEnd({ generations }: { generations: any[] }) {
    // Capture output and generate receipt
  }
  
  async onToolStart({ tool, input }: { tool: string; input: string }) {
    // Capture tool calls
  }
  
  async onToolEnd({ output }: { output: string }) {
    // Capture tool results
  }
}
```

### 4.3 Uso planificado

```typescript
import { AuditReceiptHandler } from '@aivoralabs/agenttrail';

const handler = new AuditReceiptHandler({ agentId: 'my-agent' });

const result = await agent.invoke(
  { input: 'Hello' },
  { callbacks: [handler] }
);
```

---

## 5. Integración con OpenAI Agents SDK (Post-MVP — V2)

### 5.1 Enfoque

El OpenAI Agents SDK soporta tracing nativo y middleware para guardrails. Implementaremos un guardrail de auditoría.

```typescript
// Planificado para V2
import { Agent, Runner } from 'openai-agents';

const agent = new Agent({
  name: 'Support Agent',
  instructions: 'You are support agent',
});

// Nuestro hook de auditoría se engancha al lifecycle
Runner.run(agent, [message], {
  auditHook: async (event) => {
    // event = { input, output, tool_calls, timestamp, ... }
    await auditReceipt.record(event);
  },
});
```

---

## 6. Matriz de compatibilidad

| Framework | SDK Version | Status | Prioridad | Tiempo estimado de integración |
|-----------|-------------|--------|-----------|-------------------------------|
| Vercel AI SDK | >= 4.0 | ✅ MVP | P0 | Día 1 |
| OpenAI Node SDK | >= 4.0 | ✅ MVP | P0 | Día 1 |
| LangChain (JS) | >= 0.3 | 📋 V2 | P1 | Día 15 |
| OpenAI Agents JS | >= 0.1 | 📋 V2 | P1 | Día 15 |
| Anthropic SDK | >= 0.30 | 📋 V3 | P2 | Post-validación |
| Google AI SDK | >= 0.20 | 📋 V3 | P2 | Post-validación |

**Justificación de prioridad**: El target (SaaS europeo 50-500 emp) usa mayoritariamente OpenAI y Vercel AI SDK. LangChain es común pero más pesado de integrar — lo dejamos para V2.

---

## 7. Testing de integraciones

| Test | Descripción | Herramienta |
|------|-------------|-------------|
| **Unitario** | Verificar que middleware captura input/output sin modificar resultado | Vitest + mock de modelo |
| **Integración real** | Llamada real a OpenAI con y sin SDK, comparar outputs | OpenAI API key de test |
| **Latencia** | Medir overhead del middleware en llamada real | `performance.now()` |
| **Alteración** | Modificar receipt guardado y verificar que verifyChain() falla | Test con archivos corruptos |
| **Concurrencia** | 100 llamadas paralelas, verificar que todos los receipts se registran | Promise.all + verificación |

---

## 8. Referencias

- [Vercel AI SDK — Middleware Documentation](https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/40-middleware.mdx) — `wrapLanguageModel()` y `LanguageModelV4Middleware`
- [Vercel AI SDK — Telemetry](https://github.com/vercel/ai/blob/main/content/docs/03-ai-sdk-core/60-telemetry.mdx) — Custom telemetry interface
- [OpenAI Node SDK — Chat Completions](https://github.com/openai/openai-node/blob/master/api.md) — API reference
- [LangChain JS — Callbacks](https://docs.langchain.com/oss/javascript/langchain/observability) — `BaseCallbackHandler` y `LangChainTracer`
