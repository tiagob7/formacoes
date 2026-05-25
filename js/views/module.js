import { icon }                                          from '../icons.js';
import { getCourse, getModule, courseProgress }           from '../data.js';
import { getState, setState, updateModuleProgress }       from '../state.js';
import { navigate }                                       from '../router.js';
import { saveModuleProgress, getModulePdfUrl, uploadModulePDF, hasRole } from '../firebase-service.js';
import { showToast }                                      from '../ui.js';

export async function renderModule(container, { courseId, moduleId }) {
  setState({ courseId, moduleId, view: 'module' });
  const { user, progress } = getState();
  const course  = getCourse(courseId);
  const mod     = getModule(courseId, moduleId);
  if (!course || !mod) { navigate('/dashboard'); return; }

  const cp       = progress?.[courseId]?.[moduleId] || {};
  const isRead   = !!cp.read;
  const isPassed = !!cp.quizPassed;

  // Fetch PDF URL from Firebase (may be null)
  let pdfUrl = null;
  try { pdfUrl = await getModulePdfUrl(courseId, moduleId); } catch {}

  // Calculate sidebar progress
  const { completed, total } = courseProgress(course, progress);
  const pct = Math.round((completed / total) * 100);

  container.innerHTML = `
    ${topBar(course, courseId)}
    <div class="module-layout">
      ${moduleSidebar(course, moduleId, progress, pct, completed, total)}
      <div class="module-main">
        ${pdfToolbar(mod, course, user, pdfUrl)}
        <div class="pdf-content" id="pdf-content">
          ${pdfUrl
            ? `<div class="pdf-iframe-wrapper" style="flex:1;height:100%;min-height:600px">
                 <iframe src="${pdfUrl}" class="pdf-iframe" title="${mod.title}"></iframe>
               </div>`
            : renderDocumentContent(mod, course)}
        </div>
        <div class="read-notice ${isRead || isPassed ? 'done' : ''}" id="read-notice">
          <div class="read-notice-text">
            ${isRead || isPassed
              ? `${icon('check', 16, 'var(--green)')} <strong>Leitura concluída.</strong> Pode iniciar a avaliação.`
              : `${icon('info', 16, 'var(--amber)')} <strong>Leia o módulo completo</strong> antes de iniciar a avaliação.`}
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
            ${!isRead && !isPassed
              ? `<button class="btn-sm primary" id="btn-mark-read">
                   ${icon('check', 14)} Marcar como lido
                 </button>`
              : ''}
            <button class="btn-sm primary" id="btn-start-quiz" ${!isRead && !isPassed ? 'disabled' : ''}>
              Iniciar avaliação ${icon('arrowRight', 13)}
            </button>
          </div>
        </div>
      </div>
    </div>`;

  // Sidebar module navigation
  container.querySelectorAll('.module-item').forEach(el => {
    el.addEventListener('click', () => {
      const cid = el.dataset.courseId;
      const mid = el.dataset.moduleId;
      navigate(`/module/${cid}/${mid}`);
    });
  });

  // Mark as read
  const btnRead = document.getElementById('btn-mark-read');
  if (btnRead) {
    btnRead.addEventListener('click', async () => {
      btnRead.disabled = true;
      updateModuleProgress(courseId, moduleId, { read: true });
      try {
        await saveModuleProgress(user.email, courseId, moduleId,
          { ...progress?.[courseId]?.[moduleId], read: true });
      } catch (e) { console.warn(e); }
      // Re-render notice
      const notice = document.getElementById('read-notice');
      notice.className = 'read-notice done';
      notice.innerHTML = `
        <div class="read-notice-text">
          ${icon('check', 16, 'var(--green)')} <strong>Leitura concluída.</strong> Pode iniciar a avaliação.
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
          <button class="btn-sm primary" id="btn-start-quiz">
            Iniciar avaliação ${icon('arrowRight', 13)}
          </button>
        </div>`;
      document.getElementById('btn-start-quiz').addEventListener('click', () => {
        navigate(`/quiz/${courseId}/${moduleId}`);
      });
    });
  }

  // Start quiz
  const btnQuiz = document.getElementById('btn-start-quiz');
  if (btnQuiz && !btnQuiz.disabled) {
    btnQuiz.addEventListener('click', () => navigate(`/quiz/${courseId}/${moduleId}`));
  }

  // Upload PDF (admin only)
  const btnUpload = document.getElementById('btn-upload-pdf');
  if (btnUpload) {
    btnUpload.addEventListener('click', () => openUploadModal(courseId, moduleId, () => {
      navigate(`/module/${courseId}/${moduleId}`); // refresh
    }));
  }
}

/* ------------------------------------------------------------------ */
/* Sub-renderers                                                        */
/* ------------------------------------------------------------------ */

