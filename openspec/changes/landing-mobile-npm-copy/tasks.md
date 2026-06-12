# Tasks: Landing mobile fixes, npm publish config, and copy-to-clipboard buttons

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280 (CSS tweaks + metadata JSON + vanilla JS ~60 lines + CI YAML ~40 lines + README ~30 lines) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR — all workstreams are independent, small, and CSS/metadata/JS only |
| Delivery strategy | single-pr |
| Chain strategy | pending |

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 5 workstreams | Single PR | CSS fixes, npm metadata, copy buttons, README, security docs — no SDK logic changes |

---

## Workstream 1: Mobile Overflow Fixes (CSS-only)

- [ ] **T1** Add `w-full` to all 3 `<pre>` blocks in HowItWorks.astro
  - File: `apps/landing/src/components/HowItWorks.astro`
  - Add `w-full` class to the `<pre>` elements at lines ~24, ~38, ~58 (inside each step's code block).
  - Acceptance: `<pre>` elements have `w-full` class; no horizontal overflow at 320px viewport.
  - Deps: None

- [ ] **T2** Fix audit report grid to `grid-cols-1 sm:grid-cols-3` in HowItWorks.astro
  - File: `apps/landing/src/components/HowItWorks.astro`
  - At line ~85, change `grid grid-cols-3 gap-4` to `grid grid-cols-1 sm:grid-cols-3 gap-4`.
  - Acceptance: At 320px viewport, audit report grid shows 1 column; at 640px+, 3 columns.
  - Deps: None

- [ ] **T3** Add `text-4xl sm:text-5xl` base to Hero.astro heading
  - File: `apps/landing/src/components/Hero.astro`
  - At line ~21, change `text-5xl md:text-7xl lg:text-8xl` to `text-4xl sm:text-5xl md:text-7xl lg:text-8xl`.
  - Acceptance: Hero heading uses `text-4xl` at 320px, `text-5xl` at 640px+.
  - Deps: None

- [ ] **T4** Reduce button padding to `px-6 sm:px-8` in CTA.astro
  - File: `apps/landing/src/components/CTA.astro`
  - At lines ~15, ~26, ~34, change `px-8 py-3.5` to `px-6 sm:px-8 py-3.5` on all 3 buttons.
  - Acceptance: Buttons use `px-6` at 320px, `px-8` at 640px+.
  - Deps: None

- [ ] **T5** Remove `inset-0` from WaitlistModal.astro dialog
  - File: `apps/landing/src/components/WaitlistModal.astro`
  - At line ~6, remove `inset-0` from the `<dialog>` class attribute.
  - Acceptance: Dialog centers via CSS `dialog[open]` transforms without `inset-0`; no overflow on mobile.
  - Deps: None

---

## Workstream 2: npm Publish Configuration

- [ ] **T6** Add homepage/repository/author/keywords to all 4 package.json files
  - Files: `packages/core/package.json`, `packages/openai/package.json`, `packages/vercel-ai/package.json`, `packages/cli/package.json`
  - Add after `"engines"` in each:
    - `"homepage": "https://agenttrail.aivoralabs.org"`
    - `"repository": { "type": "git", "url": "git+https://github.com/AiVoraLabs/agenttrail.git" }`
    - `"author": "AivoraLabs <hello@aivoralabs.org>"`
    - `"keywords": [...]` — core: `["eu-ai-act", "audit-trail", "compliance", "ai-agents", "cryptographic"]`; openai: `["openai", "audit-trail", "compliance", "ai-agents"]`; vercel-ai: `["vercel-ai", "audit-trail", "compliance", "ai-agents"]`; cli: `["cli", "audit-trail", "verification", "compliance"]`
  - Acceptance: `npm pack --dry-run` in each package shows homepage, repository, author, keywords.
  - Deps: None

- [ ] **T7** Add prepack script to packages/core/package.json
  - File: `packages/core/package.json`
  - Add `"prepack": "pnpm run build"` to `scripts` section (after `"test:coverage"`).
  - Acceptance: `npm pack --dry-run` triggers build; script exists in package.json.
  - Deps: T6

- [ ] **T8** Create .npmrc at project root
  - File: `.npmrc` (new)
  - Content: `@aivoralabs:registry=https://registry.npmjs.org/`
  - Acceptance: `.npmrc` exists at root with the single line above.
  - Deps: None

- [ ] **T9** Create .github/workflows/release.yml
  - File: `.github/workflows/release.yml` (new)
  - Create release workflow with triggers `push: tags: ["v*"]` and `workflow_dispatch`. Steps: checkout, pnpm setup, node setup, install, build, test, publish (`pnpm publish -r --no-git-checks`). Use `NPM_TOKEN` secret, `id-token: write` for npm provenance, `NPM_CONFIG_PROVENANCE=true`.
  - Acceptance: Workflow YAML is valid; `actionlint` passes; workflow triggers on `v*` tags.
  - Deps: T8

---

## Workstream 3: Copy-to-Clipboard Buttons

- [ ] **T10** Add wrapper div + copy button markup to all 3 `<pre>` blocks in HowItWorks.astro
  - File: `apps/landing/src/components/HowItWorks.astro`
  - For each `<pre>` block (Steps 1, 2, 3): wrap in `<div class="relative group">`. Add `data-copy` attribute to `<pre>` with clean command text (no `$ ` prefix):
    - Step 1: `data-copy="npm install @aivoralabs/agenttrail"`
    - Step 2: `data-copy="import { AgentTrail } from '@aivoralabs/agenttrail'"`
    - Step 3: `data-copy="npx agenttrail verify audit-log.jsonl --output report.html"`
  - Add `<button>` inside each wrapper at `absolute top-3 right-3` with `opacity-0 group-hover:opacity-100 transition-all duration-200` classes, `data-copy-btn` attribute, and clipboard SVG icon.
  - Acceptance: Each `<pre>` wrapped in `<div class="relative group">` with `data-copy` and a copy button; button hidden by default, visible on hover.
  - Deps: T1

- [ ] **T11** Add IIFE inline JS for clipboard functionality in HowItWorks.astro
  - File: `apps/landing/src/components/HowItWorks.astro`
  - Add a `<script>` block at the end of the component (before closing template) using the vanilla JS IIFE pattern: `(function () { ... })();`.
  - Implement event delegation via `document.addEventListener('click')`. On click of `[data-copy-btn]`: navigate up to `[data-copy]`, read `data-copy` attribute, call `navigator.clipboard.writeText()`. On success: swap innerHTML to checkmark SVG, `setTimeout` 2s to revert. Fallback: `document.execCommand('copy')` via temporary textarea.
  - SVG icons: clipboard (24x24 stroke-based) and checkmark (`text-emerald-400`).
  - Acceptance: Clicking each copy button copies correct text (without `$`); checkmark shows 2s then reverts; works on HTTP (fallback); no `client:load` directive.
  - Deps: T10

---

## Workstream 4: README.md Update

- [ ] **T12** Update README.md with current project state, badges, security section
  - File: `README.md`
  - Verify npm badge links to `@aivoralabs/agenttrail` (already correct per design).
  - Ensure Website section mentions landing page at `agenttrail.aivoralabs.org` (already present).
  - Add "Security & Governance" section after "Open Source — MIT" with:
    - Bullet points: fail-closed, hash chain integrity, Ed25519 signatures, zero data retention
    - Link to `SECURITY-REVIEW.md`
    - "npm Provenance" subsection describing SLSA build provenance attestations
    - "Content Security Policy" subsection describing IIFE-only inline scripts, no external resources
  - Acceptance: README has Security & Governance section with link to SECURITY-REVIEW.md; npm badge renders correctly on GitHub.
  - Deps: None

---

## Workstream 5: Security Documentation

- [ ] **T13** Add security/governance section to README referencing SECURITY-REVIEW.md
  - File: `README.md` (same edit as T12 — combined in one edit)
  - This task is fulfilled as part of T12. The Security & Governance section in T12 explicitly references `SECURITY-REVIEW.md` and describes the project's security posture (fail-closed, hash chain, Ed25519, zero data retention).
  - Acceptance: README contains a clickable link to `SECURITY-REVIEW.md`; section describes security posture; no hardcoded secrets in landing page source files (verify with `grep -r "API_KEY\|TOKEN\|SECRET" apps/landing/src/`).
  - Deps: None (same as T12)

---

## Summary

| Workstream | Tasks | Focus |
|------------|-------|-------|
| WS-1: Mobile overflow | T1–T5 | CSS-only responsive fixes |
| WS-2: npm publish | T6–T9 | Package metadata + .npmrc + release CI |
| WS-3: Copy buttons | T10–T11 | Wrapper HTML + vanilla JS IIFE |
| WS-4: README | T12 | Documentation update |
| WS-5: Security docs | T13 | SECURITY-REVIEW.md reference |
| **Total** | **13** | |

### Implementation Order

All 5 workstreams are independent — no blocking dependencies between them. Recommended order for logical grouping in a single PR:

1. **T1–T5** (WS-1): CSS fixes — smallest, most isolated changes
2. **T6–T8** (WS-2 part 1): Package metadata + .npmrc — JSON/config changes
3. **T9** (WS-2 part 2): Release workflow — new CI file
4. **T10–T11** (WS-3): Copy buttons — HTML + JS in HowItWorks
5. **T12–T13** (WS-4/5): README + security docs — documentation

### Review Workload Forecast

- Estimated changed lines: ~280
- 400-line budget risk: Low
- Chained PRs recommended: No
- Delivery strategy: single-pr
- Decision needed before apply: No
- Suggested work-unit PR split: Not needed — single PR is well within budget

### Next Step

Ready for implementation (`sdd-apply`). No decision needed — all workstreams are CSS/metadata/JS/CI only, no SDK logic changes, well under 400-line budget.
