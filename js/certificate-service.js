export function openCertificate({ userName, courseName, category, completedAt }) {
  const dateStr = new Date(completedAt || Date.now()).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

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
    .cert { width: 297mm; height: 210mm; position: relative; overflow: hidden; }
    .cert-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #1A3A5C 0%, #14304D 55%, #0E2540 100%); }
    .cert-deco {
      position: absolute; right: -40px; top: -40px;
      width: 260px; height: 260px; border-radius: 50%;
      background: rgba(0,174,239,.1); border: 1px solid rgba(0,174,239,.15);
    }
    .cert-deco2 {
      position: absolute; right: 60px; bottom: -60px;
      width: 180px; height: 180px; border-radius: 50%;
      background: rgba(0,174,239,.06); border: 1px solid rgba(0,174,239,.1);
    }
    .cert-inner { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; padding: 14mm 18mm; }
    .cert-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10mm; }
    .cert-brand { display: flex; flex-direction: column; }
    .cert-logo-text { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 800; color: white; letter-spacing: .03em; }
    .cert-logo-sub { font-size: 9px; color: rgba(255,255,255,.5); letter-spacing: .2em; margin-top: 2px; }
    .cert-verified { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); border-radius: 5px; padding: 5px 11px; font-size: 9.5px; letter-spacing: .12em; color: rgba(255,255,255,.75); font-weight: 600; }
    .cert-body { flex: 1; background: white; border-radius: 10px; padding: 10mm 13mm; display: flex; flex-direction: column; justify-content: center; }
    .cert-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: .2em; color: #9CA3AF; margin-bottom: 5mm; }
    .cert-conferred { font-size: 13px; color: #6B7280; margin-bottom: 2mm; }
    .cert-name { font-family: 'Sora', sans-serif; font-size: 30px; font-weight: 800; color: #1A3A5C; margin-bottom: 5mm; line-height: 1.1; }
    .cert-mid { font-size: 13px; color: #6B7280; margin-bottom: 2mm; }
    .cert-course { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700; color: #0096CC; margin-bottom: 1mm; }
    .cert-category { font-size: 11px; color: #9CA3AF; letter-spacing: .06em; margin-bottom: 8mm; }
    .cert-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #E5E9EF; padding-top: 5mm; }
    .cert-date { font-size: 11px; color: #6B7280; }
    .cert-date strong { color: #1F2A37; }
    .cert-signature { text-align: right; }
    .cert-sig-line { width: 48mm; height: 1px; background: #D1D5DB; margin-bottom: 3px; margin-left: auto; }
    .cert-sig-label { font-size: 9.5px; color: #9CA3AF; letter-spacing: .04em; }
    @media print {
      @page { size: A4 landscape; margin: 0; }
      html, body { width: 297mm; height: 210mm; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <div class="cert-bg"></div>
    <div class="cert-deco"></div>
    <div class="cert-deco2"></div>
    <div class="cert-inner">
      <div class="cert-header">
        <div class="cert-brand">
          <div class="cert-logo-text">AlgarTempo</div>
          <div class="cert-logo-sub">FORMAÇÕES</div>
        </div>
        <div class="cert-verified">CERTIFICADO VERIFICADO</div>
      </div>
      <div class="cert-body">
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
            <div class="cert-sig-label">AlgarTempo — Recursos Humanos</div>
          </div>
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
