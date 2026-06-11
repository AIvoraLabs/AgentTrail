import type { AuditReport, Receipt, VerificationResult } from '@aivoralabs/agenttrail';

// ─── Public Interface ───────────────────────────────────────────────────────

export interface HtmlRenderOptions {
  /** Optional entity/business name. If omitted, humanized from first agent_id. */
  entityName?: string;
  /** Exact CLI command used to generate this report (for reproducibility). */
  cliCommand: string;
  /** Per-agent verification results (from verifyChains). */
  agentResults: Map<string, AgentChainData>;
  /** Flat array of ALL receipts (needed for overall period computation). */
  allReceipts: Receipt[];
  /** Optional full AuditReport struct (not used in render, kept for interface consistency). */
  fullReport?: AuditReport;
  /** Human-readable signature status, e.g. "150 de 150 firmas válidas". */
  signatureStatus: string;
}

/** Internal: the per-agent container type from verifyChains. */
interface AgentChainData {
  receipts: Receipt[];
  result: VerificationResult;
}

// ─── Placeholder for empty-report edge case ─────────────────────────────────

const EMPTY_HTML =
  '<!DOCTYPE html>\n' +
  '<html lang="es">\n' +
  '<head>\n' +
  '<meta charset="UTF-8">\n' +
  '<title>AgentTrail — Informe de Auditoría</title>\n' +
  '<style>\n' +
  '  :root {\n' +
  '    --bg:#ffffff; --text:#1e293b; --border:#e2e8f0;\n' +
  '    --accent:#0d9488;\n' +
  '  }\n' +
  '  @media (prefers-color-scheme:dark) {\n' +
  '    :root {\n' +
  '      --bg:#0f172a; --text:#e2e8f0; --border:#334155;\n' +
  '      --accent:#14b8a6;\n' +
  '    }\n' +
  '  }\n' +
  '  body {\n' +
  "    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;\n" +
  '    color:var(--text); background:var(--bg);\n' +
  '    max-width:720px; margin:3rem auto; padding:2rem;\n' +
  '    text-align:center; line-height:1.6;\n' +
  '  }\n' +
  '  h1 { font-size:1.5rem; margin-bottom:0.5rem; }\n' +
  '  p  { color:var(--text); margin-bottom:2rem; }\n' +
  '  code { font-family:monospace; background:var(--border); padding:0.1em 0.3em; border-radius:4px; }\n' +
  '</style>\n' +
  '</head>\n' +
  '<body>\n' +
  '  <h1>AgentTrail — Informe de Auditoría</h1>\n' +
  '  <p>No se encontraron registros para auditar.</p>\n' +
  '  <p>Comando: <code>ESCAPED_CLI_COMMAND</code></p>\n' +
  '</body>\n' +
  '</html>';

// ─── Public Entry Point ─────────────────────────────────────────────────────

/**
 * Generate a self-contained, print-ready HTML audit report.
 * Returns a complete HTML5 document string (zero JS, inline CSS only).
 */
