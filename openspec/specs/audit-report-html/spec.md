# audit-report-html Specification

## Purpose

Generate a self-contained, print-ready HTML audit report for EU AI Act Article 12. Designed for auditors (not engineers) — every field includes a plain-language explanation of WHAT it is and WHY it matters. Zero external deps, zero JavaScript.

## Requirements

### Requirement: CLI Integration

CLI MUST detect HTML output by `.html` extension OR `--format html` flag. MUST NOT alter existing `--output report.json`.

| # | Scenario | Expect |
|---|----------|--------|
| 1 | `--output report.html` | Generates valid `.html`, exits 0 |
| 2 | `--output report.json` | Existing JSON preserved unchanged |
| 3 | `--format html` no output path | Prints HTML to stdout |
| 4 | No output specified | Prints verdict box to stdout (existing) |
| 5 | Empty receipts array | "No receipts found", exit code 1 |

### Requirement: Report Header

MUST display: AgentTrail title, "Audit Report" subtitle, date (e.g. "10 June 2026"), entity name from `--entity-name` or humanized agent_id, and audit period from first/last timestamps.

| # | Scenario | Expect |
|---|----------|--------|
| 6 | Receipts from June 2026 | Period: "01 June 2026 → 10 June 2026" |
| 7 | `--entity-name "Legora AB"` | Header shows "Legora AB" |
| 8 | No `--entity-name` | "Legora Legal Ai" → "Legora Legal AI" |

### Requirement: Executive Summary

MUST show: verdict badge (green ✓ ÍNTEGRO / red ✗ ALTERADO), agent count, receipt count, date range, signature status, and a plain-language cryptographic integrity paragraph.

| # | Scenario | Expect |
|---|----------|--------|
| 9 | All chains valid | Green badge "ÍNTEGRO" |
| 10 | Chain broken | Red badge "ALTERADO", broken agent highlighted |
| 11 | Signatures verified | "150 de 150 firmas válidas" |
| 12 | Signatures not verified | "Verificación de firmas no solicitada" |
| 13 | 1 agent, 5 receipts | "1 agente • 5 interacciones" |

### Requirement: Per-Agent Section

Each agent MUST show: plain-language name, interaction count, period, status (ÍNTEGRO/ALTERADO) in color, notable events. Below: chronological interactions with timestamp, truncated I/O, duration, model, tools. Technical fields (hash, prev_hash, signature, key_id) inside `<details>/<summary>` only.

| # | Scenario | Expect |
|---|----------|--------|
| 14 | 1 agent, 5 receipts | 5 interactions in chronological order |
| 15 | Agent chain broken | ALTERADO badge, broken interaction highlighted |
| 16 | Receipt has tool calls | "Herramienta: legal_research (1.2s)" |
| 17 | Receipt has policy check | "Verificación regulatoria: EU-AI-ACT-HIGH-RISK → Pass" |
| 18 | Receipt has human verifier | "Supervisión humana: auditor@company.com" |
| 19 | Text >200 chars | Truncated with "...", full text in `<details>` |

### Requirement: Report Footer

MUST include: exact CLI command for reproducibility, verification disclaimer, and auditor signature space.

| # | Scenario | Expect |
|---|----------|--------|
| 20 | Standard report | Footer has full CLI command |
| 21 | Print preview | "Firma del auditor:" line visible |

### Requirement: Visual & Print Design

Self-contained (inline `<style>` only), `@media print` with page breaks between agents, `prefers-color-scheme: dark`, `<details>/<summary>` collapsible sections (zero JS), <50KB for 1000 receipts. All dynamic text HTML-escaped. Zero `<script>` tags.

| # | Scenario | Expect |
|---|----------|--------|
| 22 | Print preview | Page break before each agent |
| 23 | Dark mode enabled | Dark bg, light text |
| 24 | 1000 receipts | File < 50KB |
| 25 | `</script>` in input | Escaped, rendered as text |
| 26 | Input `<script>alert(1)</script>` | Rendered as text, not executed |
| 27 | Output contains HTML tags | Escaped, shown as plain text |
