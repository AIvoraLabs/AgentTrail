#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { verifyChains } from '@aivoralabs/agenttrail';
import type { AuditReport, KeyEntry, Receipt } from '@aivoralabs/agenttrail';
import { renderHtmlReport } from './html-renderer';

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
 * Parse CLI arguments into a structured options object.
 */
function parseArgs(args: string[]): {
  command: string;
  filePath?: string;
  verifySignatures: boolean;
  publicKey?: string;
  output?: string;
  entityName?: string;
  format?: string;
} {
  const result = {
    command: '',
    filePath: undefined as string | undefined,
    verifySignatures: false,
    publicKey: undefined as string | undefined,
    output: undefined as string | undefined,
    entityName: undefined as string | undefined,
    format: undefined as string | undefined,
  };

  // First non-flag token is the command
  const command = args[0];
  if (!command || command.startsWith('--')) {
    result.command = command;
    return result;
  }
  result.command = command;

  if (command === 'verify') {
    // Scan for positional and flags
    const rest = args.slice(1);
    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      if (arg === '--verify-signatures') {
        result.verifySignatures = true;
      } else if (arg === '--public-key' && i + 1 < rest.length) {
        result.publicKey = rest[++i];
      } else if (arg === '--entity-name' && i + 1 < rest.length) {
        result.entityName = rest[++i];
      } else if (arg === '--format' && i + 1 < rest.length) {
        result.format = rest[++i];
      } else if (arg === '--output' && i + 1 < rest.length) {
        result.output = rest[++i];
      } else if (!result.filePath && !arg.startsWith('--')) {
        result.filePath = arg;
      }
    }
  }

  return result;
}

/**
 * Main CLI handler.
 */
