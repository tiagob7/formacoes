import { icon } from '../icons.js';
import { loadCourses, courseProgress, getResumeTarget, globalProgress, getCoursesStatus, getCourseDeadlineState, isCourseAssignedToUser, isCourseVisibleToUser } from '../course-service.js';
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
          <div>
            <h2 class="section-title">Formações disponíveis</h2>
            <div class="section-sub" id="courses-count">${courses.length} formações atribuídas ao seu perfil</div>
          </div>
          <div class="course-filter-stack">
            <div class="course-filter-group" id="category-filters" aria-label="Filtrar por categoria"></div>
            <div class="course-filter-group" id="assignment-filters" aria-label="Filtrar por tipo de atribuição"></div>
            <div class="course-filter-group" id="status-filters" aria-label="Filtrar por estado"></div>
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

  const searchInput = document.querySelector('.search-input');
  const categoryFilters = document.getElementById('category-filters');
  const assignmentFilters = document.getElementById('assignment-filters');
  const statusFilters = document.getElementById('status-filters');
  const grid = document.getElementById('courses-grid');
  if (!searchInput || !categoryFilters || !assignmentFilters || !statusFilters || !grid) return;
  const categories = ['Todas', ...new Set(courses.map(course => course.category).filter(Boolean))];
  const assignmentTypes = ['Todas', 'Obrigatórias', 'Opcionais'];
  const statuses = ['Todos', 'Não iniciada', 'Em curso', 'Concluída', 'Atrasada'];
  let activeCategory = 'Todas';
  let activeAssignment = 'Todas';
  let activeStatus = 'Todos';
  let query = '';

  categoryFilters.innerHTML = categories.map((category, index) => `
    <button class="filter-chip ${index === 0 ? 'active' : ''}" data-category="${category}">
      ${category}
    </button>
  `).join('');

  statusFilters.innerHTML = statuses.map((status, index) => `
    <button class="filter-chip ${index === 0 ? 'active' : ''}" data-status="${status}">
      ${status}
    </button>
  `).join('');

  assignmentFilters.innerHTML = assignmentTypes.map((type, index) => `
    <button class="filter-chip ${index === 0 ? 'active' : ''}" data-assignment="${type}">
      ${type}
    </button>
  `).join('');

  categoryFilters.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      categoryFilters.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      renderCourseGrid();
    });
  });

  statusFilters.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatus = btn.dataset.status;
      statusFilters.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      renderCourseGrid();
    });
  });

  assignmentFilters.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeAssignment = btn.dataset.assignment;
      assignmentFilters.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      renderCourseGrid();
    });
  });

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

    document.getElementById('courses-count').textContent =
      filteredCourses.length === courses.length
        ? `${courses.length} formações atribuídas ao seu perfil`
        : `${filteredCourses.length} de ${courses.length} formações`;

    renderCards(filteredCourses);
  }

  function renderCards(list) {
    const empty = document.getElementById('courses-empty');
    grid.innerHTML = '';
    empty.style.display = list.length ? 'none' : 'grid';
    if (!list.length) return;

    const assigned = list.filter(course => isCourseAssignedToUser(course, getState().user));
    const catalog = list.filter(course => !course.isRequired);

    grid.innerHTML = [
      renderCourseSection('Atribuídas a mim', 'Formações obrigatórias para concluir.', assigned),
      renderCourseSection('Catálogo disponível', 'Formações opcionais que pode iniciar quando fizer sentido.', catalog),
    ].filter(Boolean).join('');

    grid.querySelectorAll('.course-card').forEach(el => {
      const course = list.find(item => item.id === el.dataset.courseId);
      if (!course) return;
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
    <div class="course-cover">${courseCoverSVG(course.id, course.category)}<div class="course-category">${course.category}</div></div>
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

function courseCoverSVG(id, category = '') {
  const cat = (category || '').toLowerCase();
  const palettes = [
    ['#1A3A5C','#0E2540'],
    ['#14304D','#0a1f35'],
    ['#1F4060','#152C45'],
    ['#0E3352','#091f33'],
  ];
  const idx = (id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length;
  const [c1, c2] = palettes[idx];
  const gid = `gc-${(id || 'x').replace(/[^a-z0-9]/gi, '')}`;

  const wrap = (shape) => `<svg viewBox="0 0 200 110" fill="none" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="200" height="110" fill="url(#${gid})"/>
    <circle cx="170" cy="15" r="55" fill="#00AEEF" opacity=".13"/>
    <circle cx="20" cy="95" r="38" fill="#00AEEF" opacity=".09"/>
    ${shape}
  </svg>`;

  if (/conformidade|rgpd|privacidade|lei|gdpr|dados/.test(cat))
    return wrap(`<g transform="translate(72,22)"><path d="M28 4L52 14V32C52 46 40 54 28 58C16 54 4 46 4 32V14Z" fill="white" opacity=".95"/><path d="M18 32L25 39L40 24" stroke="${c1}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`);

  if (/seguran|sa[uú]de|sst|emerg|riscos/.test(cat))
    return wrap(`<g transform="translate(76,20)"><rect x="0" y="0" width="48" height="68" rx="8" fill="white" opacity=".9"/><line x1="24" y1="14" x2="24" y2="54" stroke="${c1}" stroke-width="5" stroke-linecap="round"/><line x1="8" y1="34" x2="40" y2="34" stroke="${c1}" stroke-width="5" stroke-linecap="round"/></g>`);

  if (/soft|comunica|lideran|pessoas|atendimento|rela/.test(cat))
    return wrap(`<g transform="translate(52,20)"><rect x="0" y="0" width="80" height="50" rx="10" fill="white" opacity=".9"/><path d="M14 50L8 64" stroke="white" stroke-width="2" opacity=".5"/><rect x="14" y="13" width="52" height="5" rx="2.5" fill="#C9D2DE"/><rect x="14" y="25" width="36" height="4" rx="2" fill="#C9D2DE"/><rect x="14" y="35" width="44" height="4" rx="2" fill="#C9D2DE"/></g>`);

  if (/t[eé]cnic|inform[aá]t|sistema|digital|it|tech/.test(cat))
    return wrap(`<g transform="translate(60,18)"><rect x="0" y="0" width="80" height="52" rx="6" fill="white" opacity=".9"/><rect x="8" y="8" width="64" height="36" rx="3" fill="${c1}" opacity=".8"/><rect x="28" y="52" width="24" height="5" rx="2" fill="white" opacity=".6"/></g>`);

  if (/financ|contabil|gest[aã]o|or[cç]am|custos/.test(cat))
    return wrap(`<g transform="translate(74,18)"><circle cx="26" cy="28" r="28" fill="white" opacity=".9"/><text x="26" y="37" text-anchor="middle" font-size="28" font-family="sans-serif" fill="${c1}" font-weight="bold">€</text></g>`);

  // Empregado de mesa / restaurante / serviço / sala
  if (/mesa|restaurante|sala|servi[cç]o|waiter|f&b|f and b/.test(cat))
    return wrap(`<g transform="translate(60,16)">
      <circle cx="40" cy="38" r="32" fill="white" opacity=".9"/>
      <circle cx="40" cy="38" r="26" fill="none" stroke="#C9D2DE" stroke-width="1.5"/>
      <ellipse cx="40" cy="30" rx="10" ry="4" fill="${c1}" opacity=".7"/>
      <rect x="26" y="33" width="28" height="2" rx="1" fill="${c1}" opacity=".5"/>
      <rect x="38" y="35" width="4" height="14" rx="2" fill="${c1}" opacity=".7"/>
      <ellipse cx="40" cy="50" rx="14" ry="3" fill="${c1}" opacity=".3"/>
    </g>`);

  // Housekeeping / limpeza / quartos / lavandaria
  if (/housekeeping|limpeza|quartos|lavand|andares|camareira/.test(cat))
    return wrap(`<g transform="translate(58,14)">
      <rect x="0" y="20" width="60" height="58" rx="6" fill="white" opacity=".9"/>
      <rect x="8" y="28" width="44" height="6" rx="3" fill="#C9D2DE"/>
      <rect x="8" y="40" width="36" height="4" rx="2" fill="#C9D2DE"/>
      <rect x="8" y="50" width="40" height="4" rx="2" fill="#C9D2DE"/>
      <path d="M20 0 Q30 8 40 0 Q50 8 60 0" stroke="white" stroke-width="2.5" fill="none" opacity=".6" stroke-linecap="round"/>
      <circle cx="30" cy="16" r="5" fill="white" opacity=".7"/>
    </g>`);

  // Cozinha / chef / culinária / pastelaria
  if (/cozinha|chef|culin[aá]|pastelaria|gastronomia|cozinheiro/.test(cat))
    return wrap(`<g transform="translate(62,12)">
      <rect x="4" y="28" width="56" height="46" rx="5" fill="white" opacity=".9"/>
      <rect x="12" y="36" width="40" height="6" rx="3" fill="#C9D2DE"/>
      <rect x="12" y="48" width="28" height="4" rx="2" fill="#C9D2DE"/>
      <ellipse cx="32" cy="24" rx="22" ry="10" fill="white" opacity=".9"/>
      <ellipse cx="32" cy="16" rx="14" ry="7" fill="white" opacity=".7"/>
      <rect x="30" y="8" width="4" height="8" rx="2" fill="white" opacity=".5"/>
    </g>`);

  // default — documento/livro
  return wrap(`<g transform="translate(70,16)"><rect x="4" y="0" width="52" height="70" rx="5" fill="white" opacity=".9"/><rect x="14" y="14" width="32" height="4" rx="2" fill="#C9D2DE"/><rect x="14" y="24" width="24" height="3" rx="1.5" fill="#C9D2DE"/><rect x="14" y="33" width="28" height="3" rx="1.5" fill="#C9D2DE"/><rect x="14" y="42" width="20" height="3" rx="1.5" fill="#C9D2DE"/></g>`);
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
