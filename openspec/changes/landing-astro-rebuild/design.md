# Design: Landing Astro Rebuild

## Technical Approach

Rebuild `apps/landing/` as an Astro 6 static site with **Tailwind CSS v4** utility-first styling, a theme toggle system using `data-theme` attribute + CSS custom properties, and a **use-case-driven How It Works** section that shows the actual AgentTrail workflow (install → intercept → verify) with a live preview of the CLI-generated HTML audit report. All sections compose in `index.astro` via a shared `BaseLayout.astro` shell.

## Architecture Decisions

### Decision: Tailwind CSS for styling (over scoped CSS)

**Choice**: Tailwind CSS v4 via `@astrojs/tailwind`.
**Alternatives**: Astro scoped `<style>` blocks, vanilla CSS, CSS Modules.
**Rationale**: 
- The landing page is independent from the SDK's zero-dep philosophy. A dev tool on a marketing site doesn't create risk.
- Tailwind provides consistent spacing, typography, and color system out of the box — critical for a polished marketing page.
- Faster iteration: no context-switching between HTML and CSS files.
- Astro + Tailwind is an official integration (`npx astro add tailwind`).
- `impeccable` and `ui-ux-pro-max` skills work naturally with Tailwind utility classes.
- Tailwind's purge removes unused CSS → production output is lean.

### Decision: Use-case-driven How It Works (not abstract steps)

**Choice**: Show "Install → Every decision generates a receipt → Verify the chain" as concrete, actionable steps with real code and a live CLI output preview.
**Alternatives**: Generic 3-step "Install → Configure → Deploy" flow.
**Rationale**: The primary differentiator is the HTML audit report (commit `09967c4`). Showing the actual CLI command and its output builds trust and demonstrates the product's value immediately. The audit report preview is a static HTML/CSS replica inside the step, not a separate section.

### Decision: Problem → Solution → How It Works narrative flow

**Choice**: "Problem" section → "Solution" section → "How It Works" → "Built For" → "Pricing".
**Alternatives**: Direct "Features → Pricing" SaaS pattern.
**Rationale**: The landing targets compliance officers and technical buyers. The problem section addresses their pain point (regulatory pressure, expensive alternatives) before presenting the solution. This is a proven B2B SaaS pattern.

### Decision: Audit Showcase embedded in How It Works (not standalone section)

**Choice**: The HTML report preview lives as a visual example inside Step 3 of How It Works, showing the CLI output + rendered report cards.
**Alternatives**: Separate "Audit Showcase" section between How It Works and Pricing.
**Rationale**: The report is the OUTPUT of Step 3. Showing it inline makes the causality clear: "install → wrap → this is what you get." A standalone section would feel disconnected from the workflow.

### Decision: 4 pricing tiers matching new business narrative

**Choice**: Starter ($99/agent), Growth ($299, up to 3 agents), Scale ($999, up to 10 agents), Enterprise (Custom).
**Alternatives**: 3 tiers from original design (Starter $99, Team $1k, Enterprise Custom).
**Rationale**: The Growth tier fills the gap between single-agent and multi-agent pricing. All paid tiers show "Coming soon" — only the SDK is available now (open-source MIT).

### Decision: CSS custom properties via Tailwind's `darkMode: ['data-theme', 'dark']`

**Choice**: Tailwind's built-in dark mode with `data-theme` attribute on `<html>`.
**Alternatives**: CSS custom properties in global.css, `prefers-color-scheme` only.
**Rationale**: Tailwind's `dark:` variant works seamlessly with `data-theme` when configured. No need for a separate global.css. FOUC prevention via inline `<head>` script sets `data-theme` before first paint.

## Component Tree

```
BaseLayout.astro
  ├── <head>: fonts, FOUC script, OG tags, JSON-LD, meta
  ├── ThemeToggle.astro        — Fixed sun/moon button, client-side toggle
  ├── Hero.astro               — Slogan + badge + CTA buttons
  ├── Problem.astro            — 3 pain points (Splunk, OneTrust, no visibility)
  ├── Solution.astro           — 3 value props (zero retention, tamper-proof, OSS)
  ├── HowItWorks.astro         — 3 steps with code + audit report preview
  ├── BuiltFor.astro           — 4 industry cards (LegalTech, HR, Fintech, AI Agents)
  ├── Pricing.astro            — 4 tiers (Starter/Growth/Scale/Enterprise)
  ├── CTA.astro                — Final "Get started on GitHub" CTA
  └── Footer.astro             — Brand + MIT + EU AI Act badge
```

## Data Flow

