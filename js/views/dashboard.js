import { icon }                                           from '../icons.js';
import { navigate }                                        from '../router.js';
import { getState }                                        from '../state.js';
import { loadCourses, courseProgress, globalProgress, getResumeTarget, isCourseVisibleToUser, isCourseAttachedToUser } from '../course-service.js';
import { courseCoverSVG }                                  from '../cover-service.js';

export async function renderDashboard(container) {
  const { user, progress } = getState();
  const firstName = user.name.split(' ')[0];

  container.innerHTML = `
    ${topBar(`Olá, ${firstName}`, 'Aqui está um resumo do seu percurso formativo.')}
    <div class="dashboard-body">
      <div class="dash-hero">
        <div class="dash-banner">
          <div style="position:relative;z-index:2">
            <div class="banner-eyebrow">CONTINUE ONDE PAROU</div>
            <h2 class="banner-title" id="banner-title">A carregar…</h2>
            <p class="banner-lead" id="banner-lead"></p>
            <button class="banner-btn" id="banner-cta" disabled>
              ${icon('play', 14)} A carregar…
            </button>
          </div>
          <div class="banner-art">${documentStack()}</div>
          <img src="assets/icon.png" alt="" class="banner-watermark" />
        </div>
        <div class="kpi-stack">
          <div class="kpi-card">
            <div class="kpi-label">Progresso global</div>
            <div class="kpi-value" id="kpi-pct">—<span class="kpi-unit">%</span></div>
            <div class="kpi-bar"><div class="kpi-bar-fill" id="kpi-bar" style="width:0%"></div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Módulos completos</div>
            <div class="kpi-value" id="kpi-mods">—<span class="kpi-unit"></span></div>
            <div class="kpi-sub" id="kpi-sub">
              ${icon('award', 13, 'var(--cyan-2)')} —
            </div>
          </div>
        </div>
      </div>

      <section>
        <div class="section-head" id="section-head">
          <div>
            <h2 class="section-title" id="section-title">Formações</h2>
            <div class="section-sub" id="section-sub">A carregar…</div>
          </div>
          <div class="course-filter-bar" id="filter-bar" style="visibility:hidden"></div>
        </div>
        <div class="tab-bar" id="tab-bar" style="visibility:hidden">
          <button class="tab-btn active" data-tab="minhas">
            Minhas Formações
            <span class="tab-count" id="count-minhas">—</span>
          </button>
          <button class="tab-btn" data-tab="disponiveis">
            Formações Disponíveis
            <span class="tab-count" id="count-disponiveis">—</span>
          </button>
        </div>
        <div class="courses-grid" id="courses-grid">
          <div class="view-state view-state-loading" role="status">
            <span class="spinner"></span>
          </div>
        </div>
      </section>
    </div>`;

  const allCourses = await loadCourses();

  const isManager = user?.role === 'administrador' || user?.role === 'gestor_conteudos';

  // Tab 1: Minhas Formações — cursos do departamento/role do utilizador
  const minhas = allCourses.filter(c =>
    (isManager || c.status === 'published') && isCourseAttachedToUser(c, user)
  );

  // Tab 2: Formações Disponíveis — todos os cursos visíveis publicados
  const disponiveis = allCourses.filter(c =>
    (isManager || c.status === 'published') && isCourseVisibleToUser(c, user)
  );

  // KPIs based on minhas formações
  const overall      = globalProgress(minhas, progress);
  const resumeTarget = getResumeTarget(minhas.length ? minhas : disponiveis, progress);
  const resumeCourse = resumeTarget?.course || null;
  const resumeModule = resumeTarget?.module || resumeCourse?.modules[0] || null;

  // Update banner
  document.getElementById('banner-title').textContent =
    resumeCourse ? resumeCourse.title : 'Comece a sua primeira formação';
  document.getElementById('banner-lead').textContent = resumeCourse
    ? 'Está mais perto de completar esta formação. Retome o módulo onde parou.'
    : `Existem ${disponiveis.length} formações disponíveis. Comece pela mais relevante para o seu perfil.`;
  const cta = document.getElementById('banner-cta');
  cta.disabled = false;
  cta.innerHTML = `${icon('play', 14)} ${resumeCourse ? 'Retomar formação' : 'Começar agora'}`;
  cta.addEventListener('click', () => {
    const target = resumeCourse || disponiveis[0];
    if (!target) return;
    const mod = resumeModule || target.modules[0];
    navigate(`/module/${target.id}/${mod.id}`);
  });

  // KPIs
  document.getElementById('kpi-pct').innerHTML = `${overall.pct}<span class="kpi-unit">%</span>`;
  document.getElementById('kpi-bar').style.width = `${overall.pct}%`;
  document.getElementById('kpi-mods').innerHTML = `${overall.doneMods}<span class="kpi-unit">/${overall.totalMods}</span>`;
  document.getElementById('kpi-sub').innerHTML =
    `${icon('award', 13, 'var(--cyan-2)')} ${overall.completedCourses === 1 ? '1 formação concluída' : overall.completedCourses + ' formações concluídas'}`;

  // Tab counts
  document.getElementById('count-minhas').textContent     = minhas.length;
  document.getElementById('count-disponiveis').textContent = disponiveis.length;

  // Show tabs + filter bar
  document.getElementById('tab-bar').style.visibility    = '';
  document.getElementById('filter-bar').style.visibility = '';

  // Wire tabs + filters
  wireDashboard({ minhas, disponiveis, progress });
}

