# Design: Landing — Mobile Overflow Fix, Pricing Copy & SEO Meta Tags

## Technical Approach

All changes are CSS-class edits and template copy modifications within `apps/landing/src/`. No new files, no build config changes, no runtime logic. Five files are modified: one layout, one CSS, three components. Tailwind v4 utility classes are used exclusively — no custom CSS is introduced. SEO meta tags are added to `BaseLayout.astro` `<head>` and title/description props are updated in `index.astro`.

## Architecture Decisions

### Decision: Mobile overflow fix via `<body>` overflow-x-hidden

**Choice**: Add `overflow-x-hidden` to the `<body>` element in `BaseLayout.astro`
**Alternatives considered**:
- Adding `overflow-hidden` to each `<section>` individually (7+ edits, fragile)
- Adding `overflow-hidden` to `<main>` only (misses body-level scroll)
- Using `html { overflow-x: hidden }` in globals.css (unnecessary, breaks scroll anchoring)

**Rationale**: A single `overflow-x-hidden` on `<body>` is the definitive fix. The scrollable viewport is `<body>` — clipping it prevents horizontal scroll at any viewport width. Individual section audits confirm `<pre>` blocks already use `overflow-x-auto` (HowItWorks.astro lines 24, 38, 58) and the hero section already has `overflow-hidden`. The body-level fix is sufficient; no per-section CSS changes are needed for FR-09.

### Decision: Inline SVG favicon over external file

**Choice**: Embed the SVG directly as a `<link rel="icon" type="image/svg+xml">` data URI in `<head>`
**Alternatives considered**:
- Placing `favicon.svg` in `public/` (requires Astro public folder access, adds a file)
- Using a base64-encoded `<link>` (heavier, no semantic clarity)
- Using a `.ico` file (requires asset pipeline)

**Rationale**: Inline SVG avoids file management and build pipeline concerns. The shield path `M9 0L0 4V10.5C0 16.28...` is identical to the Hero badge (Hero.astro line 15), so no design review is needed. One `<link>` tag in the `<head>` is self-contained and cache-friendly.

### Decision: Pricing footnote placement below title area

**Choice**: Insert footnote `<p>` after the subtitle `<p>` inside the existing `text-center mb-16` div
**Alternatives considered**:
- Below the pricing grid (pushes layout, visually disconnected)
- Inside each card (duplicates 4×)

**Rationale**: Placing it between the subtitle and the grid ties it to the "no hidden fees" messaging. The footnote uses `text-sm` with muted colors, consistent with the existing subtitle pattern. It does not affect the grid layout.

### Decision: SEO meta tags via Astro template-only approach

**Choice**: All SEO meta tags are rendered as static `<meta>` / `<link>` elements in `BaseLayout.astro` `<head>`, driven by props from `index.astro`. JSON-LD uses `set:html={JSON.stringify(...)}`.
**Alternatives considered**:
- `@astrojs/sitemap` only (no OG/Twitter/JSON-LD — insufficient)
- Third-party SEO plugin like `astro-seo` (adds dependency, abstracts too much)
- Dynamic generation via `Astro.request` (unnecessary for a single static page)

**Rationale**: The landing page is a single static Astro page (`output: 'static'`). All SEO metadata is deterministic — the same values are used on every page load. A template-only approach keeps the SEO surface explicit, auditable, and zero-dependency. The JSON-LD block is updated in-place with no new `@type` nesting complexity; `AggregateOffer` and `OpenSourceProject` types are added to the existing `SoftwareApplication` schema. The canonical URL, hreflang, and Twitter Cards are simple `<meta>`/`<link>` tags that don't benefit from abstraction.

## Data Flow

