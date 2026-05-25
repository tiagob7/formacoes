import { icon } from '../icons.js';
import { getCourseById, getModuleById, courseProgress, isCourseVisibleToUser } from '../course-service.js';
import { getState, setState, updateModuleProgress } from '../state.js';
import { navigate } from '../router.js';
import { saveModuleProgress, getModulePdfUrl, uploadModulePDF } from '../firebase-service.js';
import { showToast, renderLoadingState, renderEmptyState, renderInlineNotice } from '../ui.js';

export async function renderModule(container, { courseId, moduleId }) {
  container.innerHTML = renderLoadingState('A carregar módulo...');

  setState({ courseId, moduleId, view: 'module' });
  const { user, progress } = getState();
  let course = null;
  let mod = null;

  try {
    course = await getCourseById(courseId);
    mod = await getModuleById(courseId, moduleId);
  } catch (err) {
    console.error(err);
  }

  if (!course || !mod || !isCourseVisibleToUser(course, user)) {
    container.innerHTML = renderEmptyState({
      iconName: 'info',
      title: 'Módulo não encontrado',
      message: 'O módulo pode ter sido removido ou ainda não estar publicado.',
      action: `<button class="btn-next" onclick="navigate('/dashboard')">Voltar ao painel</button>`,
    });
    return;
  }

  const cp = progress?.[courseId]?.[moduleId] || {};
  const moduleState = getModuleLearningState(cp);

  let pdfUrl = null;
  let pdfError = false;
  try { pdfUrl = await getModulePdfUrl(courseId, moduleId); } catch { pdfError = true; }

  const { completed, total } = courseProgress(course, progress);
  const pct = Math.round((completed / total) * 100);

  container.innerHTML = `
    ${topBar(course)}
    ${pdfError ? renderInlineNotice({
      type: 'warning',
      title: 'PDF indisponível',
      message: 'Não foi possível obter o PDF deste módulo. Está disponível o conteúdo alternativo publicado.',
    }) : ''}
    <div class="module-layout">
      ${moduleSidebar(course, moduleId, progress, pct, completed, total)}
      <div class="module-main">
        ${pdfToolbar(mod, user, pdfUrl, moduleState)}
        <div class="pdf-content" id="pdf-content">
          ${pdfUrl
            ? `<div class="pdf-iframe-wrapper">
                 <iframe src="${pdfUrl}" class="pdf-iframe" title="${mod.title}"></iframe>
               </div>`
            : renderDocumentContent(mod, course)}
        </div>
        ${moduleActionBar(moduleState)}
      </div>
    </div>`;

  container.querySelectorAll('.module-item').forEach(el => {
    el.addEventListener('click', () => {
      navigate(`/module/${el.dataset.courseId}/${el.dataset.moduleId}`);
    });
  });

  const toggleBtn = document.getElementById('module-sidebar-toggle');
  const sidebar   = document.getElementById('module-sidebar');
  if (toggleBtn && sidebar) {
    const label = document.getElementById('module-toggle-label');
    const setCollapsed = (collapsed) => {
      sidebar.classList.toggle('collapsed', collapsed);
      toggleBtn.setAttribute('aria-expanded', String(!collapsed));
      if (label) label.textContent = collapsed ? `Ver módulos (${completed}/${total})` : 'Recolher módulos';
    };
    if (window.innerWidth < 760) setCollapsed(true);
    toggleBtn.addEventListener('click', () => setCollapsed(!sidebar.classList.contains('collapsed')));
  }

  const btnRead = document.getElementById('btn-mark-read');
  if (btnRead) {
    btnRead.addEventListener('click', async () => {
      btnRead.disabled = true;
      updateModuleProgress(courseId, moduleId, { read: true });
      try {
        await saveModuleProgress(user.email, courseId, moduleId,
          { ...progress?.[courseId]?.[moduleId], read: true });
      } catch (e) {
        console.warn(e);
      }
      renderModule(container, { courseId, moduleId });
    });
  }

  const btnQuiz = document.getElementById('btn-start-quiz');
  if (btnQuiz && !btnQuiz.disabled) {
    btnQuiz.addEventListener('click', () => navigate(`/quiz/${courseId}/${moduleId}`));
  }

  const btnUpload = document.getElementById('btn-upload-pdf');
  if (btnUpload) {
    btnUpload.addEventListener('click', () => openUploadModal(courseId, moduleId, () => {
      navigate(`/module/${courseId}/${moduleId}`);
    }));
  }
}

/* ------------------------------------------------------------------ */
/* Sub-renderers                                                        */
/* ------------------------------------------------------------------ */

