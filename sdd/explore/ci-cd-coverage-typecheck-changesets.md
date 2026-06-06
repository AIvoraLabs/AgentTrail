## Exploration: CI/CD Pipeline — Coverage, Typecheck, Changesets

### Current State

**CI Workflow** (`.github/workflows/ci.yml`): Single `quality` job, 40 lines. Four sequential steps: install → build → test → lint. No coverage, no typecheck, no publishing/release workflow. Clean but minimal.

**Test/Coverage**: Zero-config Vitest (no `vitest.config.ts` anywhere). No `@vitest/coverage-v8` installed. Each package runs `vitest run` via its own script. 46 tests passing, all in `__tests__/`.

**TypeScript Config**: Root `tsconfig.json` with `moduleResolution: "bundler"`, `strict: true`, IDE path aliases (`@aivoralabs/agenttrail` → `./packages/core/src`). All packages extend it. `**/__tests__/**` excluded from root, AND each package independently excludes `__tests__` in its own tsconfig. No `tsc --noEmit` script anywhere.

**Package Publishing**: ALL four packages already have `"publishConfig": { "access": "public" }`. Root is `"private": true`. ✅ **No changes needed.**

**Changesets**: NOT installed. Root `package.json` has scripts (`changeset`, `version-packages`, `release`) referencing `changeset` CLI, but `@changesets/cli` is absent from both `devDependencies` and `pnpm-lock.yaml`. No `.changeset/` directory. Running `pnpm changeset` would fail with "command not found".

**Turbo Pipeline** (`turbo.json`): Has entries for `build`, `test`, `dev`, `clean`, `lint`. Missing: `typecheck`, `coverage`. `test` depends on `build`. `lint` has no dependency (runs at root via Biome).

---

### Affected Areas

| File | Why |
|------|-----|
| `.github/workflows/ci.yml` | Add coverage and typecheck steps |
| `turbo.json` | Add `typecheck` and `coverage` pipeline entries |
| `tsconfig.json` (root) | Either remove `__tests__` from exclude OR create `tsconfig.typecheck.json` |
| `packages/*/tsconfig.json` (4 files) | Remove `__tests__` from package-level `exclude` if per-package approach |
| `packages/*/package.json` (4 files) | Add `typecheck` and `test:coverage` scripts |
| `package.json` (root) | Add root-level `typecheck` and `coverage` scripts; add `@changesets/cli` and `@vitest/coverage-v8` to devDeps |
| `.changeset/config.json` | NEW — must be created via `pnpm changeset init` |

---

### Approaches

#### 1. Coverage — `@vitest/coverage-v8`

Install `@vitest/coverage-v8` at root level (shared), configure per-package vitest to use it.

**What changes**:
- Root `package.json` devDeps: add `"@vitest/coverage-v8": "^2.0.0"`
- Each package `package.json` scripts: add `"test:coverage": "vitest run --coverage"`
- Root `package.json` scripts: add `"coverage": "turbo run test:coverage"`
- `turbo.json`: add `"test:coverage": { "dependsOn": ["build"], "outputs": ["coverage/**"] }`
- CI step: `- name: Coverage → run: pnpm coverage`

**Pros**: Standard vitest coverage, works with zero-config, generates lcov/html for CI artifacts
**Cons**: Need to decide coverage thresholds later; adds ~10s to CI
**Effort**: Low — ~6 file edits, no new files

#### 2. Typecheck — `tsc --noEmit`

Two sub-approaches:

**Approach 2a — Root-level typecheck tsconfig** (recommended)
- Create `tsconfig.typecheck.json` at root that extends root tsconfig, overrides `include` to cover all `src/**` and `__tests__/**` across all packages, removes test exclusion.
- Root `package.json` scripts: add `"typecheck": "tsc --noEmit -p tsconfig.typecheck.json"`
- CI step: `- name: Typecheck → run: pnpm typecheck`
- No changes to per-package tsconfigs or scripts.
- **Pros**: Single file, no per-package changes, CI-friendly, typechecks tests too
- **Cons**: Path alias `@aivoralabs/agenttrail` in root tsconfig resolves to source directly (bypasses dist/), which means typecheck doesn't catch dist-vs-source mismatches — but for `--noEmit` this is fine

