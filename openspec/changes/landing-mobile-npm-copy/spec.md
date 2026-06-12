# Spec: Landing mobile fixes, npm publish config, and copy-to-clipboard buttons

**Change**: `landing-mobile-npm-copy`
**Status**: Draft
**Context**: The AgentTrail landing page has horizontal overflow on mobile (regression against existing FR-09). The npm packages lack metadata for publishing and have no release CI. The HowItWorks code blocks lack copy-to-clipboard UX. The README and security docs need alignment with current project state.

---

## Domain: landing-page (Modified)

### MODIFIED FR-09: Responsive

The landing page MUST have zero horizontal scroll at 320px, 375px, 390px, and 414px viewport widths. All 8 sections MUST fit within viewport width. The following component-specific CSS changes SHALL be applied:

- **HowItWorks.astro**: Three `<pre>` code blocks MUST NOT overflow viewport; audit report grid SHALL stack to single column below 640px
- **Hero.astro**: Heading SHALL scale down from `text-4xl` at base before reaching `text-5xl` at `sm:` and `text-7xl` at `md:`
- **CTA.astro**: Button padding SHALL reduce to `px-6` at base viewport before expanding to `px-8` at `sm:`
- **WaitlistModal.astro**: `<dialog>` SHALL NOT use `inset-0` positioning (CSS `dialog[open]` rules handle centering)

(Previously: FR-09 required zero horizontal scroll at 4 breakpoints but did not specify component-level fixes)

#### Scenario: No overflow at 320px

- GIVEN the landing page is rendered in a 320px viewport
- WHEN the page loads
- THEN there MUST be zero horizontal scroll
- AND all 8 sections MUST be fully visible within the viewport width

#### Scenario: No overflow at 414px

- GIVEN the landing page is rendered in a 414px viewport
- WHEN the page loads
- THEN there MUST be no horizontal overflow in any section

#### Scenario: Hero heading scales responsively

- GIVEN the Hero heading is rendered
- WHEN viewport is below 640px
- THEN the heading MUST use `text-4xl` (not `text-5xl`)
- WHEN viewport is 640px or wider
- THEN the heading MUST scale up to `text-5xl`

#### Scenario: HowItWorks grid stacks on mobile

- GIVEN the audit report preview grid in HowItWorks
- WHEN viewport is below 640px
- THEN the grid SHALL use single column (`grid-cols-1`)
- WHEN viewport is 640px or wider
- THEN the grid SHALL use 3 columns (`sm:grid-cols-3`)

#### Scenario: CTA buttons reduce padding on small screens

- GIVEN the CTA section buttons
- WHEN viewport is below 640px
- THEN the buttons MUST use `px-6`
- WHEN viewport is 640px or wider
- THEN the buttons MUST use `px-8`

#### Scenario: WaitlistModal dialog centers without inset-0

- GIVEN a mobile viewport below 640px
- WHEN the waitlist dialog opens
- THEN the dialog MUST be centered via `dialog[open]` CSS transforms
- AND MUST NOT rely on `inset-0` for positioning

### ADDED FR-14: Copy-to-Clipboard Buttons

Each of the 3 `<pre>` code blocks in HowItWorks.astro SHALL display a copy button on hover that copies the code text (without shell prompt `$ ` prefix) to the clipboard.

#### Scenario: Button appears on hover

- GIVEN a user hovers over any `<pre>` code block in HowItWorks
- WHEN the mouse enters the code block area
- THEN a copy button SHALL appear at the top-right corner
- AND the button SHALL have `opacity-0 group-hover:opacity-100` transition

#### Scenario: Click copies correct text

- GIVEN a user clicks the copy button on Step 1's code block
- WHEN the button is clicked
- THEN the text `npm install @aivoralabs/agenttrail` MUST be copied (WITHOUT the `$ ` prefix)
- AND the icon SHALL swap to a checkmark for 2 seconds
- AFTER 2 seconds, the icon SHALL revert to the clipboard SVG

#### Scenario: All three blocks have independent copy buttons

- GIVEN a user interacts with HowItWorks
- WHEN inspecting the DOM
- THEN each of the 3 `<pre>` blocks MUST be wrapped in a `<div class="relative group">`
- AND each MUST have a `data-copy` attribute containing its respective code text
- AND each MUST have its own copy button instance

#### Scenario: Copy fallback on HTTP

