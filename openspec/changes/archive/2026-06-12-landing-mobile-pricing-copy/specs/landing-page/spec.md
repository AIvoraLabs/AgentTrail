# Delta for landing-page

## ADDED Requirements

### FR-10: Favicon

The landing page MUST include an inline SVG favicon in `<head>` using the EU AI Act badge shield path for browser tab rendering.

#### Scenario: Shield renders in browser tab

- GIVEN a user opens the landing page in Chrome, Firefox, Safari, or Edge
- WHEN the page loads
- THEN the browser tab MUST display the shield SVG favicon
- AND the SVG `d` attribute MUST be `M9 0L0 4V10.5C0 16.28 3.97 21.64 9 23C14.03 21.64 18 16.28 18 10.5V4L9 0Z`

## MODIFIED Requirements

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

### FR-02: SEO

| # | Scenario | Expect |
|---|----------|--------|
| 48 | OG | `og:title`, `og:description`, `og:type`, `og:url`, `og:image` (`https://agenttrail.aivoralabs.org/og-image.png`), `og:image:width` (1200), `og:image:height` (630), `og:image:type` (image/png), `og:image:alt` |
| 49 | Description | `<meta name="description">` — "Cryptographic audit trails for AI agents. Comply with EU AI Act Article 12 using an open-source SDK (MIT). SHA-256 hash chain + Ed25519 signatures. Zero data retention. Integrates in minutes." |
| 50 | JSON-LD | `SoftwareApplication` + `OpenSourceProject` schema: name, description (updated), offers (`AggregateOffer` lowPrice=0 highPrice=999), author, license |
| 51 | Title tag | `<title>` — "AgentTrail — EU AI Act audit trails for AI agents \| Open-source SDK" |
| 52 | Twitter Cards | `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image` |
| 53 | Canonical | `<link rel="canonical" href="https://agenttrail.aivoralabs.org/">` |
| 54 | Hreflang | `<link rel="alternate" hreflang="en">` + `x-default` to `https://agenttrail.aivoralabs.org/` |
| 55 | Sitemap | `/sitemap-index.xml` via `@astrojs/sitemap` |
| 56 | Robots | `/robots.txt` allows all, links sitemap |
| 57 | Semantic | `<main>`, `<section>`, `<footer>`, single `<h1>`, sequential headings |

(Previously: OG had only title/description/type/url; JSON-LD had no OpenSourceProject type, no AggregateOffer prices, no license field; no Twitter Cards, canonical, hreflang, or title tag requirement)

### FR-06: Pricing

| # | Scenario | Expect |
|---|----------|--------|
| 24 | Tiers | Starter ($99/mo · up to 3 agents, 10K receipts), Growth ($299/mo · up to 10 agents, 50K receipts), Scale ($999/mo · up to 50 agents, unlimited receipts), Enterprise (Custom) |
| 25 | Features | Starter: SDK receipt gen, SHA-256, Ed25519, CLI audit, Community support. Growth adds: Dashboard, Email support. Scale adds: Team dashboard, Priority support. Enterprise adds: On-premise, SSO/SAML, Custom integrations, Dedicated support |
| 26 | Badge | No tier shows a "Recommended" badge |
| 27 | CTA | Starter/Growth/Scale buttons show "Coming soon"; Enterprise shows "Contact sales" |
| 28 | Footnote | Below pricing title: "🧪 The SDK is open-source (MIT) and free to use today. AgentTrail Cloud (paid plans above) is in development — no payment system is active yet. You can use the full SDK right now with zero cost." |

(Previously: Per-agent pricing; Growth had "Recommended" badge; no footnote)

### FR-07: CTA & Footer

| # | Scenario | Expect |
|---|----------|--------|
| 29 | CTA headline | "Ready to know what your AI actually did?" with teal accent on "actually" |
| 30 | CTA buttons | "Get started on GitHub" (primary) + "Read the docs" (secondary) |
| 31 | Footer | "AgentTrail — AI made decisions. We keep the receipts." + "Open-source MIT" + "EU AI Act compliant" + "SDK: MIT License · Free forever. Cloud plans coming soon." + "© AivoraLabs" |

(Previously: Footer missing the SDK license line)

### FR-09: Responsive

| # | Scenario | Expect |
|---|----------|--------|
| 37 | <768px | Single column, stack cards vertically, ≥16px body |
| 38 | 768-1024px | 2-col grids where applicable |
| 39 | >1024px | 4-col pricing, max-width constrained |
| 40 | No overflow | MUST have zero horizontal scroll at 320px, 375px, 390px, and 414px viewport widths; all 8 sections MUST fit within viewport width |

(Previously: No explicit viewport-specific overflow constraint)
