# Tasks: Landing — Mobile Overflow Fix & Pricing Copy

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 50–70 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All changes — SEO, copy, overflow fix | PR 1 | Single PR. Well under 400-line budget. All files in `apps/landing/src/`. |

## Phase 1: BaseLayout.astro — SEO + Favicon

- [x] 1.1 Add `overflow-x-hidden` to `<body>` class in `src/layouts/BaseLayout.astro` (mobile overflow fix)
- [x] 1.2 Add inline SVG favicon `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,...">` in `<head>` with shield path `M9 0L0 4V10.5C0 16.28 3.97 21.64 9 23C14.03 21.64 18 16.28 18 10.5V4L9 0Z`
- [x] 1.3 Add `og:image`, `og:image:width` (1200), `og:image:height` (630), `og:image:type` (image/png), `og:image:alt` meta tags after existing `og:url`
- [x] 1.4 Add Twitter Card meta tags: `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`
- [x] 1.5 Add `<link rel="canonical" href="https://agenttrail.aivoralabs.org/">`
- [x] 1.6 Add `<link rel="alternate" hreflang="en">` and `x-default` pointing to canonical URL
- [x] 1.7 Replace existing JSON-LD block with updated schema: add `AggregateOffer` (lowPrice=0, highPrice=999) and `license` field

## Phase 2: index.astro — Title & Description

- [x] 2.1 Update `title` prop to `"AgentTrail — EU AI Act audit trails for AI agents | Open-source SDK"`
- [x] 2.2 Update `description` prop to spec FR-02 #49 content (SHA-256 hash chain, zero data retention, MIT)

## Phase 3: Component Copy Changes

- [x] 3.1 **Hero.astro** — Add open-source paragraph after subtitle: "The SDK is open-source and free (MIT). Start using it today — no sign-up required."
- [x] 3.2 **Hero.astro** — Change "Get started" `href` from `#how-it-works` to `https://github.com/AiVoraLabs/agenttrail`
- [x] 3.3 **Pricing.astro** — Replace `plans` array with 4 tiers (Starter $99, Growth $299, Scale $999, Enterprise Custom), remove `recommended` field
- [x] 3.4 **Pricing.astro** — Update CTA buttons: "Coming soon" for Starter/Growth/Scale, "Contact sales" for Enterprise
- [x] 3.5 **Pricing.astro** — Add footnote paragraph below subtitle: "🧪 The SDK is open-source (MIT) and free to use today. AgentTrail Cloud (paid plans above) is in development — no payment system is active yet. You can use the full SDK right now with zero cost."
- [x] 3.6 **Footer.astro** — Add line: "SDK: MIT License · Free forever. Cloud plans coming soon."

## Phase 4: Mobile Overflow CSS Fix

- [x] 4.1 Verify `overflow-x-hidden` is on `<body>` (applied in Phase 1 step 1.1)
- [x] 4.2 Audit all 8 sections at 320px viewport — confirm zero horizontal scroll. Check `<pre>` blocks in HowItWorks use `overflow-x-auto` (already present)

## Phase 5: Build Verification

- [x] 5.1 Run `pnpm --filter landing build` — confirm build succeeds with zero errors
- [x] 5.2 Visual check: shield favicon renders in browser tab at localhost (inline SVG `data:` URI)
- [x] 5.3 Inspect `<head>` in devtools — verify `<title>`, `<meta name="description">`, OG tags, Twitter Cards, canonical, hreflang, JSON-LD are present
- [x] 5.4 Test pricing copy renders 4 tiers with correct copy, footnote below title, no "Recommended" badge
- [x] 5.5 Test Hero open-source paragraph renders and "Get started" links to GitHub
- [x] 5.6 Test Footer shows SDK license line
- [x] 5.7 Validate JSON-LD at validator.schema.org — confirm AggregateOffer + license
