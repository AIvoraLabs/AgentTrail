import { describe, it, expect } from 'vitest';
import { AuditReceipt, verifyChains } from '@aivoralabs/agenttrail';
import { renderHtmlReport } from '../src/html-renderer';

function makeReceipts(agentId: string, count: number) {
  return Array.from({ length: count }, async (_, i) => {
    const auditor = new AuditReceipt({ agentId });
    return auditor.record({
      input: `Input ${i + 1}`,
      output: `Output ${i + 1}`,
      model: 'gpt-4o',
      provider: 'openai',
    });
  });
}

describe('HTML Report Renderer', () => {
  it('should generate basic HTML structure with 1 agent and 3 receipts', async () => {
    const auditor = new AuditReceipt({ agentId: 'test-agent' });
    const r1 = await auditor.record({ input: 'Hello', output: 'Hi there', model: 'gpt-4o', provider: 'openai' });
    const r2 = await auditor.record({ input: 'How are you?', output: 'I am fine', model: 'gpt-4o', provider: 'openai' });
    const r3 = await auditor.record({ input: 'What is AI?', output: 'AI is...', model: 'gpt-4o', provider: 'openai' });

    const results = await verifyChains([r1, r2, r3]);
    const html = renderHtmlReport({
      cliCommand: 'audit-receipt verify test.json --output report.html',
      agentResults: results,
      allReceipts: [r1, r2, r3],
      signatureStatus: 'Verificación de firmas no solicitada',
    });

    // Basic structure assertions
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="es">');
    expect(html).toContain('<style>');
    expect(html).toContain('</style>');
    expect(html).toContain('ÍNTEGRO');
    expect(html).toContain('details.technical');
    expect(html).toContain('Test Agent');

    // No script tags
    expect(html).not.toContain('<script');

    // Footer elements
    expect(html).toContain('Firma del auditor');
    expect(html).toContain('audit-receipt verify test.json --output report.html');
  });

  it('should escape HTML in dynamic content', async () => {
    const auditor = new AuditReceipt({ agentId: 'xss-test' });
    const r1 = await auditor.record({
      input: '<script>alert(1)</script>',
      output: '<img src=x onerror=alert(2)>',
      model: 'gpt-4o',
      provider: 'openai',
    });

    const results = await verifyChains([r1]);
    const html = renderHtmlReport({
      cliCommand: 'audit-receipt verify test.json --output report.html',
      agentResults: results,
      allReceipts: [r1],
      signatureStatus: 'Verificación de firmas no solicitada',
    });

    // Escaped versions — NOT raw HTML
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');

    // The raw injection strings should NOT appear unescaped
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(2)>');
  });

  it('should show ALTERADO for broken chain', async () => {
    const auditor = new AuditReceipt({ agentId: 'broken-test' });
    const r1 = await auditor.record({ input: 'first', output: 'first out', model: 'gpt-4o', provider: 'openai' });
    const r2 = await auditor.record({ input: 'second', output: 'second out', model: 'gpt-4o', provider: 'openai' });

    // Tamper the second receipt
    r2.payload.output = 'TAMPERED';

    const results = await verifyChains([r1, r2]);
    const result = results.get('broken-test')!;
    expect(result.result.valid).toBe(false);

    const html = renderHtmlReport({
      cliCommand: 'audit-receipt verify test.json --output report.html',
      agentResults: results,
      allReceipts: [r1, r2],
      signatureStatus: 'Verificación de firmas no solicitada',
    });

    // Should show ALTERADO (not ÍNTEGRO)
    expect(html).toContain('ALTERADO');
    expect(html).not.toContain('badge pass');
    // The verdict badge should have the fail class
    expect(html).toContain('badge fail');
    // Should mention the broken detection
    expect(html).toContain('Se detectaron alteraciones');
  });

  it('should return fallback HTML for empty receipts', async () => {
    const results = await verifyChains([]);
    const html = renderHtmlReport({
      cliCommand: 'audit-receipt verify empty.json --output report.html',
      agentResults: results,
      allReceipts: [],
      signatureStatus: 'Verificación de firmas no solicitada',
    });

    expect(html).toContain('No se encontraron registros');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('audit-receipt verify empty.json --output report.html');
  });

  it('should include signature status when signatures are verified', async () => {
    const auditor = new AuditReceipt({ agentId: 'sig-test' });
    const r1 = await auditor.record({ input: 'a', output: 'b', model: 'gpt-4o', provider: 'openai' });

    const results = await verifyChains([r1], {
      verifySignatures: true,
      publicKeys: [{ publicKey: auditor['publicKey'], activatedAt: new Date().toISOString(), keyId: auditor['publicKey'].slice(0, 12) }],
    });

    const html = renderHtmlReport({
      cliCommand: 'audit-receipt verify test.json --output report.html',
      agentResults: results,
      allReceipts: [r1],
      signatureStatus: '1 de 1 firmas válidas',
    });

    expect(html).toContain('1 de 1 firmas válidas');
  });
});
