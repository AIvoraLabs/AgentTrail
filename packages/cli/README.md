# @aivoralabs/agenttrail-cli

[![npm version](https://img.shields.io/npm/v/@aivoralabs/agenttrail-cli?color=CB3837&logo=npm)](https://www.npmjs.com/package/@aivoralabs/agenttrail-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![EU AI Act](https://img.shields.io/badge/EU_AI_Act-Art._12-003399)](https://artificialintelligenceact.eu/article/12/)

**Standalone CLI auditor tool for AgentTrail. 0 dependencies. 100% offline.**

Verify chain integrity, check Ed25519 signatures, and generate HTML/JSON audit reports — no server required.

Part of the [AgentTrail monorepo](https://github.com/AIvoraLabs/agenttrail).

---

## Installation

```bash
# Global install (recommended for auditors)
npm install -g @aivoralabs/agenttrail-cli

# Or run without installing
npx @aivoralabs/agenttrail-cli verify audit-log.jsonl

# When installed globally
audit-receipt verify audit-log.jsonl
```

---

## Commands

### `audit-receipt verify <file>`

Verifies the hash chain integrity of a JSONL audit log.

| Flag | Description | Default |
|------|-------------|---------|
| `--verify-signatures` | Verify Ed25519 signatures (requires `--public-key`) | `false` |
| `--public-key <key>` | Base64-encoded Ed25519 public key | — |
| `--output <file>` | Output file — `.html` or `.json` | stdout |
| `--entity-name <name>` | Organization name for HTML report header | — |

---

## Usage Examples

### Basic chain integrity check

```bash
audit-receipt verify audit-log.jsonl
```

Output:
```
Receipts loaded: 150
Agents detected: 1

  legal-ai:                150 receipts → ✅ Chain INTACT

  ╔═══════════════════════════════════╗
  ║  ✓ VERDICT: CHAIN INTACT         ║
  ║  Hash Chain:  PASS (150/150)     ║
  ║  Signatures:  PASS (not verified)║
  ╚═══════════════════════════════════╝
```

### Chain integrity + signature verification

```bash
audit-receipt verify audit-log.jsonl \
  --verify-signatures \
  --public-key mcowBQYDK2VwAyE...
```

### Generate HTML audit report for a compliance auditor

```bash
audit-receipt verify audit-log.jsonl \
  --output report.html \
  --entity-name "Acme Corp"
```

Opens `report.html` — self-contained, dark mode, print-ready. Includes:
- ✅ Verdict badge (green = chain intact, red = broken)
- Agent summary with receipt counts
- Interaction table
- Collapsible technical details (receipt IDs, SHA-256 hashes, Ed25519 signatures)
- Reproducible CLI command for independent verification
- Auditor signature field

### Generate JSON report for programmatic use

```bash
audit-receipt verify audit-log.jsonl --output report.json
```

---

## Auditor Workflow

1. **Receive** the JSONL audit log from the development team
2. **Verify** chain integrity with `audit-receipt verify`
3. **Signatures check** with `--verify-signatures --public-key <key>`
4. **Generate** HTML report with `--output report.html --entity-name "Your Company"`
5. **Review** the report in browser — green badge = compliant
6. **Reproduce** — the report footer includes the exact command used. Any auditor can independently verify.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Chain intact — all receipts valid |
| `1` | Chain broken — tampered receipt detected |
| `2` | File not found or invalid format |

---

## Security

- **100% offline** — no data leaves your machine
- **0 dependencies** — standalone binary
- **Independent verification** — any auditor can reproduce results with the same JSONL file
- **Tamper-proof** — SHA-256 hash chain + Ed25519 signatures

---

## Links

- 🌐 [agenttrail.aivoralabs.org](https://agenttrail.aivoralabs.org)
- 🐙 [GitHub: AiVoraLabs/agenttrail](https://github.com/AIvoraLabs/agenttrail)
- 📄 [EU AI Act Article 12](https://artificialintelligenceact.eu/article/12/)

**License:** MIT
