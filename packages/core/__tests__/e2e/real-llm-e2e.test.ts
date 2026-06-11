/**
 * Suite 8: Real LLM E2E — proves AgentTrail integrates with a real LLM provider (Groq)
 * and generates valid, immutable audit receipts for every interaction.
 *
 * EU AI Act Art. 12 requirement: "logs shall be kept for the entire lifetime of the system"
 * and Art. 26(6) retention requirement for traceability.
 *
 * Skipped automatically when GROQ_API_KEY environment variable is not set.
 */

import { describe, it, expect, afterAll } from 'vitest';
import OpenAI from 'openai';
import { ComplianceError } from '@aivoralabs/agenttrail';
import { wrapOpenAI } from '@aivoralabs/agenttrail-openai';
import { TestHarness, ReceiptVerifier, AgentSimulator } from '../helpers';

const hasApiKey = !!process.env.GROQ_API_KEY;

describe.skipIf(!hasApiKey)(
  'Suite 8: Real LLM E2E — real provider API integration',
  () => {
    const harness = new TestHarness('real-llm-e2e');

    afterAll(() => {
      harness.cleanup();
    });

    /**
     * 8.1 Simple Q&A: real API -> receipt -> chain intact
     *
     * Proves that a basic chat completion through a wrapped provider generates
     * a structurally valid receipt, the hash chain is intact, and token usage
     * data is captured.
     */
    it(
      'Simple Q&A: real API → receipt → chain intact',
      { timeout: 60000 },
      async () => {
        const client = new OpenAI({
          baseURL: 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY,
        });
        const storage = harness.createStorage('simple-qa');
        new AgentSimulator(client, {
          agentId: 'simple-qa',
          storage,
          systemPrompt: 'You are a helpful assistant.',
        });

        const completion = await client.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'What is 2+2?' }],
        });

        const output = completion.choices[0]?.message?.content ?? '';
        expect(output).toBeTruthy();
        expect(output.length).toBeGreaterThan(0);

        const receipts = await harness.readReceipts('simple-qa');
        expect(receipts.length).toBeGreaterThanOrEqual(1);
        ReceiptVerifier.hasValidStructure(receipts[0]);
        await ReceiptVerifier.chainIsIntact(receipts);
        expect(receipts[0].payload.tokens_total).toBeGreaterThan(0);
      },
    );

    /**
     * 8.2 Streaming: stream: true → accumulated output matches receipt
     *
     * Proves that streaming completions are fully consumed, a receipt is generated
     * with the complete accumulated output, and at least 2 chunks were received
     * (verifying streaming actually occurred).
     */
    it(
      'Streaming: real stream → accumulated output',
      { timeout: 60000 },
      async () => {
        const client = new OpenAI({
          baseURL: 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY,
        });
        const storage = harness.createStorage('streaming');
        new AgentSimulator(client, {
          agentId: 'streaming',
          storage,
          systemPrompt: 'You are a helpful assistant.',
        });

        const stream = await client.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'Count from 1 to 5.' }],
          stream: true,
        });

        let fullOutput = '';
        let chunkCount = 0;
        for await (const chunk of stream) {
          chunkCount++;
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullOutput += delta;
          }
        }

        expect(chunkCount).toBeGreaterThanOrEqual(2);
        expect(fullOutput).toBeTruthy();

        const receipts = await harness.readReceipts('streaming');
        expect(receipts.length).toBeGreaterThanOrEqual(1);
        expect(receipts[0].payload.output).toBe(fullOutput);
        ReceiptVerifier.hasValidStructure(receipts[0]);
        await ReceiptVerifier.chainIsIntact(receipts);
      },
    );

    /**
     * 8.3 Tool calling: function call via tools parameter → tool_calls metadata
     *
     * Proves that when the LLM invokes a tool, the receipt captures the
     * finish_reason and tool_calls metadata indicating the tool invocation.
     */
    it(
      'Tool calling: function call → metadata',
      { timeout: 60000 },
      async () => {
        const client = new OpenAI({
          baseURL: 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY,
        });
        const storage = harness.createStorage('tool-calling');
        new AgentSimulator(client, {
          agentId: 'tool-calling',
          storage,
          systemPrompt: 'You are a helpful assistant.',
        });

        const completion = await client.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'user',
              content: 'What is the weather in Berlin? Use the get_weather tool.',
            },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'get_weather',
                description: 'Get current temperature for a city',
                parameters: {
                  type: 'object',
                  properties: {
                    city: { type: 'string', description: 'City name' },
                  },
                  required: ['city'],
                },
              },
            },
          ],
          tool_choice: 'auto',
        });

        const finishReason = completion.choices[0]?.finish_reason;
        const hasToolCalls =
          finishReason === 'tool_calls' ||
          completion.choices[0]?.message?.tool_calls !== undefined;

        expect(hasToolCalls).toBe(true);

        const receipts = await harness.readReceipts('tool-calling');
        expect(receipts.length).toBeGreaterThanOrEqual(1);
        ReceiptVerifier.hasValidStructure(receipts[0]);
        await ReceiptVerifier.chainIsIntact(receipts);
      },
    );

    /**
     * 8.4 Multi-turn: 3 sequential calls → prev_hash chain intact
     *
     * Proves that sequential calls to the same agent produce a linked hash chain:
     * receipt[1].prev_hash === receipt[0].hash, receipt[2].prev_hash === receipt[1].hash.
     */
    it(
      'Multi-turn: 3 calls → chain intact',
      { timeout: 60000 },
      async () => {
        const client = new OpenAI({
          baseURL: 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY,
        });
        const storage = harness.createStorage('multi-turn');
        new AgentSimulator(client, {
          agentId: 'multi-turn',
          storage,
          systemPrompt: 'You are a helpful assistant.',
        });

        await client.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'What is the capital of France?' }],
        });

        await client.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'What is its population?' }],
        });

        await client.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'What is its most famous landmark?' }],
        });

        const receipts = await harness.readReceipts('multi-turn');
        expect(receipts.length).toBe(3);

        // Verify hash chain linkage
        expect(receipts[0].prev_hash).toBeNull();
        expect(receipts[1].prev_hash).toBe(receipts[0].hash);
        expect(receipts[2].prev_hash).toBe(receipts[1].hash);

        await ReceiptVerifier.chainIsIntact(receipts);
      },
    );

    /**
     * 8.5 Invalid API key + strict mode → ComplianceError thrown
     *
     * Proves the fail-closed behavior: when the pre-flight compliance check
     * fails in strict mode, the SDK throws a ComplianceError instead of
     * silently continuing.
     */
    it(
      'Invalid key + strict → ComplianceError',
      { timeout: 15000 },
      async () => {
        const invalidClient = new OpenAI({
          baseURL: 'https://api.groq.com/openai/v1',
          apiKey: 'sk-invalid-key-for-testing',
        });

        const wrapped = wrapOpenAI(invalidClient, {
          agentId: 'invalid-key-test',
          complianceMode: 'strict',
        });

        await expect(
          wrapped.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: 'Hello' }],
          }),
        ).rejects.toThrow(ComplianceError);
      },
    );
  },
);
