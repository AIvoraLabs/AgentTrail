# Metadata Validation Specification

**Domain**: `metadata-validation` · **Status**: New · **EU AI Act**: Art. 12 §1 (data integrity)

## Purpose

Runtime metadata safety validation using Zod. Protects the audit trail from injection attacks, structural abuse, and excessively large or deep metadata payloads.

## Requirements

### Requirement: Metadata Validation

Zod-based `validateMetadata(metadata: unknown): asserts metadata is Record<string, MetadataValue>` MUST run in `record()` BEFORE building receipt payload. Schema: max 50 top-level keys, nesting depth ≤4, no `__proto__`/`constructor`/`prototype` keys, no functions/symbols/bigints/undefined, strings ≤1000 chars, arrays ≤100 items. Empty/undefined metadata passes through. Violations throw `TypeError` with descriptive message. (Art. 12 §1 — data integrity)

| # | Scenario | Expect |
|---|----------|--------|
| 1 | `__proto__` injection attempt | `TypeError`, receipt NOT created |
| 2 | 60 top-level keys | `TypeError` |
| 3 | Nesting depth 5 | `TypeError` |
| 4 | Function value in metadata | `TypeError` |
| 5 | Valid metadata under all constraints | Passes, receipt created |
| 6 | Metadata undefined or `{}` | Passes through unmodified |
| 7 | String value >1000 chars | `TypeError` |
| 8 | Array with 150 items | `TypeError` |
