import { icon } from '../icons.js';
import { getCourseById, courseProgress } from '../course-service.js';
import { getState } from '../state.js';
import { navigate } from '../router.js';
import { renderLoadingState, renderEmptyState } from '../ui.js';

export async function renderCourseDetail(container, { courseId }) {
  container.innerHTML = renderLoadingState('A carregar detalhe da formação...');

  let course = null;
  try {
    course = await getCourseById(courseId);
  } catch (err) {
    console.error(err);
  }

  const { progress } = getState();
  if (!course) {
    container.innerHTML = renderEmptyState({
      iconName: 'info',
      title: 'Formação não encontrada',
      message: 'Esta formação pode ter sido removida ou ainda não estar publicada.',
      action: `<button class="btn-next" onclick="navigate('/dashboard')">Voltar ao dashboard</button>`,
    });
    return;
  }

  const p = courseProgress(course, progress);
  const cp = progress?.[course.id] || {};
  const nextModule = course.modules.find(mod => !cp[mod.id]?.quizPassed) || course.modules[0];
  const ctaLabel = p.pct === 100 ? 'Rever formação' : p.started > 0 ? 'Continuar formação' : 'Começar formação';

  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="breadcrumbs">
          <span style="cursor:pointer;color:var(--ink-3)" onclick="navigate('/dashboard')">Dashboard</span>
          <span class="breadcrumb-sep">${icon('chevronRight', 12, '#D1D5DB')}</span>
          <span class="breadcrumb-current">${course.title}</span>
        </div>
        <h1 class="topbar-title">${course.title}</h1>
        <div class="topbar-sub">${course.subtitle || 'Detalhe da formação'}</div>
      </div>
      <div class="topbar-right">
        <button class="btn-ghost" onclick="navigate('/dashboard')">
          ${icon('arrowLeft', 14)} Voltar
        </button>
      </div>
    </div>

    <div class="course-detail">
      <section class="course-detail-hero">
        <div>
          <div class="course-detail-category">${course.category}</div>
          <h2>${course.title}</h2>
          <p>${course.subtitle || 'Esta formação ainda não tem descrição detalhada.'}</p>
          <div class="course-detail-meta">
            <span>${icon('book', 14, 'currentColor')} ${course.modules.length} módulos</span>
            <span>${icon('clock', 14, 'currentColor')} ${course.duration || 'Duração por definir'}</span>
            <span>${icon('award', 14, 'currentColor')} Nota mínima ${course.passingScore}%</span>
          </div>
        </div>
        <div class="course-detail-progress">
          <div class="kpi-label">Progresso</div>
          <div class="course-detail-percent">${p.pct}<span>%</span></div>
          <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${p.pct}%"></div></div>
          <div class="kpi-sub">${p.completed}/${p.total} módulos concluídos</div>
          <button class="btn-next" id="course-start" ${nextModule ? '' : 'disabled'}>
            ${ctaLabel} ${icon('arrowRight', 14)}
          </button>
        </div>
      </section>

      <section class="course-detail-section">
        <div class="section-head">
          <div>
            <h2 class="section-title">Plano da formação</h2>
            <div class="section-sub">Complete os módulos e avaliações pela ordem recomendada.</div>
          </div>
        </div>
        <div class="course-module-list">
          ${course.modules.length ? course.modules.map((mod, index) => moduleRow(course, mod, index, cp)).join('') : `
            <div class="empty-state small">
              <div class="empty-state-inner">
                <div class="empty-state-icon">${icon('info', 28, 'var(--ink-3)')}</div>
                <div class="empty-state-title">Ainda sem módulos</div>
                <div class="empty-state-sub">Quando os módulos forem publicados, aparecerão aqui.</div>
              </div>
            </div>
          `}
        </div>
      </section>
    </div>`;

  document.getElementById('course-start')?.addEventListener('click', () => {
    if (nextModule) navigate(`/module/${course.id}/${nextModule.id}`);
  });

  container.querySelectorAll('[data-module-id]').forEach(btn => {
    btn.addEventListener('click', () => navigate(`/module/${course.id}/${btn.dataset.moduleId}`));
  });
}

function moduleRow(course, mod, index, cp) {
  const mp = cp?.[mod.id] || {};
  const done = !!mp.quizPassed;
  const read = !!mp.read;
  const status = done ? 'Concluído' : read ? 'Avaliação disponível' : 'Por iniciar';
  const statusClass = done ? 'done' : read ? 'ready' : '';

  return `
    <button class="course-module-card ${statusClass}" data-module-id="${mod.id}">
      <div class="module-num">
        ${done ? icon('check', 13, 'var(--green)', 2.5) : index + 1}
      </div>
      <div class="course-module-info">
        <div class="course-module-title">${mod.title}</div>
        <div class="course-module-meta">
          <span>${icon('clock', 12, 'var(--ink-3)')} ${mod.duration || 'Duração por definir'}</span>
          <span>${icon('pdf', 12, 'var(--red)')} ${mod.pages || 1} páginas</span>
          <span>${icon('award', 12, 'var(--cyan-2)')} ${mod.quiz?.length || 0} perguntas</span>
        </div>
      </div>
      <div class="course-module-status">${status}</div>
      ${icon('chevronRight', 16, 'var(--ink-3)')}
    </button>`;
}
