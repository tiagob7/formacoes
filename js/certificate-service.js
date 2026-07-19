export function openCertificate({ userName, courseName, category, completedAt, modules = [] }) {
  const dateStr = new Date(completedAt || Date.now()).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const logoUrl = `${window.location.origin}/assets/logo-vertical-color.png`;

  const totalMinutes = modules.reduce((sum, m) => sum + parseDurationMinutes(m.duration), 0);
  const totalHHMM    = minutesToHHMM(totalMinutes);

  const moduleRows = modules.map(m => `
    <tr>
      <td class="td-name">${esc(m.title)}</td>
      <td class="td-hours">${minutesToHHMM(parseDurationMinutes(m.duration))}</td>
    </tr>`).join('');

  /* ── Badge SVG (inline, always renders) ── */
  const badgeSVG = `
    <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" width="82" style="display:block">
      <!-- Ribbons -->
      <polygon points="27,90 11,118 43,104" fill="#4A8FD4"/>
      <polygon points="73,90 89,118 57,104" fill="#4A8FD4"/>
      <!-- Rosette / 8-pointed badge -->
      <polygon fill="#1A3A5C" points="
        50,13  63,24  79.7,25.3  81.4,42
        92,55  81.4,68  79.7,84.7  63,86.4
        50,97  37,86.4  20.3,84.7  18.6,68
        8,55   18.6,42  20.3,25.3  37,24"/>
      <!-- White ring -->
      <circle cx="50" cy="55" r="27" fill="none" stroke="white" stroke-width="3.5"/>
      <!-- Checkmark -->
      <polyline points="36,56 45,66 65,42"
        fill="none" stroke="#4A8FD4" stroke-width="6.5"
        stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Certificado de Conclusão — ${esc(courseName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 210mm; height: 297mm;
      background: white;
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm; min-height: 297mm;
      background: white;
      padding: 14mm 16mm 12mm 16mm;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .cert-header {
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      margin-bottom: 10mm;
    }
    .cert-logo {
      height: 110px;
      width: auto;
    }

    /* ── Section accent helper ── */
    .section {
      display: flex;
      align-items: flex-start;
      gap: 6mm;
      margin-bottom: 8mm;
    }
    .accent-bar {
      flex-shrink: 0;
      width: 5px;
      background: #1A3A5C;
      border-radius: 2px;
      align-self: stretch;
      min-height: 24px;
    }
    .section-body {
      flex: 1;
    }

    /* ── Title ── */
    .cert-title {
      font-family: 'Crimson Pro', Georgia, serif;
      font-size: 28pt;
      font-weight: 600;
      color: #1A3A5C;
      line-height: 1.1;
      letter-spacing: -0.01em;
    }

    /* ── Body text ── */
    .cert-body-text {
      font-size: 10.5pt;
      line-height: 1.65;
      color: #1a1a1a;
      text-align: justify;
    }
    .cert-body-text strong {
      font-weight: 600;
    }

    /* ── Table ── */
    .table-wrap { width: 100%; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    thead tr {
      background: #1A3A5C;
      color: white;
    }
    thead th {
      padding: 3mm 3.5mm;
      text-align: left;
      font-weight: 500;
      font-size: 9pt;
    }
    .th-hours {
      text-align: center;
      white-space: nowrap;
      width: 28mm;
    }
    tbody tr {
      border-bottom: 1px solid #dde3ea;
    }
    tbody tr:last-child {
      border-bottom: 2px solid #1A3A5C;
    }
    .td-name {
      padding: 2.5mm 3.5mm;
      color: #1a1a1a;
    }
    .td-hours {
      padding: 2.5mm 3.5mm;
      text-align: center;
      color: #3a4a5a;
      white-space: nowrap;
      width: 28mm;
    }
    /* Total row aligned under horas column */
    .table-total {
      display: flex;
      justify-content: flex-end;
    }
    .table-total-cell {
      width: 28mm;
      text-align: center;
      padding: 2mm 3.5mm 0;
      font-size: 9pt;
      font-weight: 600;
      color: #1A3A5C;
      border-top: none;
    }

    /* ── Footer / signature ── */
    .footer-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 8mm;
    }
    .footer-left { flex: 1; }
    .cert-footer-text {
      font-size: 10pt;
      color: #1a1a1a;
      margin-bottom: 5mm;
    }
    .cert-sig-role {
      font-size: 9.5pt;
      color: #1a1a1a;
      margin-bottom: 8mm;
    }
    .cert-sig-line {
      width: 75mm;
      height: 1px;
      background: #888;
      margin-bottom: 1.5mm;
    }
    .cert-sig-caption {
      font-style: italic;
      font-size: 8.5pt;
      color: #666;
    }
    .cert-stamp {
      display: block;
      height: 130px;
      width: auto;
      margin-top: 4mm;
      opacity: 0.92;
    }
    .footer-badge {
      flex-shrink: 0;
      padding-bottom: 2mm;
    }

    /* ── Spacer ── */
    .spacer { flex: 1; }

    @media print {
      @page { size: A4 portrait; margin: 0; }
      html, body { width: 210mm; height: 297mm; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header: logo top-right -->
  <div class="cert-header">
    <img src="${logoUrl}" alt="Algartempo" class="cert-logo"
         onerror="this.style.display:'none'">
  </div>

  <!-- Title -->
  <div class="section">
    <div class="accent-bar"></div>
    <div class="section-body">
      <div class="cert-title">Certificado de Conclusão de Formação Profissional</div>
    </div>
  </div>

  <!-- Body paragraph -->
  <div class="section" style="margin-bottom:6mm">
    <div class="accent-bar"></div>
    <div class="section-body">
      <p class="cert-body-text">
        A <strong>Algartempo</strong>, com o número de pessoa coletiva n.º 504 139 304
        e sede na Avenida de Ceuta, Edifício A Nora, Lote 2, Loja A, Quarteira,
        certifica que <strong>${esc(userName)}</strong> concluiu com aproveitamento
        a formação de <strong>&#8220;${esc(courseName)}&#8221;</strong>,
        em <strong>${dateStr}</strong>, com a duração de <strong>${totalHHMM} horas</strong>.
      </p>
    </div>
  </div>

  <!-- Modules table -->
  <div class="section" style="margin-bottom:2mm">
    <div class="accent-bar"></div>
    <div class="section-body table-wrap">
      <table>
        <thead>
          <tr>
            <th>Unidades de Formação / Módulos / Outras Designações</th>
            <th class="th-hours">Horas<br>(hh:mm)</th>
          </tr>
        </thead>
        <tbody>
          ${moduleRows || `<tr><td class="td-name">${esc(courseName)}</td><td class="td-hours">${totalHHMM}</td></tr>`}
        </tbody>
      </table>
      <div class="table-total">
        <div class="table-total-cell">${totalHHMM}</div>
      </div>
    </div>
  </div>

  <div class="spacer"></div>

  <!-- Date, signature + badge -->
  <div class="section" style="margin-bottom:0">
    <div class="accent-bar"></div>
    <div class="section-body">
      <div class="footer-row">
        <div class="footer-left">
          <p class="cert-footer-text">Quarteira, ${dateStr}</p>
          <img src="${window.location.origin}/assets/carimbo.png" alt="Carimbo Algartempo" class="cert-stamp">
          <div class="cert-sig-line"></div>
          <p class="cert-sig-caption">(Assinatura e carimbo)</p>
        </div>
        <div class="footer-badge">${badgeSVG}</div>
      </div>
    </div>
  </div>

</div>
<script>setTimeout(() => { window.focus(); window.print(); }, 700);<\/script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) { alert('Active o popup para gerar o certificado.'); return; }
  w.document.write(html);
  w.document.close();
}

function parseDurationMinutes(str) {
  if (!str) return 0;
  const h = str.match(/(\d+)\s*h/);
  const m = str.match(/(\d+)\s*min/);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

function minutesToHHMM(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
