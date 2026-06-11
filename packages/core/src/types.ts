// --- Developer-facing types (camelCase) ---

export interface ToolCall {
  toolName: string;
  toolInput: string;
  toolOutput: string;
  toolExecutionMs: number;
  toolStatus: 'success' | 'error';
}

export interface PolicyCheck {
  policyName: string;
  status: 'pass' | 'fail' | 'review';
  details?: string;
}

export interface Interaction {
  input: string;
  output: string;
  model: string;
  provider: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
  toolCalls?: ToolCall[];
  policyCheck?: PolicyCheck;
  humanVerifier?: string;
  /**
   * Optional key-value metadata attached to the receipt.
   *
   * Constraints:
   * - Max 50 top-level keys
   * - Nesting depth ≤ 4 (metadata object itself is depth 1)
   * - Values must be JSON-safe: strings, numbers, booleans, null, arrays, plain objects
   * - Strings ≤ 1000 chars, arrays ≤ 100 items
   *
   * **Important**: Do NOT nest provider-specific objects directly (e.g., OpenAI tool_calls).
   * Serialize them as JSON strings first to stay within depth limits.
   * The SDK auto-serializes `tool_calls` arrays as a safety measure.
   */
  metadata?: Record<string, unknown>;
}

// --- Serialized types (snake_case, used in JSON payload) ---

export interface SerializedToolCall {
  tool_name: string;
  tool_input: string;
  tool_output: string;
  tool_execution_ms: number;
  tool_status: 'success' | 'error';
}

export interface SerializedPolicyCheck {
  policy_name: string;
  status: 'pass' | 'fail' | 'review';
  details?: string;
}

export interface ReceiptPayload {
  timestamp_start: string;
  timestamp_end: string;
  input: string;
  output: string;
  input_hash?: string;
  model: string;
  provider: string;
  tokens_prompt?: number;
  tokens_completion?: number;
  tokens_total?: number;
  tool_calls?: SerializedToolCall[];
  policy_check?: SerializedPolicyCheck;
  human_verifier?: string;
  monotonic_ns?: string;
  clock_drift_detected?: boolean;
  key_id?: string;
}

export interface Receipt {
  receipt_id: string;
  agent_id: string;
  version: string;
  prev_hash: string | null;
  hash: string;
  signature: string;
  payload: ReceiptPayload;
  metadata?: Record<string, unknown>;
}

export type ComplianceMode = 'strict' | 'permissive';

export interface ComplianceConfig {
  mode?: ComplianceMode;
  onComplianceError?: (error: Error) => void;
}

export interface KeyEntry {
  publicKey: string;
  activatedAt: string;
  keyId: string;
}

export interface RedactRule {
  pattern: RegExp;
  replacement?: string;
}

export interface RedactConfig {
  rules?: RedactRule[];
  hashInput?: boolean;
}

export interface TimestampResult {
  iso: string;
  monotonic_ns: string;
  drift_detected: boolean;
}

export interface VerificationResult {
  valid: boolean;
  hashChainIntact: boolean;
  signaturesValid: boolean;
  verifiedSignatures: number;
  signatureErrors: { receiptId: string; error: string }[];
  brokenAtIndex?: number;
}

export interface AuditReport {
  report_version: string;
  generated_at: string;
  tool: string;
  source_file: string;
  summary: {
    verdict: 'intact' | 'broken';
    total_receipts: number;
    hash_chain_intact: boolean;
    signatures_valid: boolean;
    verified_signatures: number;
  };
  agents: {
    agent_id: string;
    receipts_count: number;
    verdict: 'intact' | 'broken';
    broken_at_index?: number;
    broken_receipt_id?: string;
  }[];
  per_receipt: {
    index: number;
    receipt_id: string;
    hash_valid: boolean;
    signature_valid: boolean;
    agent_id: string;
    timestamp_start: string;
  }[];
}

export interface AuditReceiptConfig {
  agentId: string;
  version?: string;
  privateKey?: string;
  publicKey?: string;
  complianceConfig?: ComplianceConfig;
  redactConfig?: RedactConfig;
  driftThresholdMs?: number;
  maxKeys?: number;
  /** Optional persistent storage backend. When provided, receipts are persisted to storage. */
  storage?: import('./storage').StorageBackend;
}
