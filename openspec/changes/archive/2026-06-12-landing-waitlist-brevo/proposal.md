# Proposal: Landing — Waitlist via Brevo

## Intent

Replace "Coming soon" buttons with a working waitlist flow via Brevo. Collect early sign-ups with email + company. Simplify JSON-LD to match open-source positioning.

## Scope

### In Scope
- Pricing "Coming soon" → "Join waitlist" buttons opening a modal
- CTA section: add "Join waitlist" button
- `WaitlistModal.astro` — email (required), company (optional), vanilla JS `<dialog>`
- `functions/api/waitlist.ts` — Pages Function proxy to Brevo API
- `_routes.json` — Functions routing
- JSON-LD → single `SoftwareApplication` + `Offer`
- Redirect script: `pages.dev` → `aivoralabs.org` in `<head>` before any other script

### Out of Scope
- Sitemap, robots.txt, og-image, meta, Twitter Cards (already done)
- Theme, colors, layout, i18n
- Payment or auth

## Capabilities

### Modified Capabilities
- `landing-page` — FR-06: Pricing CTA → "Join waitlist" opens modal
- `landing-page` — FR-07: CTA gains "Join waitlist" button
- `landing-page` — SEO #51: JSON-LD simplified to single type + `Offer`

### New Capabilities
- None

## Approach

- **Pages Function proxy**: Browser → POST `/api/waitlist` → `functions/api/waitlist.ts` → Brevo `POST /v3/contacts` with `{email, listIds, updateEnabled: true}`. `BREVO_API_KEY` stays server-side.
- **Modal**: `<dialog>` element, CSS transition, inline JS (follows ThemeToggle pattern).
- **JSON-LD**: Replace `["SoftwareApplication", "OpenSourceProject"]` with single `SoftwareApplication` + `offers: { @type: "Offer", price: "0", priceCurrency: "USD" }`.
- **Env vars**: `BREVO_API_KEY` (secret), `BREVO_LIST_ID` (variable) — Cloudflare dashboard.

## Affected Areas

| Area | Impact | What |
|------|--------|------|
| `Pricing.astro` | Modified | CTA → "Join waitlist" opens modal |
| `CTA.astro` | Modified | Add waitlist button |
| `WaitlistModal.astro` | New | Form with `<dialog>`, email + company |
| `index.astro` | Modified | Import and mount modal |
| `functions/api/waitlist.ts` | New | Brevo POST proxy |
| `_routes.json` | New | Functions routing |
| `BaseLayout.astro` | Modified | JSON-LD replacement + `pages.dev` → domain redirect script |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| API key leak | Low | Pages Function only, never in client |
| Brevo API changes | Low | Pin `/v3/contacts`, handle non-2xx |
| CORS in dev | Med | Bypass function locally or mock |
| Modal a11y | Low | Focus trap + ESC on `<dialog>` |

## Rollback Plan

1. Revert `Pricing.astro`, `CTA.astro`, `index.astro` to prior commit
2. Remove `WaitlistModal.astro`, `functions/api/waitlist.ts`, `_routes.json`
3. Revert `BaseLayout.astro` JSON-LD
4. Remove `BREVO_API_KEY` and `BREVO_LIST_ID` from CF dashboard

## Dependencies

- Brevo API key + list ID in Cloudflare dashboard
- Cloudflare Pages Functions enabled

## Success Criteria

- [ ] "Join waitlist" opens modal on all pricing cards
- [ ] Form submits email; success shown on 201/204
- [ ] Errors handled (validation, network, server)
- [ ] JSON-LD renders `SoftwareApplication` + `Offer` price "0"
- [ ] Visiting `agenttrail.pages.dev` redirects to `agenttrail.aivoralabs.org`
- [ ] `pnpm build` succeeds
