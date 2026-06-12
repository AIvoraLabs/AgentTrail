# Design: Landing — Waitlist via Brevo

## Technical Approach

Add a waitlist modal (`<dialog>`) to the Astro landing page, proxy submissions through a Cloudflare Pages Function to Brevo's API, and simplify JSON-LD schema. All client-side interactivity follows the existing vanilla JS inline `<script>` pattern (ThemeToggle). The Pages Function keeps `BREVO_API_KEY` server-side.

## Architecture Decisions

### Decision: Pages Function over client-side fetch to Brevo

| Option | Tradeoff |
|--------|----------|
| Client → Brevo directly | API key exposed in client bundle; anyone can call Brevo with it |
| Pages Function proxy | One extra network hop; API key stays in `context.env`; free tier covers traffic |

**Choice**: Pages Function proxy. API key security is non-negotiable for a public landing page.

### Decision: `<dialog>` over custom div modal

| Option | Tradeoff |
|--------|----------|
| Custom div + JS focus trap | Full control; but must implement ESC, focus trap, aria-modal manually |
| Native `<dialog>` | Built-in ESC, `::backdrop`, focus management; limited styling control on `::backdrop` |

**Choice**: `<dialog>`. Native a11y primitives eliminate entire classes of bugs. `::backdrop` styling is sufficient with `backdrop-filter: blur(4px)`.

### Decision: Inline `<script is:inline>` for redirect

| Option | Tradeoff |
|--------|----------|
| External script | Async/defer loads after HTML parsing; user sees flash of pages.dev content |
| Inline `<script is:inline>` in `<head>` | Blocks rendering until redirect fires; no FOUC; but blocks parser briefly |

**Choice**: Inline. The redirect is a single `window.location.replace` call (<1ms). Parser block is negligible vs. preventing a flash of content on the wrong domain.

### Decision: Vanilla JS over framework for modal

| Option | Tradeoff |
|--------|----------|
| Alpine.js / htmx | Declarative; adds dependency for one component |
| Vanilla JS (ThemeToggle pattern) | Zero deps; consistent with existing codebase; straightforward |

**Choice**: Vanilla JS. The landing page has zero client-side dependencies. Adding a framework for one modal is disproportionate.

### Decision: `_routes.json` to limit Function invocations

| Option | Tradeoff |
|--------|----------|
| No `_routes.json` | Functions invoked on every request including static assets; burns free tier |
| `_routes.json` with include `/api/*` | Only `/api/*` routes hit Functions; static assets served directly from Pages CDN |

**Choice**: `_routes.json`. The free tier has 100K Functions invocations/day. Static assets (HTML, CSS, JS, images) should never invoke a Function.

## Data Flow

```
Browser                    Pages Function              Brevo API
───────                    ───────────────             ─────────
POST /api/waitlist
  ├─ JSON body ─────────→  Parse + validate
  │                         Read BREVO_API_KEY ──→     POST /v3/contacts
  │                         Read BREVO_LIST_ID ──→       { email, listIds,
  │                                                       updateEnabled }
  │                         ←── 201 Created           │
  │                         ←── 200 OK (duplicate)    │
  │  ←── 200 + message ──  Format response           │
  │                                                    │
  │  On error:                                         │
  │  ←── 400 "Invalid email"                          │
  │  ←── 500 "Something went wrong"                   │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/landing/src/components/WaitlistModal.astro` | Create | `<dialog>` modal with email/company form, loading/success states, inline JS |
| `apps/landing/src/components/Pricing.astro` | Modify | Replace `cta: 'Coming soon'` → `'Join waitlist'`; `<a href="#">` → `<button>` with `data-open-waitlist` |
| `apps/landing/src/components/CTA.astro` | Modify | Add "Join waitlist" button alongside GitHub/docs buttons |
| `apps/landing/src/pages/index.astro` | Modify | Import and render `WaitlistModal` |
| `apps/landing/src/layouts/BaseLayout.astro` | Modify | Replace JSON-LD; add redirect `<script is:inline>` before theme script |
| `apps/landing/functions/api/waitlist.ts` | Create | Pages Function: POST handler, Brevo proxy, CORS |
| `apps/landing/_routes.json` | Create | `{ "version": 1, "include": ["/api/*"], "exclude": ["/*"] }` |

## Interfaces / Contracts

### WaitlistModal.astro — Component API

```astro
<!-- No props. Self-contained component. -->
<WaitlistModal />
<!-- Renders a <dialog id="waitlist-modal"> with form -->
```

### functions/api/waitlist.ts — Request/Response

```typescript
// POST /api/waitlist
// Request body:
{ email: string; company?: string }

// Response 200/201:
{ success: true; message: "You're on the list. We'll reach out when AgentTrail Cloud launches." }

// Response 400:
{ success: false; error: "Invalid email" }

// Response 500:
{ success: false; error: "Something went wrong. Try again." }
```

### Brevo API Payload

```json
{
  "email": "user@example.com",
  "listIds": [BREVO_LIST_ID],
  "attributes": { "COMPANY": "Acme Corp" },
  "updateEnabled": true
}
```

### Environment Variables

| Variable | Type | Location |
|----------|------|----------|
| `BREVO_API_KEY` | Secret (encrypted) | Cloudflare Dashboard → Settings → Environment variables |
| `BREVO_LIST_ID` | Variable (plain) | Cloudflare Dashboard → Settings → Environment variables |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Modal open/close/submit states | Manual browser test: click button → verify dialog opens → submit → verify loading → verify success |
| Unit | Pricing CTA text | Visual check: all 4 cards show "Join waitlist" (Starter/Growth/Scale) or "Contact sales" (Enterprise) |
| Integration | `/api/waitlist` endpoint | `curl -X POST localhost:4321/api/waitlist -d '{"email":"test@example.com"}'` — verify 200/201 |
| Integration | Validation | POST with empty/invalid email → verify 400 |
| E2E | Full flow | Visit page → click "Join waitlist" → fill email → submit → verify success message |
| E2E | Redirect | Visit `agenttrail.pages.dev` → verify redirect to `agenttrail.aivoralabs.org` |
| Build | `pnpm build` succeeds | Run build, verify no errors |

## Migration / Rollout

1. Set `BREVO_API_KEY` and `BREVO_LIST_ID` in Cloudflare Dashboard **before** deploying
2. Deploy with all changes in one commit
3. Verify redirect script fires on `pages.dev`
4. Verify waitlist form submits and Brevo receives contact

No data migration. No feature flags. Single atomic deploy.

## Open Questions

- [ ] Should Enterprise "Contact sales" also open the waitlist modal, or remain a mailto/link?
- [ ] Should the modal include a checkbox for "I agree to receive emails" (GDPR compliance)?
- [ ] What is the Brevo list ID? (Needed for env var setup)
