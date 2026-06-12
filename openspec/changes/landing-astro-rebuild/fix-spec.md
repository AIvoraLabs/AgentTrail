# Fix Spec: Landing Post-Verify Fixes

**Change**: `landing-astro-rebuild`

Four issues found during verification — two failures, two warnings. This spec documents each fix, its verification, and the Cloudflare Pages deployment strategy for the landing site.

---

## FIX-01: Missing `@astrojs/sitemap` Integration

**Severity**: Failure — build produces no sitemap

| Field | Value |
|-------|-------|
| **File** | `apps/landing/package.json` + `apps/landing/astro.config.mjs` |
| **Root cause** | `@astrojs/sitemap` was in the proposal's dependency list but never installed or configured |
| **Expected fix** | Add dependency + register integration |

### What to change

1. **`apps/landing/package.json`** — add to `dependencies`:
   ```json
   "@astrojs/sitemap": "^3.0.0"
   ```

2. **`apps/landing/astro.config.mjs`** — add import + integration:
   ```js
   import sitemap from '@astrojs/sitemap';

   export default defineConfig({
     integrations: [sitemap()],
     // ... rest unchanged
   });
   ```

### Verification

| Step | Command / Check | Expected |
|------|----------------|----------|
| 1 | `pnpm --filter @agenttrail/landing build` | Exit 0 |
| 2 | `ls apps/landing/dist/sitemap-index.xml` | File exists |
| 3 | `head -5 apps/landing/dist/sitemap-index.xml` | Valid XML with `<urlset>` |
| 4 | `curl -s https://agenttrail.aivoralabs.org/sitemap-index.xml \| head -1` | `<?xml` response (deployed) |

### Scenario

- GIVEN the landing page has multiple sections
- WHEN `astro build` runs
- THEN the `sitemap-index.xml` MUST be generated in `dist/`
- AND it MUST include at minimum the `/` URL entry

---

## FIX-02: Missing `robots.txt`

**Severity**: Failure — search engines get no crawl instructions

| Field | Value |
|-------|-------|
| **File** | `apps/landing/public/robots.txt` (new file) |
| **Root cause** | `public/` directory was created empty; `robots.txt` was in the spec but never written |
| **Expected fix** | Create `apps/landing/public/robots.txt` |

### What to change

Create `apps/landing/public/robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://agenttrail.aivoralabs.org/sitemap-index.xml
```

### Verification

| Step | Command / Check | Expected |
|------|----------------|----------|
| 1 | `ls apps/landing/public/robots.txt` | File exists |
| 2 | `astro build` | `robots.txt` copied to `dist/` |
| 3 | `curl -s https://agenttrail.aivoralabs.org/robots.txt` | Contains `Sitemap:` + `Allow: /` |

### Scenario

- GIVEN the landing page is built
- WHEN a search engine requests `/robots.txt`
- THEN it MUST respond with `User-agent: *` and `Allow: /`
- AND it MUST include the sitemap URL

---

## FIX-03: FOUC Script Runs Deferred (`type="module"`)

**Severity**: Warning — visible flash on slow connections

| Field | Value |
|-------|-------|
| **File** | `apps/landing/src/layouts/BaseLayout.astro`, line 59 |
| **Root cause** | Astro compiles bare `<script>` tags to `<script type="module"` which defers execution to after DOM parsing. FOUC prevention MUST run synchronously before first paint |
| **Expected fix** | Add `is:inline` directive to the FOUC script |

### What to change

In `BaseLayout.astro`, line 59:

```astro
<!-- Theme FOUC prevention -->
<script is:inline>
```

This tells Astro to emit the script AS-IS (no bundling, no `type="module"`, no defer).

### Verification

| Step | Command / Check | Expected |
|------|----------------|----------|
| 1 | `astro build` | Exit 0 |
| 2 | `grep -c 'type="module"' apps/landing/dist/index.html` on the FOUC script block | Zero — script is inline, not module |
| 3 | Open `dist/index.html`, inspect `<head>` | Script is a regular `<script>` (not `type="module"`) |
| 4 | Reload page on slow 3G | No flash from dark to light or vice versa |

### Scenario

- GIVEN the page loads
- WHEN the browser parses `<head>`
- THEN the theme script MUST execute synchronously before the first paint
- AND there MUST be no flash of unstyled content (FOUC) on theme switch

---

## FIX-04: Missing `<main>` Landmark

**Severity**: Warning — accessibility and SEO degradation

| Field | Value |
|-------|-------|
| **File** | `apps/landing/src/layouts/BaseLayout.astro`, line 74 |
| **Root cause** | `<slot />` is rendered directly in `<body>` without a `<main>` wrapper |
| **Expected fix** | Wrap `<slot />` in `<main id="main-content">` |

### What to change

In `BaseLayout.astro`, replace:

```astro
<body class="...">
  <slot />
</body>
```

With:

```astro
<body class="...">
  <main id="main-content">
    <slot />
  </main>
</body>
```

### Verification

| Step | Command / Check | Expected |
|------|----------------|----------|
| 1 | `astro build` | Exit 0 |
| 2 | `grep '<main' apps/landing/dist/index.html` | `<main id="main-content">` found once |
| 3 | `grep '</main>' apps/landing/dist/index.html` | Closing tag present |
| 4 | Run axe DevTools / Lighthouse | "Document doesn't have a `<main>` landmark" warning gone |

### Scenario