function topBar(course) {
  return `
    <div class="topbar">
      <div>
        <div class="breadcrumbs">
          <span style="cursor:pointer;color:var(--ink-3)" onclick="navigate('/dashboard')">Painel</span>
          <span class="breadcrumb-sep">${icon('chevronRight', 12, '#D1D5DB')}</span>
          <span class="breadcrumb-current">${course.title}</span>
        </div>
        <h1 class="topbar-title">${course.title}</h1>
        <div class="topbar-sub">${course.subtitle}</div>
      </div>
      <div class="topbar-right">
        <button class="btn-ghost" onclick="history.back()">
          ${icon('arrowLeft', 14)} Voltar
        </button>
      </div>
    </div>`;
}

function getModuleLearningState(moduleProgress = {}) {
  if (moduleProgress.quizPassed) {
    return {
      key: 'completed',
      label: 'Concluído',
      title: 'Em modo de revisão',
      message: 'Este módulo já foi concluído com sucesso. O teu progresso está preservado — estás apenas a rever o conteúdo.',
      iconName: 'check',
      iconColor: 'var(--green)',
      canStartQuiz: true,
      showMarkRead: false,
      isReview: true,
    };
  }

  if (moduleProgress.read) {
    return {
      key: 'ready',
      label: 'Avaliação disponível',
      title: 'Leitura concluída',
      message: 'Já pode iniciar a avaliação deste módulo.',
      iconName: 'award',
      iconColor: 'var(--cyan-2)',
      canStartQuiz: true,
      showMarkRead: false,
    };
  }

  return {
    key: 'unread',
    label: 'Por ler',
    title: 'Leitura pendente',
    message: 'Leia o módulo completo e marque-o como lido para desbloquear a avaliação.',
    iconName: 'info',
    iconColor: 'var(--amber)',
    canStartQuiz: false,
    showMarkRead: true,
  };
}

function moduleStatusBadge(state) {
  const badgeLabel = state.isReview ? 'Em revisão' : state.label;
  return `
    <span class="module-state-badge ${state.key}">
      ${icon(state.iconName, 12, 'currentColor')}
      ${badgeLabel}
    </span>`;
}

function moduleActionBar(state) {
  const quizBtn = state.isReview
    ? `<button class="btn-sm" id="btn-start-quiz">
         ${icon('refresh', 13)} Repetir avaliação
       </button>`
    : `<button class="btn-sm primary" id="btn-start-quiz" ${state.canStartQuiz ? '' : 'disabled'}>
         Iniciar avaliação ${icon('arrowRight', 13)}
       </button>`;

  return `
    <div class="read-notice ${state.key}" id="read-notice">
      <div class="read-notice-text">
        ${icon(state.iconName, 16, state.iconColor)}
        <span>
          <strong>${state.title}.</strong>
          ${state.message}
        </span>
      </div>
      <div class="module-actions">
        ${state.showMarkRead
          ? `<button class="btn-sm primary" id="btn-mark-read">
               ${icon('check', 14)} Marcar como lido
             </button>`
          : ''}
        ${quizBtn}
      </div>
    </div>`;
}