/* ------------------------------------------------------------------ */
/* Tab + filter wiring                                                  */
/* ------------------------------------------------------------------ */

function wireDashboard({ minhas, disponiveis, progress }) {
  let activeTab      = 'minhas';
  let activeEstado   = '';
  let activeCategoria = '';

  const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');

  function currentList() {
    return activeTab === 'minhas' ? minhas : disponiveis;
  }

  function updateFilterBar() {
    const list = currentList();
    const categories = [...new Set(list.map(c => c.category).filter(Boolean))].sort();
    const filterBar = document.getElementById('filter-bar');

    filterBar.innerHTML = `
      ${filterDropdown('filter-estado', 'ESTADO', 'Todos', [
        { value: '', label: 'Todos' },
        { value: 'nao-iniciado', label: 'Não iniciado' },
        { value: 'em-curso',     label: 'Em curso' },
        { value: 'concluida',    label: 'Concluída' },
      ], activeEstado)}
      ${categories.length > 1 ? filterDropdown('filter-categoria', 'CATEGORIA', 'Todas', [
        { value: '', label: 'Todas' },
        ...categories.map(c => ({ value: c, label: c })),
      ], activeCategoria) : ''}
      <button class="filter-clear-btn" id="filter-clear" style="display:${activeEstado || activeCategoria ? '' : 'none'}">
        ${icon('x', 12)} Limpar
      </button>`;

    filterBar.querySelectorAll('.filter-dropdown').forEach(dd => {
      const btn    = dd.querySelector('.filter-dropdown-btn');
      const panel  = dd.querySelector('.filter-dropdown-panel');
      const valEl  = dd.querySelector('.filter-dropdown-value');
      const filterId = dd.dataset.filterId;

      btn.addEventListener('click', e => {
        e.stopPropagation();
        const open = panel.style.display === 'block';
        closeAllPanels();
        panel.style.display = open ? 'none' : 'block';
      });

      panel.querySelectorAll('.filter-dropdown-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const val = opt.dataset.value;
          if (filterId === 'filter-estado')    activeEstado    = val;
          if (filterId === 'filter-categoria') activeCategoria = val;
          valEl.textContent = opt.dataset.label;
          btn.classList.toggle('active', val !== '');
          panel.querySelectorAll('.filter-dropdown-option').forEach(o =>
            o.classList.toggle('selected', o.dataset.value === val));
          panel.style.display = 'none';
          renderCards();
        });
      });
    });

    const clearBtn = document.getElementById('filter-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        activeEstado    = '';
        activeCategoria = '';
        updateFilterBar();
        renderCards();
      });
    }
  }

  function renderCards() {
    const list = currentList();
    const filtered = list.filter(c => {
      const p = courseProgress(c, progress);
      if (activeEstado === 'nao-iniciado' && p.pct !== 0) return false;
      if (activeEstado === 'em-curso'     && (p.pct === 0 || p.pct === 100)) return false;
      if (activeEstado === 'concluida'    && p.pct !== 100) return false;
      if (activeCategoria && c.category !== activeCategoria) return false;
      return true;
    });

    const label = activeTab === 'minhas' ? 'Minhas Formações' : 'Formações Disponíveis';
    document.getElementById('section-title').textContent = label;
    document.getElementById('section-sub').textContent =
      filtered.length === list.length
        ? `${list.length} formação${list.length !== 1 ? 'ões' : ''}`
        : `${filtered.length} de ${list.length} formações`;

    const clearBtn = document.getElementById('filter-clear');
    if (clearBtn) clearBtn.style.display = (activeEstado || activeCategoria) ? '' : 'none';

    const grid = document.getElementById('courses-grid');
    if (!filtered.length) {
      const msg = !list.length
        ? (activeTab === 'minhas'
          ? 'Não existem formações atribuídas ao seu perfil neste momento.'
          : 'Não existem formações disponíveis neste momento.')
        : 'Nenhuma formação corresponde aos filtros selecionados.';
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-inner">
            <div class="empty-state-icon">${icon('book', 32, 'var(--ink-3)')}</div>
            <div class="empty-state-title">${!list.length ? 'Sem formações' : 'Sem resultados'}</div>
            <div class="empty-state-sub">${msg}</div>
          </div>
        </div>`;
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(course => {
      const p  = courseProgress(course, progress);
      const el = document.createElement('article');
      el.className = 'course-card';
      el.innerHTML = courseCard(course, p);
      el.querySelector('.course-cta').addEventListener('click', e => {
        e.stopPropagation();
        openCourse(course, progress);
      });
      el.addEventListener('click', () => openCourse(course, progress));
      grid.appendChild(el);
    });
  }

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab       = btn.dataset.tab;
      activeEstado    = '';
      activeCategoria = '';
      tabBtns.forEach(b => b.classList.toggle('active', b === btn));
      updateFilterBar();
      renderCards();
    });
  });

  document.addEventListener('click', closeAllPanels);

  // Initial render
  updateFilterBar();
  renderCards();
}

function closeAllPanels() {
  document.querySelectorAll('.filter-dropdown-panel').forEach(p => p.style.display = 'none');
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function filterDropdown(id, label, defaultLabel, options, activeValue = '') {
  return `
    <div class="filter-dropdown" data-filter-id="${id}" data-default-label="${defaultLabel}">
      <button class="filter-dropdown-btn${activeValue ? ' active' : ''}" type="button">
        <span>
          <span class="filter-dropdown-label">${label}</span>
          <span class="filter-dropdown-value">${activeValue ? (options.find(o => o.value === activeValue)?.label ?? defaultLabel) : defaultLabel}</span>
        </span>
        <span class="filter-dropdown-chevron">${icon('chevronDown', 12)}</span>
      </button>
      <div class="filter-dropdown-panel" style="display:none">
        ${options.map(o => `
          <div class="filter-dropdown-option${o.value === activeValue ? ' selected' : ''}"
               data-value="${o.value}" data-label="${o.label}">
            ${o.label}
            ${o.value === activeValue ? `<span class="filter-dropdown-check">${icon('check', 12)}</span>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
}

function openCourse(course, progress) {
  const cp = progress[course.id] || {};
  const nextModule = course.modules.find(m => !cp[m.id]?.quizPassed) || course.modules[0];
  navigate(`/module/${course.id}/${nextModule.id}`);
}

function topBar(title, subtitle) {
  return `
    <div class="topbar">
      <div>
        <h1 class="topbar-title">${title}</h1>
        <div class="topbar-sub">${subtitle}</div>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          ${icon('search', 15, '#9CA3AF')}
          <input class="search-input" placeholder="Pesquisar formações…" />
        </div>
      </div>
    </div>`;
}

function courseCard(course, p) {
  const statusColor = p.status === 'Concluída' ? 'var(--green)' : p.status === 'Em curso' ? 'var(--amber)' : 'var(--ink-3)';
  const statusBg    = p.status === 'Concluída' ? 'var(--green-soft)' : p.status === 'Em curso' ? 'var(--amber-soft)' : '#F4F6FA';
  const ctaLabel    = p.pct === 0 ? 'Começar' : p.pct === 100 ? 'Rever' : 'Continuar';

  return `
    <div class="course-cover">${
      course.coverImageUrl
        ? `<img src="${course.coverImageUrl.replace(/"/g, '&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">`
        : courseCoverSVG(course.id, course.category, course.coverId)
    }<div class="course-category">${course.category}</div></div>
    <div class="course-body">
      <div class="course-status" style="background:${statusBg};color:${statusColor}">
        ${p.status === 'Concluída' ? icon('check', 11, statusColor, 3) : ''}
        ${p.status}
      </div>
      <h3 class="course-title">${course.title}</h3>
      <p class="course-subtitle">${course.subtitle}</p>
      <div class="course-meta">
        <span class="meta-item">${icon('book', 13, 'var(--ink-3)')} ${course.modules.length} módulos</span>
        <span class="meta-item">${icon('clock', 13, 'var(--ink-3)')} ${course.duration}</span>
      </div>
      <div class="course-progress-top">
        <span>Progresso</span>
        <span class="course-progress-pct">${p.completed}/${p.total} · ${p.pct}%</span>
      </div>
      <div class="course-bar"><div class="course-bar-fill" style="width:${p.pct}%"></div></div>
      <button class="course-cta">
        ${ctaLabel} ${icon('arrowRight', 13)}
      </button>
    </div>`;
}

function documentStack() {
  return `<svg width="200" height="160" viewBox="0 0 220 180" fill="none">
    <rect x="40" y="30" width="120" height="140" rx="6" fill="white" opacity=".08" transform="rotate(-8 100 100)"/>
    <rect x="55" y="20" width="120" height="140" rx="6" fill="white" opacity=".14" transform="rotate(-3 115 90)"/>
    <rect x="70" y="14" width="120" height="140" rx="6" fill="white" opacity=".95"/>
    <rect x="84" y="32" width="60" height="4"   rx="2"   fill="#1A3A5C"/>
    <rect x="84" y="44" width="92" height="3"   rx="1.5" fill="#C9D2DE"/>
    <rect x="84" y="52" width="80" height="3"   rx="1.5" fill="#C9D2DE"/>
    <rect x="84" y="60" width="88" height="3"   rx="1.5" fill="#C9D2DE"/>
    <rect x="84" y="72" width="76" height="3"   rx="1.5" fill="#C9D2DE"/>
    <rect x="84" y="92" width="92" height="40"  rx="4"   fill="#E6F7FE"/>
    <circle cx="100" cy="112" r="10" fill="#00AEEF"/>
    <polyline points="96 112 99 115 105 109" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="120" y="106" width="48" height="3.5" rx="1.5" fill="#1A3A5C"/>
    <rect x="120" y="115" width="36" height="3"   rx="1.5" fill="#C9D2DE"/>
    <rect x="84" y="142" width="32" height="6"   rx="3"   fill="#00AEEF"/>
  </svg>`;
}