export function renderHtmlReport(opts: HtmlRenderOptions): string {
  const { entityName, cliCommand, agentResults, allReceipts, signatureStatus } = opts;

  // Empty guard
  if (agentResults.size === 0 || allReceipts.length === 0) {
    return EMPTY_HTML.replace('ESCAPED_CLI_COMMAND', escapeHtml(cliCommand));
  }

  // ── Data processing ────────────────────────────────────────────────────────

  const firstAgentId = Array.from(agentResults.keys())[0];
  const displayEntity = entityName || humanizeAgentId(firstAgentId);
  const generatedDate = formatDate(new Date().toISOString());

  // Compute period: min(timestamp_start) → max(timestamp_end)
  const sortedByStart = [...allReceipts].sort(
    (a, b) =>
      new Date(a.payload.timestamp_start).getTime() - new Date(b.payload.timestamp_start).getTime(),
  );
  const sortedByEnd = [...allReceipts].sort(
    (a, b) =>
      new Date(a.payload.timestamp_end).getTime() - new Date(b.payload.timestamp_end).getTime(),
  );
  const periodStart = formatDate(sortedByStart[0].payload.timestamp_start);
  const periodEnd = formatDate(sortedByEnd[sortedByEnd.length - 1].payload.timestamp_end);

  // Overall verdict
  let overallIntact = true;
  let totalReceiptCount = 0;
  for (const [, { receipts: agentR, result }] of agentResults) {
    if (!result.valid) overallIntact = false;
    totalReceiptCount += agentR.length;
  }

  const verdict = overallIntact ? 'ÍNTEGRO' : 'ALTERADO';
  const verdictClass = overallIntact ? 'pass' : 'fail';
  const verdictIcon = overallIntact ? '✓' : '✗';

  // ── Build sections ─────────────────────────────────────────────────────────

  const agentsHtml = buildAgentSections(agentResults);

  const integrityLine = overallIntact
    ? 'La cadena de registros se encuentra íntegra y puede ser verificada de forma independiente.'
    : 'Se detectaron alteraciones en la cadena de registros. Los agentes afectados están marcados a continuación.';

  // ── Full document ──────────────────────────────────────────────────────────

  return (
    '<!DOCTYPE html>\n' +
    '<html lang="es">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>AgentTrail — Informe de Auditoría</title>\n' +
    '<style>\n' +
    '  * { box-sizing:border-box; margin:0; padding:0; }\n' +
    '\n' +
    '  :root {\n' +
    '    --bg:            #ffffff;\n' +
    '    --text:          #1e293b;\n' +
    '    --text-muted:    #64748b;\n' +
    '    --border:        #e2e8f0;\n' +
    '    --accent:        #0d9488;\n' +
    '    --verdict-pass:  #059669;\n' +
    '    --verdict-fail:  #dc2626;\n' +
    '    --verdict-pass-bg: #d1fae5;\n' +
    '    --verdict-fail-bg: #fee2e2;\n' +
    '    --surface:       #f8fafc;\n' +
    "    --font:          -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;\n" +
    "    --font-mono:     'SF Mono','Fira Code','Cascadia Code',Consolas,monospace;\n" +
    '  }\n' +
    '\n' +
    '  @media (prefers-color-scheme:dark) {\n' +
    '    :root {\n' +
    '      --bg:            #0f172a;\n' +
    '      --text:          #e2e8f0;\n' +
    '      --text-muted:    #94a3b8;\n' +
    '      --border:        #334155;\n' +
    '      --accent:        #14b8a6;\n' +
    '      --verdict-pass:  #34d399;\n' +
    '      --verdict-fail:  #f87171;\n' +
    '      --verdict-pass-bg: #064e3b;\n' +
    '      --verdict-fail-bg: #7f1d1d;\n' +
    '      --surface:       #1e293b;\n' +
    '    }\n' +
    '  }\n' +
    '\n' +
    '  body {\n' +
    '    font-family: var(--font);\n' +
    '    color: var(--text);\n' +
    '    background: var(--bg);\n' +
    '    line-height: 1.6;\n' +
    '    max-width: 1100px;\n' +
    '    margin: 0 auto;\n' +
    '    padding: 2rem;\n' +
    '  }\n' +
    '\n' +
    '  /* ── Header ──────────────────────────────────────────────────────────── */\n' +
    '\n' +
    '  header { margin-bottom: 2.5rem; }\n' +
    '\n' +
    '  .brand {\n' +
    '    font-size: 0.85rem;\n' +
    '    font-weight: 700;\n' +
    '    letter-spacing: 0.08em;\n' +
    '    text-transform: uppercase;\n' +
    '    color: var(--accent);\n' +
    '    margin-bottom: 0.25rem;\n' +
    '  }\n' +
    '\n' +
    '  h1 {\n' +
    '    font-size: 2rem;\n' +
    '    font-weight: 700;\n' +
    '    margin-bottom: 0.5rem;\n' +
    '    color: var(--text);\n' +
    '  }\n' +
    '\n' +
    '  .meta {\n' +
    '    font-size: 0.9rem;\n' +
    '    color: var(--text-muted);\n' +
    '    margin-bottom: 0.15rem;\n' +
    '  }\n' +
    '\n' +
    '  /* ── Executive Summary / Verdict ─────────────────────────────────────── */\n' +
    '\n' +
    '  .verdict {\n' +
    '    background: var(--surface);\n' +
    '    border: 1px solid var(--border);\n' +
    '    border-radius: 12px;\n' +
    '    padding: 1.75rem;\n' +
    '    margin-bottom: 2rem;\n' +
    '  }\n' +
    '\n' +
    '  .badge {\n' +
    '    display: inline-block;\n' +
    '    font-size: 1.5rem;\n' +
    '    font-weight: 700;\n' +
    '    padding: 0.4rem 1.2rem;\n' +
    '    border-radius: 999px;\n' +
    '    margin-bottom: 1rem;\n' +
    '  }\n' +
    '\n' +
    '  .badge.pass {\n' +
    '    background: var(--verdict-pass-bg);\n' +
    '    color: var(--verdict-pass);\n' +
    '  }\n' +
    '\n' +
    '  .badge.fail {\n' +
    '    background: var(--verdict-fail-bg);\n' +
    '    color: var(--verdict-fail);\n' +
    '  }\n' +
    '\n' +
    '  .summary-stats {\n' +
    '    display: flex;\n' +
    '    gap: 1.5rem;\n' +
    '    flex-wrap: wrap;\n' +
    '    font-size: 0.95rem;\n' +
    '    color: var(--text-muted);\n' +
    '    margin-bottom: 1rem;\n' +
    '  }\n' +
    '\n' +
    '  .summary-stats span { white-space: nowrap; }\n' +
    '\n' +
    '  .explanation {\n' +
    '    font-size: 0.95rem;\n' +
    '    color: var(--text);\n' +
    '    line-height: 1.7;\n' +
    '  }\n' +
    '\n' +
    '  /* ── Per-Agent Section ──────────────────────────────────────────────── */\n' +
    '\n' +
    '  .agents { margin-top: 1px; }\n' +
    '\n' +
    '  .agent {\n' +
    '    border: 1px solid var(--border);\n' +
    '    border-radius: 12px;\n' +
    '    padding: 1.5rem;\n' +
    '    margin-bottom: 1.5rem;\n' +
    '    page-break-inside: avoid;\n' +
    '  }\n' +
    '\n' +
    '  .agent h2 {\n' +
    '    font-size: 1.25rem;\n' +
    '    font-weight: 600;\n' +
    '    margin-bottom: 0.5rem;\n' +
    '  }\n' +
    '\n' +
    '  .agent-meta {\n' +
    '    display: flex;\n' +
    '    gap: 1.25rem;\n' +
    '    flex-wrap: wrap;\n' +
    '    font-size: 0.9rem;\n' +
    '    color: var(--text-muted);\n' +
    '    margin-bottom: 1rem;\n' +
    '  }\n' +
    '\n' +
    '  .status {\n' +
    '    font-weight: 700;\n' +
    '    padding: 0.15rem 0.6rem;\n' +
    '    border-radius: 6px;\n' +
    '    font-size: 0.85rem;\n' +
    '  }\n' +
    '\n' +
    '  .status.intact {\n' +
    '    background: var(--verdict-pass-bg);\n' +
    '    color: var(--verdict-pass);\n' +
    '  }\n' +
    '\n' +
    '  .status.broken {\n' +
    '    background: var(--verdict-fail-bg);\n' +
    '    color: var(--verdict-fail);\n' +
    '  }\n' +
    '\n' +
    '  .agent-errors {\n' +
    '    background: var(--verdict-fail-bg);\n' +
    '    border: 1px solid var(--verdict-fail);\n' +
    '    border-radius: 8px;\n' +
    '    padding: 0.75rem 1rem;\n' +
    '    margin-bottom: 1rem;\n' +
    '    font-size: 0.9rem;\n' +
    '  }\n' +
    '\n' +
    '  /* ── Interactions Table ──────────────────────────────────────────────── */\n' +
    '\n' +
    '  table {\n' +
    '    width: 100%;\n' +
    '    border-collapse: collapse;\n' +
    '    font-size: 0.875rem;\n' +
    '    margin-bottom: 1rem;\n' +
    '  }\n' +
    '\n' +
    '  thead th {\n' +
    '    background: var(--surface);\n' +
    '    border-bottom: 2px solid var(--border);\n' +
    '    padding: 0.6rem 0.5rem;\n' +
    '    text-align: left;\n' +
    '    font-weight: 600;\n' +
    '    white-space: nowrap;\n' +
    '  }\n' +
    '\n' +
    '  tbody td {\n' +
    '    border-bottom: 1px solid var(--border);\n' +
    '    padding: 0.5rem;\n' +
    '    vertical-align: top;\n' +
    '  }\n' +
    '\n' +
    '  tbody tr:nth-child(even) { background: var(--surface); }\n' +
    '\n' +
    '  tbody tr.broken { background: var(--verdict-fail-bg); }\n' +
    '\n' +
    '  .cell-truncate {\n' +
    '    max-width: 280px;\n' +
    '    overflow: hidden;\n' +
    '    text-overflow: ellipsis;\n' +
    '    white-space: nowrap;\n' +
    '  }\n' +
    '\n' +
    '  .cell-details {\n' +
    '    font-size: 0.8rem;\n' +
    '    color: var(--text-muted);\n' +
    '    line-height: 1.5;\n' +
    '  }\n' +
    '\n' +
    '  /* ── Technical Details (collapsible) ─────────────────────────────────── */\n' +
    '\n' +
    '  details.technical {\n' +
    '    margin-top: 0.5rem;\n' +
    '    font-size: 0.85rem;\n' +
    '  }\n' +
    '\n' +
    '  details.technical summary {\n' +
    '    cursor: pointer;\n' +
    '    color: var(--accent);\n' +
    '    font-weight: 600;\n' +
    '    padding: 0.4rem 0;\n' +
    '    user-select: none;\n' +
    '  }\n' +
    '\n' +
    '  details.technical summary:hover { opacity: 0.8; }\n' +
    '\n' +
    '  details.technical .tech-intro {\n' +
    '    color: var(--text-muted);\n' +
    '    margin: 0.5rem 0;\n' +
    '    line-height: 1.5;\n' +
    '  }\n' +
    '\n' +
    '  details.technical table { margin-top: 0.5rem; }\n' +
    '\n' +
    '  details.technical code {\n' +
    '    font-family: var(--font-mono);\n' +
    '    font-size: 0.8rem;\n' +
    '    word-break: break-all;\n' +
    '    background: var(--surface);\n' +
    '    padding: 0.1em 0.3em;\n' +
    '    border-radius: 3px;\n' +
    '  }\n' +
    '\n' +
    '  /* ── Footer ──────────────────────────────────────────────────────────── */\n' +
    '\n' +
    '  footer {\n' +
    '    margin-top: 3rem;\n' +
    '    padding-top: 1.5rem;\n' +
    '    border-top: 1px solid var(--border);\n' +
    '    font-size: 0.85rem;\n' +
    '    color: var(--text-muted);\n' +
    '  }\n' +
    '\n' +
    '  footer .cli-command {\n' +
    '    font-family: var(--font-mono);\n' +
    '    font-size: 0.8rem;\n' +
    '    background: var(--surface);\n' +
    '    padding: 0.5rem 0.75rem;\n' +
    '    border-radius: 6px;\n' +
    '    margin-bottom: 1rem;\n' +
    '    word-break: break-all;\n' +
    '  }\n' +
    '\n' +
    '  footer .disclaimer {\n' +
    '    margin-bottom: 1.5rem;\n' +
    '    line-height: 1.6;\n' +
    '  }\n' +
    '\n' +
    '  footer .signature-space p {\n' +
    '    margin-bottom: 0.5rem;\n' +
    '  }\n' +
    '\n' +
    '  /* ── Print Styles ────────────────────────────────────────────────────── */\n' +
    '\n' +
    '  @media print {\n' +
    '    body {\n' +
    '      padding: 0.5in;\n' +
    '      font-size: 10pt;\n' +
    '    }\n' +
    '\n' +
    '    header { margin-bottom: 1.5rem; }\n' +
    '\n' +
    '    .verdict { border: 1px solid #ccc; box-shadow: none; }\n' +
    '\n' +
    '    .agent {\n' +
    '      page-break-inside: avoid;\n' +
    '      border: 1px solid #ccc;\n' +
    '      box-shadow: none;\n' +
    '    }\n' +
    '\n' +
    '    .agent + .agent { page-break-before: always; }\n' +
    '\n' +
    '    table { font-size: 8pt; }\n' +
    '\n' +
    '    details.technical { display: block; }\n' +
    '    details.technical summary { display: none; }\n' +
    '\n' +
    '    footer { margin-top: 2rem; }\n' +
    '  }\n' +
    '</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '\n' +
    '<header>\n' +
    '  <div class="brand">AgentTrail</div>\n' +
    '  <h1>Informe de Auditoría</h1>\n' +
    '  <p class="meta">Generado: ' +
    escapeHtml(generatedDate) +
    '</p>\n' +
    '  <p class="meta">Entidad: ' +
    escapeHtml(displayEntity) +
    '</p>\n' +
    '  <p class="meta">Período: ' +
    escapeHtml(periodStart) +
    ' → ' +
    escapeHtml(periodEnd) +
    '</p>\n' +
    '</header>\n' +
    '\n' +
    '<section class="verdict">\n' +
    '  <div class="badge ' +
    verdictClass +
    '">' +
    verdictIcon +
    ' ' +
    verdict +
    '</div>\n' +
    '  <div class="summary-stats">\n' +
    '    <span>' +
    agentResults.size +
    ' agente' +
    (agentResults.size !== 1 ? 's' : '') +
    '</span>\n' +
    '    <span>' +
    totalReceiptCount +
    ' interaccione' +
    (totalReceiptCount !== 1 ? 's' : '') +
    '</span>\n' +
    '    <span>' +
    escapeHtml(signatureStatus) +
    '</span>\n' +
    '  </div>\n' +
    '  <p class="explanation">\n' +
    '    Este reporte confirma que todas las interacciones registradas durante el período auditado\n' +
    '    están protegidas criptográficamente' +
    (overallIntact ? ' y no han sido alteradas' : '') +
    '.\n' +
    '    Cada registro contiene un sello digital único que garantiza su autenticidad.\n' +
    '    ' +
    integrityLine +
    '\n' +
    '  </p>\n' +
    '</section>\n' +
    '\n' +
    '<section class="agents">\n' +
    agentsHtml +
    '\n' +
    '</section>\n' +
    '\n' +
    '<footer>\n' +
    '  <div class="cli-command">Comando: ' +
    escapeHtml(cliCommand) +
    '</div>\n' +
    '  <p class="disclaimer">\n' +
    '    Este reporte fue generado automáticamente por AgentTrail. La cadena criptográfica\n' +
    '    subyacente puede ser verificada de forma independiente utilizando el comando indicado arriba.\n' +
    '    Para verificar la validez de este documento, ejecute el comando de verificación nuevamente\n' +
    '    sobre el archivo de registros original.\n' +
    '  </p>\n' +
    '  <div class="signature-space">\n' +
    '    <p>Firma del auditor: _________________________</p>\n' +
    '    <p>Fecha: _________________________</p>\n' +
    '  </div>\n' +
    '</footer>\n' +
    '\n' +
    '</body>\n' +
    '</html>'
  );
}

