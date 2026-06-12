# landing-page Specification

## Purpose

Static Astro 6 landing page for AgentTrail on Cloudflare Pages. Rebuild from `apps/landing/dist/index.html`: carry forward Hero, How It Works, Pricing, CTA, Footer. New narrative: "AI made decisions. We keep the receipts." Positioning as the open-source cryptographic audit trail for EU AI Act compliance. New sections: Problem, Solution, BuiltFor.

## Brand Narrative

- **Slogan**: "AI made decisions. We keep the receipts."
- **Positioning**: Open-source SDK that generates tamper-proof cryptographic audit trails for AI agents
- **Tone**: Technical but accessible. Direct. No buzzwords.
- **Pricing**: SDK is free (MIT). AgentTrail Cloud starts at $99/agent/month.
- **Differentiators**: Hash chain (not logs), zero data retention, open-source, minutes to implement (vs €50K OneTrust)

## Functional Requirements

### FR-01: Hero

| # | Scenario | Expect |
|---|----------|--------|
| 1 | Load | H1 "AI made decisions. We keep the receipts." with teal accent on second line |
| 2 | Badge | "EU AI Act Article 12 compliant" pill with shield icon |
| 3 | Subtitle | "Cryptographic audit trails for AI agents. Comply with the EU AI Act Article 12 using an open-source SDK that integrates in minutes." |
| 4 | CTA | "Get started" → `#how-it-works`; "Star on GitHub" → repo (new tab) |
| 5 | GitHub icon | SVG inlined, consistent style |

### FR-02: Problem

| # | Scenario | Expect |
|---|----------|--------|
| 6 | Section title | "The EU AI Act requires traceability. Your tools weren't built for this." |
| 7 | Card 1 | "Splunk gives you logs, not audit trails" — raw timestamps are not compliance artifacts |
| 8 | Card 2 | "OneTrust charges €50K+ for features you don't need" — enterprise GRC overkill for AI audit |
| 9 | Card 3 | "Nobody knows what their AI actually did" — no proof without cryptographic receipts |
| 10 | Footer text | "You're caught between the sword of regulation and the wall of budget." |

### FR-03: Solution

| # | Scenario | Expect |
|---|----------|--------|
| 11 | Section title | "One receipt per decision. That's it." with teal accent |
| 12 | Card 1 | "Zero data retention" — receipts stay in customer infra |
| 13 | Card 2 | "Tamper-proof by design" — SHA-256 + Ed25519 |
| 14 | Card 3 | "Open-source, auditable" — MIT license |

### FR-04: How It Works

| # | Scenario | Expect |
|---|----------|--------|
| 15 | Steps | 3 steps with numbered badges and code snippets |
| 16 | Step 1 | "Install the SDK" — `npm install @aivoralabs/agenttrail` |
| 17 | Step 2 | "Every decision generates a signed receipt" — wrapOpenAI code example |
| 18 | Step 3 | "Verify the chain with one CLI command" — `npx agenttrail verify` with output preview |
| 19 | Report preview | Static mockup: green "INTEGRO" badge, stats grid (3 agents, 150 interactions, 30 days), collapsible hint text |
| 20 | Section title | "Three steps to tamper-proof compliance" |

### FR-05: Built For

| # | Scenario | Expect |
|---|----------|--------|
| 21 | Section title | "If your AI makes decisions that affect people, you need AgentTrail" |
| 22 | Industries | LegalTech (⚖️), HR Tech (📋), Fintech (🏦), AI Agents (🤖) |
| 23 | Each industry | Emoji icon + name + description in bordered card |

### FR-06: Pricing

| # | Scenario | Expect |
|---|----------|--------|
| 24 | Tiers | 4 tiers: Starter ($99/agent), Growth ($299/up to 3 agents), Scale ($999/up to 10 agents), Enterprise (Custom) |
| 25 | Per tier | Name, price, description, feature list, CTA button |
| 26 | Recommended | Growth tier has "Recommended" badge with brand accent ring |
| 27 | CTA | All tiers show "Coming soon" — SDK is free (MIT) |
| 28 | Enterprise CTA | "Contact sales" instead of "Coming soon" |

