# Proposal: Landing mobile fixes, npm publish config, and copy-to-clipboard buttons

## Intent

Fix horizontal scroll on mobile (regression against FR-09), configure npm publish for `@aivoralabs/agenttrail`, and add copy-to-clipboard UX to code blocks in HowItWorks.

## Scope

### In Scope
- Mobile overflow fixes in Hero, HowItWorks, CTA, and WaitlistModal
- `.npmrc` + `prepack` script + GitHub Actions release workflow
- Copy-to-clipboard buttons on all 3 `HowItWorks.astro` `<pre>` blocks

### Out of Scope
- Merkle tree verification, SSO, multi-tenancy (per immutable decisions)
- Any SDK logic changes — core package code stays untouched
- Dashboard or analytics UI

## Capabilities

### New Capabilities
- `code-copy-button`: Inline JS copy-to-clipboard on `<pre>` blocks with hover reveal, checkmark feedback
- `npm-publish`: `.npmrc`, `prepack` script, and release CI workflow for `@aivoralabs/agenttrail`

### Modified Capabilities
- `landing-page`: CSS-only responsive fixes to meet existing FR-09 (no overflow at 320px). No spec-level changes — pure implementation fix.

## Approach

**WS-1 Mobile overflow**: Add `w-full` to 3 `<pre>` blocks in HowItWorks, responsive grid `grid-cols-1 sm:grid-cols-3` at line 85, `text-4xl sm:text-5xl` base in Hero h1, `px-6 sm:px-8` on CTA buttons, remove `inset-0` from WaitlistModal dialog.

**WS-2 npm publish**: Root `.npmrc` with `@aivoralabs` registry. `prepack` script in `packages/core/package.json`. `.github/workflows/release.yml` on tags (`v*`) + `workflow_dispatch`, build + `pnpm publish`.

**WS-3 Copy buttons**: `group` + `relative` wrappers on each `<pre>`. `data-copy` attribute with code (minus `$`). Absolute `<button>` top-right, shown on group hover. Vanilla IIFE handles click → `clipboard.writeText()` → checkmark 2s → revert.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/landing/src/components/Hero.astro` | Modified | `text-5xl` → `text-4xl sm:text-5xl` |
| `apps/landing/src/components/HowItWorks.astro` | Modified | `<pre>` widths, grid, copy buttons |
| `apps/landing/src/components/CTA.astro` | Modified | `px-8` → `px-6 sm:px-8` on buttons |
| `apps/landing/src/components/WaitlistModal.astro` | Modified | Remove `inset-0` from `<dialog>` |
| `.npmrc` | New | `@aivoralabs` registry config |
| `packages/core/package.json` | Modified | Add `prepack` script |
| `.github/workflows/release.yml` | New | npm publish CI on tags |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| NPM_TOKEN leak via CI | Low | GitHub encrypted secrets |
| Copy button fails on HTTP | Med | Fallback `execCommand('copy')` |
| Overflow fix misses breakpoint | Low | Test at 320/375/390/414px |

## Rollback Plan

`git revert` the commit. For npm publish, `npm unpublish` if no consumers, else yank.

## Dependencies

- GitHub `NPM_TOKEN` secret must be set before first release workflow run

## Success Criteria

- [ ] Zero horizontal scroll at 320px, 375px, 390px, 414px on all 8 landing sections
- [ ] `npm publish --dry-run` succeeds on `packages/core`
- [ ] Clicking each copy button copies correct code (without `$`) and shows checkmark