No data flow changes. All modifications are static template edits rendered at build time.

    Browser ──→ BaseLayout.astro <body overflow-x-hidden>
                  ├─ Hero.astro (new copy, href change)
                  ├─ Pricing.astro (new plans array, footnote)
                  └─ Footer.astro (new license line)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/pages/index.astro` | Modify | Update `title` prop to `"AgentTrail — EU AI Act audit trails for AI agents \| Open-source SDK"`; update `description` prop to spec FR-02 #49 content |
| `src/layouts/BaseLayout.astro` | Modify | Add `overflow-x-hidden` to `<body>` class; add inline SVG favicon `<link>` in `<head>`; add `og:image`, `og:image:width`, `og:image:height`, `og:image:type`, `og:image:alt` after `og:url`; add Twitter Card `<meta>` tags (`card`, `title`, `description`, `image`); add `<link rel="canonical" href="...">`; add `<link rel="alternate" hreflang="en">` + `x-default`; replace existing JSON-LD block with updated `SoftwareApplication` + `OpenSourceProject` schema (AggregateOffer, license field) |
| `src/styles/globals.css` | No change | Overflow fix is handled via Tailwind class on `<body>`, not CSS |
| `src/components/Hero.astro` | Modify | Add open-source paragraph after subtitle; change "Get started" `href` to GitHub repo URL |
| `src/components/Pricing.astro` | Modify | Replace `plans` array (new tiers, remove `recommended` field); add footnote paragraph below subtitle; update CTA buttons |
| `src/components/Footer.astro` | Modify | Add SDK license line in the content area |
| `src/components/HowItWorks.astro` | No change | `<pre>` blocks already use `overflow-x-auto` |
| `src/components/Problem.astro` | No change | Grid cards with `px-6` padding, no overflow risk |
| `src/components/Solution.astro` | No change | Standard `max-w-5xl mx-auto` container, no overflow risk |
| `src/components/BuiltFor.astro` | No change | Standard grid, no overflow risk |
| `src/components/CTA.astro` | No change | Standard centered content, no overflow risk |
| `astro.config.mjs` | No change | `site: 'https://agenttrail.aivoralabs.org'` already correct |

## Interfaces / Contracts

No new interfaces. Existing data structures modified:

```typescript
// Pricing.astro plans array — updated shape
const plans = [
  {
    name: string;           // "Starter" | "Growth" | "Scale" | "Enterprise"
    price: string;          // "$99" | "$299" | "$999" | "Custom"
    sub: string;            // "/month · up to N agents" | ""
    description: string;
    features: string[];
    cta: string;            // "Coming soon" | "Contact sales"
    // `recommended` field REMOVED — no longer used
  }
];
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Visual | No horizontal scroll at 320px, 375px, 390px, 414px | Open devtools, set viewport width, scroll horizontally |
| Visual | Pricing renders 4 tiers with correct copy | Screenshot at 1280px desktop |
| Visual | Favicon appears in browser tab | Load page in Chrome/Firefox, check tab |
| Build | `pnpm build` succeeds in `apps/landing/` | Run `pnpm --filter landing build` |
| Content | Hero paragraph renders after subtitle | Inspect DOM at 320px |
| Content | Footer shows SDK license line | Inspect footer section |
| SEO | `<title>` tag matches spec FR-02 #51 | Inspect `<head>` in devtools or view-source |
| SEO | `<meta name="description">` matches spec FR-02 #49 | Inspect `<head>` |
| SEO | OG tags present: `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:image:width`, `og:image:height`, `og:image:type`, `og:image:alt` | Validate with [opengraph.xyz](https://opengraph.xyz) or Facebook Sharing Debugger |
| SEO | Twitter Card tags present: `card` (summary_large_image), `title`, `description`, `image` | Validate with [cards.twitter.com](https://cards.twitter.com/validator) |
| SEO | Canonical `<link>` points to `https://agenttrail.aivoralabs.org/` | Inspect `<head>` |
| SEO | Hreflang `<link>` tags: `en` + `x-default` both point to `https://agenttrail.aivoralabs.org/` | Inspect `<head>` |
| SEO | JSON-LD includes `SoftwareApplication` + `OpenSourceProject` types, `AggregateOffer` with `lowPrice: 0` / `highPrice: 999`, license field | Validate with [schema.org/validator](https://validator.schema.org/) or Google Rich Results Test |
| SEO | `robots.txt` exists and allows all, links sitemap | Fetch `https://agenttrail.aivoralabs.org/robots.txt` |
| SEO | `/sitemap-index.xml` is generated and includes the landing page | Run `pnpm --filter landing build` and inspect `dist/` |

## Migration / Rollout

No migration required. All changes are to static template files. Deploy via Cloudflare Pages push (existing pipeline).

## Open Questions

- None — all requirements are concrete with explicit copy and exact file targets.
