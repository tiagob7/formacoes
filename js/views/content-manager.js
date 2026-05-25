import { icon }       from '../icons.js';
import { getState }   from '../state.js';
import { showToast }  from '../ui.js';
import { COURSES }    from '../data.js';
import { clearCoursesCache } from '../course-service.js';
import { getCoursesFromDB, saveCourse, deleteCourseFromDB, saveModule, deleteModuleFromDB, uploadModulePDF, getModulePdfUrl } from '../firebase-service.js';

let _courses = [];

export async function renderContentManager(container) {
  const { user } = getState();
  if (!user?.role || !['gestor_conteudos','administrador'].includes(user.role)) {
    container.innerHTML = '<p style="padding:2rem">Acesso negado.</p>'; return;
  }

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="topbar-title">Gestão de Conteúdos</h1>
        <div class="topbar-sub">Criar e editar formações, módulos e avaliações</div>
      </div>
    </div>
    <div style="padding:0 2rem 2rem" id="cm-root"></div>`;

  await loadAndRenderCourses();
}

async function loadAndRenderCourses() {
  const root = document.getElementById('cm-root');
  if (!root) return;
  root.innerHTML = `<div class="admin-loading">${icon('spinner',20)} A carregar...</div>`;

  try {
    const fromDB = await getCoursesFromDB();
    _courses = fromDB || COURSES.map(c => ({ ...c }));
  } catch { _courses = COURSES.map(c => ({ ...c })); }

  renderCourseList(root);
}

/* ------------------------------------------------------------------ */
/* Lista de formações                                                   */
/* ------------------------------------------------------------------ */

function renderCourseList(root) {
  root.innerHTML = `
    <div class="admin-toolbar">
      <h2 style="margin:0;font-size:18px">Formações</h2>
      <button class="btn-primary" id="btn-new-course" style="margin-left:auto">
        ${icon('plus',14)} Nova formação
      </button>
    </div>
    <div class="courses-manager-grid" id="cm-courses-grid"></div>`;

  const grid = document.getElementById('cm-courses-grid');
  if (!_courses.length) {
    grid.innerHTML = `<p style="color:var(--ink-3)">Ainda sem formações. Crie a primeira!</p>`;
  } else {
    _courses.forEach(course => {
      const card = document.createElement('div');
      card.className = 'cm-course-card';
      card.innerHTML = `
        <div class="cm-course-header">
          <div>
            <div class="cm-course-title">${course.title}</div>
            <div class="cm-course-sub">${course.subtitle || ''}</div>
          </div>
          <div class="cm-course-actions">
            <button class="btn-icon" data-action="edit-course" title="Editar formação" aria-label="Editar formação">${icon('edit',14)}</button>
            <button class="btn-icon warn" data-action="delete-course" title="Eliminar" aria-label="Eliminar formação">${icon('trash',14)}</button>
          </div>
        </div>
        <div class="cm-modules-list" id="modules-${course.id}">
          ${(course.modules || []).map((m, i) => moduleRow(course.id, m, i, course.modules.length)).join('')}
        </div>
        <button class="btn-sm primary" data-action="add-module" style="margin-top:.75rem">
          ${icon('plus',12)} Adicionar módulo
        </button>`;

      card.querySelector('[data-action="edit-course"]').addEventListener('click', () => openCourseModal(course));
      card.querySelector('[data-action="delete-course"]').addEventListener('click', () => confirmDeleteCourse(course));
      card.querySelector('[data-action="add-module"]').addEventListener('click', () => openModuleModal(course, null));

      card.querySelectorAll('[data-action="edit-module"]').forEach(btn =>
        btn.addEventListener('click', () => {
          const mod = course.modules.find(m => m.id === btn.dataset.mid);
          openModuleModal(course, mod);
        })
      );
      card.querySelectorAll('[data-action="delete-module"]').forEach(btn =>
        btn.addEventListener('click', () => {
          const mod = course.modules.find(m => m.id === btn.dataset.mid);
          confirmDeleteModule(course, mod);
        })
      );
      card.querySelectorAll('[data-action="upload-pdf"]').forEach(btn =>
        btn.addEventListener('click', () => openPdfUpload(course.id, btn.dataset.mid))
      );

      grid.appendChild(card);
    });
  }

  document.getElementById('btn-new-course').addEventListener('click', () => openCourseModal(null));
}

function moduleRow(courseId, mod, idx, total) {
  return `
    <div class="cm-module-row" data-mid="${mod.id}">
      <span class="cm-module-num">${idx + 1}</span>
      <span class="cm-module-name">${mod.title}</span>
      <div class="cm-module-actions">
        <button class="btn-icon" data-action="upload-pdf" data-mid="${mod.id}" title="PDF" aria-label="Carregar PDF do módulo">${icon('pdf',13,'var(--red)')}</button>
        <button class="btn-icon" data-action="edit-module" data-mid="${mod.id}" title="Editar" aria-label="Editar módulo">${icon('edit',13)}</button>
        <button class="btn-icon warn" data-action="delete-module" data-mid="${mod.id}" title="Eliminar" aria-label="Eliminar módulo">${icon('trash',13)}</button>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Modal: Criar / Editar Formação                                       */
/* ------------------------------------------------------------------ */

function openCourseModal(course) {
  const isEdit = !!course;
  const overlay = createOverlay(`
    <div class="modal modal-wide">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar formação' : 'Nova formação'}</h3>
        <button class="btn-icon" id="modal-close" aria-label="Fechar janela">${icon('x',16)}</button>
      </div>
      <div class="modal-body">
        <label class="form-label">Título</label>
        <input id="c-title" class="form-input" value="${course?.title || ''}" placeholder="ex.: Proteção de Dados e RGPD" />

        <label class="form-label" style="margin-top:1rem">Subtítulo</label>
        <input id="c-subtitle" class="form-input" value="${course?.subtitle || ''}" placeholder="ex.: Conformidade, direitos e boas práticas" />

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem">
          <div>
            <label class="form-label">Duração</label>
            <input id="c-duration" class="form-input" value="${course?.duration || ''}" placeholder="ex.: 2h 30min" />
          </div>
          <div>
            <label class="form-label">Categoria</label>
            <input id="c-category" class="form-input" value="${course?.category || ''}" placeholder="ex.: Conformidade" />
          </div>
        </div>

        <div style="margin-top:1rem">
          <label class="form-label">Nota mínima de aprovação (%)</label>
          <input id="c-passing" class="form-input" type="number" min="0" max="100" value="${course?.passingScore ?? 60}" style="max-width:120px" />
        </div>

        <div id="c-error" class="form-error" style="display:none;margin-top:.5rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-save">${icon('check',14)} ${isEdit ? 'Guardar' : 'Criar'}</button>
      </div>
    </div>`);

  document.getElementById('modal-save').addEventListener('click', async () => {
    const title    = document.getElementById('c-title').value.trim();
    const subtitle = document.getElementById('c-subtitle').value.trim();
    const duration = document.getElementById('c-duration').value.trim();
    const category = document.getElementById('c-category').value.trim();
    const passing  = parseInt(document.getElementById('c-passing').value) || 60;
    const errEl    = document.getElementById('c-error');

    if (!title) { errEl.textContent = 'O título é obrigatório.'; errEl.style.display = 'block'; return; }

    const courseId = isEdit ? course.id : title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g,'').slice(0,30) + '-' + Date.now();
    const data     = { title, subtitle, duration, category, passingScore: passing, order: isEdit ? (course.order ?? 0) : _courses.length };

    const btn = document.getElementById('modal-save');
    btn.disabled = true;
    try {
      await saveCourse(courseId, data);
      clearCoursesCache();
      showToast(`Formação ${isEdit ? 'atualizada' : 'criada'}.`, 'success');
      overlay.remove();
      await loadAndRenderCourses();
    } catch (e) {
      errEl.textContent = 'Erro: ' + e.message; errEl.style.display = 'block'; btn.disabled = false;
    }
  });
}

