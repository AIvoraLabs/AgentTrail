# Proposal: Landing UX fixes + npm READMEs

## Intent

Fix two high-priority mobile UX regressions (copy buttons invisible on touch, code blocks overflowing viewport) and create self-contained READMEs for 4 packages that show blank pages on npmjs.com.

## Scope

### In Scope
- Touch-device copy button fix (3 buttons in `HowItWorks.astro`)
- Code block overflow fix at 320-414px (3 `<pre>` blocks)
- 4 READMEs: `packages/core`, `openai`, `vercel-ai`, `cli`

### Out of Scope
- Other landing sections, SDK logic, content changes

## Capabilities

### New Capabilities
- `npm-readme`: Self-contained READMEs for npm — install, quick start, API reference, EU AI Act context

### Modified Capabilities
- `code-copy-button`: CC-01 hover-reveal fails on touch — add `@media (hover: hover)` guard; always visible on touch
- `landing-page`: Pure implementation fix for FR-09 overflow. No spec-level changes.

## Approach

**WS-1 Copy on mobile**: `@media (hover: hover)` in `<style>` block hides buttons by default on hover-capable devices only. Base `opacity-100`. Touch devices see buttons always; desktop hover preserved.

**WS-2 Code block overflow**: Add `min-w-0` to `.flex-1` div (L19) so flex child shrinks below content size, letting `w-full` on `<pre>` constrain to viewport. `overflow-x-auto` already present.

**WS-3 npm READMEs**: Create `README.md` per package. Badges, install, quick-start, API ref, links. Enterprise tone for EU AI Act audience.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/landing/src/components/HowItWorks.astro` | Modified | Copy btn CSS, `min-w-0` on flex |
| `packages/core/README.md` | New | Core SDK docs |
| `packages/openai/README.md` | New | OpenAI wrapper docs |
| `packages/vercel-ai/README.md` | New | Vercel AI middleware docs |
| `packages/cli/README.md` | New | CLI tool docs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `(hover: hover)` unsupported in old browsers | Low | Always-show fallback via `@supports` |
| README drifts from API | Med | Source of truth = docstrings; CI lint |
| Button always visible on desktop | Low | Media query restores hover behavior |

## Rollback Plan

`git revert` the commit.

## Dependencies

None.

## Success Criteria

- [ ] Copy buttons visible on touch devices at 375px without hover interaction
- [ ] Copy buttons hidden on desktop, shown on hover
- [ ] Zero horizontal scroll at 320-414px on HowItWorks section
- [ ] `npm pack --dry-run` on each package includes README.md
- [ ] Each README renders on npmjs.com (valid markdown, no broken links)
