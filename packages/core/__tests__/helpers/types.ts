import type { RedactConfig } from '@aivoralabs/agenttrail';
import type { JSONLFileWriter } from '@aivoralabs/agenttrail';

/**
 * Configuration options for creating an {@link AuditReceipt} auditor via
 * {@link TestHarness.createAuditor}.
 *
 * @example
 * ```typescript
 * const opts: AuditorOpts = {
 *   storage: true,
 *   complianceMode: 'strict',
 * };
 * const auditor = harness.createAuditor('agent-1', opts);
 * ```
 */
export interface AuditorOpts {
  /** When `true`, creates a {@link JSONLFileWriter} and attaches it to the auditor for persistence. */
  storage?: boolean;
  /** Optional PII redaction configuration passed to the {@link AuditReceipt} constructor. */
  redactConfig?: RedactConfig;
  /** Compliance mode: `'strict'` throws on storage failure; `'permissive'` logs and continues. */
  complianceMode?: 'strict' | 'permissive';
}

/**
 * Configuration for an {@link AgentSimulator} instance.
 * Defines the agent identity, storage backend, system prompt, and optional model override.
 *
 * @example
 * ```typescript
 * const config: AgentConfig = {
 *   agentId: 'legora-legal-ai',
 *   storage: new JSONLFileWriter('/tmp/logs'),
 *   systemPrompt: 'You are a legal AI assistant.',
 *   model: 'llama-3.3-70b-versatile',
 * };
 * const sim = new AgentSimulator(openaiClient, config);
 * ```
 */
export interface AgentConfig {
  /** Unique identifier for this agent. Used as `agentId` in the {@link AuditReceipt} constructor. */
  agentId: string;
  /** Persistent storage backend for audit receipts. */
  storage: JSONLFileWriter;
  /**
   * System prompt that defines the agent's behavior and persona.
   * When omitted, a generic assistant prompt is used.
   */
  systemPrompt?: string;
  /** Optional model override. Defaults to `'llama-3.3-70b-versatile'` when not set. */
  model?: string;
}

/**
 * A candidate record used in HR / hiring simulation scenarios.
 *
 * @example
 * ```typescript
 * const candidate: CandidateData = {
 *   name: 'Jane Doe',
 *   email: 'jane.doe@example.com',
 *   role: 'Senior Software Engineer',
 *   experience: '8 years building distributed systems',
 * };
 * ```
 */
export interface CandidateData {
  /** Full name of the candidate. */
  name: string;
  /** Email address — may contain PII that redaction rules should catch. */
  email: string;
  /** Job role or title the candidate is being evaluated for. */
  role: string;
  /** Professional experience summary. */
  experience: string;
}

/**
 * A financial investment scenario for compliance simulation.
 * Carries a scenario description, risk level, and investment amount.
 *
 * @example
 * ```typescript
 * const scenario: InvestmentScenario = {
 *   scenario: 'High-growth tech fund',
 *   riskLevel: 'high',
 *   amount: '$500,000',
 * };
 * ```
 */
export interface InvestmentScenario {
  /** Human-readable description of the investment scenario. */
  scenario: string;
  /** Risk classification: `'low'`, `'medium'`, or `'high'`. */
  riskLevel: 'low' | 'medium' | 'high';
  /** Investment amount as a formatted string (e.g. `'$50,000'`). */
  amount: string;
}
