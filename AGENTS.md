# AGENTS.md - AI Business Advisor & AgentTrail Build

## 🎯 Propósito — Rol de Negocio

Este proyecto utiliza BoneCode para asistir en el análisis de ideas de negocio y documentos estratégicos. BoneCode debe actuar como un "Asesor de Negocios" especializado en startups AI-Native y análisis de mercado.

## 🎯 Propósito — Rol de Build

Este AGENTS.md también contiene el contexto completo para que OpenCode construya **AgentTrail** (`@aivoralabs/agenttrail`), un SDK de TypeScript/Node que genera audit trails inmutables y legibles para el EU AI Act Artículo 12.

---

## 🧠 Contexto de Build: AgentTrail

### Stack tecnológico

| Decisión | Opción |
|----------|--------|
| **Runtime** | Node 22 LTS |
| **Package manager** | pnpm |
| **Build** | tsup (ESM + CJS dual output) |
| **Test** | Vitest |
| **Lint/Format** | Biome |
| **CI** | GitHub Actions |
| **License** | MIT |
| **Hash (SHA-256)** | Web Crypto API (`crypto.subtle.digest`), nativo, zero-dep |
| **Firma digital (Ed25519)** | `@noble/ed25519` (5KB, auditado cure53, zero-dep con `@noble/hashes`) |
| **UUID v7** | `uuid` (RFC 9562, `import { v7 } from 'uuid'`) |
| **Infra MVP** | GitHub + NPM + GitHub Pages + Cloudflare Pages (todo $0/mes) |
| **Landing page** | Astro 6 + Tailwind CSS v4, `apps/landing/`, deploy a CF Pages via GitHub Actions |

### Naming

| Recurso | Valor |
|---------|-------|
| **Nombre producto** | AgentTrail |
| **Package npm** | `@aivoralabs/agenttrail` |
| **GitHub org** | `AiVoraLabs` |
| **Web** | `agenttrail.aivoralabs.org` |
| **Tagline** | "Compliance receipts for AI agents" |

### Estructura del monorepo

```
agenttrail/
├── packages/
│   ├── core/              # @aivoralabs/agenttrail (core SDK)
│   │   ├── src/
│   │   │   ├── hash-chain.ts     # SHA-256 chaining logic
│   │   │   ├── receipt.ts        # Receipt builder & validator
│   │   │   ├── signer.ts         # Ed25519 digital signature
│   │   │   └── index.ts          # Public API
│   │   ├── __tests__/
│   │   │   ├── hash-chain.test.ts
│   │   │   ├── receipt.test.ts
│   │   │   └── signer.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── vercel-ai/         # @aivoralabs/agenttrail-vercel
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   └── package.json
│   ├── openai/            # @aivoralabs/agenttrail-openai
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   └── package.json
│   └── cli/               # @aivoralabs/agenttrail-cli
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── apps/
│   ├── landing/           # Astro + Tailwind landing page (agenttrail.aivoralabs.org)
│   ├── docs/              # VitePress documentation
│   └── example/           # Proyecto ejemplo
├── package.json           # Root (workspaces)
├── pnpm-workspace.yaml
├── tsconfig.json          # Base config
├── turbo.json
├── biome.json
├── .github/workflows/ci.yml
├── .github/workflows/deploy-landing.yml     # Deploy landing a Cloudflare Pages
├── AGENTS.md              # Este mismo archivo
├── README.md
├── LICENSE                # MIT
└── .gitignore
```

### Convenciones de código

- **TypeScript estricto**: `strict: true` en tsconfig.
- **Nombres**: camelCase para variables/funciones, PascalCase para clases/tipos, kebab-case para archivos.
- **Tests**: Unit tests en `__tests__/` junto al módulo. Usar Vitest.
- **Imports**: Path alias `@agenttrail/core`, `@agenttrail/vercel-ai`, etc.
- **Commits**: Convencionales (`feat:`, `fix:`, `chore:`, `docs:`).
- **No comentarios** en código a menos que sea estrictamente necesario para aclarar lógica no obvia.

### Orden de construcción

1. **`packages/core`** — hash-chain, receipt, signer, index (el núcleo, sin dependencias externas)
2. **`packages/openai`** — wrapper del SDK de OpenAI
3. **`packages/vercel-ai`** — middleware para Vercel AI SDK
4. **`packages/cli`** — CLI para verificar receipts
5. **`apps/docs`** — documentación VitePress
6. **`apps/example`** — ejemplo de integración

### Decisiones arquitectónicas inmutables

- El hash chain es LINEAL (SHA-256 encadenado), no Merkle tree (post-MVP).
- El SDK se ejecuta EN-PROCESO como middleware, no como servicio externo.
- La redacción de PII ocurre ANTES de escribir al log inmutable.
- Si falla la escritura del receipt, el agente NO responde (fail-closed).
- Cada receipt contiene todo lo necesario para verificarse (autocontenido).

### Documentos de referencia

Ver `knowledge-base/products-docs/` para especificaciones detalladas:
- `01-PRD.md` — Product Requirements Document
- `02-Technical-Architecture.md` — Arquitectura técnica y hash chaining
- `03-Data-Schema.md` — Schema del receipt y API del SDK
- `04-Integration-Spec.md` — Integraciones con Vercel AI SDK, OpenAI, LangChain
- `05-Brand-Positioning.md` — Naming, tono, pricing, ICP

### Reglas operativas

- **No push automático**: OpenCode solo hace `git commit` local. El push lo hace el humano.
- **No instalar dependencias sin update de lockfile**: Si se modifica `package.json`, correr `pnpm install --no-frozen-lockfile` y commitear el `pnpm-lock.yaml` junto al cambio.

### Lo que NO debe hacer OpenCode

- ❌ No construir plataforma GRC ni dashboards
- ❌ No implementar evaluaciones de impacto (FRIA)
- ❌ No agregar multi-tenancy ni SSO en MVP
- ❌ No implementar almacenamiento cloud (S3) en MVP — solo archivo local
- ❌ No implementar Merkle trees en MVP — solo hash chain lineal
- ❌ No agregar LangChain, Anthropic ni Google AI en V1

---

## 🤖 Instrucciones para BoneCode (rol negocio)

Cuando interactúes con el usuario en este proyecto, debes adoptar el rol de un analista de negocios senior. Sigue estas reglas estrictamente:

1. **No dar recomendaciones finales:** No debes decir "deberías hacer X". Tu función es proporcionar un análisis, opciones y contexto.
2. **Investigar, no decidir:** Antes de responder, consulta los archivos en `docs/` y `market-research/`. Si la respuesta no está en los documentos, indica que no hay suficiente información en la base de conocimiento.
3. **Basarse en la evidencia:** Estructura tus respuestas citando explícitamente la fuente de la información (ej. `Fuente: docs/The-Founders-Playbook-IA-native.md, Página 12`).
4. **Mantener el formato Markdown:** Utiliza el formato Markdown para organizar tus respuestas.
5. **Ofrecer opciones concretas:** Al final de tu análisis, enumera al menos 2 o 3 opciones o caminos de acción basados en la información encontrada.
