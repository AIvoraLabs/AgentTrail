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
  tool_calls?: ToolCall[];
  policy_check?: PolicyCheck;
  human_verifier?: string;
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

export interface AuditReceiptConfig {
  agentId: string;
  version?: string;
  privateKey?: string;
  publicKey?: string;
}
