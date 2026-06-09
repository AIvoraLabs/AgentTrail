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

export interface AuditReceiptConfig {
  agentId: string;
  version?: string;
  privateKey?: string;
  publicKey?: string;
  complianceConfig?: ComplianceConfig;
  redactConfig?: RedactConfig;
  driftThresholdMs?: number;
  maxKeys?: number;
}