async function confirmDeleteCourse(course) {
  if (!confirm(`Eliminar a formação "${course.title}"? Esta ação não pode ser desfeita.`)) return;
  try {
    await deleteCourseFromDB(course.id);
    clearCoursesCache();
    showToast('Formação eliminada.', 'success');
    await loadAndRenderCourses();
  } catch (e) { showToast('Erro ao eliminar: ' + e.message, 'error'); }
}

/* ------------------------------------------------------------------ */
/* Modal: Criar / Editar Módulo                                         */
/* ------------------------------------------------------------------ */

function openModuleModal(course, mod) {
  const isEdit = !!mod;
  const quizJson = isEdit && mod.quiz ? JSON.stringify(mod.quiz, null, 2) : '[\n  {\n    "type": "mc",\n    "question": "Pergunta aqui?",\n    "options": ["Opção A", "Opção B", "Opção C", "Opção D"],\n    "answer": 0\n  }\n]';

  const overlay = createOverlay(`
    <div class="modal modal-wide">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar módulo' : 'Novo módulo'} — ${course.title}</h3>
        <button class="btn-icon" id="modal-close" aria-label="Fechar janela">${icon('x',16)}</button>
      </div>
      <div class="modal-body">
        <label class="form-label">Título do módulo</label>
        <input id="m-title" class="form-input" value="${mod?.title || ''}" placeholder="ex.: Introdução ao RGPD" />

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem">
          <div>
            <label class="form-label">Duração</label>
            <input id="m-duration" class="form-input" value="${mod?.duration || ''}" placeholder="ex.: 45 min" />
          </div>
          <div>
            <label class="form-label">Nº de páginas</label>
            <input id="m-pages" class="form-input" type="number" value="${mod?.pages || 1}" min="1" />
          </div>
        </div>

        <div style="margin-top:1.5rem">
          <label class="form-label">
            Avaliação (formato JSON)
            <span style="font-weight:400;color:var(--ink-3);font-size:12px;margin-left:.5rem">
              type: "mc" (múltipla escolha) ou "tf" (verdadeiro/falso)
            </span>
          </label>
          <textarea id="m-quiz" class="form-input" rows="12" style="font-family:monospace;font-size:12px;resize:vertical">${quizJson}</textarea>
        </div>

        <div id="m-error" class="form-error" style="display:none;margin-top:.5rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-save">${icon('check',14)} ${isEdit ? 'Guardar' : 'Criar'}</button>
      </div>
    </div>`);

  document.getElementById('modal-save').addEventListener('click', async () => {
    const title    = document.getElementById('m-title').value.trim();
    const duration = document.getElementById('m-duration').value.trim();
    const pages    = parseInt(document.getElementById('m-pages').value) || 1;
    const quizRaw  = document.getElementById('m-quiz').value.trim();
    const errEl    = document.getElementById('m-error');

    if (!title) { errEl.textContent = 'O título é obrigatório.'; errEl.style.display = 'block'; return; }

    let quiz = [];
    try { quiz = JSON.parse(quizRaw); }
    catch { errEl.textContent = 'JSON da avaliação inválido. Verifique a sintaxe.'; errEl.style.display = 'block'; return; }

    const moduleId = isEdit ? mod.id : 'm' + Date.now();
    const order    = isEdit ? (mod.order ?? 0) : (course.modules?.length ?? 0);
    const data     = { title, duration, pages, quiz, order, content: mod?.content || [] };

    const btn = document.getElementById('modal-save');
    btn.disabled = true;
    try {
      await saveModule(course.id, moduleId, data);
      clearCoursesCache();
      showToast(`Módulo ${isEdit ? 'atualizado' : 'criado'}.`, 'success');
      overlay.remove();
      await loadAndRenderCourses();
    } catch (e) {
      errEl.textContent = 'Erro: ' + e.message; errEl.style.display = 'block'; btn.disabled = false;
    }
  });
}

