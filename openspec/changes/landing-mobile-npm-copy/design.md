# Design: Landing mobile fixes, npm publish config, and copy-to-clipboard buttons

## Technical Approach

Cinco workstreams independientes que no se bloquean entre sí: (1) fixes CSS puros para overflow mobile, (2) configuración de publicación npm con CI, (3) botones copy-to-clipboard vanilla JS en bloques de código, (4) actualización de README con badges y secciones nuevas, (5) documentación de seguridad. No hay cambios en lógica de SDK — solo metadata, CSS, HTML y JS del landing.

---

## Workstream 1: Mobile Overflow Fixes

### Arquitectura de la solución

Cada fix es CSS-only (clases Tailwind v4). No hay JavaScript ni cambios de estructura DOM. Los breakpoints `sm:` (640px) y `md:` (768px) se usan para escalar de mobile a desktop.

### Decisiones de implementación por componente

| Componente | Cambio actual | Cambio propuesto | Por qué |
|---|---|---|---|
| `Hero.astro` L21 | `text-5xl md:text-7xl lg:text-8xl` | `text-4xl sm:text-5xl md:text-7xl lg:text-8xl` | `text-5xl` (3rem/48px) desborda en 320px — el `<h1>` tiene 2 líneas y el ancho disponible es ~288px con px-6. `text-4xl` (2.25rem/36px) cabe. |
| `HowItWorks.astro` L24,38,58 | `<pre class="... overflow-x-auto ...">` | Agregar `w-full` a cada `<pre>` | Los `<pre>` están dentro de un `flex-1` parent. Sin width explícito, el contenido inline (código largo) empuja el ancho del flex child más allá del viewport. `w-full` fuerza `width: 100%` del padre, y `overflow-x-auto` genera scroll interno. |
| `HowItWorks.astro` L85 | `grid grid-cols-3 gap-4` | `grid grid-cols-1 sm:grid-cols-3 gap-4` | En 320px, 3 columnas a ~96px cada una apilan texto sin legibilidad. Single column apila verticalmente. |
| `CTA.astro` L15,26,34 | `px-8 py-3.5` en 3 botones | `px-6 sm:px-8 py-3.5` | `px-8` (2rem/32px por lado) + padding del flex container = 64px de padding total. En 320px con flex-col, 3 botones stackeados cabe, pero el padding reduce el area clickeable. `px-6` (1.5rem) en base. |
| `WaitlistModal.astro` L6 | `class="fixed inset-0 ..."` | Eliminar `inset-0` de la clase del `<dialog>` | El CSS en L98-104 ya posiciona el dialog con `position:fixed; top:50%; left:50%; transform:translate(-50%,-50%)`. `inset-0` (top/right/bottom/left:0) entra en conflicto con el `top:50%` del CSS — funciona en desktop pero en mobile el `inset-0` fuerza dimensions que causan overflow. El CSS `dialog[open]` es suficiente. |

### Flujo de datos del fix

```
Viewport resize → Tailwind responsive prefixes evalúan →
  text-4xl/sm:text-5xl → escala font del h1
  w-full → fuerza width del <pre> al 100% del padre flex
  grid-cols-1/sm:grid-cols-3 → reorganiza grid
  px-6/sm:px-8 → reduce padding de botones
  (sin inset-0) → dialog se centra via CSS transform
```

### Compatibilidad Tailwind v4

- `w-full`, `grid-cols-1`, `sm:grid-cols-3`, `px-6`, `sm:px-8`, `text-4xl`, `sm:text-5xl` — todos son utilidades core de Tailwind v4. Sin cambios en `globals.css` ni `@theme`.
- `@custom-variant dark` no se ve afectado — los fixes son independientes del theme.
- No se usan utilidades deprecadas ni plugins custom.

### Manejo de errores

No aplica — es CSS puro. Si un breakpoint falla, la evidencia es visual (horizontal scroll).

### Testing

| Qué | Cómo |
|---|---|
| Overflow 320px | Abrir DevTools, responsive mode, 320px, scroll horizontal = 0 |
| Overflow 375/390/414px | Mismos breakpoints, verificar que no hay scroll |
| Hero heading | Verificar que a 320px usa text-4xl (inspeccionar computed style) |
| HowItWorks grid | A 320px debe ser 1 columna, a 640px+ 3 columnas |
| CTA buttons | A 320px padding px-6 visible, a 640px+ px-8 |
| WaitlistModal | Abrir modal en mobile, verificar que se centra sin overflow |

