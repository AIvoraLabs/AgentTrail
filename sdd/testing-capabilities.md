# Testing Capabilities — AgentTrail

**Strict TDD Mode**: Enabled (default — test runner detected)
**Detected**: 2026-06-11
**Mode**: openspec (file-based SDD persistence)

## Test Runner

- Command: `pnpm test` (turbo orchestrated) / `vitest run` (per package)
- Framework: Vitest ^2.0.0

## Test Layers

| Layer       | Available | Tool                      |
| ----------- | --------- | ------------------------- |
| Unit        | ✅        | Vitest                    |
| Integration | ❌        | —                         |
| E2E         | ✅        | `e2e-test.sh` (Groq API) |

### Property-Based Testing

- Available: ✅
- Framework: @fast-check/vitest (in packages/core)
- Status: Active, used alongside unit tests

## Coverage

- Available: ✅
- Tool: @vitest/coverage-v8
- Command: `pnpm test:coverage` (turbo) / `vitest run --coverage` (per package)
- Threshold (config): 80%

## Quality Tools

| Tool         | Available | Command                            |
| ------------ | --------- | ---------------------------------- |
| Linter       | ✅        | `pnpm lint` (biome check .)        |
| Type checker | ✅        | `pnpm typecheck` (tsc --noEmit)    |
| Formatter    | ✅        | `pnpm format` (biome format --write)|

## Test Discovery

- Location: `__tests__/` directory alongside each module
- Pattern: `__tests__/**/*.test.ts`
- Per-package vitest config in packages/core/vitest.config.ts

## CI Pipeline

- GitHub Actions workflow (`.github/workflows/ci.yml`)
- Steps: Typecheck → Build → Test → Coverage → Lint
- Runs on push/PR to main
