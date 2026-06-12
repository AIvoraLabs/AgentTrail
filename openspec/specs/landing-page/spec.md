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
| 4 | Open-source | "The SDK is open-source and free (MIT). Start using it today — no sign-up required." renders immediately after subtitle |
| 5 | CTA | "Get started" → `https://github.com/AiVoraLabs/agenttrail`; "Star on GitHub" → repo (new tab) |
| 6 | GitHub icon | SVG inlined, consistent style |

(Previously: No open-source subtitle follow-up; "Get started" linked to `#how-it-works`)

### FR-02: Problem

| # | Scenario | Expect |
|---|----------|--------|
| 7 | Section title | "The EU AI Act requires traceability. Your tools weren't built for this." |
| 8 | Card 1 | "Splunk gives you logs, not audit trails" — raw timestamps are not compliance artifacts |
| 9 | Card 2 | "OneTrust charges €50K+ for features you don't need" — enterprise GRC overkill for AI audit |
| 10 | Card 3 | "Nobody knows what their AI actually did" — no proof without cryptographic receipts |
| 11 | Footer text | "You're caught between the sword of regulation and the wall of budget." |

### FR-03: Solution

| # | Scenario | Expect |
|---|----------|--------|
| 12 | Section title | "One receipt per decision. That's it." with teal accent |
| 13 | Card 1 | "Zero data retention" — receipts stay in customer infra |
| 14 | Card 2 | "Tamper-proof by design" — SHA-256 + Ed25519 |
| 15 | Card 3 | "Open-source, auditable" — MIT license |

### FR-04: How It Works

| # | Scenario | Expect |
|---|----------|--------|
| 16 | Steps | 3 steps with numbered badges and code snippets |
| 17 | Step 1 | "Install the SDK" — `npm install @aivoralabs/agenttrail` |
| 18 | Step 2 | "Every decision generates a signed receipt" — wrapOpenAI code example |
| 19 | Step 3 | "Verify the chain with one CLI command" — `npx agenttrail verify` with output preview |
| 20 | Report preview | Static mockup: green "INTEGRO" badge, stats grid (3 agents, 150 interactions, 30 days), collapsible hint text |
| 21 | Section title | "Three steps to tamper-proof compliance" |

### FR-05: Built For

| # | Scenario | Expect |
|---|----------|--------|
| 22 | Section title | "If your AI makes decisions that affect people, you need AgentTrail" |
| 23 | Industries | LegalTech (⚖️), HR Tech (📋), Fintech (🏦), AI Agents (🤖) |
| 24 | Each industry | Emoji icon + name + description in bordered card |

### FR-06: Pricing

| # | Scenario | Expect |
|---|----------|--------|
| 25 | Tiers | Starter ($99/mo · up to 3 agents, 10K receipts), Growth ($299/mo · up to 10 agents, 50K receipts), Scale ($999/mo · up to 50 agents, unlimited receipts), Enterprise (Custom) |
| 26 | Features | Starter: SDK receipt gen, SHA-256, Ed25519, CLI audit, Community support. Growth adds: Dashboard, Email support. Scale adds: Team dashboard, Priority support. Enterprise adds: On-premise, SSO/SAML, Custom integrations, Dedicated support |
| 27 | Badge | No tier shows a "Recommended" badge |
| 28 | CTA | Starter/Growth/Scale buttons show "Coming soon"; Enterprise shows "Contact sales" |
| 29 | Footnote | Below pricing title: "🧪 The SDK is open-source (MIT) and free to use today. AgentTrail Cloud (paid plans above) is in development — no payment system is active yet. You can use the full SDK right now with zero cost." |

(Previously: Per-agent pricing; Growth had "Recommended" badge; no footnote)

### FR-07: CTA & Footer

| # | Scenario | Expect |
|---|----------|--------|
| 30 | CTA headline | "Ready to know what your AI actually did?" with teal accent on "actually" |
| 31 | CTA buttons | "Get started on GitHub" (primary) + "Read the docs" (secondary) |
| 32 | Footer | "AgentTrail — AI made decisions. We keep the receipts." + "Open-source MIT" + "EU AI Act compliant" + "SDK: MIT License · Free forever. Cloud plans coming soon." + "© AivoraLabs" |