**Approach 2b — Per-package typecheck**
- Each package gets `"typecheck": "tsc --noEmit"` script
- Remove `__tests__` from each package's `tsconfig.json` `exclude`
- Root `package.json` scripts: add `"typecheck": "turbo run typecheck"`
- `turbo.json`: add `"typecheck": { "dependsOn": ["^build"], "outputs": [] }`
- **Pros**: Checks against built output (correct resolution), each package is independent
- **Cons**: 4 package tsconfigs to edit, 4 scripts to add, depends on `^build` (slower in CI), turborepo cache overhead. Also this resolves through pnpm symlinks to `dist/` — so it checks the actual compiled output, not source.

**Recommendation**: **Approach 2a** for simplicity. The root-level typecheck catches type errors across the entire monorepo in one command, includes test files, and doesn't require build first. The path aliases in root tsconfig are already IDE-configured and work correctly for cross-package source resolution.

#### 3. Changesets

**What changes**:
- Root `package.json` devDeps: add `"@changesets/cli": "^2.27.0"`
- Run `pnpm changeset init` to create `.changeset/config.json`
- Verify `.changeset/config.json` has correct settings (access: public, commit: false, baseBranch: main)
- `turbo.json`: no new entry needed (changeset is a root-only command, not turbo-driven)
- CI: **No CI step for now** — changeset commands are run locally by maintainers. Releasing via CI would be a separate future enhancement (publish workflow with GitHub Actions + NPM token).

**Pros**: Standard tooling, supports `pnpm changeset` for local versioning, enables future automated releases
**Cons**: None — it's idle until someone creates a changeset
**Effort**: Low — install + init, 2 files changed

---

### Recommendation

**Order**: coverage → typecheck → changesets (as specified)

**Phase 1 — Coverage** (estimated: 2 commits)
1. Install `@vitest/coverage-v8` in root devDeps
2. Add `test:coverage` script to each of 4 packages
3. Add `coverage` root script and `test:coverage` to `turbo.json`
4. Add coverage step to CI (after test, before lint)

**Phase 2 — Typecheck** (estimated: 1 commit)
1. Create `tsconfig.typecheck.json` at root
2. Add `typecheck` root script
3. Add typecheck step to CI (before build or parallel with build)

**Phase 3 — Changesets** (estimated: 1 commit)
1. Install `@changesets/cli` in root devDeps
2. Run `pnpm changeset init`
3. No CI changes needed

---

### Risks

- **Path alias resolution**: If path aliases in root tsconfig misbehave during `tsc --noEmit`, the typecheck could produce false positives. Mitigation: aliases are already IDE-tested. The `@aivoralabs/agenttrail` alias resolves `./packages/core/src` → finds `index.ts` via TypeScript's module resolution. The wildcard `@aivoralabs/agenttrail-*` pattern matches all scoped sub-packages. If this fails, fall back to per-package approach (2b).
- **CI time**: Adding 2 steps (coverage + typecheck) will increase CI time. Coverage adds ~10s (instrument + run), typecheck adds ~3-5s. Total CI time goes from ~40s to ~55s — acceptable.
- **`__tests__` exclusion in tsconfig.typecheck.json**: Must ensure the new typecheck tsconfig does NOT exclude test directories, otherwise test files won't be typechecked. Explicitly set `"exclude": ["node_modules", "dist"]` only.
- **npm publish readiness**: `publishConfig.access: "public"` is already on all 4 packages. But the CLI package has `"private"` NOT set — this is correct (it should be publishable). Root is `"private": true` — also correct. No risk here.

---

### Ready for Proposal
**Yes** — all three phases are well-understood, no unknowns remain. Ready to proceed to `sdd-propose` with the exploration anchored as context.