---

## Workstream 2: npm Publish Configuration

### Decisiones de implementación

#### Decision: .npmrc en root

**Choice**: `@aivoralabs:registry=https://registry.npmjs.org/`
**Alternatives**: (1) No .npmrc — pnpm usaría el registry default, pero scoped packages necesitan config explícita. (2) `.npmrc` por package — duplicación innecesaria en monorepo.
**Rationale**: Un solo `.npmrc` root configura el scope para todos los packages. pnpm hereda esta config en `pnpm publish`.

#### Decision: prepack script solo en core

**Choice**: `"prepack": "pnpm run build"` solo en `packages/core/package.json`
**Alternatives**: (1) En los 4 packages — redundante porque `turbo run build` ya compila todo antes de publish. (2) En el workflow CI — ya está en el pipeline, pero prepack protege contra `npm pack` local.
**Rationale**: `prepack` es un safety net para que si alguien ejecuta `npm pack` o `npm publish` localmente, el build siempre corra. En CI, el workflow ya hace `pnpm build` antes.

#### Decision: Release workflow separado de CI

**Choice**: `.github/workflows/release.yml` dedicado, triggers en `v*` tags + `workflow_dispatch`
**Alternatives**: (1) Agregar publish al `ci.yml` — violaría single-responsibility. (2) Changeset bot — requiere más configuración.
**Rationale**: Separar CI (calidad en cada PR) de Release (publicación en tags) es patrón estándar. El workflow existente `ci.yml` se mantiene intacto.

### Cambios exactos en package.json

#### `packages/core/package.json` — diff

```json
// Agregar después de "engines":
"homepage": "https://agenttrail.aivoralabs.org",
"repository": {
  "type": "git",
  "url": "git+https://github.com/AiVoraLabs/agenttrail.git"
},
"author": "AivoraLabs <hello@aivoralabs.org>",
"keywords": ["eu-ai-act", "audit-trail", "compliance", "ai-agents", "cryptographic"],

// Agregar en "scripts" después de "test:coverage":
"prepack": "pnpm run build"
```

#### `packages/openai/package.json` — diff

```json
// Agregar después de "engines":
"homepage": "https://agenttrail.aivoralabs.org",
"repository": {
  "type": "git",
  "url": "git+https://github.com/AiVoraLabs/agenttrail.git"
},
"author": "AivoraLabs <hello@aivoralabs.org>",
"keywords": ["openai", "audit-trail", "compliance", "ai-agents"]
```

#### `packages/vercel-ai/package.json` — diff

```json
// Agregar después de "engines":
"homepage": "https://agenttrail.aivoralabs.org",
"repository": {
  "type": "git",
  "url": "git+https://github.com/AiVoraLabs/agenttrail.git"
},
"author": "AivoraLabs <hello@aivoralabs.org>",
"keywords": ["vercel-ai", "audit-trail", "compliance", "ai-agents"]
```

#### `packages/cli/package.json` — diff

```json
// Agregar después de "engines":
"homepage": "https://agenttrail.aivoralabs.org",
"repository": {
  "type": "git",
  "url": "git+https://github.com/AiVoraLabs/agenttrail.git"
},
"author": "AivoraLabs <hello@aivoralabs.org>",
"keywords": ["cli", "audit-trail", "verification", "compliance"]
```

### .npmrc — contenido

```
@aivoralabs:registry=https://registry.npmjs.org/
```

**Por qué**: pnpm y npm necesitan saber explícitamente a qué registry apuntar los scoped packages (`@aivoralabs/*`). Sin esta línea, `pnpm publish` de un package scoped puede fallar o intentar buscar en un registry privado.

### Release workflow — `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags: ["v*"]
  workflow_dispatch:

env:
  PNPM_VERSION: "9.0.0"
  NODE_VERSION: "22"
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"

permissions:
  contents: read
  id-token: write  # npm provenance

jobs:
  release:
    name: Build & Publish
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test

      - name: Publish packages
        run: pnpm publish -r --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: "true"
