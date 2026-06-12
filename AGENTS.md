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

### Convenciones de la Landing Page (`apps/landing/`)

#### Stack
- **Framework**: Astro 6 (`output: 'static'`)
- **CSS**: Tailwind CSS v4 via `@tailwindcss/vite`
- **Plugins**: `@astrojs/sitemap` (genera sitemap-index.xml automáticamente)
- **Deploy**: Cloudflare Pages via GitHub Actions (`.github/workflows/deploy-landing.yml`)

#### Tailwind CSS v4 — Tema personalizado (`src/styles/globals.css`)
```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme {
  --font-heading: "Bricolage Grotesque", "system-ui", "sans-serif";
  --font-mono: "DM Mono", "Fira Code", "monospace";
  --color-brand-50: #f0fdfa;
  --color-brand-100: #ccfbf1;
  ...
  --color-brand-600: #0d9488;  /* Primary CTA */
  --color-surface-light: #eef0e9;
  --color-surface-dark: #07090f;
}
```
- Dark mode se controla con `data-theme="dark"` en `<html>`, no con `prefers-color-scheme`.
- El `@custom-variant dark` usa `[data-theme="dark"] *` para anidamiento.

#### Colores de texto — Convención

Todos los headings y texto del sitio siguen esta convención de color, SIN excepciones:

| Elemento | Clase |
|----------|-------|
| **Headings** | Sin clase de color explícita (heredan del body) |
| **Body base** | `text-slate-900 dark:text-slate-100` en `<body>` |
| **Texto secundario** | `text-slate-600 dark:text-slate-400` |
| **Texto terciario** | `text-slate-500 dark:text-slate-500` |
| **Enlaces/acentos** | `text-brand-600 dark:text-brand-400` |

Si un componente necesita color explícito (ej. dentro de `<dialog>` que tiene UA styles), usar `text-slate-900 dark:text-slate-100`.

#### Patrón de componentes

- **Componentes Astro** en `src/components/`, archivos en PascalCase (`Hero.astro`, `Pricing.astro`).
- **Layout** en `src/layouts/BaseLayout.astro`.
- **Páginas** en `src/pages/index.astro`.
- **Estilos globales** en `src/styles/globals.css`.
- **Assets públicos** en `public/` (favicon.svg, og-image.png, robots.txt).

#### Headings
- Usar `font-heading` + `font-extrabold` + `tracking-tight` para todos los headings.
- Escalas responsivas: `text-3xl md:text-4xl` para h2, `text-5xl md:text-7xl lg:text-8xl` para h1.
- NO poner clase de color explícita en headings — heredan del body.

#### Componentes interactivos — JS vanilla inline

TODO el JavaScript interactivo usa el patrón **IIFE inline** con `<script>` (NO `client:load`):

```astro
<script>
  (function () {
    // Vanilla JS, sin frameworks
    var el = document.getElementById('...');
    el.addEventListener('click', function (e) { ... });
  })();
</script>
```

Ejemplos existentes:
- `ThemeToggle.astro` — toggle dark/light con localStorage
- `WaitlistModal.astro` — modal de waitlist con form + fetch

#### Modales — Patrón `<dialog>`

- Usar `<dialog>` nativo (no divs personalizados).
- Abrir con `.showModal()` (no `.show()`).
- Centrado: `dialog[open] { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0; }`.
- Cierre con ESC nativo, backdrop click, y botón close explícito.
- Focus management: `requestAnimationFrame(() => input.focus())` al abrir, devolver focus al trigger al cerrar.
- Triggers con atributo `data-*` (ej. `data-open-waitlist`), escuchados con event delegation en `document.addEventListener('click')`.

#### Botones

| Tipo | Clase |
|------|-------|
| **Primario (CTA)** | `bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/25` |
| **Secundario** | `border border-slate-300 dark:border-slate-700 hover:border-brand-500/50 text-slate-700 dark:text-slate-300` |
| **Deshabilitado** | `bg-brand-400 disabled:cursor-not-allowed` |

- Misma clase `inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200` en todos.

#### Pricing — Estructura de datos

Array de objetos con: `{ name, price, sub, description, features[], cta, recommended }`.

| Plan | Precio | Agents | Receipts | CTA |
|------|--------|--------|----------|-----|
| Starter | $99/month | hasta 3 | 10,000/mes | "Join waitlist" |
| Growth | $299/month | hasta 10 | 50,000/mes | "Join waitlist" |
| Scale | $999/month | hasta 50 | Ilimitados | "Join waitlist" |
| Enterprise | Custom | Ilimitados | Ilimitados | "Contact sales" |

El tag `recommended` NO se usa en ningún plan (fue removido).

#### SEO — Meta tags en BaseLayout.astro

Todo en `<head>`, orden estricto:

1. **Redirect script** (primero): redirige `agenttrail.pages.dev` → `agenttrail.aivoralabs.org`
2. **Charset + viewport**
3. **Title + description** (desde props de la página)
4. **Favicon**: `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`
5. **Open Graph**: title, description, type, url + image (1200x630, png, alt)
6. **Twitter Cards**: card=summary_large_image, title, description, image
7. **Canonical**: `<link rel="canonical">` + `<meta name="canonical">`
8. **Hreflang**: en + x-default
9. **Theme color** (light/dark)
10. **JSON-LD**: Schema.org SoftwareApplication con Offer price="0", MIT license
11. **Google Fonts** (preconnect + stylesheet)
12. **Theme FOUC prevention** (script inline antes de </head>)

#### Waitlist API — Patrón Cloudflare Pages Function

- Ruta: `functions/api/waitlist.ts` → sirve en `POST /api/waitlist`
- Usar `onRequestPost: PagesFunction<Env>` con interfaz `Env { BREVO_API_KEY: string; BREVO_LIST_ID: string; }`
- Variables de entorno desde `context.env`, NUNCA hardcodeadas
- Proxy a Brevo `POST /v3/contacts` con `updateEnabled: true`
- Manejar: 201 (created) y 204/400 duplicate (ambos como éxito)
- Routing: `_routes.json` con `include: ["/api/*"], exclude: ["/*"]`

#### PII / GDPR

- Checkbox de consentimiento obligatorio en formularios que recolecten emails.
- Texto: "I agree to receive updates about AgentTrail. No spam. Unsubscribe anytime."
- Botón submit deshabilitado hasta que el checkbox esté marcado.
- Label con `display:flex; gap:8px; align-items:flex-start; font-size:0.8rem`.

#### Assets públicos

| Archivo | Ruta | Propósito |
|---------|------|-----------|
| `favicon.svg` | `public/favicon.svg` | Shield SVG teal en pestaña |
| `og-image.png` | `public/og-image.png` | Open Graph preview (1200x630) |
| `robots.txt` | `public/robots.txt` | Allow all + sitemap URL |

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