function topBar(course, courseId) {
  return `
    <div class="topbar">
      <div>
        <div class="breadcrumbs">
          <span style="cursor:pointer;color:var(--ink-3)" onclick="navigate('/dashboard')">Dashboard</span>
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

function moduleSidebar(course, activeModuleId, progress, pct, completed, total) {
  const items = course.modules.map((m, i) => {
    const mp       = progress?.[course.id]?.[m.id] || {};
    const isActive = m.id === activeModuleId;
    const isDone   = !!mp.quizPassed;
    return `
      <div class="module-item ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}"
           data-course-id="${course.id}" data-module-id="${m.id}">
        <div class="module-num">
          ${isDone
            ? `<span class="check-anim">${icon('check', 13, 'var(--green)', 2.5)}</span>`
            : i + 1}
        </div>
        <div>
          <div class="module-name">${m.title}</div>
          <div class="module-duration">${icon('clock', 11, 'var(--ink-3)')} ${m.duration}</div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="module-sidebar">
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
      </div>
      <div class="module-list">${items}</div>
    </div>`;
}

function pdfToolbar(mod, course, user, pdfUrl) {
  const canUpload = user?.role && (user.role === 'gestor_conteudos' || user.role === 'administrador');
  return `
    <div class="pdf-toolbar">
      <div class="pdf-toolbar-left">
        ${icon('pdf', 18, 'var(--red)')}
        <span class="pdf-file-name">${mod.title}</span>
        <span class="pdf-pages">${pdfUrl ? 'PDF carregado' : mod.pages + ' páginas'}</span>
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
  const blocks = mod.content.map(block => {
    switch (block.type) {
      case 'h1':      return `<h2 class="doc-h1">${block.text}</h2>`;
      case 'lead':    return `<p class="doc-lead">${block.text}</p>`;
      case 'h2':      return `<h3 class="doc-h2">${block.text}</h3>`;
      case 'p':       return `<p class="doc-p">${block.text}</p>`;
      case 'list':    return `<ul class="doc-list">${block.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
      case 'callout': return `
        <div class="doc-callout">
          <div class="callout-label">${block.label}</div>
          <div class="callout-text">${block.text}</div>
        </div>`;
      default: return '';
    }
  }).join('');

  return `
    <div class="pdf-page">
      <div class="pdf-page-header">
        <img src="assets/logo-color.png" alt="AlgarTempo" class="pdf-header-logo" />
        <span class="pdf-header-title">${course.title}</span>
      </div>
      <div class="pdf-page-body">${blocks}</div>
      <div class="pdf-page-footer">
        <span>Plataforma de Formações ALGARTEMPO</span>
        <span>${mod.pages} páginas</span>
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
      <p class="upload-modal-sub">Seleccione um ficheiro PDF para este módulo. Ficará disponível para todos os colaboradores.</p>
      <div class="upload-drop" id="upload-drop">
        <div class="upload-drop-icon">${icon('upload', 32, 'var(--ink-3)')}</div>
        <div class="upload-drop-text">Arraste o PDF aqui ou clique para seleccionar</div>
        <div class="upload-drop-hint">Apenas ficheiros .pdf · Max 50 MB</div>
        <div class="upload-file-name" id="upload-file-name" style="display:none"></div>
      </div>
      <input type="file" id="upload-input" accept="application/pdf" style="display:none" />
      <div id="upload-progress-wrap" style="display:none;margin-top:12px">
        <div class="upload-modal-sub" id="upload-progress-label">A carregar… 0%</div>
        <div class="upload-progress-bar" style="height:6px;background:var(--line);border-radius:3px;overflow:hidden;margin-top:6px">
          <div id="upload-progress-fill" style="height:100%;width:0;background:linear-gradient(90deg,var(--cyan),#00C8FF);border-radius:3px;transition:width .2s"></div>
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

  const drop     = overlay.querySelector('#upload-drop');
  const input    = overlay.querySelector('#upload-input');
  const fileName = overlay.querySelector('#upload-file-name');
  const confirm  = overlay.querySelector('#upload-confirm');
  const cancel   = overlay.querySelector('#upload-cancel');

  function pickFile(file) {
    if (!file || file.type !== 'application/pdf') { showToast('Seleccione um ficheiro PDF válido.', 'error'); return; }
    selectedFile = file;
    fileName.textContent = file.name;
    fileName.style.display = 'block';
    confirm.disabled = false;
  }

  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover',  e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag-over'); pickFile(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => pickFile(input.files[0]));
  cancel.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  confirm.addEventListener('click', async () => {
    if (!selectedFile) return;
    confirm.disabled = true; cancel.disabled = true;
    overlay.querySelector('#upload-progress-wrap').style.display = 'block';

    try {
      await uploadModulePDF(courseId, moduleId, selectedFile, (pct) => {
        overlay.querySelector('#upload-progress-fill').style.width = pct + '%';
        overlay.querySelector('#upload-progress-label').textContent = `A carregar… ${pct}%`;
      });
      overlay.remove();
      showToast('PDF carregado com sucesso!', 'success');
      onSuccess();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Erro ao carregar o PDF.', 'error');
      confirm.disabled = false; cancel.disabled = false;
    }
  });
}