```

**Notas sobre el workflow**:
- `id-token: write` + `NPM_CONFIG_PROVENANCE=true` habilita npm provenance (SLSA build provenance).
- `--no-git-checks` es necesario porque pnpm en CI no tiene git user config para los checks de uncommitted changes.
- `pnpm publish -r` publica todos los packages con `publishConfig.access: "public"` (ya configurado en los 4 packages).
- `registry-url` en `setup-node` + `NODE_AUTH_TOKEN` configura el `.npmrc` de auth automáticamente.
- No se usa `changeset publish` porque el workflow actual del root `package.json` ya tiene `"release": "turbo run build && changeset publish"` — pero para el CI directo, `pnpm publish -r` es más simple y directo.

### Flujo de datos del publish

```
git tag v0.1.0 && git push --tags
  → GitHub Actions trigger release.yml
  → checkout + pnpm install
  → pnpm build (turbo build en todos los packages)
  → pnpm test (turbo test)
  → pnpm publish -r (publica core, openai, vercel-ai, cli)
  → npm recibe paquetes con provenance
```

### Manejo de errores

| Error | Manejo |
|---|---|
| `NPM_TOKEN` no configurado | `NODE_AUTH_TOKEN` será empty → npm responde 401 → workflow falla con error claro |
| Build falla | `pnpm build` retorna non-zero → workflow se detiene antes de publish |
| Tests fallan | `pnpm test` retorna non-zero → workflow se detiene antes de publish |
| Package ya existe | npm retorna 403 "cannot publish over previously published version" → workflow falla |

### Testing

| Qué | Cómo |
|---|---|
| Package metadata | `npm pack --dry-run` en cada package, verificar que campos aparecen |
| .npmrc | `pnpm publish --dry-run` en core, verificar que resuelve registry |
| Workflow syntax | `actionlint .github/workflows/release.yml` o push a branch y verificar en Actions tab |
| Build completo | `pnpm build` en root, verificar que genera `dist/` en todos los packages |

---

## Workstream 3: Copy-to-Clipboard Buttons

### Arquitectura del componente

```
<div class="relative group">          ← wrapper con relative + group
  <pre data-copy="npm install ...">   ← código original
    <span>$</span> npm install ...
  </pre>
  <button class="...                  ← botón absoluto, opacity-0 por defecto
    opacity-0 group-hover:opacity-100
    absolute top-3 right-3">
    <svg><!-- clipboard icon --></svg>
  </button>
</div>

<script>
  (function () {
    // Event delegation en document
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy-btn]');
      if (!btn) return;
      var pre = btn.closest('[data-copy]');
      if (!pre) return;
      var text = pre.getAttribute('data-copy');
      // Clipboard API + fallback
    });
  })();
</script>
```

### Decisiones de implementación

#### Decision: `data-copy` en `<pre>`, `data-copy-btn` en `<button>`

**Choice**: Atributos `data-*` para selector limpio.
**Alternatives**: (1) Clases CSS como `.copy-trigger` — mezcla concerns. (2) IDs — no funciona con múltiples instancias.
**Rationale**: `data-copy` en el `<pre>` contiene el texto a copiar (clean source of truth). `data-copy-btn` en el `<button>` permite delegation sin depender de clases de estilo. El `<button>` es un descendiente del `<pre>`, así que `btn.closest('[data-copy]')` navega hacia arriba.

#### Decision: Un solo IIFE con event delegation

**Choice**: Un `<script>` con un solo `document.addEventListener('click')` que maneja los 3 botones.
**Alternatives**: (1) 3 event listeners separados — viola CC-04 (event delegation). (2) Astro `client:load` — viola convención del proyecto.
**Rationale**: Sigue el patrón de `WaitlistModal.astro` (L125-146): delegation desde `document`, matching con `e.target.closest()`. Un solo listener, 0 memory leaks.

#### Decision: SVG inline (no external files)

**Choice**: SVGs inline en el HTML del botón, toggle con `classList`.
**Alternatives**: (1) Imágenes externas — más requests HTTP. (2) Icon library — dependency innecesaria.
**Rationale**: Los SVGs de ThemeToggle ya son inline (L10-36). Consistencia. Tamaño mínimo (~200 bytes cada uno).

### Data flow del copy

```
User hover sobre <div class="relative group">
  → CSS: group-hover:opacity-100 → botón visible

User click en <button data-copy-btn>
  → IIFE delegation: e.target.closest('[data-copy-btn]')
  → Navigate up: btn.closest('[data-copy]') → encuentra el <pre>
  → Read: pre.getAttribute('data-copy') → "npm install @aivoralabs/agenttrail"
  → Try: navigator.clipboard.writeText(text)
    → Success: swap icon to checkmark, setTimeout 2s → revert
    → Fail (HTTP/no API): fallback a textarea + execCommand('copy')