export async function main(): Promise<void> {
  const parsedArgs = parseArgs(process.argv.slice(2));
  const { command, filePath, verifySignatures, publicKey, output, entityName, format } = parsedArgs;

  if (!command || command === '--help' || command === '-h') {
    console.log(`
AgentTrail CLI — Audit receipt verification

Usage:
  audit-receipt verify <file>                           Verify hash chain integrity
  audit-receipt verify <file> --verify-signatures       Also verify Ed25519 signatures
                          --public-key <base64>         Public key (required with --verify-signatures)
                          --output <path>               Write report to file (JSON or HTML)
                          --format <format>             Report format: json (default) or html
                          --entity-name <name>          Entity name for the HTML report
  audit-receipt --help                                  Show this help

File format: JSON array (.json) or JSONL (.jsonl)
`);
    return;
  }

  if (command === 'verify') {
    if (!filePath) {
      console.error('Error: missing file path');
      console.error(
        'Usage: audit-receipt verify <file> [--verify-signatures --public-key <key> --output <path>]',
      );
      process.exit(1);
    }

    if (verifySignatures && !publicKey) {
      console.error('Error: --public-key is required when --verify-signatures is used');
      process.exit(1);
    }

    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
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

    let options: { verifySignatures?: boolean; publicKeys?: KeyEntry[] } | undefined;
    if (verifySignatures && publicKey) {
      const keyEntry: KeyEntry = {
        publicKey,
        activatedAt: new Date().toISOString(),
        keyId: publicKey.slice(0, 12),
      };
      options = { verifySignatures: true, publicKeys: [keyEntry] };
    }

    const allResults = await verifyChains(receipts, options);
    const agents = Array.from(allResults.entries());

    console.log(`Receipts loaded: ${receipts.length}`);
    console.log(`Agents detected: ${agents.length}`);
    console.log('');

    // Per-agent output
    let overallIntact = true;
    let totalReceipts = 0;
    let totalHashChainIntact = true;
    let totalSignaturesValid = true;
    let totalVerifiedSignatures = 0;

    for (const [agentId, { receipts: agentR, result }] of agents) {
      const status = result.valid ? '✅ Chain INTACT' : '❌ Chain BROKEN';
      const padding = ' '.repeat(Math.max(1, 22 - agentId.length));
      console.log(`  ${agentId}:${padding}${agentR.length} receipts → ${status}`);

      totalReceipts += agentR.length;
      if (!result.hashChainIntact) totalHashChainIntact = false;
      if (!result.signaturesValid) totalSignaturesValid = false;
      if (!result.valid) overallIntact = false;
      totalVerifiedSignatures += result.verifiedSignatures;
    }
    console.log('');

    // Verdict box
    const verdict = overallIntact ? '✓ VERDICT: CHAIN INTACT' : '✗ VERDICT: CHAIN BROKEN';
    const hashPass = totalHashChainIntact ? 'PASS' : 'FAIL';
    const sigPass = totalSignaturesValid ? 'PASS' : 'FAIL';
    const boxWidth = Math.max(verdict.length + 4, 36);

    function renderBox(lines: string[]): string {
      const top = `  ╔${'═'.repeat(boxWidth)}╗`;
      const bottom = `  ╚${'═'.repeat(boxWidth)}╝`;
      const body = lines.map((l) => `  ║  ${l.padEnd(boxWidth - 2)}║`).join('\n');
      return `${top}\n${body}\n${bottom}`;
    }

    console.log(
      renderBox([
        verdict,
        `Hash Chain:  ${hashPass} (${totalReceipts}/${totalReceipts})`,
        verifySignatures
          ? `Signatures:  ${sigPass} (${totalVerifiedSignatures}/${totalReceipts})`
          : `Signatures:  ${sigPass} (not verified)`,
      ]),
    );

    // Show brokenAtIndex detail
    if (!overallIntact) {
      console.log('');
      for (const [agentId, { receipts: agentR, result }] of agents) {
        if (!result.valid && result.brokenAtIndex !== undefined) {
          const brokenReceipt = agentR[result.brokenAtIndex];
          console.error(`  ❌ Agent "${agentId}" — broken at index ${result.brokenAtIndex}`);
          console.error(`     Receipt: ${brokenReceipt?.receipt_id ?? 'unknown'}`);
        }
      }
    }

    // --output: write AuditReport (JSON or HTML)
    if (output) {
      const isHtml = output.endsWith('.html') || format === 'html';

      if (isHtml) {
        const signatureStatus = verifySignatures
          ? `${totalVerifiedSignatures} de ${totalReceipts} firmas válidas`
          : 'Verificación de firmas no solicitada';

        const htmlContent = renderHtmlReport({
          entityName,
          cliCommand: `audit-receipt verify ${filePath} --output ${output}`,
          agentResults: allResults,
          allReceipts: receipts,
          signatureStatus,
        });
        writeFileSync(output, htmlContent, 'utf-8');
        console.log(`\nReporte de auditoría escrito a: ${output}`);
      } else {
        // Legacy JSON report
        const perReceipt: AuditReport['per_receipt'] = [];
        let idx = 0;
        for (const [, { receipts: agentR, result }] of agents) {
          for (let j = 0; j < agentR.length; j++) {
            const r = agentR[j];
            const hashValid =
              result.hashChainIntact ||
              (result.brokenAtIndex !== undefined && j < result.brokenAtIndex);
            const sigValid =
              result.signaturesValid ||
              !result.signatureErrors.some((e) => e.receiptId === r.receipt_id);
            perReceipt.push({
              index: idx++,
              receipt_id: r.receipt_id,
              hash_valid: hashValid,
              signature_valid: sigValid,
              agent_id: r.agent_id,
              timestamp_start: r.payload.timestamp_start,
            });
          }
        }

        const report: AuditReport = {
          report_version: '1.0',
          generated_at: new Date().toISOString(),
          tool: 'audit-receipt verify',
          source_file: filePath,
          summary: {
            verdict: overallIntact ? 'intact' : 'broken',
            total_receipts: totalReceipts,
            hash_chain_intact: totalHashChainIntact,
            signatures_valid: totalSignaturesValid,
            verified_signatures: totalVerifiedSignatures,
          },
          agents: Array.from(allResults.entries()).map(
            ([agentId, { receipts: agentR, result }]) => ({
              agent_id: agentId,
              receipts_count: agentR.length,
              verdict: (result.valid ? 'intact' : 'broken') as 'intact' | 'broken',
              broken_at_index: result.brokenAtIndex,
              broken_receipt_id:
                result.brokenAtIndex !== undefined
                  ? agentR[result.brokenAtIndex]?.receipt_id
                  : undefined,
            }),
          ),
          per_receipt: perReceipt,
        };

        writeFileSync(output, JSON.stringify(report, null, 2));
        console.log(`\nReport written to: ${output}`);
      }
    }

    if (!overallIntact) {
      process.exit(1);
    }
    return;
  }

  console.error(`Error: unknown command "${command}"`);
  console.error('Usage: audit-receipt verify <file>');
  process.exit(1);
}

// Auto-execute when run directly
const isMain =
  process.argv[1]?.endsWith('dist/index.js') ||
  process.argv[1]?.endsWith('index.ts') ||
  process.argv[1]?.includes('audit-receipt');
if (isMain && !process.env.VITEST) {
  main();
}