// ─── Section Builders ────────────────────────────────────────────────────────

function buildAgentSections(agentResults: Map<string, AgentChainData>): string {
  const parts: string[] = [];

  for (const [agentId, { receipts: agentR, result }] of agentResults) {
    const displayName = humanizeAgentId(agentId);
    const agentIntact = result.valid;
    const statusClass = agentIntact ? 'intact' : 'broken';
    const statusLabel = agentIntact ? 'ÍNTEGRO' : 'ALTERADO';

    // Sort receipts by timestamp_start
    const sorted = [...agentR].sort(
      (a, b) =>
        new Date(a.payload.timestamp_start).getTime() -
        new Date(b.payload.timestamp_start).getTime(),
    );

    // Error section for broken agents
    const errorHtml =
      !agentIntact && result.brokenAtIndex !== undefined
        ? '<div class="agent-errors">\n' +
          '          <strong>⚠ Se detectó una alteración en el registro ' +
          (result.brokenAtIndex + 1) +
          '</strong> (índice ' +
          result.brokenAtIndex +
          ').\n' +
          '          A partir de este punto, la cadena criptográfica no puede verificarse.\n' +
          '         </div>'
        : '';

    // Interaction rows
    const rows = sorted.map((r, i) => buildInteractionRow(r, i, result));
    const rowHtml = rows.join('\n');

    // Technical details
    const techHtml = buildTechnicalDetails(sorted, agentIntact);

    parts.push(
      '  <article class="agent">\n' +
        '    <h2>Agente: ' +
        escapeHtml(displayName) +
        '</h2>\n' +
        '    <div class="agent-meta">\n' +
        '      <span class="status ' +
        statusClass +
        '">' +
        statusLabel +
        '</span>\n' +
        '      <span>' +
        sorted.length +
        ' interaccione' +
        (sorted.length !== 1 ? 's' : '') +
        '</span>\n' +
        '      <span>' +
        escapeHtml(formatShortDate(sorted[0].payload.timestamp_start)) +
        ' → ' +
        escapeHtml(formatShortDate(sorted[sorted.length - 1].payload.timestamp_end)) +
        '</span>\n' +
        '      <span>Modelo: ' +
        escapeHtml(sorted[0].payload.model) +
        '</span>\n' +
        '    </div>\n' +
        errorHtml +
        '    <table class="interactions">\n' +
        '      <thead>\n' +
        '        <tr>\n' +
        '          <th>#</th>\n' +
        '          <th>Fecha</th>\n' +
        '          <th>Entrada</th>\n' +
        '          <th>Salida</th>\n' +
        '          <th>Duración</th>\n' +
        '          <th>Detalles</th>\n' +
        '          <th>Estado</th>\n' +
        '        </tr>\n' +
        '      </thead>\n' +
        '      <tbody>\n' +
        rowHtml +
        '      </tbody>\n' +
        '    </table>\n' +
        techHtml +
        '  </article>',
    );
  }

  return parts.join('\n\n');
}

