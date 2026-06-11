import { wrapOpenAI } from '@aivoralabs/agenttrail-openai';
import type OpenAI from 'openai';
import type { AgentConfig, CandidateData, InvestmentScenario } from './types';

/** Default model used when {@link AgentConfig.model} is not provided. */
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

/** System prompt for the Legora legal AI scenario. */
const LEGAL_SYSTEM_PROMPT = `You are Legora, an AI legal assistant specialized in contract review and regulatory compliance. 
Analyze the following legal question thoroughly, citing relevant regulations where applicable. 
Focus on EU AI Act compliance, data protection (GDPR), and contractual obligations.`;

/** System prompt for the Bizneo HR AI scenario. */
const HR_SYSTEM_PROMPT = `You are Bizneo, an AI HR assistant specialized in candidate evaluation. 
Review the candidate's profile and provide a detailed assessment of their suitability. 
Consider their experience, skills, and cultural fit. Be objective and constructive.`;

/** System prompt for the Velliv financial AI scenario. */
const FINANCIAL_SYSTEM_PROMPT = `You are Velliv, an AI financial advisor specialized in investment compliance. 
Evaluate the investment scenario for regulatory compliance and risk assessment. 
Consider MiFID II suitability requirements, risk tolerance, and diversification principles.`;

/**
 * Simulates a real-world AI agent using a real LLM provider via the OpenAI-compatible API.
 *
 * Wraps the client with `wrapOpenAI` so every interaction automatically generates
 * audit receipts through the AgentTrail SDK. Requires a valid API key configured
 * on the OpenAI client; methods throw a descriptive error if one is missing.
 *
 * @example
 * ```typescript
 * import OpenAI from 'openai';
 * import { AgentSimulator } from './helpers/agent-simulator';
 *
 * const client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
 * const sim = new AgentSimulator(client, {
 *   agentId: 'legora-legal-ai',
 *   storage: new JSONLFileWriter('/tmp/logs'),
 *   systemPrompt: 'You are a legal AI.',
 * });
 *
 * const response = await sim.legalConsultation('What are the requirements of EU AI Act Article 12?');
 * ```
 */
export class AgentSimulator {
  private wrappedClient: ReturnType<typeof wrapOpenAI>;
  private config: AgentConfig;
  private rawClient: OpenAI;

  /**
   * Create a new agent simulator.
   *
   * Wraps the provided OpenAI client with {@link wrapOpenAI} so all
   * completions generate audit receipts automatically. The constructor
   * itself does NOT throw on missing API key — API calls will fail
   * with a descriptive error.
   *
   * @param client - An OpenAI-compatible client instance (e.g. Groq SDK with `baseURL: 'https://api.groq.com/openai/v1'`).
   * @param config - Agent configuration including agent ID, storage backend, and system prompt.
   *
   * @example
   * ```typescript
   * const sim = new AgentSimulator(groq, { agentId: 'my-agent', storage, systemPrompt: 'You are...' });
   * ```
   */
  constructor(client: OpenAI, config: AgentConfig) {
    this.rawClient = client;
    this.config = config;
    this.wrappedClient = wrapOpenAI(client, {
      agentId: config.agentId,
      storage: config.storage,
      complianceMode: 'strict',
    });
  }

  /**
   * Check whether the underlying OpenAI client has an API key configured.
   */
  private hasApiKey(): boolean {
    return !!(this.rawClient.apiKey && this.rawClient.apiKey.length > 0);
  }

  /**
   * Throw a descriptive error if no API key is configured.
   */
  private requireApiKey(): void {
    if (!this.hasApiKey()) {
      throw new Error(
        `[AgentSimulator:${this.config.agentId}] No API key configured. Set GROQ_API_KEY (or another provider key) in your .env file to run real-LLM tests.`,
      );
    }
  }

  /**
   * Simulate a legal consultation using the Legora legal AI persona.
   *
   * Uses a legal system prompt focused on EU AI Act compliance,
   * contract review, and regulatory analysis.
   *
   * @param topic - Legal topic or question to analyze (e.g. `'EU AI Act Article 12 requirements'`).
   * @returns The LLM's response text.
   * @throws {Error} If no API key is configured or the API call fails.
   *
   * @example
   * ```typescript
   * const response = await sim.legalConsultation('What is required for audit trail compliance?');
   * expect(response).toBeTruthy();
   * ```
   */
  async legalConsultation(topic: string): Promise<string> {
    this.requireApiKey();
    const completion = await this.wrappedClient.chat.completions.create({
      model: this.config.model ?? DEFAULT_MODEL,
      messages: [
        { role: 'system', content: this.config.systemPrompt ?? LEGAL_SYSTEM_PROMPT },
        { role: 'user', content: topic },
      ],
    });
    return completion.choices[0]?.message?.content ?? '';
  }

  /**
   * Simulate an HR candidate evaluation using the Bizneo HR AI persona.
   *
   * The candidate's data (including PII like email) is sent to the LLM
   * so the test can verify that PII redaction is applied correctly.
   *
   * @param candidate - The candidate profile to evaluate.
   * @returns The LLM's evaluation text.
   * @throws {Error} If no API key is configured or the API call fails.
   *
   * @example
   * ```typescript
   * const response = await sim.hrDecision({
   *   name: 'Jane Doe',
   *   email: 'jane.doe@example.com',
   *   role: 'Senior Engineer',
   *   experience: '8 years',
   * });
   * ```
   */
  async hrDecision(candidate: CandidateData): Promise<string> {
    this.requireApiKey();
    const prompt = [
      `Candidate: ${candidate.name}`,
      `Email: ${candidate.email}`,
      `Role Applied: ${candidate.role}`,
      `Experience: ${candidate.experience}`,
      '',
      'Please evaluate this candidate and provide a hiring recommendation.',
    ].join('\n');

    const completion = await this.wrappedClient.chat.completions.create({
      model: this.config.model ?? DEFAULT_MODEL,
      messages: [
        { role: 'system', content: this.config.systemPrompt ?? HR_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });
    return completion.choices[0]?.message?.content ?? '';
  }

  /**
   * Simulate a financial investment advice scenario using the Velliv financial AI persona.
   *
   * Evaluates the investment scenario for regulatory compliance and suitability.
   *
   * @param scenario - The investment scenario to evaluate.
   * @returns The LLM's financial advice response.
   * @throws {Error} If no API key is configured or the API call fails.
   *
   * @example
   * ```typescript
   * const advice = await sim.financialAdvice({
   *   scenario: 'High-growth tech fund',
   *   riskLevel: 'high',
   *   amount: '$500,000',
   * });
   * ```
   */
  async financialAdvice(scenario: InvestmentScenario): Promise<string> {
    this.requireApiKey();
    const prompt = [
      `Investment Scenario: ${scenario.scenario}`,
      `Risk Level: ${scenario.riskLevel}`,
      `Amount: ${scenario.amount}`,
      '',
      'Please assess this investment for regulatory compliance and provide advice.',
    ].join('\n');

    const completion = await this.wrappedClient.chat.completions.create({
      model: this.config.model ?? DEFAULT_MODEL,
      messages: [
        { role: 'system', content: this.config.systemPrompt ?? FINANCIAL_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });
    return completion.choices[0]?.message?.content ?? '';
  }
}
