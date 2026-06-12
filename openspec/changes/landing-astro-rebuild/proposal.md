# Proposal: Landing Page — Astro Rebuild with Audit Report Showcase

## Intent

Rebuild `apps/landing/` as an **Astro 6** project. Current: no `package.json`, no `src/`, broken CSS ref, no deploy pipeline. Goal: build infra, SEO, component structure, and showcase **HTML audit report generation** (commit `09967c4`).

## Scope

### In Scope
- Astro 6 scaffold: `package.json`, `astro.config.mjs`, `src/`, `tsconfig.json`
- Components for every section: Hero, How it Works (3 steps), Pricing (3 tiers), Open Source CTA, Footer
- **NEW Audit Showcase section** — highlights self-contained HTML report output with code preview
- CSS recreated inline via Astro scoped `<style>` blocks (port from missing `global.css`)
- Theme toggle (dark/light, localStorage, no FOUC)
- SEO: BaseLayout with OG tags, JSON-LD structured data, `@astrojs/sitemap`
- Cloudflare Pages config (build: `npx astro build`, output: `dist/`)
- `.gitignore` entry for `apps/landing/node_modules/`

### Out of Scope
- SSR / dynamic routes (static-only)
- Blog, analytics, i18n
- Interactive audit report demo (static code/screenshot only)

## Capabilities

### New Capabilities
- `landing-page`: Public-facing product landing page — hero, features, pricing, theme toggle, SEO

### Modified Capabilities
- None — pure refactor of an unspec'd artifact

## Approach

| Astro File | Source Section |
|---|---|
| `src/layouts/BaseLayout.astro` | `<head>`, fonts, SEO, theme script, footer |
| `src/components/Hero.astro` | Badge, h1, subtitle, CTA buttons |
| `src/components/HowItWorks.astro` | 3 steps with code snippets |
| `src/components/AuditShowcase.astro` | NEW — HTML report output preview |
| `src/components/Pricing.astro` | 3-tier pricing grid |
| `src/components/CtaSection.astro` | Open Source + GitHub link |
| `src/components/ThemeToggle.astro` | Dark/light toggle |
| `src/pages/index.astro` | Composes all sections |

CSS recreated in Astro scoped blocks per component. Theme toggle script in `<head>` to prevent FOUC.

## Affected Areas

| Area | Impact |
|------|--------|
| `apps/landing/` | Full rewrite (Astro scaffold) |
| `.gitignore` | Add `apps/landing/node_modules/` |
| Root `turbo.json` | Add landing to pipeline |
| Root `package.json` | Add landing scripts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSS fidelity to original design | Med | Reference `dist/index.html` during build |
| FOUC on theme toggle | Low | Inline script in `<head>` before render |

## Rollback Plan

`git checkout HEAD -- apps/landing/`. Existing `dist/index.html` remains as fallback.

## Dependencies

- Astro 6, `@astrojs/sitemap`, Node 22+

## Success Criteria

- [ ] `npx astro build` produces valid `apps/landing/dist/`
- [ ] Lighthouse SEO ≥90
- [ ] `/sitemap.xml` returns valid sitemap
- [ ] Audit Showcase section visible with real HTML report output
- [ ] Theme toggle works without FOUC
- [ ] Cloudflare Pages deploy succeeds
