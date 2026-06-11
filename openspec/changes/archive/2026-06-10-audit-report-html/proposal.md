# Proposal: Audit Report HTML

## Intent

El CLI actual genera un `AuditReport` JSON técnico con `--output report.json`. Un auditor europeo no revisa JSON — necesita un **documento formal** listo para imprimir, firmar y archivar. Este cambio añade un reporte HTML autocontenido que se ve como un documento de una Big 4 (limpiamente formateado, verificable, reproducible).

## Scope

### In Scope
- Generar HTML autocontenido desde `verifyChains()` + `Receipt[]` cuando `--output report.html` se usa
- Detectar formato por extensión (`.html`) o nuevo flag `--format html`
- Report structure: Header, Executive Summary, Per-Agent, Receipt Detail, Footer
- Zero external dependencies (pure HTML + inline CSS)
- `@media print` ready, dark mode via `prefers-color-scheme`
- Collapsible receipts via `<details>/<summary>`
- CLI flag backward compat — no romper `--output report.json`

### Out of Scope
- Dashboard UI o servidor web (es un CLI que genera archivos)
- Base64 images o assets externos
- Paginación real (1000+ receipts colapsables, no paginados)
- Multi-idioma (inglés siempre, el EU AI Act usa inglés)
- Export PDF (el usuario imprime desde el navegador)

## Capabilities

### New Capabilities
- `audit-report-html`: Single-file HTML report generation from AuditReceipt verification data. Template engine via tagged template literals (zero-dep). All data inline.

### Modified Capabilities
- None

## Approach

Extender el bloque `if (output)` en `packages/cli/src/index.ts` con un nuevo branch `.html`. El HTML se construye con una función `renderHtmlReport(allResults, receipts, options)` que itera agentes → receipts y produce un string HTML completo con inline `<style>`. El contenido se escribe con `writeFileSync` (mismo que el JSON path). Template = tagged templates o funciones que concatenan strings — sin engine externo.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/cli/src/index.ts` | Modified | Add HTML branch in `--output` block, new `renderHtmlReport()` func |
| `packages/cli/__tests__/` | New | Test HTML generation output, print styles, dark mode |
| `openspec/specs/audit-report-html/` | New | Full spec for HTML report capability |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| HTML injection via receipt input/output | Low | Escapar `<>&"'` en todo texto dinámico |
| File size blowup with 1000 receipts | Low | `<details>` oculta detalles por defecto; target <50KB |
| Print layout breaks across browsers | Medium | Test en Chromium + Firefox print preview |

## Rollback Plan

Revert el diff en `packages/cli/src/index.ts`. El cambio es aditivo — no modifica rutas existentes, solo añade un branch. `--output report.json` no se toca.

## Dependencies

- `packages/core` types (`Receipt`, `AuditReport`, `VerificationResult`) — ya existen, no cambian

## Success Criteria

- [ ] `agenttrail verify receipts.json --output report.html` genera un `.html` válido
- [ ] El reporte se ve correcto al imprimir (landscape/portrait) en Chrome y Firefox
- [ ] 0 dependencias npm nuevas
- [ ] `<details>` funciona sin JavaScript (click nativo)
- [ ] El reporte incluye todos los campos del diseño especificado