- GIVEN the page is served over HTTP (not HTTPS)
- WHEN `navigator.clipboard.writeText()` fails
- THEN the implementation SHOULD fall back to `document.execCommand('copy')`

#### Scenario: Vanilla JS IIFE pattern

- GIVEN the page loads
- WHEN inspecting the `<script>` block
- THEN the copy logic MUST use the vanilla JS IIFE pattern (no `client:load`)
- AND all event listeners SHALL use `document.addEventListener` delegation

---

## Domain: npm-publish (New)

### Purpose

Configure npm package metadata and CI release workflow for the `@aivoralabs/agenttrail` monorepo packages so they can be published to the npm registry.

### Requirements

#### NP-01: Package Metadata

All 4 packages (`core`, `openai`, `vercel-ai`, `cli`) SHALL include `homepage`, `repository`, `author`, and `keywords` fields in their `package.json`.

The `core` package SHALL also include a `"prepack": "pnpm run build"` script that runs before `npm pack` / `npm publish`.

##### Scenario: Core package has complete metadata

- GIVEN the `packages/core/package.json` file
- WHEN inspected
- THEN it MUST include `homepage`, `repository` (with `type: "git"` and `url`), `author`, and `keywords`
- AND it MUST include `"prepack": "pnpm run build"` in `scripts`

##### Scenario: All sub-packages have metadata

- GIVEN each sub-package (`openai`, `vercel-ai`, `cli`)
- WHEN inspecting their `package.json`
- THEN each MUST include `homepage`, `repository`, `author`, and `keywords`

##### Scenario: Repository URL points to GitHub

- GIVEN any package's `repository` field
- WHEN inspected
- THEN it MUST reference `github:AiVoraLabs/agenttrail` or the full HTTPS URL

#### NP-02: Registry Configuration

A `.npmrc` file at the project root SHALL configure the `@aivoralabs` scope to publish to the public npm registry.

##### Scenario: .npmrc exists at root

- GIVEN the project root directory
- WHEN listing files
- THEN `.npmrc` MUST exist with `@aivoralabs:registry=https://registry.npmjs.org/`

#### NP-03: Release Workflow

A GitHub Actions workflow at `.github/workflows/release.yml` SHALL publish packages to npm when triggered by a version tag push (`v*`) or manual `workflow_dispatch`.

##### Scenario: Release on tag push

- GIVEN a maintainer pushes a `v*` tag
- WHEN the release workflow triggers
- THEN it MUST checkout, install deps, run tests, build, and publish all packages
- AND use `NPM_TOKEN` from GitHub secrets for authentication

##### Scenario: Manual dispatch

- GIVEN a maintainer triggers `workflow_dispatch`
- WHEN the release workflow runs
- THEN it MUST follow the same build-and-publish pipeline

##### Scenario: Fail on missing NPM_TOKEN

- GIVEN the release workflow runs without `NPM_TOKEN` set
- WHEN publish step executes
- THEN the workflow MUST fail with a clear error

#### NP-04: Changeset Integration

The release workflow SHALL integrate with the existing `changeset` tooling in the root `package.json`.

##### Scenario: Version bump before publish

- GIVEN the release workflow
- WHEN triggered
- THEN it SHALL use `changeset publish` or equivalent to handle versioning
- AND the `.npmrc` `@aivoralabs` scope configuration MUST be in place

---

## Domain: code-copy-button (New)

### Purpose

Provide copy-to-clipboard functionality on code blocks throughout AgentTrail documentation and UI surfaces. Initially scoped to the landing page's HowItWorks component.

### Requirements

#### CC-01: Code Block Copy Button

Any `<pre>` element with a `data-copy` attribute SHALL display a copy button on hover that copies the value of `data-copy` to the system clipboard.

##### Scenario: Button renders on hover

- GIVEN a `<pre>` element with `data-copy="some text"`
- WHEN hovered
- THEN a button SHALL appear at `top-3 right-3` with smooth opacity transition

##### Scenario: Copies correct content

- GIVEN the button is visible
- WHEN clicked
- THEN `navigator.clipboard.writeText(data-copy-value)` SHALL be called
- AND the button icon SHALL change to a checkmark for 2 seconds

#### CC-02: Shell Prompt Stripping

The `data-copy` attribute MUST NOT include shell prompt prefixes (e.g., `$ `).

##### Scenario: No dollar sign in copy text

