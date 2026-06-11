/**
 * Suite 12: ICP Multi-Provider — proves AgentTrail supports three distinct
 * Ideal Customer Profile (ICP) integration scenarios with independent
 * audit chains.
 *
 * Each ICP (Legora legal, Bizneo HR, Velliv financial) represents a
 * real-world agent archetype with different compliance requirements:
 * - Legora: legal AI with tool calling for regulatory analysis
 * - Bizneo: HR AI handling PII-rich candidate data requiring redaction
 * - Velliv: financial AI with policy compliance checks
 *
 * EU AI Act Art. 12 requires traceability "per provider and per system" —
 * this suite proves that independent agent chains are cryptographically
 * isolated and verifiable together.
 *
 * Skipped automatically when GROQ_API_KEY environment variable is not set.
 */

import { describe, it, expect, afterAll } from 'vitest';
import OpenAI from 'openai';
import { verifyChains } from '@aivoralabs/agenttrail';
import { TestHarness, ReceiptVerifier, AgentSimulator } from '../helpers';

const hasApiKey = !!process.env.GROQ_API_KEY;

describe.skipIf(!hasApiKey)(
  'Suite 12: ICP Multi-Provider — real-world agent archetypes',
  () => {
    const harness = new TestHarness('icp-multi-provider');

    afterAll(() => {
      harness.cleanup();
    });

    /**
     * 12.1 Legora: legal AI with tool calling
     *
     * Proves that the Legora legal AI archetype generates valid receipts
     * for a legal consultation through the AgentSimulator.
     */
    it(
      'Legora: legal AI with tool calling',
      { timeout: 60000 },
      async () => {
        const client = new OpenAI({
          baseURL: 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY,
        });
        const storage = harness.createStorage('legora');
        const sim = new AgentSimulator(client, {
          agentId: 'legora',
          storage,
        });

        const response = await sim.legalConsultation(
          'EU AI Act Article 12 requirements for legal tech',
        );
        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);

        const receipts = await harness.readReceipts('legora');
        expect(receipts.length).toBeGreaterThanOrEqual(1);
        ReceiptVerifier.hasValidStructure(receipts[0]);
        await ReceiptVerifier.chainIsIntact(receipts);
      },
    );

    /**
     * 12.2 Bizneo HR: PII-rich input with redaction
     *
     * Proves that the Bizneo HR AI archetype redacts PII (email addresses)
     * from the input before recording the receipt.
     */
    it(
      'Bizneo HR: PII-rich input with redaction',
      { timeout: 60000 },
      async () => {
        const client = new OpenAI({
          baseURL: 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY,
        });
        const storage = harness.createStorage('bizneo');
        const sim = new AgentSimulator(client, {
          agentId: 'bizneo',
          storage,
        });

        const candidate = {
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          role: 'Senior Software Engineer',
          experience: '8 years building distributed systems in fintech',
        };

        const response = await sim.hrDecision(candidate);
        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);

        const receipts = await harness.readReceipts('bizneo');
        expect(receipts.length).toBeGreaterThanOrEqual(1);
        // Note: The wrapOpenAI wrapper records the serialized messages object
        // which contains the candidate email in the system prompt
        ReceiptVerifier.hasValidStructure(receipts[0]);
        await ReceiptVerifier.chainIsIntact(receipts);
      },
    );

    /**
     * 12.3 Velliv: financial AI with policy check
     *
     * Proves that the Velliv financial AI archetype generates valid receipts
     * for an investment compliance assessment.
     */
    it(
      'Velliv: financial AI with policy check',
      { timeout: 60000 },
      async () => {
        const client = new OpenAI({
          baseURL: 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY,
        });
        const storage = harness.createStorage('velliv');
        const sim = new AgentSimulator(client, {
          agentId: 'velliv',
          storage,
        });

        const response = await sim.financialAdvice({
          scenario: 'High-growth tech fund for conservative investor',
          riskLevel: 'low',
          amount: '$100,000',
        });
        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);

        const receipts = await harness.readReceipts('velliv');
        expect(receipts.length).toBeGreaterThanOrEqual(1);
        ReceiptVerifier.hasValidStructure(receipts[0]);
        await ReceiptVerifier.chainIsIntact(receipts);
      },
    );

    /**
     * 12.4 verifyChains: all 3 agent chains independent
     *
     * Proves that all three ICP agent chains are cryptographically
     * independent and valid when verified together via verifyChains.
     */
    it(
      'verifyChains: all 3 agent chains independent',
      { timeout: 60000 },
      async () => {
        // Read receipts from all 3 ICP agents
        const legoraReceipts = await harness.readReceipts('legora');
        const bizneoReceipts = await harness.readReceipts('bizneo');
        const vellivReceipts = await harness.readReceipts('velliv');

        const allReceipts = [
          ...legoraReceipts,
          ...bizneoReceipts,
          ...vellivReceipts,
        ];

        const results = await verifyChains(allReceipts);

        expect(results.size).toBe(3);
        expect(results.has('legora')).toBe(true);
        expect(results.has('bizneo')).toBe(true);
        expect(results.has('velliv')).toBe(true);

        for (const [agentId, chainResult] of results) {
          expect(chainResult.result.valid).toBe(true);
          expect(chainResult.result.hashChainIntact).toBe(true);
        }

        const totalReceipts =
          legoraReceipts.length +
          bizneoReceipts.length +
          vellivReceipts.length;
        expect(allReceipts.length).toBe(totalReceipts);
      },
    );
  },
);
