import { icon } from '../icons.js';
import { courseCoverSVG } from '../cover-service.js';
import { loadCourses, courseProgress, getResumeTarget, globalProgress, getCoursesStatus, getCourseDeadlineState, isCourseAssignedToUser, isCourseAttachedToUser, isCourseVisibleToUser } from '../course-service.js';
import { navigate } from '../router.js';
import { getState } from '../state.js';
import { renderLoadingState, renderInlineNotice, renderEmptyState } from '../ui.js';

export async function renderDashboard(container) {
  container.innerHTML = renderLoadingState('A carregar formações...');

  const { user, progress } = getState();
  let courses = [];
  try {
    const all = await loadCourses();
    courses = all.filter(c => c.status === 'published' && isCourseVisibleToUser(c, user));
  } catch (err) {
    console.error(err);
    container.innerHTML = renderEmptyState({
      iconName: 'x',
      title: 'Não foi possível carregar as formações',
      message: 'Atualize a página ou tente novamente dentro de instantes.',
      action: `<button class="btn-next" onclick="navigate('/dashboard')">Tentar novamente</button>`,
    });
    return;
  }

  const coursesStatus      = getCoursesStatus();
  const overall            = globalProgress(courses, progress);
  const resumeTarget       = getResumeTarget(courses, progress);
  const resumeCourse       = resumeTarget?.course || null;
  const resumeModule       = resumeTarget?.module || null;
  const firstName          = (user.name || 'Colaborador').split(' ')[0];

  container.innerHTML = `
    ${topBar(`Olá, ${firstName}`, 'Aqui está um resumo do seu percurso formativo.')}

    ${coursesStatus.fallback ? renderInlineNotice({
      type: 'warning',
      title: 'Catálogo local em utilização',
      message: coursesStatus.error
        ? 'Não foi possível ligar ao Firebase. As formações apresentadas podem não refletir as últimas alterações.'
        : 'Ainda não existem formações publicadas no Firebase. Está a ver o catálogo de demonstração.',
    }) : ''}

    <div class="dashboard-body">
      <!-- Hero row -->
      <div class="dash-hero">
        <div class="dash-banner">
          <div style="position:relative;z-index:2">
            <div class="banner-eyebrow">CONTINUE ONDE PAROU</div>
            <h2 class="banner-title">${resumeCourse ? resumeCourse.title : 'Comece a sua primeira formação'}</h2>
            <p class="banner-lead">
              ${resumeCourse
                ? `Retome em "${resumeModule?.title || 'módulo seguinte'}" e continue o percurso a partir do ponto certo.`
                : 'Existem ' + courses.length + ' formações à sua espera. Comece pela mais relevante para o seu departamento.'}
            </p>
            <button class="banner-btn" id="banner-cta">
              ${icon('play', 14)}
              ${resumeCourse ? 'Retomar formação' : 'Começar agora'}
            </button>
          </div>
          <div class="banner-art">${documentStack()}</div>
          <img src="assets/icon.png" alt="" class="banner-watermark" />
        </div>

        <div class="kpi-stack">
          <div class="kpi-card">
            <div class="kpi-label">Progresso global</div>
            <div class="kpi-value">${overall.pct}<span class="kpi-unit">%</span></div>
            <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${overall.pct}%"></div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Módulos completos</div>
            <div class="kpi-value">${overall.doneMods}<span class="kpi-unit">/${overall.totalMods}</span></div>
            <div class="kpi-sub">
              ${icon('award', 13, 'var(--cyan-2)')}
              ${overall.completedCourses === 1 ? '1 formação concluída' : overall.completedCourses + ' formações concluídas'}
            </div>
          </div>
        </div>
      </div>

      <!-- Course list -->
      <section>
        <div class="section-head">
          <div class="section-title">Formações</div>
          <div class="course-filter-bar" id="course-filter-bar">
            <button class="filter-clear-btn" id="filter-clear-btn" style="display:none">✕ Limpar filtros</button>
            <div class="filter-dropdown" id="filter-categoria"></div>
            <div class="filter-dropdown" id="filter-atribuicao"></div>
            <div class="filter-dropdown" id="filter-estado"></div>
          </div>
        </div>
        <div class="courses-catalog" id="courses-grid"></div>
        <div class="empty-state small" id="courses-empty" style="display:none">
          <div class="empty-state-inner">
            <div class="empty-state-icon">${icon('search', 28, 'var(--ink-3)')}</div>
            <div class="empty-state-title">Sem formações encontradas</div>
            <div class="empty-state-sub">Ajuste a pesquisa ou escolha outro filtro.</div>
          </div>
        </div>
      </section>
    </div>`;

  // Banner CTA
  const bannerCta = document.getElementById('banner-cta');
  if (!bannerCta) return;
  bannerCta.addEventListener('click', () => {
    const target = resumeCourse || courses[0];
    const targetModule = resumeModule || target?.modules?.[0];
    if (target && targetModule) navigate(`/module/${target.id}/${targetModule.id}`);
  });

  const searchInput = container.querySelector('.search-input');
  const clearBtn = document.getElementById('filter-clear-btn');
  const catContainer = document.getElementById('filter-categoria');
  const assContainer = document.getElementById('filter-atribuicao');
  const stateContainer = document.getElementById('filter-estado');
  const grid = document.getElementById('courses-grid');
  if (!searchInput || !clearBtn || !catContainer || !assContainer || !stateContainer || !grid) return;

  const categories = ['Todas', ...new Set(courses.map(c => c.category).filter(Boolean))];
  const assignmentTypes = ['Todas', 'Obrigatórias', 'Opcionais'];
  const statuses = ['Todos', 'Não iniciada', 'Em curso', 'Concluída', 'Atrasada'];

  let activeCategory = 'Todas';
  let activeAssignment = 'Todas';
  let activeStatus = 'Todos';
  let query = '';
  let activeTab = 'assigned'; // 'assigned' | 'catalog'

  function updateClearBtn() {
    const hasFilter = activeCategory !== 'Todas' || activeAssignment !== 'Todas' || activeStatus !== 'Todos';
    clearBtn.style.display = hasFilter ? 'inline-flex' : 'none';
  }

  function buildDropdown(container, labelText, options, defaultVal, onSelect) {
    let current = defaultVal;

    const btn = document.createElement('button');
    const panel = document.createElement('div');
    panel.className = 'filter-dropdown-panel';
    panel.style.display = 'none';

    function renderBtn() {
      btn.className = 'filter-dropdown-btn' + (current !== defaultVal ? ' active' : '');
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = `
        <span>
          <span class="filter-dropdown-label">${labelText}</span>
          <span class="filter-dropdown-value">${current}</span>
        </span>
        <span class="filter-dropdown-chevron">▾</span>`;
    }

    function renderPanel() {
      panel.innerHTML = options.map(opt => `
        <div class="filter-dropdown-option${opt === current ? ' selected' : ''}"
             role="option" aria-selected="${opt === current}" data-value="${opt}">
          ${opt}${opt === current ? '<span class="filter-dropdown-check">✓</span>' : ''}
        </div>`).join('');
      panel.querySelectorAll('.filter-dropdown-option').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          current = el.dataset.value;
          renderBtn();
          renderPanel();
          panel.style.display = 'none';
          onSelect(current);
        });
      });
    }

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = panel.style.display !== 'none';
      document.querySelectorAll('.filter-dropdown-panel').forEach(p => { p.style.display = 'none'; });
      document.querySelectorAll('.filter-dropdown-btn').forEach(b => { b.setAttribute('aria-expanded', 'false'); });
      if (!isOpen) {
        panel.style.display = 'block';
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    container.appendChild(btn);
    container.appendChild(panel);
    renderBtn();
    renderPanel();

    return {
      reset() {
        current = defaultVal;
        renderBtn();
        renderPanel();
      }
    };
  }

  const catDrop = buildDropdown(catContainer, 'Categoria', categories, 'Todas', val => {
    activeCategory = val; updateClearBtn(); renderCourseGrid();
  });
  const assDrop = buildDropdown(assContainer, 'Atribuição', assignmentTypes, 'Todas', val => {
    activeAssignment = val; updateClearBtn(); renderCourseGrid();
  });
  const stateDrop = buildDropdown(stateContainer, 'Estado', statuses, 'Todos', val => {
    activeStatus = val; updateClearBtn(); renderCourseGrid();
  });

  clearBtn.addEventListener('click', () => {
    activeCategory = 'Todas'; activeAssignment = 'Todas'; activeStatus = 'Todos';
    catDrop.reset(); assDrop.reset(); stateDrop.reset();
    updateClearBtn(); renderCourseGrid();
  });

  function onDocClick() {
    if (!container.isConnected) {
      document.removeEventListener('click', onDocClick);
      return;
    }
    container.querySelectorAll('.filter-dropdown-panel').forEach(p => { p.style.display = 'none'; });
    container.querySelectorAll('.filter-dropdown-btn').forEach(b => { b.setAttribute('aria-expanded', 'false'); });
  }
  document.addEventListener('click', onDocClick);

  searchInput.addEventListener('input', e => {
    query = e.target.value.trim().toLowerCase();
    renderCourseGrid();
  });

  renderCourseGrid();

  function renderCourseGrid() {
    const filteredCourses = courses.filter(course => {
      const p = courseProgress(course, progress);
      const matchesCategory = activeCategory === 'Todas' || course.category === activeCategory;
      const matchesAssignment = activeAssignment === 'Todas'
        || (activeAssignment === 'Obrigatórias' && course.isRequired)
        || (activeAssignment === 'Opcionais' && !course.isRequired);
      const deadline = getCourseDeadlineState(course, progress);
      const matchesStatus = activeStatus === 'Todos'
        || p.status === activeStatus
        || (activeStatus === 'Atrasada' && deadline?.isOverdue);
      const haystack = `${course.title} ${course.subtitle} ${course.category}`.toLowerCase();
      return matchesCategory && matchesAssignment && matchesStatus && (!query || haystack.includes(query));
    });

    renderCards(filteredCourses);
  }

  function renderCards(list) {
    const empty = document.getElementById('courses-empty');
    grid.innerHTML = '';

    const assigned = list.filter(course => isCourseAttachedToUser(course, getState().user));
    const catalog  = list.filter(course => !isCourseAttachedToUser(course, getState().user));
    const activeList = activeTab === 'assigned' ? assigned : catalog;
    const otherList  = activeTab === 'assigned' ? catalog  : assigned;

    if (!activeList.length && otherList.length) {
      activeTab = activeTab === 'assigned' ? 'catalog' : 'assigned';
      renderCourseGrid();
      return;
    }

    empty.style.display = activeList.length ? 'none' : 'grid';

    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';
    tabBar.innerHTML = `
      <button type="button" class="tab-btn ${activeTab === 'assigned' ? 'active' : ''}" data-tab="assigned">
        Atribuídas a mim <span class="tab-count">${assigned.length}</span>
      </button>
      <button type="button" class="tab-btn ${activeTab === 'catalog' ? 'active' : ''}" data-tab="catalog">
        Catálogo disponível <span class="tab-count">${catalog.length}</span>
      </button>`;
    tabBar.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        renderCourseGrid();
      });
    });
    grid.appendChild(tabBar);

    if (!activeList.length) return;

    const section = document.createElement('div');
    section.innerHTML = renderCourseItems(activeList);
    grid.appendChild(section);

    grid.querySelectorAll('.course-card').forEach(el => {
      const course = list.find(item => item.id === el.dataset.courseId);
      if (!course) return;
      const p = courseProgress(course, progress);
      el.classList.toggle('course-card--in-progress', p.status === 'Em curso');
      el.classList.toggle('course-card--completed',   p.status === 'Concluída');
      el.querySelector('.course-cta')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCourse(course);
      });
      el.addEventListener('click', () => openCourse(course));
    });
  }
}