- GIVEN the landing page loads
- WHEN a screen reader or accessibility tool inspects the page
- THEN the main content MUST be wrapped in `<main id="main-content">`
- AND it MUST be the only `<main>` element on the page

---

## CI/CD Strategy: Cloudflare Pages Deployment

### Architecture Context

The monorepo layout:
```
agenttrail/
├── packages/*        → npm packages (published to NPM)
├── apps/landing/     → Astro 6 static site (deploys to Cloudflare Pages)
├── apps/docs/        → VitePress docs (deploys separately or same CF Pages project)
└── .github/workflows/ci.yml → Typecheck → Build → Test → Coverage → Lint
```

Only `apps/landing` is a static site. The SDK packages are not deployed — they are published to NPM via `pnpm changeset publish`.

### Option 1: Direct Git Integration (Recommended for MVP)

Cloudflare Pages connects directly to the GitHub repo.

| Config | Value |
|--------|-------|
| **Root directory** | `apps/landing` |
| **Build command** | `npx astro build` |
| **Output directory** | `dist` |
| **Node version** | 22 |
| **Environment variables** | None needed |

**Can Cloudflare Pages handle a monorepo with root dir set to `apps/landing`?**  
Yes. Cloudflare Pages supports a `Root directory` field — set it to `apps/landing`. The build then runs in that subdirectory context. No `wrangler.toml` is needed for this minimal setup.

**Do we need a `wrangler.toml`?**  
No. For a Pages project without Functions (pure static), the dashboard UI configuration is sufficient. `wrangler.toml` is required only when using Wrangler CLI or adding Cloudflare Functions/Workers.

**Pros:**
- Zero config beyond dashboard setup
- Preview deployments for every PR branch (automatic)
- Minimal maintenance

**Cons:**
- Cannot run monorepo-level checks (typecheck, test) before deploy
- Build happens on Cloudflare infra — less control
- Full `pnpm install` runs every time (slower)

### Option 2: GitHub Actions → Cloudflare Pages (Recommended Post-MVP)

Add a second workflow or extend `ci.yml` to deploy the landing after quality checks pass.

```yaml
# .github/workflows/deploy-landing.yml
name: Deploy Landing

on:
  push:
    branches: [main]
    paths:
      - "apps/landing/**"
      - "pnpm-lock.yaml"
  pull_request:
    branches: [main]
    paths:
      - "apps/landing/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile --filter @agenttrail/landing...
      - run: pnpm --filter @agenttrail/landing build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy apps/landing/dist --project-name=agenttrail-landing
```

**Should landing deploy on every push to main, or only when `apps/landing/` changes?**  
Only when `apps/landing/` changes. The `paths:` filter on the workflow trigger prevents unnecessary deploys when only `packages/` or `apps/docs/` change. The `pnpm-lock.yaml` path is included because a lockfile change affects dependency resolution.

**How does this interact with the existing CI?**  
The existing `ci.yml` runs on ALL pushes/PRs to `main` and includes `pnpm build` which handles the landing too. The deploy workflow runs *in parallel* or *after* CI — they are independent. If you want deploy to wait for CI to pass, add `needs: [quality]` to the deploy job or use a branch protection rule requiring CI success.

**What about preview deployments for PRs?**  
Both options support preview deployments:
- **Option 1** (Direct Git): Automatic — Cloudflare creates a preview URL for each PR branch automatically.
- **Option 2** (GitHub Actions): The `cloudflare/wrangler-action` creates preview deployments by default on non-`main` branches. Each PR gets a unique `https://<branch>.agenttrail-landing.pages.dev` URL.

### Recommendation: Start with Option 1, graduate to Option 2

| Phase | Approach | Rationale |
|-------|----------|-----------|
| **MVP** | Direct Git integration | Fast setup, preview deployments free, no secrets management |
| **Post-MVP** | GitHub Actions → Cloudflare Pages | Run typecheck + test + lint before deploy, path-scoped triggers, full CI integration |

### Custom Domain

The domain `agenttrail.aivoralabs.org` must be configured in Cloudflare Pages dashboard:
- Add custom domain → `agenttrail.aivoralabs.org`
- Update DNS: CNAME `agenttrail` → `agenttrail-landing.pages.dev` (Cloudflare manages this automatically if DNS is on Cloudflare)
- Update `astro.config.mjs` `site` field if it doesn't match (currently set to `https://agenttrail.aivoralabs.org` — this is correct)

### Verification Checklist

- [ ] Landing deploys successfully to Cloudflare Pages
- [ ] `https://agenttrail.aivoralabs.org` resolves to the deployed site
- [ ] `/robots.txt` returns 200
- [ ] `/sitemap-index.xml` returns valid XML
- [ ] PR branches get unique preview URLs
- [ ] Deploy does NOT trigger on `packages/` or `apps/docs/` changes (if using Option 2)
- [ ] FOUC prevention works in production build
- [ ] `<main>` landmark exists in production HTML

---

## Summary

| Fix | Issue | File | Type | Status |
|-----|-------|------|------|--------|
| FIX-01 | Missing sitemap | `package.json` + `astro.config.mjs` | Dependency + Config | Pending |
| FIX-02 | Missing robots.txt | `public/robots.txt` (new) | New file | Pending |
| FIX-03 | FOUC script deferred | `BaseLayout.astro:59` | Directive change | Pending |
| FIX-04 | Missing `<main>` | `BaseLayout.astro:74` | Element wrap | Pending |

**Next step**: Apply the fixes (`sdd-apply`), then re-run verification (`sdd-verify`).