### FR-07: CTA & Footer

| # | Scenario | Expect |
|---|----------|--------|
| 29 | CTA headline | "Ready to know what your AI actually did?" with teal accent on "actually" |
| 30 | CTA buttons | "Get started on GitHub" (primary) + "Read the docs" (secondary) |
| 31 | Footer | "AgentTrail — AI made decisions. We keep the receipts." + "Open-source MIT" + "EU AI Act compliant" + "© AivoraLabs" |

### FR-08: Theme Toggle

| # | Scenario | Expect |
|---|----------|--------|
| 32 | Click | Toggles `data-theme` dark↔light |
| 33 | Persist | `localStorage`, survives reload |
| 34 | FOUC | Inline `<head>` script before first paint sets attribute |
| 35 | Default | No stored preference → `prefers-color-scheme` |
| 36 | Icons | Sun icon in dark mode, moon icon in light mode |

### FR-09: Responsive

| # | Scenario | Expect |
|---|----------|--------|
| 37 | <768px | Single column, stack cards vertically, ≥16px body |
| 38 | 768-1024px | 2-col grids where applicable |
| 39 | >1024px | 4-col pricing, max-width constrained |

## Non-Functional

| # | Scenario | Expect |
|---|----------|--------|
| 40 | Performance | Lighthouse ≥85 |
| 41 | SEO | Lighthouse ≥90, CLS < 0.1 |
| 42 | JS | Zero third-party runtime JS; theme toggle inline |
| 43 | Structure | One `.astro` component per section |
| 44 | CSS | Tailwind utility classes; brand colors in tailwind.config |
| 45 | Layout | SEO/fonts/meta in BaseLayout.astro |
| 46 | Fonts | Google Fonts with preconnect + `font-display: swap` |
| 47 | No emoji in code | README uses no emojis; landing page permits emoji icons |

## SEO

| # | Scenario | Expect |
|---|----------|--------|
| 48 | OG | `og:title`, `og:description`, `og:type`, `og:url` |
| 49 | Description | `<meta name="description">` with slogan + positioning |
| 50 | JSON-LD | `SoftwareApplication` schema: name, description, offers, author |
| 51 | Sitemap | `/sitemap-index.xml` via `@astrojs/sitemap` |
| 52 | Robots | `/robots.txt` allows all, links sitemap |
| 53 | Semantic | `<main>`, `<section>`, `<footer>`, single `<h1>`, sequential headings |

## Deployment

| # | Scenario | Expect |
|---|----------|--------|
| 54 | Build | `npx astro build` exits 0 |
| 55 | Output | Static `dist/`, no server |
| 56 | Node | Node 22+ |
| 57 | Pipeline | `turbo.json` has `landing:build` task; integrated in monorepo |
| 58 | Cloudflare | Root `apps/landing`, build `npx astro build`, output `dist` |

## Acceptance Criteria

- [ ] `pnpm --filter @agenttrail/landing build` produces `apps/landing/dist/index.html`
- [ ] All 9 sections render in order: Hero → Problem → Solution → How It Works → Built For → Pricing → CTA → Footer
- [ ] How It Works Step 3 shows audit report preview (INTEGRO badge + stats)
- [ ] Theme toggle works, persists, no FOUC
- [ ] Lighthouse Performance ≥85, SEO ≥90
- [ ] `/sitemap-index.xml` valid; `/robots.txt` allows all
- [ ] OG tags + JSON-LD in `<head>`
- [ ] Responsive at 375px, 768px, 1440px
- [ ] Zero runtime JS; theme toggle script inline only
- [ ] All CTA buttons link correctly (GitHub, `#how-it-works`, `#`)
- [ ] No broken `<link>` or missing asset references