async function confirmDeleteModule(course, mod) {
  if (!confirm(`Eliminar o módulo "${mod.title}"?`)) return;
  try {
    await deleteModuleFromDB(course.id, mod.id);
    clearCoursesCache();
    showToast('Módulo eliminado.', 'success');
    await loadAndRenderCourses();
  } catch (e) { showToast('Erro ao eliminar: ' + e.message, 'error'); }
}

/* ------------------------------------------------------------------ */
/* Upload PDF                                                           */
/* ------------------------------------------------------------------ */

function openPdfUpload(courseId, moduleId) {
  const overlay = createOverlay(`
    <div class="modal">
      <div class="modal-header">
        <h3>Carregar PDF</h3>
        <button class="btn-icon" id="modal-close" aria-label="Fechar janela">${icon('x',16)}</button>
      </div>
      <div class="modal-body">
        <label class="form-label">Ficheiro PDF</label>
        <input type="file" id="pdf-file" class="form-input" accept=".pdf" />
        <div id="pdf-progress" style="display:none;margin-top:1rem">
          <div style="height:6px;background:var(--ink-6);border-radius:3px;overflow:hidden">
            <div id="pdf-bar" style="height:100%;width:0%;background:var(--cyan-2);border-radius:3px;transition:width .2s"></div>
          </div>
          <div id="pdf-pct" style="text-align:center;font-size:13px;margin-top:.5rem;color:var(--ink-3)">0%</div>
        </div>
        <div id="pdf-error" class="form-error" style="display:none;margin-top:.5rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-save">${icon('upload',14)} Carregar</button>
      </div>
    </div>`);

  document.getElementById('modal-save').addEventListener('click', async () => {
    const file  = document.getElementById('pdf-file').files[0];
    const errEl = document.getElementById('pdf-error');
    if (!file) { errEl.textContent = 'Selecione um ficheiro PDF.'; errEl.style.display = 'block'; return; }

    const btn = document.getElementById('modal-save');
    btn.disabled = true;
    document.getElementById('pdf-progress').style.display = 'block';

    try {
      await uploadModulePDF(courseId, moduleId, file, pct => {
        document.getElementById('pdf-bar').style.width = pct + '%';
        document.getElementById('pdf-pct').textContent = pct + '%';
      });
      showToast('PDF carregado com sucesso!', 'success');
      overlay.remove();
    } catch (e) {
      errEl.textContent = 'Erro: ' + e.message; errEl.style.display = 'block';
      btn.disabled = false;
    }
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function createOverlay(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#modal-close')?.addEventListener('click', close);
  overlay.querySelector('#modal-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  return overlay;
}