```

### Estructura del IIFE (siguiendo WaitlistModal.astro)

```javascript
(function () {
  var CLIPBOARD_SVG = '<svg ...>clipboard path</svg>';
  var CHECK_SVG = '<svg ...>checkmark path</svg>';

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy-btn]');
    if (!btn) return;

    var pre = btn.closest('[data-copy]');
    if (!pre) return;

    var text = pre.getAttribute('data-copy');
    if (!text) return;

    function onSuccess() {
      btn.innerHTML = CHECK_SVG;
      setTimeout(function () {
        btn.innerHTML = CLIPBOARD_SVG;
      }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); onSuccess(); }
      catch (err) { /* silent fail — button stays as clipboard */ }
      document.body.removeChild(ta);
    }
  });
})();
```

### SVG Icons

**Clipboard** (24x24, stroke-based):
```svg
<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
  <rect x="9" y="3" width="6" height="4" rx="1" />
</svg>
```

**Checkmark** (24x24, stroke-based):
```svg
<svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
  <path d="M5 13l4 4L19 7" />
</svg>
```

### CSS Transitions

El botón ya obtiene transición de la clase existente del proyecto:
- `transition-all duration-200` — fade in/out del opacity
- `group-hover:opacity-100` — activación en hover
- `opacity-0` — estado default (oculto)

Para el icon swap (clipboard → checkmark), no hay transición CSS — es un innerHTML swap instantáneo. El color verde del checkmark (`text-emerald-400`) da feedback visual inmediato.

### Manejo de errores

| Escenario | Comportamiento |
|---|---|
| `navigator.clipboard` undefined (HTTP) | Fallback a `execCommand('copy')` via textarea temporal |
| `execCommand` falla | Silent fail — botón queda como clipboard, sin feedback |
| `data-copy` attribute vacío | `if (!text) return` — noop |
| Click en espacio vacío del pre | `e.target.closest('[data-copy-btn]')` retorna null → noop |

### Testing

| Qué | Cómo |
|---|---|
| Botón aparece en hover | Hover sobre cada `<pre>` en DevTools, verificar opacity transition |
| Copy correcto | Click botón → pegar en text editor → verificar texto sin `$` |
| Checkmark feedback | Click → icono cambia a check verde por 2s → reverte |
| 3 instancias independientes | Cada `<pre>` tiene su propio botón, clipboard independiente |
| HTTP fallback | Servir localmente sin HTTPS → verificar que copy funciona |
| IIFE pattern | Inspeccionar `<script>` → no hay `client:load`, es IIFE |

---

## Workstream 4: README.md Update

### Secciones a modificar

| Sección | Cambio | Línea actual |
|---|---|---|
| Badges (L11-13) | Verificar que npm badge apunta a `@aivoralabs/agenttrail` — ya correcto | L12: OK |
| Website (L108-118) | Agregar mención explícita de la landing page live | L112: ya tiene URL |
| Nueva sección: Security | Agregar después de "Open Source — MIT" | Nueva |

### Contenido de la nueva sección "Security & Governance"

```markdown
## Security & Governance

AgentTrail is designed with security-first principles:

- **Fail-closed**: If receipt writing fails, the agent does NOT respond
- **Hash chain integrity**: SHA-256 chaining prevents tampering — any modification breaks the chain
- **Ed25519 signatures**: Every receipt is cryptographically signed
- **Zero data retention**: Receipts stay in your infrastructure — AgentTrail never sees them