(Previously: Footer missing the SDK license line)

### FR-08: Theme Toggle

| # | Scenario | Expect |
|---|----------|--------|
| 33 | Click | Toggles `data-theme` dark↔light |
| 34 | Persist | `localStorage`, survives reload |
| 35 | FOUC | Inline `<head>` script before first paint sets attribute |
| 36 | Default | No stored preference → `prefers-color-scheme` |
| 37 | Icons | Sun icon in dark mode, moon icon in light mode |

### FR-09: Responsive

| # | Scenario | Expect |
|---|----------|--------|
| 38 | <768px | Single column, stack cards vertically, ≥16px body |
| 39 | 768-1024px | 2-col grids where applicable |
| 40 | >1024px | 4-col pricing, max-width constrained |
| 41 | No overflow | MUST have zero horizontal scroll at 320px, 375px, 390px, and 414px viewport widths; all 8 sections MUST fit within viewport width |

(Previously: No explicit viewport-specific overflow constraint)

### FR-10: Favicon

The landing page MUST include an inline SVG favicon in `<head>` using the EU AI Act badge shield path for browser tab rendering.

#### Scenario: Shield renders in browser tab

- GIVEN a user opens the landing page in Chrome, Firefox, Safari, or Edge
- WHEN the page loads
- THEN the browser tab MUST display the shield SVG favicon
- AND the SVG `d` attribute MUST be `M9 0L0 4V10.5C0 16.28 3.97 21.64 9 23C14.03 21.64 18 16.28 18 10.5V4L9 0Z`

## Non-Functional

| # | Scenario | Expect |
|---|----------|--------|
| 41 | Performance | Lighthouse ≥85 |
| 42 | SEO | Lighthouse ≥90, CLS < 0.1 |
| 43 | JS | Zero third-party runtime JS; theme toggle inline |
| 44 | Structure | One `.astro` component per section |
| 45 | CSS | Tailwind utility classes; brand colors in tailwind.config |
| 46 | Layout | SEO/fonts/meta in BaseLayout.astro |
| 47 | Fonts | Google Fonts with preconnect + `font-display: swap` |
| 48 | No emoji in code | README uses no emojis; landing page permits emoji icons |

## SEO

| # | Scenario | Expect |
|---|----------|--------|
| 49 | OG | `og:title`, `og:description`, `og:type`, `og:url`, `og:image` (`https://agenttrail.aivoralabs.org/og-image.png`), `og:image:width` (1200), `og:image:height` (630), `og:image:type` (image/png), `og:image:alt` |
| 50 | Description | `<meta name="description">` — "Cryptographic audit trails for AI agents. Comply with EU AI Act Article 12 using an open-source SDK (MIT). SHA-256 hash chain + Ed25519 signatures. Zero data retention. Integrates in minutes." |
| 51 | JSON-LD | `SoftwareApplication` + `OpenSourceProject` schema: name, description (updated), offers (`AggregateOffer` lowPrice=0 highPrice=999), author, license |
| 52 | Title tag | `<title>` — "AgentTrail — EU AI Act audit trails for AI agents \| Open-source SDK" |
| 53 | Twitter Cards | `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image` |
| 54 | Canonical | `<link rel="canonical" href="https://agenttrail.aivoralabs.org/">` |
| 55 | Hreflang | `<link rel="alternate" hreflang="en">` + `x-default` to `https://agenttrail.aivoralabs.org/` |
| 56 | Sitemap | `/sitemap-index.xml` via `@astrojs/sitemap` |
| 57 | Robots | `/robots.txt` allows all, links sitemap |
| 58 | Semantic | `<main>`, `<section>`, `<footer>`, single `<h1>`, sequential headings |

## Deployment

| # | Scenario | Expect |
|---|----------|--------|
| 59 | Build | `npx astro build` exits 0 |
| 60 | Output | Static `dist/`, no server |
| 61 | Node | Node 22+ |
| 62 | Pipeline | `turbo.json` has `landing:build` task; integrated in monorepo |
| 63 | Cloudflare | Root `apps/landing`, build `npx astro build`, output `dist` |

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