function renderCourseSection(title, subtitle, courses) {
  if (!courses.length) return '';
  return `
    <section class="course-catalog-section">
      <div class="course-catalog-head">
        <div>
          <h3 class="course-catalog-title">${title}</h3>
          <div class="course-catalog-sub">${subtitle}</div>
        </div>
        <span class="course-catalog-count">${courses.length}</span>
      </div>
      <div class="courses-grid">
        ${courses.map(course => `
          <button type="button" class="course-card" data-course-id="${course.id}" aria-label="Abrir formação: ${course.title}">
            ${courseCard(course, courseProgress(course, getState().progress))}
          </button>
        `).join('')}
      </div>
    </section>`;
}

function renderCourseItems(courses) {
  return `<div class="courses-grid">
    ${courses.map(course => `
      <button type="button" class="course-card" data-course-id="${course.id}" aria-label="Abrir formação: ${course.title}">
        ${courseCard(course, courseProgress(course, getState().progress))}
      </button>`).join('')}
  </div>`;
}

function openCourse(course) {
  navigate(`/course/${course.id}`);
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
          <input class="search-input" placeholder="Pesquisar formações…" aria-label="Pesquisar formações" />
        </div>
      </div>
    </div>`;
}

function courseCard(course, p) {
  const statusColor = p.status === 'Concluída' ? 'var(--green)' : p.status === 'Em curso' ? 'var(--amber)' : 'var(--ink-3)';
  const statusBg    = p.status === 'Concluída' ? 'var(--green-soft)' : p.status === 'Em curso' ? 'var(--amber-soft)' : '#F4F6FA';
  const ctaLabel    = p.pct === 0 ? 'Começar' : p.pct === 100 ? 'Rever' : 'Continuar';
  const deadline    = getCourseDeadlineState(course, getState().progress);
  const assignmentClass = course.isRequired ? 'required' : 'optional';
  const assignmentLabel = course.isRequired ? 'Obrigatória' : 'Opcional';

  return `
    <div class="course-cover">${courseCoverSVG(course.id, course.category, course.coverId)}<div class="course-category">${course.category}</div></div>
    <div class="course-body">
      <div class="course-status-row">
        <div class="course-status" style="background:${statusBg};color:${statusColor}">
          ${p.status === 'Concluída' ? icon('check', 11, statusColor, 3) : ''}
          ${p.status}
        </div>
        <div class="course-assignment ${assignmentClass}">${assignmentLabel}</div>
      </div>
      <h3 class="course-title">${course.title}</h3>
      <p class="course-subtitle">${course.subtitle}</p>
      <div class="course-meta">
        <span class="meta-item">${icon('book', 13, 'var(--ink-3)')} ${course.modules.length} módulos</span>
        <span class="meta-item">${icon('clock', 13, 'var(--ink-3)')} ${course.duration}</span>
      </div>
      ${deadline ? deadlineBadge(deadline) : ''}
      <div class="course-progress-top">
        <span>Progresso</span>
        <span class="course-progress-pct">${p.completed}/${p.total} · ${p.pct}%</span>
      </div>
      <div class="course-bar"><div class="course-bar-fill" style="width:${p.pct}%"></div></div>
      <div class="course-cta">
        ${ctaLabel} ${icon('arrowRight', 13)}
      </div>
    </div>`;
}

function deadlineBadge(deadline) {
  const label = deadline.completed
    ? `Concluída dentro do prazo: ${deadline.label}`
    : deadline.isOverdue
      ? `Atrasada desde ${deadline.label}`
      : deadline.isDueSoon
        ? `Termina em ${Math.max(deadline.daysRemaining, 0)} dias (${deadline.label})`
        : `Data limite: ${deadline.label}`;
  return `
    <div class="course-deadline ${deadline.status}">
      ${icon('clock', 12, 'currentColor')} ${label}
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