For the full security review, audit methodology, and threat model, see [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### npm Provenance

All published packages include [npm provenance](https://docs.npmjs.com/generating-provenance-statements) for supply chain verification. Each package is built and published from this repository's GitHub Actions with SLSA build provenance attestations.
```

### Flujo de datos

```
README.md actualizado
  → GitHub renderiza badges (npm version badge ya correcto)
  → Sección Security referencia SECURITY-REVIEW.md (ya existe)
  → Sección npm Provenance describe attestation
```

### Manejo de errores

No aplica — es documentación estática.

### Testing

| Qué | Cómo |
|---|---|
| Badges renderizados | Abrir README en GitHub, verificar que badges cargan |
| Link SECURITY-REVIEW.md | Click en link, verificar que resuelve |
| Landing page URL | Click en badge de website, verificar que redirige |

---

## Workstream 5: Security Documentation

### Decisiones de implementación

#### Decision: SECURITY-REVIEW.md ya existe

El archivo `SECURITY-REVIEW.md` ya existe en la raíz. El README solo necesita un link y una sección descriptiva. No se duplica contenido.

#### Decision: CSP headers en Cloudflare Pages

**Choice**: Documentar CSP como recomendación, no implementar en este change.
**Alternatives**: (1) Agregar `_headers` file de Cloudflare — requiere testing en deploy real. (2) Implementar ahora — scope creep.
**Rationale**: CSP es un topic que requiere testing cuidadoso (puede romper funcionalidad existente). Este change es sobre overflow fixes + npm + copy buttons. CSP queda como follow-up.

### Contenido a agregar

En el README, la sección "Security & Governance" (descrita arriba) referencia `SECURITY-REVIEW.md`. No se modifica `SECURITY-REVIEW.md` — solo se enlaza.

### CSP Considerations (documentar en README)

```markdown
### Content Security Policy

The landing page on Cloudflare Pages is deployed with a strict CSP. Inline scripts
(IIFE pattern) are allowed via `script-src 'self' 'unsafe-inline'`. No external
scripts, styles, or resources are loaded from third-party domains.
```

### Testing

| Qué | Cómo |
|---|---|
| Link funciona | Abrir README en GitHub, click en SECURITY-REVIEW.md |
| No hardcoded secrets | `grep -r "API_KEY\|TOKEN\|SECRET" apps/landing/src/` — debe retornar 0 resultados |
| CSP documentado | Verificar que la sección existe en README |

---

## File Changes

| Archivo | Acción | Descripción |
|---|---|---|
| `apps/landing/src/components/Hero.astro` | Modify | L21: `text-5xl` → `text-4xl sm:text-5xl` |
| `apps/landing/src/components/HowItWorks.astro` | Modify | L24,38,58: agregar `w-full` a `<pre>`. L85: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`. Agregar wrappers `<div class="relative group">` + `<button>` + `<script>` IIFE |
| `apps/landing/src/components/CTA.astro` | Modify | L15,26,34: `px-8` → `px-6 sm:px-8` en 3 botones |
| `apps/landing/src/components/WaitlistModal.astro` | Modify | L6: eliminar `inset-0` de la clase del `<dialog>` |
| `packages/core/package.json` | Modify | Agregar `homepage`, `repository`, `author`, `keywords`, `prepack` script |
| `packages/openai/package.json` | Modify | Agregar `homepage`, `repository`, `author`, `keywords` |
| `packages/vercel-ai/package.json` | Modify | Agregar `homepage`, `repository`, `author`, `keywords` |
| `packages/cli/package.json` | Modify | Agregar `homepage`, `repository`, `author`, `keywords` |
| `.npmrc` | Create | `@aivoralabs:registry=https://registry.npmjs.org/` |
| `.github/workflows/release.yml` | Create | Release CI workflow para npm publish |
| `README.md` | Modify | Agregar sección "Security & Governance" con link a SECURITY-REVIEW.md |

---

## Open Questions

- [ ] ¿El `<pre>` de Step 3 (L58-62) en HowItWorks contiene output multiline — el `data-copy` debe incluir solo el comando o el output completo? Spec CC-05 dice "only the command line(s) shall be included" — pero el bloque tiene output visual útil. **Recomendación**: copiar solo `$ npx agenttrail verify audit-log.jsonl --output report.html` (sin output).
- [ ] ¿Usar `changeset publish` o `pnpm publish -r` en el workflow? El root `package.json` ya tiene `"release": "turbo run build && changeset publish"`. **Recomendación**: usar `pnpm publish -r --no-git-checks` en CI directo, mantener `changeset publish` para uso local.
- [ ] ¿El wrapper `<div class="relative group">` en HowItWorks afecta el layout actual de los pasos? Los `<pre>` están dentro de `<div class="flex-1">` que ya es flex child — el wrapper div no rompe el flex flow.

---

## Migration / Rollout

No hay migración de datos. Los cambios son:
- **CSS fixes**: Deploy normal del landing page (Cloudflare Pages auto-deploy on merge to main)
- **npm publish**: Configurar `NPM_TOKEN` en GitHub Secrets antes de primer tag
- **Copy buttons**: Se activan automáticamente en el siguiente deploy del landing
- **README**: Visible inmediatamente en GitHub

### Pre-requisitos para primer release

1. Configurar `NPM_TOKEN` en GitHub Secrets (Settings → Secrets → Actions)
2. Verificar que `@aivoralabs` scope está registrado en npm (o registrar con `npm org create aivoralabs`)
3. Push tag `v0.1.0` para primer release
