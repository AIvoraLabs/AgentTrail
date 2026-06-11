/**
 * AgentTrail Example — OpenAI SDK integration
 *
 * This example demonstrates how to wrap an OpenAI client with
 * AgentTrail to automatically generate audit receipts for every
 * chat completion.
 *
 * Usage:
 *   1. Set OPENAI_API_KEY in your environment or .env file
 *   2. Run: pnpm start
 */

import 'dotenv/config';
import { AuditReceipt } from '@aivoralabs/agenttrail';
import { wrapOpenAI } from '@aivoralabs/agenttrail-openai';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.log(`
⚠️  No OPENAI_API_KEY found in environment.

This example requires an OpenAI API key to run.
Set it in a .env file:

  OPENAI_API_KEY=sk-...

Or run with a mock to see the SDK workflow without an actual API call.
`);
  process.exit(0);
}

async function main() {
  console.log('AgentTrail Example — OpenAI SDK Integration');
  console.log('============================================\n');

  // 1. Create OpenAI client
  const openai = new OpenAI({ apiKey });

  // 2. Wrap with AgentTrail (auto-generates receipts)
  const client = wrapOpenAI(openai, { agentId: 'example-chatbot-v1' });

  // 3. Make a chat completion (receipt generated automatically)
  console.log('Sending: "What is the EU AI Act?"\n');

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful compliance assistant.' },
      { role: 'user', content: 'What is the EU AI Act?' },
    ],
    max_tokens: 150,
  });

  const reply = completion.choices?.[0]?.message?.content ?? '';
  console.log(`Response: "${reply.slice(0, 200)}..."\n`);

  // 4. Note: receipts are stored in memory in this example.
  //    In production, you would configure a storage backend.
  console.log('✅ Receipt generated automatically (in memory).');
  console.log('   To persist receipts, add a storage backend.\n');

  // 5. Example of manual receipt creation (without OpenAI)
  console.log('--- Manual receipt example ---\n');

  const auditor = new AuditReceipt({ agentId: 'example-chatbot-v1' });

  const receipt1 = await auditor.record({
    input: 'What is the EU AI Act?',
    output: 'The EU AI Act is a regulation...',
    model: 'gpt-4o-mini',
    provider: 'openai',
    tokensPrompt: 50,
    tokensCompletion: 100,
  });

  console.log(`Receipt #1: ${receipt1.receipt_id}`);
  console.log(`  Hash: ${receipt1.hash.slice(0, 20)}...`);
  console.log(`  Previous hash: ${receipt1.prev_hash}\n`);

  const receipt2 = await auditor.record({
    input: 'Does it apply to my startup?',
    output: 'If you deploy AI systems in the EU...',
    model: 'gpt-4o-mini',
    provider: 'openai',
  });

  console.log(`Receipt #2: ${receipt2.receipt_id}`);
  console.log(`  Hash: ${receipt2.hash.slice(0, 20)}...`);
  console.log(`  Previous hash: ${receipt2.prev_hash?.slice(0, 20)}...`);
  console.log(`  Chain intact: ${receipt2.prev_hash === receipt1.hash}\n`);

  // 6. Verify chain integrity
  const allReceipts = await auditor.exportJSON();
  const chainValid = await AuditReceipt.verifyChain(allReceipts);

  console.log(`Receipts in chain: ${allReceipts.length}`);
  console.log(`Chain integrity: ${chainValid ? '✅ VERIFIED' : '❌ BROKEN'}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
