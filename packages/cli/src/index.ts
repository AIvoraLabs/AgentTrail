#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { AuditReceipt } from '@aivoralabs/agenttrail';
import type { Receipt } from '@aivoralabs/agenttrail';

/**
 * Parse receipt data from a string (JSON array or JSONL).
 */
export async function readReceiptsFile(content: string): Promise<Receipt[]> {
  if (!content || content.trim().length === 0) {
    throw new Error('File is empty');
  }

  const trimmed = content.trim();

  // Try parsing as JSON array first
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON root must be an array of receipts');
    }
    return parsed as Receipt[];
  }

  // Try JSONL (one JSON object per line)
  const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
  const receipts: Receipt[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      receipts.push(parsed as Receipt);
    } catch {
      throw new Error(`Invalid JSONL line: ${line.slice(0, 80)}`);
    }
  }

  if (receipts.length === 0) {
    throw new Error('No receipts found in file');
  }

  return receipts;
}

/**
 * Main CLI handler.
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
AgentTrail CLI — Audit receipt verification

Usage:
  audit-receipt verify <file>    Verify hash chain integrity of a receipt file
  audit-receipt --help           Show this help

File format: JSON array (.json) or JSONL (.jsonl)
`);
    return;
  }

  if (command === 'verify') {
    const filePath = args[1];
    if (!filePath) {
      console.error('Error: missing file path');
      console.error('Usage: audit-receipt verify <file>');
      process.exit(1);
    }

    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.error(`Error: cannot read file "${filePath}"`);
      process.exit(1);
    }

    let receipts: Receipt[];
    try {
      receipts = await readReceiptsFile(content);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }

    console.log(`Receipts loaded: ${receipts.length}`);
    console.log(`Agent ID: ${receipts[0]?.agent_id ?? 'unknown'}`);
    console.log(`Date range: ${receipts[0]?.payload.timestamp_start ?? '?'} → ${receipts[receipts.length - 1]?.payload.timestamp_end ?? '?'}`);
    console.log('');

    const valid = await AuditReceipt.verifyChain(receipts);

    if (valid) {
      console.log('✅ Chain INTACT — all receipts verified');
      console.log(`   ${receipts.length} receipt(s) in chain, hash chain unbroken`);
      return;
    } else {
      console.error('❌ Chain BROKEN — tampering detected');
      console.error('   The hash chain is not consistent. Some receipts may have been altered.');
      process.exit(1);
    }
  }

  console.error(`Error: unknown command "${command}"`);
  console.error('Usage: audit-receipt verify <file>');
  process.exit(1);
}

// Auto-execute when run directly
const isMain = process.argv[1]?.endsWith('dist/index.js') ||
  process.argv[1]?.endsWith('index.ts') ||
  process.argv[1]?.includes('audit-receipt');
if (isMain && !process.env.VITEST) {
  main();
}
