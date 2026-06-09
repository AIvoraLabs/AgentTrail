import { v7 as uuidv7 } from 'uuid';
import { canonicalJSON, chainHash, createGenesisHash, verifyChain } from './hash-chain';
import { generateKeyPair, sign } from './signer';
import type {
  AuditReceiptConfig,
  Interaction,
  Receipt,
  ReceiptPayload,
  SerializedPolicyCheck,
  SerializedToolCall,
} from './types';

// Re-export types and verifyChain
export type {
  Receipt,
  Interaction,
  AuditReceiptConfig,
  ReceiptPayload,
  SerializedToolCall,
  SerializedPolicyCheck,
};
export { verifyChain };

export class AuditReceipt {
  private agentId: string;
  private version: string;
  private receipts: Receipt[] = [];
  private lastHash: string | null = null;
  private publicKey: string;
  private privateKey: string;
  private keyPairGenerated = false;

  constructor(config: AuditReceiptConfig) {
    this.agentId = config.agentId;
    this.version = config.version ?? '1.0';
    this.publicKey = config.publicKey ?? '';
    this.privateKey = config.privateKey ?? '';
    if (config.publicKey && config.privateKey) {
      this.keyPairGenerated = true;
    }
  }

  private async ensureKeyPair(): Promise<void> {
    if (!this.keyPairGenerated) {
      const kp = await generateKeyPair();
      this.publicKey = kp.publicKey;
      this.privateKey = kp.privateKey;
      this.keyPairGenerated = true;
    }
  }

  /**
   * Record a single interaction and return the generated receipt.
   */
  async record(interaction: Interaction): Promise<Receipt> {
    await this.ensureKeyPair();

    const timestampStart = new Date().toISOString();
    const timestampEnd = new Date().toISOString();

    // Map camelCase Interaction -> snake_case ReceiptPayload
    const toolCalls: SerializedToolCall[] | undefined = interaction.toolCalls?.map((tc) => ({
      tool_name: tc.toolName,
      tool_input: tc.toolInput,
      tool_output: tc.toolOutput,
      tool_execution_ms: tc.toolExecutionMs,
      tool_status: tc.toolStatus as 'success' | 'error',
    }));

    const policyCheck: SerializedPolicyCheck | undefined = interaction.policyCheck
      ? {
          policy_name: interaction.policyCheck.policyName,
          status: interaction.policyCheck.status as 'pass' | 'fail' | 'review',
          details: interaction.policyCheck.details,
        }
      : undefined;

    const payload: ReceiptPayload = {
      timestamp_start: timestampStart,
      timestamp_end: timestampEnd,
      input: interaction.input,
      output: interaction.output,
      model: interaction.model,
      provider: interaction.provider,
    };

    if (interaction.tokensPrompt !== undefined) {
      payload.tokens_prompt = interaction.tokensPrompt;
    }
    if (interaction.tokensCompletion !== undefined) {
      payload.tokens_completion = interaction.tokensCompletion;
    }
    if (interaction.tokensPrompt !== undefined || interaction.tokensCompletion !== undefined) {
      payload.tokens_total = (interaction.tokensPrompt ?? 0) + (interaction.tokensCompletion ?? 0);
    }
    if (toolCalls && toolCalls.length > 0) {
      payload.tool_calls = toolCalls;
    }
    if (policyCheck) {
      payload.policy_check = policyCheck;
    }
    if (interaction.humanVerifier) {
      payload.human_verifier = interaction.humanVerifier;
    }

    // Compute hash chain
    const canonicalPayload = canonicalJSON(payload as unknown as Record<string, unknown>);

    let hash: string;
    let prevHash: string | null;

    if (this.lastHash === null) {
      // Genesis receipt
      const genesisHash = await createGenesisHash(timestampStart);
      hash = await chainHash(genesisHash, canonicalPayload);
      prevHash = null;
    } else {
      hash = await chainHash(this.lastHash, canonicalPayload);
      prevHash = this.lastHash;
    }

    // Sign the hash
    const signature = await sign(hash, this.privateKey);

    const receipt: Receipt = {
      receipt_id: uuidv7(),
      agent_id: this.agentId,
      version: this.version,
      prev_hash: prevHash,
      hash,
      signature,
      payload,
      metadata: interaction.metadata,
    };

    this.receipts.push(receipt);
    this.lastHash = hash;

    return receipt;
  }

  /**
   * Verify the integrity of a chain of receipts.
   */
  static async verifyChain(receipts: Receipt[]): Promise<boolean> {
    return verifyChain(receipts);
  }

  /**
   * Export all receipts as an array, optionally filtered by date range.
   */
  async exportJSON(range?: {
    start?: Date;
    end?: Date;
  }): Promise<Receipt[]> {
    let filtered = this.receipts;

    if (range?.start) {
      const startMs = range.start.getTime();
      filtered = filtered.filter((r) => new Date(r.payload.timestamp_start).getTime() >= startMs);
    }

    if (range?.end) {
      const endMs = range.end.getTime();
      filtered = filtered.filter((r) => new Date(r.payload.timestamp_end).getTime() <= endMs);
    }

    return filtered;
  }
}
