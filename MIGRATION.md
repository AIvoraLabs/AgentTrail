# AgentTrail Migration Guide

## v0.1.x → v0.2.0

### Breaking Changes

#### verifyChain return type
- **Before**: `verifyChain(receipts): Promise<boolean>`
- **After**: `verifyChain(receipts, options?): Promise<VerificationResult>`
- **Migration**: Replace `const valid = await verifyChain(receipts)` with `const result = await verifyChain(receipts); if (!result.valid) { ... }`

#### exportJSON is synchronous
- **Before**: `await auditor.exportJSON()`
- **After**: `auditor.exportJSON()` (no await)
- **Migration**: Remove `await` from exportJSON calls

#### computeKeyId format
- **Before**: First 8 chars of base64 public key
- **After**: First 12 chars of SHA-256 hash (hex)
- **Migration**: Update any code parsing key_id from receipts

#### ToolCall new fields (optional)
New optional fields: `sequence`, `timestampStart`, `timestampEnd`, `parentSequence`. Existing tool calls without these fields still work.

### New Features
- Compliance modes: strict (default, fail-closed), permissive (degraded receipt)
- AuditReceiptRegistry for multi-agent Vercel AI deployments
- verifyChain signature verification via options parameter
- CLI: `--verify-signatures`, `--output report.json`
- Multi-agent chain isolation in CLI
