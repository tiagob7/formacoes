import { icon }                          from '../icons.js';
import { loadCourses, courseProgress }   from '../course-service.js';
import { getState }                      from '../state.js';
import { openCertificate }               from '../certificate-service.js';
import { renderLoadingState }            from '../ui.js';

export async function renderCertificates(container) {
  container.innerHTML = renderLoadingState('A carregar certificados...');

  const { user, progress } = getState();
  let courses = [];
  try {
    const all = await loadCourses();
    courses = all.filter(c => c.status === 'published');
  } catch (e) { console.error(e); }

  const earned = courses.filter(c => {
    if (!c.modules.length) return false;
    const cp = progress?.[c.id] || {};
    return c.modules.every(m => cp[m.id]?.quizPassed);
  });

  const pending = courses.filter(c => {
    if (!c.modules.length) return false;
    const cp = progress?.[c.id] || {};
    return !c.modules.every(m => cp[m.id]?.quizPassed);
  });

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="topbar-title">Certificados</h1>
        <div class="topbar-sub">Formações concluídas e percurso em aberto</div>
      </div>
    </div>

    <div class="certs-layout">

      <section>
        <div class="certs-section-header">
          ${icon('award', 16, 'var(--green)')}
          <h2 class="certs-section-title">Certificados obtidos</h2>
          <span class="certs-count">${earned.length}</span>
        </div>
        ${earned.length
          ? `<div class="certs-grid">${earned.map(c => certCard(c, progress, user)).join('')}</div>`
          : `<p class="certs-empty">Ainda não concluiu nenhuma formação. Complete todos os módulos para ganhar um certificado.</p>`}
      </section>

      <section style="margin-top:2.5rem">
        <div class="certs-section-header">
          ${icon('clock', 16, 'var(--amber)')}
          <h2 class="certs-section-title">Em progresso</h2>
          <span class="certs-count">${pending.length}</span>
        </div>
        ${pending.length
          ? `<div class="certs-grid">${pending.map(c => pendingCard(c, progress)).join('')}</div>`
          : `<p class="certs-empty">Não tem formações pendentes.</p>`}
      </section>

    </div>`;

  container.querySelectorAll('[data-cert]').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = btn.dataset.cert;
      const course   = earned.find(c => c.id === courseId);
      if (!course) return;
      const cp       = progress?.[courseId] || {};
      const dates    = course.modules.map(m => cp[m.id]?.completedAt).filter(Boolean);
      const lastDate = dates.length ? Math.max(...dates) : Date.now();
      openCertificate({
        userName:    user?.name || user?.email || 'Colaborador',
        courseName:  course.title,
        category:    course.category,
        completedAt: lastDate,
      });
    });
  });
}

function certCard(course, progress, user) {
  const cp      = progress?.[course.id] || {};
  const dates   = course.modules.map(m => cp[m.id]?.completedAt).filter(Boolean);
  const lastDate = dates.length ? Math.max(...dates) : null;
  const dateStr  = lastDate
    ? new Date(lastDate).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return `
    <div class="cert-card earned">
      <div class="cert-card-icon">${icon('award', 28, 'var(--green)')}</div>
      <div class="cert-card-body">
        <div class="cert-card-category">${course.category || 'Formação'}</div>
        <div class="cert-card-title">${course.title}</div>
        <div class="cert-card-date">${icon('check', 12, 'var(--green)')} Concluído em ${dateStr}</div>
      </div>
      <button class="btn-primary cert-card-btn" data-cert="${course.id}">
        ${icon('download', 13)} Descarregar
      </button>
    </div>`;
}

function pendingCard(course, progress) {
  const cp   = progress?.[course.id] || {};
  const done = course.modules.filter(m => cp[m.id]?.quizPassed).length;
  const total = course.modules.length;
  const pct   = Math.round((done / total) * 100);

  return `
    <div class="cert-card pending">
      <div class="cert-card-icon">${icon('lock', 24, 'var(--ink-3)')}</div>
      <div class="cert-card-body">
        <div class="cert-card-category">${course.category || 'Formação'}</div>
        <div class="cert-card-title">${course.title}</div>
        <div class="cert-card-progress">
          <div class="cert-prog-bar"><div class="cert-prog-fill" style="width:${pct}%"></div></div>
          <span class="cert-prog-label">${done}/${total} módulos</span>
        </div>
      </div>
      <button class="btn-ghost cert-card-btn" onclick="navigate('/dashboard')">
        ${icon('play', 13)} Continuar
      </button>
    </div>`;
}
