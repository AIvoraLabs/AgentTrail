import { v7 as uuidv7 } from 'uuid';
import {
  canonicalJSON,
  chainHash,
  computeHash,
  createGenesisHash,
  verifyChain,
} from './hash-chain';
import { redactPII } from './redact';
import { computeKeyId, generateKeyPair, sign } from './signer';
import { SecureClock } from './timestamp';
import type {
  AuditReceiptConfig,
  ComplianceConfig,
  Interaction,
  Receipt,
  ReceiptPayload,
  RedactConfig,
  SerializedPolicyCheck,
  SerializedToolCall,
} from './types';
import { validateInteraction, validateKeyMaterial } from './validate';

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
  private secureClock: SecureClock;
  private redactConfig?: RedactConfig;
  private complianceConfig?: ComplianceConfig;

  constructor(config: AuditReceiptConfig) {
    this.agentId = config.agentId;
    this.version = config.version ?? '1.0';
    this.publicKey = config.publicKey ?? '';
    this.privateKey = config.privateKey ?? '';
    if (config.publicKey && config.privateKey) {
      validateKeyMaterial({ publicKey: config.publicKey, privateKey: config.privateKey });
      this.keyPairGenerated = true;
    }
    this.secureClock = new SecureClock(config.driftThresholdMs);
    this.redactConfig = config.redactConfig;
    this.complianceConfig = config.complianceConfig;
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
    validateInteraction(interaction);

    try {
      await this.ensureKeyPair();

      // Use SecureClock for monotonic timestamps with drift detection
      const tsStart = this.secureClock.now();

      // Apply PII redaction if configured
      let finalInput = interaction.input;
      let inputHash: string | undefined;

      if (this.redactConfig) {
        const redacted = redactPII(interaction.input, this.redactConfig);
        finalInput = redacted;
        inputHash = await computeHash(redacted);
      }

      const tsEnd = this.secureClock.now();

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
        timestamp_start: tsStart.iso,
        timestamp_end: tsEnd.iso,
        input: finalInput,
        input_hash: inputHash,
        output: interaction.output,
        model: interaction.model,
        provider: interaction.provider,
        monotonic_ns: tsStart.monotonic_ns,
        clock_drift_detected: tsStart.drift_detected || tsEnd.drift_detected,
        key_id: computeKeyId(this.publicKey),
      };

      if (interaction.tokensPrompt !== undefined) {
        payload.tokens_prompt = interaction.tokensPrompt;
      }
      if (interaction.tokensCompletion !== undefined) {
        payload.tokens_completion = interaction.tokensCompletion;
      }
      if (interaction.tokensPrompt !== undefined || interaction.tokensCompletion !== undefined) {
        payload.tokens_total =
          (interaction.tokensPrompt ?? 0) + (interaction.tokensCompletion ?? 0);
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
        const genesisHash = await createGenesisHash(tsStart.iso);
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
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (this.complianceConfig?.mode === 'permissive') {
        if (this.complianceConfig.onComplianceError) {
          this.complianceConfig.onComplianceError(error);
        }
        console.warn(`[AgentTrail] Compliance warning: ${error.message}`);
      }
      throw error;
    }
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