function buildInteractionRow(receipt: Receipt, index: number, result: VerificationResult): string {
  const { payload } = receipt;
  const brokenRow =
    !result.valid && result.brokenAtIndex !== undefined && index >= result.brokenAtIndex
      ? ' class="broken"'
      : '';

  const dateStr = formatShortDate(payload.timestamp_start);
  const duration = formatDuration(payload.timestamp_start, payload.timestamp_end);

  const inputDisplay = truncate(payload.input, 200);
  const outputDisplay = truncate(payload.output, 200);

  // Optional details (tool calls, policy checks, human verifier)
  const detailParts: string[] = [];
  if (payload.tool_calls && payload.tool_calls.length > 0) {
    for (const tc of payload.tool_calls) {
      const dur =
        tc.tool_execution_ms < 1000
          ? tc.tool_execution_ms + 'ms'
          : (tc.tool_execution_ms / 1000).toFixed(1) + 's';
      detailParts.push('Herramienta: ' + escapeHtml(tc.tool_name) + ' (' + dur + ')');
    }
  }
  if (payload.policy_check) {
    detailParts.push(
      'Verificación regulatoria: ' +
        escapeHtml(payload.policy_check.policy_name) +
        ' → ' +
        payload.policy_check.status,
    );
  }
  if (payload.human_verifier) {
    detailParts.push('Supervisión humana: ' + escapeHtml(payload.human_verifier));
  }

  // Input/output full text in collapsible if truncated
  const fullTextParts: string[] = [];
  if (payload.input.length > 200) {
    fullTextParts.push('<strong>Entrada completa:</strong><br>' + escapeHtml(payload.input));
  }
  if (payload.output.length > 200) {
    fullTextParts.push('<strong>Salida completa:</strong><br>' + escapeHtml(payload.output));
  }
  const fullTextHtml =
    fullTextParts.length > 0
      ? '<details style="margin-top:0.25rem;font-size:0.8rem;color:var(--text-muted)"><summary>Ver texto completo</summary><div style="margin-top:0.25rem;white-space:pre-wrap">' +
        fullTextParts.join('<br><br>') +
        '</div></details>'
      : '';

  const detailsContent =
    detailParts.length > 0
      ? '<div class="cell-details">' + detailParts.join('<br>') + '</div>' + fullTextHtml
      : fullTextHtml;

  // Determine individual receipt validity
  const receiptValid =
    result.hashChainIntact || (result.brokenAtIndex !== undefined && index < result.brokenAtIndex);
  const statusIcon = receiptValid ? '✓' : '✗';
  const statusColor = receiptValid ? 'var(--verdict-pass)' : 'var(--verdict-fail)';

  return (
    '        <tr' +
    brokenRow +
    '>\n' +
    '          <td>' +
    (index + 1) +
    '</td>\n' +
    '          <td style="white-space:nowrap">' +
    escapeHtml(dateStr) +
    '</td>\n' +
    '          <td><div class="cell-truncate">' +
    escapeHtml(inputDisplay) +
    '</div></td>\n' +
    '          <td><div class="cell-truncate">' +
    escapeHtml(outputDisplay) +
    '</div></td>\n' +
    '          <td style="white-space:nowrap">' +
    escapeHtml(duration) +
    '</td>\n' +
    '          <td>' +
    (detailsContent || '<span style="color:var(--text-muted)">—</span>') +
    '</td>\n' +
    '          <td style="color:' +
    statusColor +
    ';font-weight:700;text-align:center">' +
    statusIcon +
    '</td>\n' +
    '        </tr>'
  );
}