function moduleSidebar(course, activeModuleId, progress, pct, completed, total) {
  const items = course.modules.map((mod, index) => {
    const state = getModuleLearningState(progress?.[course.id]?.[mod.id] || {});
    const isActive = mod.id === activeModuleId;
    return `
      <div class="module-item ${isActive ? 'active' : ''} ${state.key}"
           data-course-id="${course.id}" data-module-id="${mod.id}">
        <div class="module-num">
          ${state.key === 'completed'
            ? `<span class="check-anim">${icon('check', 13, 'var(--green)', 2.5)}</span>`
            : index + 1}
        </div>
        <div class="module-item-body">
          <div class="module-name">${mod.title}</div>
          <div class="module-duration">${icon('clock', 11, 'var(--ink-3)')} ${mod.duration || 'Duração por definir'}</div>
          <div class="module-sidebar-status">${state.label}</div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="module-sidebar" id="module-sidebar">
      <div class="module-sidebar-header">
        <div class="module-sidebar-course">Formação</div>
        <div class="module-sidebar-title">${course.title}</div>
        <div class="module-progress-info">
          <span>${completed}/${total} módulos</span>
          <span>${pct}%</span>
        </div>
        <div class="module-progress-bar">
          <div class="module-progress-fill" style="width:${pct}%"></div>
        </div>
        <button class="module-sidebar-toggle" id="module-sidebar-toggle" aria-expanded="true">
          ${icon('chevronDown', 14)} <span id="module-toggle-label">Recolher módulos</span>
        </button>
      </div>
      <div class="module-list">${items}</div>
    </div>`;
}

function pdfToolbar(mod, user, pdfUrl, state) {
  const canUpload = user?.role && (user.role === 'gestor_conteudos' || user.role === 'administrador');
  return `
    <div class="pdf-toolbar">
      <div class="pdf-toolbar-left">
        ${icon('pdf', 18, 'var(--red)')}
        <span class="pdf-file-name">${mod.title}</span>
        <span class="pdf-pages">${pdfUrl ? 'PDF carregado' : `${mod.pages || 1} páginas`}</span>
        ${moduleStatusBadge(state)}
      </div>
      <div class="pdf-toolbar-right">
        ${pdfUrl
          ? `<a href="${pdfUrl}" target="_blank" class="btn-sm">
               ${icon('download', 13)} Descarregar
             </a>`
          : ''}
        ${canUpload
          ? `<button class="btn-upload" id="btn-upload-pdf">
               ${icon('upload', 13)} Carregar PDF
             </button>`
          : ''}
      </div>
    </div>`;
}

function renderDocumentContent(mod, course) {
  const hasContent = Array.isArray(mod.content) && mod.content.length > 0;
  const blocks = hasContent ? mod.content.map(block => {
    switch (block.type) {
      case 'h1': return `<h2 class="doc-h1">${block.text}</h2>`;
      case 'lead': return `<p class="doc-lead">${block.text}</p>`;
      case 'h2': return `<h3 class="doc-h2">${block.text}</h3>`;
      case 'p': return `<p class="doc-p">${block.text}</p>`;
      case 'list': return `<ul class="doc-list">${block.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
      case 'callout': return `
        <div class="doc-callout">
          <div class="callout-label">${block.label}</div>
          <div class="callout-text">${block.text}</div>
        </div>`;
      default: return '';
    }
  }).join('') : `
    <div class="doc-empty">
      <h2 class="doc-h1">${mod.title}</h2>
      <p class="doc-lead">Este módulo ainda não tem conteúdo publicado.</p>
      <p class="doc-p">Quando o gestor carregar um PDF ou adicionar conteúdo estruturado, ficará disponível aqui para os colaboradores.</p>
    </div>`;

  return `
    <div class="pdf-page">
      <div class="pdf-page-header">
        <img src="assets/logo-color.png" alt="AlgarTempo" class="pdf-header-logo" />
        <span class="pdf-header-title">${course.title}</span>
      </div>
      <div class="pdf-page-body">${blocks}</div>
      <div class="pdf-page-footer">
        <span>Plataforma de Formações ALGARTEMPO</span>
        <span>${mod.pages || 1} páginas</span>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* PDF Upload Modal                                                     */
/* ------------------------------------------------------------------ */
function openUploadModal(courseId, moduleId, onSuccess) {
  let selectedFile = null;

  const overlay = document.createElement('div');
  overlay.className = 'upload-overlay';
  overlay.innerHTML = `
    <div class="upload-modal">
      <h3 class="upload-modal-title">Carregar PDF do módulo</h3>
      <p class="upload-modal-sub">Selecione um ficheiro PDF para este módulo. Ficará disponível para todos os colaboradores.</p>
      <div class="upload-drop" id="upload-drop">
        <div class="upload-drop-icon">${icon('upload', 32, 'var(--ink-3)')}</div>
        <div class="upload-drop-text">Arraste o PDF aqui ou clique para selecionar</div>
        <div class="upload-drop-hint">Apenas ficheiros .pdf · Max 50 MB</div>
        <div class="upload-file-name" id="upload-file-name" style="display:none"></div>
      </div>
      <input type="file" id="upload-input" accept="application/pdf" style="display:none" />
      <div id="upload-progress-wrap" style="display:none;margin-top:12px">
        <div class="upload-modal-sub" id="upload-progress-label">A carregar... 0%</div>
        <div class="upload-progress-bar">
          <div id="upload-progress-fill"></div>
        </div>
      </div>
      <div class="upload-actions">
        <button class="btn-outline" id="upload-cancel">Cancelar</button>
        <button class="btn-next" id="upload-confirm" disabled>
          ${icon('upload', 14)} Enviar PDF
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const drop = overlay.querySelector('#upload-drop');
  const input = overlay.querySelector('#upload-input');
  const fileName = overlay.querySelector('#upload-file-name');
  const confirm = overlay.querySelector('#upload-confirm');
  const cancel = overlay.querySelector('#upload-cancel');

  function pickFile(file) {
    if (!file || file.type !== 'application/pdf') {
      showToast('Selecione um ficheiro PDF válido.', 'error');
      return;
    }
    selectedFile = file;
    fileName.textContent = file.name;
    fileName.style.display = 'block';
    confirm.disabled = false;
  }

  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag-over'); pickFile(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => pickFile(input.files[0]));
  cancel.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  confirm.addEventListener('click', async () => {
    if (!selectedFile) return;
    confirm.disabled = true;
    cancel.disabled = true;
    overlay.querySelector('#upload-progress-wrap').style.display = 'block';

    try {
      await uploadModulePDF(courseId, moduleId, selectedFile, (pct) => {
        overlay.querySelector('#upload-progress-fill').style.transform = `scaleX(${pct / 100})`;
        overlay.querySelector('#upload-progress-label').textContent = `A carregar... ${pct}%`;
      });
      overlay.remove();
      showToast('PDF carregado com sucesso!', 'success');
      onSuccess();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Erro ao carregar o PDF.', 'error');
      confirm.disabled = false;
      cancel.disabled = false;
    }
  });
}