- GIVEN a code block showing `$ npm install @aivoralabs/agenttrail`
- WHEN inspecting the `data-copy` attribute
- THEN the value MUST be `npm install @aivoralabs/agenttrail` (without `$ `)

#### CC-03: Error Handling

If clipboard API fails, the system SHALL fall back to `document.execCommand('copy')` or display an error state.

##### Scenario: Clipboard API unavailable

- GIVEN `navigator.clipboard` is undefined
- WHEN the copy button is clicked
- THEN the implementation SHALL fall back to `document.execCommand('copy')`

#### CC-04: Script Injection Pattern

All JavaScript for copy functionality SHALL use the vanilla JS IIFE pattern (project convention).

##### Scenario: No client:load directive

- GIVEN the Astro component
- WHEN inspecting the script tag
- THEN it MUST NOT use `client:load` or any Astro directive
- AND the script MUST be an IIFE: `(function () { ... })();`

---

## Domain: readme (Modified)

### MODIFIED: README.md

The root `README.md` SHALL be updated to reflect current project state including npm publish status, landing page URL, and security governance.

(Previously: README referenced unversioned npm badge, no security section, no landing page context)

#### Scenario: Updated npm badge

- GIVEN the README is rendered on GitHub
- WHEN inspecting the npm badge
- THEN it MUST link to the correct `@aivoralabs/agenttrail` package

#### Scenario: Landing page section

- GIVEN a user reads the README
- WHEN viewing the Website section
- THEN it MUST mention the landing page is live at agenttrail.aivoralabs.org

#### Scenario: Security governance section

- GIVEN a user reads the README
- WHEN viewing the document
- THEN there MUST be a section linking to `SECURITY-REVIEW.md`
- AND it MUST describe the overall security posture (fail-closed, hash chain, Ed25519)

---

## Domain: security-docs (Modified)

### ADDED: Security Governance in README

The README SHALL reference the `SECURITY-REVIEW.md` and describe the project's security posture.

#### Scenario: README links SECURITY-REVIEW.md

- GIVEN the README.md file
- WHEN viewing the document
- THEN it MUST contain a link to `SECURITY-REVIEW.md`

### MODIFIED: Landing Page Security Posture

The landing page SHALL NOT contain hardcoded tokens or API keys. Content Security Policy SHALL be considered.

(Previously: No explicit security requirements for the landing page)

#### Scenario: No hardcoded secrets

- GIVEN all landing page source files
- WHEN searching for API keys, tokens, or secrets
- THEN there MUST NOT be any hardcoded credentials

#### Scenario: CSP headers considered

- GIVEN the Cloudflare Pages deployment
- WHEN reviewing the deployment config
- THEN Content Security Policy headers SHOULD be configured to limit script sources

---

## Out of Scope

- Merkle tree verification, SSO, multi-tenancy (per immutable architecture decisions)
- SDK logic changes — core, openai, vercel-ai, cli package code stays untouched
- Dashboard or analytics UI
- LangChain, Anthropic, or Google AI integrations
- Any changes to `packages/core/src/`, `packages/openai/src/`, `packages/vercel-ai/src/`, `packages/cli/src/` (metadata in package.json only)
- Changeset configuration or versioning strategy — the existing changeset setup is sufficient

---

## Acceptance Criteria

- [ ] Zero horizontal scroll at 320px, 375px, 390px, 414px on all 8 landing sections
- [ ] Hero heading uses `text-4xl sm:text-5xl` base before `md:text-7xl`
- [ ] CTA buttons use `px-6 sm:px-8`
- [ ] WaitlistModal `<dialog>` has no `inset-0` class
- [ ] HowItWorks audit grid uses `grid-cols-1 sm:grid-cols-3`
- [ ] All 3 `<pre>` blocks in HowItWorks wrapped in `<div class="relative group">` with copy buttons
- [ ] Clicking each copy button copies correct code (without `$ ` shell prompt)
- [ ] Copy button shows checkmark for 2s then reverts
- [ ] All 4 package.json files have `homepage`, `repository`, `author`, `keywords`
- [ ] `packages/core/package.json` has `"prepack": "pnpm run build"`
- [ ] `.npmrc` exists at root with `@aivoralabs:registry=https://registry.npmjs.org/`
- [ ] `.github/workflows/release.yml` created and valid
- [ ] `README.md` has updated badges, landing page section, security governance section
- [ ] No hardcoded secrets in landing page source files