Theme state: FOUC script in `<head>` reads `localStorage('theme')` → sets `data-theme` attribute before first paint. Tailwind's `dark:` variants respond to `[data-theme="dark"]`. Toggle button flips attribute and persists to localStorage. Default: `prefers-color-scheme`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/landing/package.json` | Create | Astro 6 + Tailwind + sitemap |
| `apps/landing/astro.config.mjs` | Create | Static output, tailwind integration |
| `apps/landing/tsconfig.json` | Create | Extends root, Astro types |
| `apps/landing/tailwind.config.mjs` | Create | Brand colors, fonts, dark mode via data-theme |
| `apps/landing/src/layouts/BaseLayout.astro` | Create | HTML shell, Tailwind classes, SEO, JSON-LD |
| `apps/landing/src/components/ThemeToggle.astro` | Create | Sun/moon toggle with inline script |
| `apps/landing/src/components/Hero.astro` | Create | Slogan + badge + CTA |
| `apps/landing/src/components/Problem.astro` | Create | 3 pain point cards |
| `apps/landing/src/components/Solution.astro` | Create | 3 value prop cards |
| `apps/landing/src/components/HowItWorks.astro` | Create | 3 steps + audit report preview |
| `apps/landing/src/components/BuiltFor.astro` | Create | 4 industry cards |
| `apps/landing/src/components/Pricing.astro` | Create | 4-tier pricing grid |
| `apps/landing/src/components/CTA.astro` | Create | Final CTA section |
| `apps/landing/src/components/Footer.astro` | Create | Brand + links |
| `apps/landing/src/pages/index.astro` | Create | Composes all sections |
| `README.md` | Rewrite | New marketing narrative + positioning |
| `.gitignore` | Modify | Clean up old entries |
| `turbo.json` | Modify | Add `landing:build` and `landing:dev` tasks |

## Theme System

Tailwind configured with `darkMode: ['data-theme', 'dark']`. Brand colors defined in `tailwind.config.mjs`:

```js
colors: {
  brand: { 50..900 },       // teal spectrum
  surface: { light, dark },  // #EEF0E9 / #07090F
}
```

No separate `global.css` needed. Tailwind handles everything. Font families `Bricolage Grotesque` (headings) and `DM Mono` (code) via Google Fonts.

## How It Works — Audit Report Preview Implementation

Step 3 ("Verify the chain") includes a visual mockup embedded below the CLI command:

- CLI output simulation with green checkmarks and timing
- Verdict badge: green `✓ INTEGRO` pill
- Stats grid: 3 agents, 150 interactions, 30 days
- Collapsible receipts hint text

All styled with Tailwind utility classes. No JavaScript. Zero external dependencies — consistent with the real audit report's philosophy.

## SEO Implementation

- **OG tags**: `og:title`, `og:description`, `og:type`, `og:url` in `<head>`
- **JSON-LD**: `SoftwareApplication` schema via `set:html` directive
- **Sitemap**: `@astrojs/sitemap` integration
- **Meta**: `theme-color` for light/dark, `description`, canonical URL

## Cloudflare Deployment

```js
// astro.config.mjs — static output, no adapter needed
export default defineConfig({
  site: 'https://agenttrail.aivoralabs.org',
  integrations: [tailwind()],
  output: 'static',
});
```

| Config | Value |
|--------|-------|
| Root directory | `apps/landing` |
| Build command | `npx astro build` |
| Output directory | `dist` |
| Node version | 22+ |

## Font Strategy

Bricolage Grotesque (headings, 400/600/800) + DM Mono (code, 400/500) via Google Fonts with `display=swap`. Preconnect hints in `<head>`.

## Responsive Breakpoints

Mobile-first. 768px (tablet grid), 1024px (desktop grid). Pricing: 1-col on mobile, 2-col on tablet, 4-col on desktop.

## Testing & Build Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Build | `npx astro build` succeeds | CI via `turbo run landing:build` |
| Visual | Theme toggle, responsive layout | Manual browser check |
| SEO | Sitemap, OG tags, JSON-LD | `curl` + validator |
| Pipeline | Integrated in `turbo run build` | Turbo cache landing output |

Turbo pipeline: `landing:build` as a separate task, integrated into the monorepo through `pnpm workspaces`. The landing build is fast (~3s) and Turbo caches it on no-op changes.

## Rollout

1. Merge to `main`
2. Configure Cloudflare Pages: root `apps/landing`, build `npx astro build`, output `dist`
3. Verify live URL
4. Old `dist/index.html` on filesystem is replaced by Astro build output (not tracked in git)
