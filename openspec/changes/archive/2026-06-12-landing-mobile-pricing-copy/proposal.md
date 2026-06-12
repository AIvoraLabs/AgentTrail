# Proposal: Landing — Mobile Overflow Fix & Pricing Copy

## Intent

Landing page at agenttrail.aivoralabs.org has horizontal scroll on mobile viewports, pricing tiers use outdated copy, and SEO/OG meta tags are incomplete. Fix mobile responsiveness, align pricing with current product model, and upgrade SEO meta tags (OG, Twitter Cards, canonical, hreflang, JSON-LD). Establish honest tone: open-source SDK works now, paid Cloud plans are in development.

## Scope

### In Scope
1. Fix horizontal overflow on all 8 sections (Hero, Problem, Solution, HowItWorks, BuiltFor, Pricing, CTA, Footer) for mobile viewports
2. Update pricing tiers: Starter ($99/3 agents), Growth ($299/10 agents), Scale ($999/50 agents), Enterprise (Custom)
3. Add pricing footnote about SDK being free MIT, Cloud plans in dev
4. Hero: add open-source line after subtitle; change "Get started" href to GitHub repo URL
5. Footer: add "SDK: MIT License · Free forever. Cloud plans coming soon."
6. Pricing buttons: "Coming soon" (Starter/Growth/Scale), "Contact sales" (Enterprise)
7. Add SVG shield favicon in `<head>` using the same path as the EU AI Act badge icon
8. Upgrade SEO meta tags: OG image, Twitter Cards, canonical URL, hreflang, updated JSON-LD with AggregateOffer + license

### Out of Scope
- Colors, layout, visual design changes
- New sections, testimonials, client logos, or features
- Backend/service changes
- Theme toggle behavior

## Capabilities

> Contract for sdd-spec. Research: `openspec/specs/landing-page/spec.md` covers all existing requirements.

### New Capabilities
None — all changes modify existing specs.

### Modified Capabilities
- `landing-page`: FR-01 (Hero) — new subtitle line, updated CTA URL; FR-02 (SEO) — upgraded OG tags, Twitter Cards, canonical, hreflang, JSON-LD; FR-06 (Pricing) — all tier data replaced, footnote added, "Recommended" badge removed; FR-07 (Footer) — new license line; FR-09 (Responsive) — stricter mobile overflow constraint

## Approach

CSS-only: add `overflow-x-hidden` to `<body>` or root wrapper, audit each section for fixed-width/negative-margin causes of overflow. Pricing: update `plans` array data in `Pricing.astro`. Hero/Footer: edit template copy. No layout refactors — minimal diff.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/styles/globals.css` | Modified | Add `overflow-x-hidden` to body |
| `src/components/Hero.astro` | Modified | Add subtitle line, change CTA href |
| `src/components/Pricing.astro` | Modified | Replace tier data, add footnote, remove badge |
| `src/components/Footer.astro` | Modified | Add license line |
| `src/components/*.astro` (all) | Modified | Add container overflow guards per section |
| `src/layouts/BaseLayout.astro` | Modified | Add inline SVG favicon in `<head>` + OG/Twitter/canonical/hreflang tags, update JSON-LD |
| `src/pages/index.astro` | Modified | Update title and description props |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `overflow-x-hidden` clips sticky/fixed elements | Low | Audit with DevTools at 320px before commit |
| Pricing footnote pushes layout | Low | Keep short, add below title not below grid |

## Rollback Plan

Revert changes to the 5 component files and `globals.css` via `git checkout`. All changes are localized to `apps/landing/src/`.

## Dependencies

- None — Tailwind v4 utility classes only

## Success Criteria

- [ ] No horizontal scroll at 320px, 375px, 390px, 414px viewports
- [ ] Pricing tiers match exact copy specified in requirements
- [ ] Pricing footnote renders below "Pricing" title
- [ ] Hero "Get started" links to `https://github.com/AiVoraLabs/agenttrail`
- [ ] Footer shows "SDK: MIT License · Free forever. Cloud plans coming soon."
- [ ] Shield SVG favicon renders in browser tab
- [ ] OG image tags, Twitter Cards, canonical, hreflang present in `<head>`
- [ ] JSON-LD has AggregateOffer (lowPrice: 0) + license field
- [ ] `pnpm build` succeeds in `apps/landing/`
