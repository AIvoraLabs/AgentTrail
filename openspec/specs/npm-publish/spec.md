# npm-publish Specification

## Purpose

Configure npm package metadata, registry authentication, and CI release workflow for the `@aivoralabs/agenttrail` monorepo. All 4 packages (`core`, `openai`, `vercel-ai`, `cli`) SHALL publish to the public npm registry under the `@aivoralabs` scope.

## Requirements

### NP-01: Package Metadata

Every published package SHALL include `homepage`, `repository`, `author`, and `keywords` fields in `package.json` for npm discovery and provenance.

#### Scenario: Core package has complete metadata

- GIVEN `packages/core/package.json`
- WHEN inspected
- THEN it MUST include:
  - `"homepage": "https://agenttrail.aivoralabs.org"`
  - `"repository": { "type": "git", "url": "git+https://github.com/AiVoraLabs/agenttrail.git" }`
  - `"author": "AivoraLabs <hello@aivoralabs.org>"`
  - `"keywords": ["eu-ai-act", "audit-trail", "compliance", "ai-agents", "cryptographic"]`
- AND `"prepack": "pnpm run build"` MUST exist in `scripts`

#### Scenario: Sub-packages have metadata

- GIVEN `packages/openai/package.json`, `packages/vercel-ai/package.json`, and `packages/cli/package.json`
- WHEN inspected
- THEN each MUST include `homepage`, `repository`, `author`, and `keywords` matching the core package format (with their own description-specific keywords)

### NP-02: Registry Configuration

A `.npmrc` file at the project root SHALL scope the `@aivoralabs` registry to the public npm registry.

#### Scenario: .npmrc at project root

- GIVEN the project root directory
- WHEN reading `.npmrc`
- THEN the file MUST contain `@aivoralabs:registry=https://registry.npmjs.org/`

### NP-03: Package Access

All packages SHALL have `"publishConfig": { "access": "public" }` to allow scoped package publishing (already present in all 4 packages).

#### Scenario: Public access configured

- GIVEN each package's `package.json`
- WHEN inspecting `publishConfig`
- THEN `access` MUST be `"public"`

### NP-04: Release CI Workflow

A GitHub Actions workflow at `.github/workflows/release.yml` SHALL publish all packages to npm when triggered.

#### Scenario: Trigger on version tag

- GIVEN a maintainer pushes a tag matching `v*` (e.g., `v0.1.0`)
- WHEN the release workflow triggers
- THEN the workflow MUST:
  - Check out the repository
  - Install dependencies with `pnpm install --frozen-lockfile`
  - Run tests (`pnpm test`)
  - Build all packages (`pnpm build`)
  - Publish packages to npm (`pnpm publish -r`)
- AND MUST authenticate using `NPM_TOKEN` from GitHub secrets

#### Scenario: Manual workflow dispatch

- GIVEN a maintainer manually triggers `workflow_dispatch`
- WHEN the workflow runs
- THEN it MUST follow the same build-and-publish pipeline as the tag trigger

#### Scenario: Authentication failure

- GIVEN the release workflow runs without `NPM_TOKEN`
- WHEN the publish step executes
- THEN the workflow MUST fail with a clear authentication error

### NP-05: Changeset Integration

The release workflow SHALL integrate with the existing `changeset` tooling defined in the root `package.json`.

#### Scenario: Version packages before publish

- GIVEN the release workflow
- WHEN it runs
- THEN it MUST produce a `.npmrc` with the `@aivoralabs` scope before `pnpm publish`
- AND the existing `changeset` versioning flow SHALL be respected
