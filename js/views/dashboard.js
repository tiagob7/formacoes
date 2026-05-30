import { icon }                                           from '../icons.js';
import { COURSES, courseProgress, getResumeCourse, globalProgress } from '../data.js';
import { navigate }                                        from '../router.js';
import { getState }                                        from '../state.js';
import { courseCoverSVG }                                  from '../cover-service.js';

export function renderDashboard(container) {
  const { user, progress } = getState();
  const overall            = globalProgress(progress);
  const resumeCourse       = getResumeCourse(progress);
  const firstName          = user.name.split(' ')[0];

  container.innerHTML = `
    ${topBar(`Olá, ${firstName}`, 'Aqui está um resumo do seu percurso formativo.')}

    <div class="dashboard-body">
      <!-- Hero row -->
      <div class="dash-hero">
        <div class="dash-banner">
          <div style="position:relative;z-index:2">
            <div class="banner-eyebrow">CONTINUE ONDE PAROU</div>
            <h2 class="banner-title">${resumeCourse ? resumeCourse.title : 'Comece a sua primeira formação'}</h2>
            <p class="banner-lead">
              ${resumeCourse
                ? 'Está mais perto de completar esta formação. Retome o módulo onde parou.'
                : 'Existem ' + COURSES.length + ' formações à sua espera. Comece pela mais relevante para o seu departamento.'}
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
            <div class="section-sub">${COURSES.length} formações atribuídas ao seu perfil</div>
          </div>
        </div>
        <div class="courses-grid" id="courses-grid"></div>
      </section>
    </div>`;

  // Banner CTA
  document.getElementById('banner-cta').addEventListener('click', () => {
    const target = resumeCourse || COURSES[0];
    navigate(`/module/${target.id}/${target.modules[0].id}`);
  });

  // Render cards
  const grid = document.getElementById('courses-grid');
  COURSES.forEach(course => {
    const p   = courseProgress(course, progress);
    const el  = document.createElement('article');
    el.className = 'course-card';
    el.innerHTML = courseCard(course, p);
    el.querySelector('.course-cta').addEventListener('click', (e) => {
      e.stopPropagation();
      openCourse(course, progress);
    });
    el.addEventListener('click', () => openCourse(course, progress));
    grid.appendChild(el);
  });
}

function openCourse(course, progress) {
  // Navigate to the first incomplete module, or first module if all done
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
        <button class="icon-btn">
          ${icon('bell', 17)}
          <span class="notif-dot"></span>
        </button>
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
