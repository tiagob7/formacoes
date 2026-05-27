export function openCertificate({ userName, courseName, category, completedAt }) {
  const dateStr = new Date(completedAt || Date.now()).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const logoUrl = `${window.location.origin}/assets/logo-vertical-color.png`;

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Certificado — ${esc(courseName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Sora:wght@400;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 297mm; height: 210mm; background: white; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .cert {
      width: 297mm; height: 210mm;
      background: white;
      position: relative; overflow: hidden;
      padding: 12mm 16mm;
      display: flex; flex-direction: column; justify-content: center;
      /* subtle dot-grid watermark */
      background-image: radial-gradient(circle, rgba(26,58,92,0.045) 1px, transparent 1px);
      background-size: 20px 20px;
    }

    /* Top colour accent */
    .cert::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, #1A3A5C, #0096CC);
    }

    /* Large faint text watermark */
    .cert-watermark {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-12deg);
      font-family: 'Sora', sans-serif;
      font-size: 96px; font-weight: 800;
      color: rgba(26,58,92,0.028);
      white-space: nowrap;
      pointer-events: none; user-select: none;
      letter-spacing: .04em;
    }

    /* Corner ornaments */
    .cert-corner { position: absolute; width: 40px; height: 40px; }
    .cert-corner::before, .cert-corner::after {
      content: ''; position: absolute; background: #1A3A5C; opacity: 0.22;
    }
    .cert-corner::before { width: 100%; height: 2px; top: 0; left: 0; }
    .cert-corner::after  { width: 2px; height: 100%; top: 0; left: 0; }
    .cert-corner.tl { top: 12px; left: 12px; }
    .cert-corner.tr { top: 12px; right: 12px; transform: scaleX(-1); }
    .cert-corner.bl { bottom: 12px; left: 12px; transform: scaleY(-1); }
    .cert-corner.br { bottom: 12px; right: 12px; transform: scale(-1,-1); }

    /* Inner thin border */
    .cert-border-inner {
      position: absolute; inset: 8px; border-radius: 4px;
      border: 1px solid rgba(26,58,92,0.1);
      pointer-events: none;
    }

    /* Single-column: logo + text left-aligned */
    .cert-content { position: relative; z-index: 1; }

    .cert-logo-img { display: block; height: 100px; width: auto; margin-bottom: 7mm; }

    .cert-eyebrow   { font-size: 11px; font-weight: 700; letter-spacing: .2em; color: #9CA3AF; margin-bottom: 5mm; }
    .cert-conferred { font-size: 15px; color: #6B7280; margin-bottom: 2mm; }
    .cert-name      { font-family: 'Sora', sans-serif; font-size: 36px; font-weight: 800; color: #1A3A5C; margin-bottom: 5mm; line-height: 1.1; }
    .cert-mid       { font-size: 15px; color: #6B7280; margin-bottom: 2mm; }
    .cert-course    { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; color: #0096CC; margin-bottom: 1mm; }
    .cert-category  { font-size: 13px; color: #9CA3AF; letter-spacing: .06em; margin-bottom: 8mm; }

    .cert-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #E5E9EF; padding-top: 5mm; }
    .cert-date { font-size: 13px; color: #6B7280; }
    .cert-date strong { color: #1F2A37; }
    .cert-signature { text-align: right; }
    .cert-sig-line  { width: 48mm; height: 1px; background: #D1D5DB; margin-bottom: 3px; margin-left: auto; }
    .cert-sig-label { font-size: 11px; color: #9CA3AF; letter-spacing: .04em; }

    @media print {
      @page { size: A4 landscape; margin: 0; }
      html, body { width: 297mm; height: 210mm; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <div class="cert-watermark">Algartempo</div>
    <div class="cert-corner tl"></div>
    <div class="cert-corner tr"></div>
    <div class="cert-corner bl"></div>
    <div class="cert-corner br"></div>
    <div class="cert-border-inner"></div>
    <div class="cert-content">
      <img src="${logoUrl}" alt="Algartempo" class="cert-logo-img"
           onerror="this.style.display='none'">
      <div class="cert-eyebrow">CERTIFICADO DE CONCLUSÃO</div>
      <div class="cert-conferred">Este certificado é conferido a</div>
      <div class="cert-name">${esc(userName)}</div>
      <div class="cert-mid">pela conclusão com aproveitamento da formação</div>
      <div class="cert-course">${esc(courseName)}</div>
      <div class="cert-category">${esc(category || '')}</div>
      <div class="cert-footer">
        <div class="cert-date">Concluído em <strong>${dateStr}</strong></div>
        <div class="cert-signature">
          <div class="cert-sig-line"></div>
          <div class="cert-sig-label">Algartempo — Recursos Humanos</div>
        </div>
      </div>
    </div>
  </div>
  <script>setTimeout(() => { window.focus(); window.print(); }, 700);<\/script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=1120,height=800');
  if (!w) { alert('Active o popup para gerar o certificado.'); return; }
  w.document.write(html);
  w.document.close();
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