function buildTechnicalDetails(receipts: Receipt[], agentIntact: boolean): string {
  const rows = receipts
    .map((r, i) => {
      const keyId = r.payload.key_id || '—';
      const sigValid = agentIntact;
      return (
        '        <tr>\n' +
        '          <td>' +
        (i + 1) +
        '</td>\n' +
        '          <td><code>' +
        escapeHtml(r.receipt_id) +
        '</code></td>\n' +
        '          <td><code>' +
        escapeHtml(shortHash(r.hash)) +
        '</code></td>\n' +
        '          <td><code>' +
        (r.prev_hash ? escapeHtml(shortHash(r.prev_hash)) : '—') +
        '</code></td>\n' +
        '          <td><code>' +
        (sigValid ? 'Válida' : 'Inválida') +
        ' (Ed25519)</code></td>\n' +
        '          <td><code>' +
        escapeHtml(keyId) +
        '</code></td>\n' +
        '        </tr>'
      );
    })
    .join('\n');

  return (
    '    <details class="technical">\n' +
    '      <summary>Ver detalles técnicos de este agente</summary>\n' +
    '      <div class="tech-intro">\n' +
    '        Estos son los valores criptográficos que garantizan la integridad de cada registro.\n' +
    '        Cualquier modificación mínima cambiaría estos valores, haciendo detectable la alteración.\n' +
    '      </div>\n' +
    '      <table>\n' +
    '        <thead>\n' +
    '          <tr>\n' +
    '            <th>#</th>\n' +
    '            <th>Identificador del registro</th>\n' +
    '            <th>Sello criptográfico (SHA-256)</th>\n' +
    '            <th>Enlace al registro anterior</th>\n' +
    '            <th>Firma digital (Ed25519)</th>\n' +
    '            <th>Llave utilizada</th>\n' +
    '          </tr>\n' +
    '        </thead>\n' +
    '        <tbody>\n' +
    rows +
    '\n' +
    '        </tbody>\n' +
    '      </table>\n' +
    '    </details>'
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function humanizeAgentId(id: string): string {
  return id
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  return day + ' de ' + months[d.getMonth()] + ' de ' + d.getFullYear();
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return day + '/' + month + ' ' + hours + ':' + mins;
}

function truncate(text: string, max = 200): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

function shortHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return hash.slice(0, 8) + '...' + hash.slice(-4);
}
