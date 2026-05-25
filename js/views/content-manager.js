import { icon }       from '../icons.js';
import { getState }   from '../state.js';
import { showToast }  from '../ui.js';
import { COURSES }    from '../data.js';
import { clearCoursesCache } from '../course-service.js';
import { getCoursesFromDB, saveCourse, deleteCourseFromDB, saveModule, deleteModuleFromDB, uploadModulePDF, getModulePdfUrl } from '../firebase-service.js';

let _courses  = [];
let _editQuiz = [];

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
            <div style="display:flex;align-items:center;gap:.5rem">
              <div class="cm-course-title">${escHtml(course.title)}</div>
              <span class="cm-status-badge cm-status-${course.status || 'draft'}">${statusLabel(course.status)}</span>
            </div>
            <div class="cm-course-sub">${escHtml(course.subtitle || '')}</div>
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

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem">
          <div>
            <label class="form-label">Nota mínima de aprovação (%)</label>
            <input id="c-passing" class="form-input" type="number" min="0" max="100" value="${course?.passingScore ?? 60}" />
          </div>
          <div>
            <label class="form-label">Estado de publicação</label>
            <select id="c-status" class="form-input">
              <option value="draft"     ${(course?.status || 'draft') === 'draft'     ? 'selected' : ''}>Rascunho</option>
              <option value="published" ${course?.status === 'published' ? 'selected' : ''}>Publicado</option>
              <option value="archived"  ${course?.status === 'archived'  ? 'selected' : ''}>Arquivado</option>
            </select>
          </div>
        </div>

        <label class="form-label" style="margin-top:1rem">Data limite</label>
        <input id="c-due-date" class="form-input" type="date" value="${course?.dueDate || ''}" />

        <label class="form-label" style="margin-top:1rem">Tipo de atribuiÃ§Ã£o</label>
        <select id="c-required" class="form-input">
          <option value="false" ${course?.isRequired ? '' : 'selected'}>Opcional</option>
          <option value="true" ${course?.isRequired ? 'selected' : ''}>ObrigatÃ³ria</option>
        </select>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem">
          <div>
            <label class="form-label">Roles alvo</label>
            <select id="c-target-roles" class="form-input" multiple size="3">
              ${Object.entries({ colaborador: 'Colaborador', gestor_conteudos: 'Gestor de conteudos', administrador: 'Administrador' }).map(([value, label]) =>
                `<option value="${value}" ${(course?.targetRoles || []).includes(value) ? 'selected' : ''}>${label}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Departamentos alvo</label>
            <input id="c-target-departments" class="form-input" value="${escHtml((course?.targetDepartments || []).join(', '))}" placeholder="ex.: RH, Operacoes" />
          </div>
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
    const dueDate  = document.getElementById('c-due-date').value || '';
    const isRequired = document.getElementById('c-required').value === 'true';
    const targetRoles = Array.from(document.getElementById('c-target-roles').selectedOptions).map(opt => opt.value);
    const targetDepartments = parseCsvList(document.getElementById('c-target-departments').value);
    const errEl    = document.getElementById('c-error');

    if (!title) { errEl.textContent = 'O título é obrigatório.'; errEl.style.display = 'block'; return; }

    const status   = document.getElementById('c-status').value;
    const courseId = isEdit ? course.id : title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g,'').slice(0,30) + '-' + Date.now();
    const data     = { title, subtitle, duration, category, passingScore: passing, dueDate, isRequired, targetRoles, targetDepartments, status, order: isEdit ? (course.order ?? 0) : _courses.length };

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
  _editQuiz = isEdit && Array.isArray(mod.quiz)
    ? mod.quiz.map(q => ({ ...q, options: q.options ? [...q.options] : undefined }))
    : [];

  const overlay = createOverlay(`
    <div class="modal modal-wide">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar módulo' : 'Novo módulo'} — ${escHtml(course.title)}</h3>
        <button class="btn-icon" id="modal-close" aria-label="Fechar janela">${icon('x',16)}</button>
      </div>
      <div class="modal-body modal-body-scroll">
        <label class="form-label">Título do módulo</label>
        <input id="m-title" class="form-input" value="${escHtml(mod?.title || '')}" placeholder="ex.: Introdução ao RGPD" />

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem">
          <div>
            <label class="form-label">Duração</label>
            <input id="m-duration" class="form-input" value="${escHtml(mod?.duration || '')}" placeholder="ex.: 45 min" />
          </div>
          <div>
            <label class="form-label">Nº de páginas</label>
            <input id="m-pages" class="form-input" type="number" value="${mod?.pages || 1}" min="1" />
          </div>
        </div>

        <div style="margin-top:1.5rem">
          <label class="form-label" style="margin-bottom:.5rem">Avaliação</label>
          <div id="qb-root"></div>
        </div>

        <div id="m-error" class="form-error" style="display:none;margin-top:.5rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-save">${icon('check',14)} ${isEdit ? 'Guardar' : 'Criar'}</button>
      </div>
    </div>`);

  renderQuizEditor(document.getElementById('qb-root'));

  document.getElementById('modal-save').addEventListener('click', async () => {
    const title    = document.getElementById('m-title').value.trim();
    const duration = document.getElementById('m-duration').value.trim();
    const pages    = parseInt(document.getElementById('m-pages').value) || 1;
    const errEl    = document.getElementById('m-error');

    if (!title) { errEl.textContent = 'O título é obrigatório.'; errEl.style.display = 'block'; return; }

    // Validate quiz
    for (let i = 0; i < _editQuiz.length; i++) {
      const q = _editQuiz[i];
      if (!q.question.trim()) {
        errEl.textContent = `Pergunta ${i + 1} não tem texto.`; errEl.style.display = 'block'; return;
      }
      if (q.type === 'mc') {
        const filled = q.options.filter(o => o.trim());
        if (filled.length < 2) {
          errEl.textContent = `Pergunta ${i + 1}: preencha pelo menos 2 opções.`; errEl.style.display = 'block'; return;
        }
        if (q.answer >= q.options.length || !q.options[q.answer]?.trim()) {
          errEl.textContent = `Pergunta ${i + 1}: a resposta correta não está preenchida.`; errEl.style.display = 'block'; return;
        }
      }
    }

    const moduleId = isEdit ? mod.id : 'm' + Date.now();
    const order    = isEdit ? (mod.order ?? 0) : (course.modules?.length ?? 0);
    const data     = { title, duration, pages, quiz: _editQuiz, order, content: mod?.content || [] };

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

/* ------------------------------------------------------------------ */
/* Quiz Builder                                                         */
/* ------------------------------------------------------------------ */

function renderQuizEditor(root) {
  root.innerHTML = `
    <div class="quiz-builder">
      ${_editQuiz.length === 0
        ? `<p class="qb-empty">Ainda sem perguntas. Adicione a primeira!</p>`
        : _editQuiz.map((q, i) => renderQCard(q, i)).join('')}
      <button class="btn-sm primary" id="qb-add" style="margin-top:.5rem">
        ${icon('plus',12)} Adicionar pergunta
      </button>
    </div>`;

  root.querySelector('#qb-add').addEventListener('click', () => {
    _editQuiz.push({ type: 'mc', question: '', options: ['', '', '', ''], answer: 0, explanation: '' });
    renderQuizEditor(root);
    root.querySelector('.qb-card:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  root.querySelectorAll('[data-qact="type"]').forEach(el => {
    el.addEventListener('change', () => {
      const i = parseInt(el.dataset.qi);
      const old = _editQuiz[i];
      _editQuiz[i] = {
        type: el.value,
        question: old.question || '',
        answer: el.value === 'tf' ? true : 0,
        options: el.value === 'mc' ? ['', '', '', ''] : undefined,
        explanation: old.explanation || '',
      };
      renderQuizEditor(root);
    });
  });

  root.querySelectorAll('[data-qact="question"]').forEach(el =>
    el.addEventListener('input', () => { _editQuiz[parseInt(el.dataset.qi)].question = el.value; })
  );
  root.querySelectorAll('[data-qact="option"]').forEach(el =>
    el.addEventListener('input', () => { _editQuiz[parseInt(el.dataset.qi)].options[parseInt(el.dataset.oi)] = el.value; })
  );
  root.querySelectorAll('[data-qact="correct-mc"]').forEach(el =>
    el.addEventListener('change', () => { _editQuiz[parseInt(el.dataset.qi)].answer = parseInt(el.value); })
  );
  root.querySelectorAll('[data-qact="correct-tf"]').forEach(el =>
    el.addEventListener('change', () => { _editQuiz[parseInt(el.dataset.qi)].answer = el.value === 'true'; })
  );
  root.querySelectorAll('[data-qact="explanation"]').forEach(el =>
    el.addEventListener('input', () => { _editQuiz[parseInt(el.dataset.qi)].explanation = el.value; })
  );

  root.querySelectorAll('[data-qact="del"]').forEach(el => {
    el.addEventListener('click', () => {
      _editQuiz.splice(parseInt(el.dataset.qi), 1);
      renderQuizEditor(root);
    });
  });
  root.querySelectorAll('[data-qact="add-opt"]').forEach(el => {
    el.addEventListener('click', () => {
      const i = parseInt(el.dataset.qi);
      if (_editQuiz[i].options.length < 6) { _editQuiz[i].options.push(''); renderQuizEditor(root); }
    });
  });
  root.querySelectorAll('[data-qact="del-opt"]').forEach(el => {
    el.addEventListener('click', () => {
      const i = parseInt(el.dataset.qi), oi = parseInt(el.dataset.oi);
      if (_editQuiz[i].options.length > 2) {
        _editQuiz[i].options.splice(oi, 1);
        if (_editQuiz[i].answer >= _editQuiz[i].options.length) _editQuiz[i].answer = 0;
        renderQuizEditor(root);
      }
    });
  });
}

function renderQCard(q, i) {
  const isMC = q.type === 'mc';
  return `
    <div class="qb-card">
      <div class="qb-card-top">
        <span class="qb-num">P${i + 1}</span>
        <select class="form-input qb-type-select" data-qact="type" data-qi="${i}">
          <option value="mc" ${q.type === 'mc' ? 'selected' : ''}>Múltipla escolha</option>
          <option value="tf" ${q.type === 'tf' ? 'selected' : ''}>Verdadeiro / Falso</option>
        </select>
        <button class="btn-icon danger" data-qact="del" data-qi="${i}" title="Remover pergunta" aria-label="Remover pergunta">
          ${icon('trash',13)}
        </button>
      </div>

      <input class="form-input" data-qact="question" data-qi="${i}"
             value="${escHtml(q.question)}" placeholder="Escreva a pergunta aqui…"
             style="margin-top:.75rem" />

      ${isMC ? renderMCOptions(q, i) : renderTFOptions(q, i)}

      <input class="form-input qb-explanation" data-qact="explanation" data-qi="${i}"
             value="${escHtml(q.explanation || '')}"
             placeholder="Explicação (opcional) — mostrada ao colaborador quando erra" />
    </div>`;
}

function renderMCOptions(q, i) {
  const opts = q.options.map((opt, oi) => `
    <div class="qb-option-row">
      <input type="radio" name="qb-${i}" data-qact="correct-mc" data-qi="${i}" value="${oi}"
             ${q.answer === oi ? 'checked' : ''} class="qb-radio" title="Resposta correta" />
      <input class="form-input qb-opt-input" data-qact="option" data-qi="${i}" data-oi="${oi}"
             value="${escHtml(opt)}" placeholder="Opção ${String.fromCharCode(65 + oi)}" />
      ${q.options.length > 2
        ? `<button class="btn-icon" data-qact="del-opt" data-qi="${i}" data-oi="${oi}"
                   title="Remover opção" aria-label="Remover opção">${icon('x',11)}</button>`
        : ''}
    </div>`).join('');

  return `
    <div class="qb-options">
      <div class="qb-hint">${icon('info',11,'var(--ink-3)')} Selecione o círculo para marcar a resposta correta</div>
      ${opts}
      ${q.options.length < 6
        ? `<button class="btn-sm" data-qact="add-opt" data-qi="${i}" style="margin-top:.25rem">
             ${icon('plus',11)} Adicionar opção
           </button>`
        : ''}
    </div>`;
}

function renderTFOptions(q, i) {
  return `
    <div class="qb-tf-row">
      <label class="qb-tf-label ${q.answer === true ? 'qb-tf-selected' : ''}">
        <input type="radio" name="qb-${i}" data-qact="correct-tf" data-qi="${i}" value="true"
               ${q.answer === true ? 'checked' : ''} />
        ${icon('check',14,'currentColor')} Verdadeiro
      </label>
      <label class="qb-tf-label ${q.answer === false ? 'qb-tf-selected' : ''}">
        <input type="radio" name="qb-${i}" data-qact="correct-tf" data-qi="${i}" value="false"
               ${q.answer === false ? 'checked' : ''} />
        ${icon('x',14,'currentColor')} Falso
      </label>
    </div>`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function parseCsvList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function statusLabel(status) {
  const map = { draft: 'Rascunho', published: 'Publicado', archived: 'Arquivado' };
  return map[status] || 'Rascunho';
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
