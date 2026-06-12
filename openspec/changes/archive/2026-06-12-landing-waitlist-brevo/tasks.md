# Tasks: Landing — Waitlist via Brevo

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150–200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full waitlist flow + JSON-LD + redirect | PR 1 | Single atomic deploy, all files included |

## Phase 1: Foundation

- [x] 1.1 Create `apps/landing/functions/api/waitlist.ts` — Pages Function proxy: validate email, read `BREVO_API_KEY`/`BREVO_LIST_ID` from `context.env`, POST to Brevo `/v3/contacts` with `{email, listIds: [3], attributes: {COMPANY}, updateEnabled: true}`. Return 201 on success, treat Brevo `duplicate_parameter` (400) as success, 400 for invalid email, 500 for other errors. Handle OPTIONS preflight with CORS headers (204).
- [x] 1.2 Create `apps/landing/_routes.json` — `{"version": 1, "include": ["/api/*"], "exclude": ["/*"]}`.

## Phase 2: Modal Component

- [x] 2.1 Create `apps/landing/src/components/WaitlistModal.astro` — Self-contained `<dialog id="waitlist-modal">` with `<form>` (email required, company optional). Three states: form, loading (button disabled + spinner), success (message text). Inline `<script is:inline>` for open/close/submit logic: `data-open-waitlist` buttons trigger `dialog.showModal()`, ESC closes, focus returns to trigger. POST to `/api/waitlist` with `fetch`. Tailwind classes for backdrop blur, layout, form fields.

## Phase 3: Wiring

- [x] 3.1 Modify `apps/landing/src/components/Pricing.astro` — Replace `cta: 'Coming soon'` text with `'Join waitlist'` for Starter/Growth/Scale cards. Change `<a href="#">` to `<button data-open-waitlist>`. Enterprise card stays "Contact sales" as-is.
- [x] 3.2 Modify `apps/landing/src/components/CTA.astro` — Add a "Join waitlist" button with `data-open-waitlist` attribute alongside existing GitHub/docs buttons.
- [x] 3.3 Modify `apps/landing/src/pages/index.astro` — Import `WaitlistModal` component and render it (no props needed).
- [x] 3.4 Modify `apps/landing/src/layouts/BaseLayout.astro` — (a) Replace existing JSON-LD array with single `SoftwareApplication` + `Offer` schema (price "0", priceCurrency "USD", license MIT). (b) Add inline `<script is:inline>` in `<head>` before theme script: `if (location.hostname === 'agenttrail.pages.dev') location.replace('https://agenttrail.aivoralabs.org')`.

## Phase 4: Verification

- [x] 4.1 Run `pnpm --filter @agenttrail/landing build` — verify build succeeds with no errors.
- [x] 4.2 Inspect `dist/` output — confirm redirect script and JSON-LD script appear in built HTML.
- [x] 4.3 Manual browser test — click any "Join waitlist" button, verify modal opens with focused email field, ESC closes it, submit sends POST to `/api/waitlist`.
