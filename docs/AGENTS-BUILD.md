# AGENTS-BUILD — AgentTrail Construction Plan

> Plan de construcción paso a paso para OpenCode.
> Sigue este orden estrictamente. No te saltes pasos ni añadas features no especificadas.

---

## Orden de construcción

### Fase 1: Inicializar monorepo

1. Crear `package.json` root con workspaces
2. Crear `pnpm-workspace.yaml`
3. Crear `tsconfig.json` base (strict: true)
4. Crear `biome.json`
5. Crear `turbo.json`
6. Crear `.gitignore`
7. Crear `LICENSE` (MIT)
8. Crear `README.md` con tagline, quick start, y enlaces a docs

### Fase 2: packages/core

1. `packages/core/package.json` — name: `@aivoralabs/agenttrail`
2. `packages/core/tsconfig.json`
3. `packages/core/src/hash-chain.ts` — SHA-256 chaining
4. `packages/core/src/receipt.ts` — Receipt builder & validator
5. `packages/core/src/signer.ts` — Ed25519 digital signature
6. `packages/core/src/index.ts` — Public API
7. Tests en `packages/core/__tests__/`

### Fase 3: packages/openai

1. `packages/openai/package.json` — name: `@aivoralabs/agenttrail-openai`
2. `packages/openai/src/index.ts` — OpenAI SDK wrapper
3. Tests

### Fase 4: packages/vercel-ai

1. `packages/vercel-ai/package.json` — name: `@aivoralabs/agenttrail-vercel`
2. `packages/vercel-ai/src/index.ts` — Vercel AI SDK middleware
3. Tests

### Fase 5: packages/cli

1. `packages/cli/package.json` — name: `@aivoralabs/agenttrail-cli`
2. `packages/cli/src/index.ts` — CLI para verificar receipts
3. Tests

### Fase 6: apps/example

1. Proyecto ejemplo que usa el SDK con OpenAI
2. README con instrucciones

---

## Reglas para OpenCode

- **NO** agregues dependencias no especificadas en AGENTS.md
- **NO** construyas dashboards, UI web, ni APIs REST
- **NO** implementes Merkle trees ni multi-tenancy
- **NO** agregues integraciones con LangChain, Anthropic, Google AI en V1
- **Commit** cada fase completada con mensajes convencionales
- **Tests** primero: escribe el test antes de implementar (TDD)
- **TypeScript estricto**: sin `any`, sin `@ts-ignore`
