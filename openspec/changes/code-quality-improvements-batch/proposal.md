# Proposal: Code Quality & Security Batch

## Intent

Fix 2 confirmed bugs, add 4 security features, establish 4 coding conventions. Hardens AgentTrail for pre-1.0 compliance readiness in one batch.

## Scope

**In (10 items):** BF-1 Recursive canonicalJSON (nested keys). BF-2 Safe bytesToBase64 (no spread overflow). ADR-001 ComplianceMode (strict default + callback). TS-001 SecureClock (monotonic + drift, schema v1.1). SEC-001 Key rotation (rotateKey, key_id, multi-key verify). SEC-002 PII redaction (redactPII, input_hash, fail-closed). PQ-1 Custom errors (ComplianceError, SignatureError, ChainError, ClockError). PQ-2 Remove any types. PQ-3 Input validation guards. PQ-4 Regression tests per fix.

**Out:** Roughtime, cloud/SaaS, dashboards, Merkle trees, RFC 3161 TSA.

## Approach

BF-1: Recursive sort on unknown. BF-2: Array.from(bytes, b=>...).join(''). ADR-001: ComplianceMode enum, strict=throw on fail, permissive=catch. TS-001: New timestamp.ts — SecureClock class, hrtime snapshot, drift compute, additive schema fields. SEC-001: keys[] in config, rotateKey pushes new pair, sign latest/verify all, SHA-256 pubkey fingerprint as key_id. SEC-002: redactPII hashes strings by default, accepts regex patterns. PQ-1-3: New errors.ts, audit wrappers for any, guard functions. PQ-4: One test per fix above.

## Risks

BF-1 breaks existing receipt verify (Low — semver minor, CHANGELOG). Schema v1.1 breaks parsers (Low — additive fields). Strict mode breaks integrations (Med — configurable to permissive).

## Rollback

git revert batch. Pin to prior @agenttrail/core. Set complianceMode: permissive.

## Dependencies

None — zero new external deps.
