import { icon }       from '../icons.js';
import { COVER_ICONS, COVER_PALETTES, courseCoverSVG } from '../cover-service.js';
import { getState }   from '../state.js';
import { showToast, confirmDialog }  from '../ui.js';
import { COURSES }    from '../data.js';
import { clearCoursesCache } from '../course-service.js';
import { getCoverImages, uploadCoverImage, deleteCoverImage, setCoverImageUsage } from '../cover-image-service.js';
import { getCoursesFromDB, saveCourse, deleteCourseFromDB, saveModule, deleteModuleFromDB, uploadModulePDF, getModulePdfUrl, getDepartments } from '../firebase-service.js';

let _courses         = [];
let _editQuiz        = [];
let _editContent     = [];
const _expandedCourses = new Set(); // persiste entre re-renders

export async function renderContentManager(container) {
  const { user } = getState();
  if (!user?.role || !['gestor_conteudos','administrador'].includes(user.role)) {
    container.innerHTML = '<p class="access-denied">Acesso negado.</p>'; return;
  }

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="topbar-title">Gestão de Conteúdos</h1>
        <div class="topbar-sub">Criar e editar formações, módulos e avaliações</div>
      </div>
    </div>
    <div style="padding:2rem 2.5rem 3rem;max-width:1400px;width:100%;margin:0 auto" id="cm-root"></div>`;

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
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn-sm" id="btn-help-cm">
          ${icon('info',12)} Ajuda
        </button>
        <button class="btn-sm primary" id="btn-new-course">
          ${icon('plus',12)} Nova formação
        </button>
      </div>
    </div>
    <div class="courses-manager-grid" id="cm-courses-grid"></div>`;

  const grid = document.getElementById('cm-courses-grid');
  if (!_courses.length) {
    grid.innerHTML = `<p class="table-cell-meta">Ainda sem formações. Crie a primeira!</p>`;
  } else {
    _courses.forEach(course => {
      const isExpanded = _expandedCourses.has(course.id);
      const modCount   = (course.modules || []).length;
      const card = document.createElement('div');
      card.className = 'cm-course-card';
      const auditMsg = course.editadoPor
        ? `Editado por ${escHtml(course.editadoPor)}${course.editadoEm ? ' em ' + new Date(course.editadoEm).toLocaleDateString('pt-PT') : ''}`
        : course.criadoPor
          ? `Criado por ${escHtml(course.criadoPor)}${course.criadoEm ? ' em ' + new Date(course.criadoEm).toLocaleDateString('pt-PT') : ''}`
          : '';
      card.innerHTML = `
        <div class="cm-course-header cm-course-toggle" data-action="toggle" role="button" tabindex="0"
             aria-expanded="${isExpanded}" style="cursor:pointer">
          <div class="cm-course-header-chevron">
            ${icon('chevronRight', 14, 'var(--ink-3)')}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
              <div class="cm-course-title">${escHtml(course.title)}</div>
              <span class="cm-status-badge cm-status-${course.status || 'draft'}">${statusLabel(course.status)}</span>
              <span class="cm-module-count-badge">${modCount} módulo${modCount !== 1 ? 's' : ''}</span>
            </div>
            <div class="cm-course-sub">${escHtml(course.subtitle || '')}</div>
            ${auditMsg ? `<div class="cm-audit-text">${icon('clock',10,'var(--ink-3)')} ${auditMsg}</div>` : ''}
          </div>
          <div class="cm-course-actions" style="flex-shrink:0">
            <button class="btn-icon" data-action="edit-course" title="Editar formação" aria-label="Editar formação">${icon('edit',14)}</button>
            <button class="btn-icon danger" data-action="delete-course" title="Eliminar" aria-label="Eliminar formação">${icon('trash',14)}</button>
          </div>
        </div>
        <div class="cm-course-body ${isExpanded ? 'cm-course-body--open' : ''}">
          <div>
            <div class="cm-modules-list" id="modules-${course.id}">
              ${modCount === 0
                ? `<p class="cm-empty-modules">Ainda sem módulos. Adicione o primeiro!</p>`
                : (course.modules || []).map((m, i) => moduleRow(course.id, m, i, modCount)).join('')}
            </div>
            <button class="btn-sm primary" data-action="add-module" style="margin-top:.75rem">
              ${icon('plus',12)} Adicionar módulo
            </button>
          </div>
        </div>`;

      // Toggle accordion
      card.querySelector('[data-action="toggle"]').addEventListener('click', (e) => {
        // Não propaga se clicou nos botões de editar/eliminar
        if (e.target.closest('[data-action="edit-course"], [data-action="delete-course"]')) return;
        const body    = card.querySelector('.cm-course-body');
        const chevron = card.querySelector('.cm-course-header-chevron');
        const open    = body.classList.toggle('cm-course-body--open');
        card.querySelector('[data-action="toggle"]').setAttribute('aria-expanded', open);
        if (open) { _expandedCourses.add(course.id); } else { _expandedCourses.delete(course.id); }
      });
      card.querySelector('[data-action="toggle"]').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); }
      });

      card.querySelector('[data-action="edit-course"]').addEventListener('click', (e) => { e.stopPropagation(); openCourseModal(course); });
      card.querySelector('[data-action="delete-course"]').addEventListener('click', (e) => { e.stopPropagation(); confirmDeleteCourse(course); });
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
      card.querySelectorAll('[data-action="order-up"]').forEach(btn =>
        btn.addEventListener('click', () => reorderModule(course, btn.dataset.mid, -1))
      );
      card.querySelectorAll('[data-action="order-down"]').forEach(btn =>
        btn.addEventListener('click', () => reorderModule(course, btn.dataset.mid, 1))
      );
      card.querySelectorAll('[data-action="upload-pdf"]').forEach(btn =>
        btn.addEventListener('click', () => openPdfUpload(course.id, btn.dataset.mid))
      );

      grid.appendChild(card);
    });
  }

  document.getElementById('btn-new-course').addEventListener('click', () => openCourseModal(null));
  document.getElementById('btn-help-cm').addEventListener('click', () => openHelpModal());
}

function moduleRow(courseId, mod, idx, total) {
  return `
    <div class="cm-module-row" data-mid="${mod.id}">
      <span class="cm-module-num">${idx + 1}</span>
      <span class="cm-module-name">${mod.title}</span>
      <div class="cm-module-actions">
        <button class="btn-icon" data-action="order-up" data-mid="${mod.id}" title="Mover para cima" aria-label="Mover módulo para cima" ${idx === 0 ? 'disabled' : ''}>${icon('chevronUp',13)}</button>
        <button class="btn-icon" data-action="order-down" data-mid="${mod.id}" title="Mover para baixo" aria-label="Mover módulo para baixo" ${idx === total - 1 ? 'disabled' : ''}>${icon('chevronDown',13)}</button>
        <button class="btn-icon" data-action="upload-pdf" data-mid="${mod.id}" title="PDF" aria-label="Carregar PDF do módulo">${icon('pdf',13,'var(--red)')}</button>
        <button class="btn-icon" data-action="edit-module" data-mid="${mod.id}" title="Editar" aria-label="Editar módulo">${icon('edit',13)}</button>
        <button class="btn-icon danger" data-action="delete-module" data-mid="${mod.id}" title="Eliminar" aria-label="Eliminar módulo">${icon('trash',13)}</button>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Modal: Criar / Editar Formação                                       */
/* ------------------------------------------------------------------ */

async function openCourseModal(course) {
  const isEdit = !!course;
  const departments = await getDepartments().catch(() => []);
  const currentDepts = (course?.targetDepartments || []).map(v => v.toLowerCase());
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

        <div class="form-grid-2">
          <div>
            <label class="form-label">Duração</label>
            <input id="c-duration" class="form-input" value="${course?.duration || ''}" placeholder="ex.: 2h 30min" />
          </div>
          <div>
            <label class="form-label">Categoria</label>
            <input id="c-category" class="form-input" value="${course?.category || ''}" placeholder="ex.: Conformidade" />
          </div>
        </div>

        <div class="form-grid-2">
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

        <label class="form-label" style="margin-top:1rem">Tipo de atribuição</label>
        <select id="c-required" class="form-input">
          <option value="false" ${course?.isRequired ? '' : 'selected'}>Opcional</option>
          <option value="true" ${course?.isRequired ? 'selected' : ''}>Obrigatória</option>
        </select>

        <label class="form-label" style="margin-top:1rem">Departamentos alvo</label>
        <div id="c-target-departments-group" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
          ${departments.length
            ? departments.map(d => `
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;
                              background:var(--surface-1,#F4F6FA);border:1.5px solid var(--border,#E2E8F0);
                              border-radius:6px;padding:5px 10px;user-select:none">
                  <input type="checkbox" value="${escHtml(d.nome)}"
                    ${currentDepts.includes(d.nome.toLowerCase()) ? 'checked' : ''} />
                  ${escHtml(d.nome)}
                </label>`).join('')
            : `<span style="font-size:13px;color:var(--ink-3)">Sem departamentos configurados — crie-os em <strong>Utilizadores → Departamentos</strong>.</span>`}
        </div>

        <div class="cover-picker">
          <label class="form-label">Capa</label>
          <div class="cover-picker-layout">
            <div class="cover-preview" id="c-cover-preview"></div>
            <div>
              <div class="cover-tabs" id="c-cover-tabs">
                <button class="cover-tab" data-tab="icon">Ícone</button>
                <button class="cover-tab" data-tab="image">Imagem</button>
              </div>
              <div id="c-tab-icon">
                <div style="font-size:11px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Ícone</div>
                <div class="cover-icon-grid" id="c-icon-grid"></div>
                <div style="font-size:11px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:10px;margin-bottom:6px">Cor</div>
                <div class="cover-palette-row" id="c-palette-row"></div>
              </div>
              <div id="c-tab-image" style="display:none"></div>
            </div>
          </div>
        </div>
        <div id="c-error" class="form-error" style="display:none;margin-top:.5rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-save">${icon('check',14)} ${isEdit ? 'Guardar' : 'Criar'}</button>
      </div>
    </div>`);

  document.getElementById('modal-close').addEventListener('click', () => overlay.remove());
  document.getElementById('modal-cancel').addEventListener('click', () => overlay.remove());

  // Cover picker state
  let _selIcon = 0;
  let _selPal  = 0;
  let _pickerDirty   = false;
  let _activeTab     = course?.coverImageUrl ? 'image' : 'icon';
  let _selImageId    = '';
  let _selImageUrl   = course?.coverImageUrl || '';
  let _origImageId   = '';
  let _imageTabLoaded = false;

  if (course?.coverId) {
    const [k, p] = course.coverId.split('|');
    const ki = COVER_ICONS.findIndex(ic => ic.key === k);
    if (ki >= 0) _selIcon = ki;
    if (p !== undefined) _selPal = Math.min(parseInt(p, 10) || 0, COVER_PALETTES.length - 1);
  }

  function _updatePreview() {
    const prev = document.getElementById('c-cover-preview');
    if (_activeTab === 'image' && _selImageUrl) {
      prev.innerHTML = `<img src="${_selImageUrl.replace(/"/g,'&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    } else if (_activeTab === 'image') {
      prev.innerHTML = `<div class="cover-preview-placeholder">Sem imagem</div>`;
    } else {
      prev.innerHTML = courseCoverSVG('preview', '', `${COVER_ICONS[_selIcon].key}|${_selPal}`);
    }
  }

  function _refreshIconGrid() {
    const grid = document.getElementById('c-icon-grid');
    grid.innerHTML = '';
    COVER_ICONS.forEach((ic, i) => {
      const div = document.createElement('div');
      div.className = 'cover-icon-opt' + (i === _selIcon ? ' active' : '');
      div.innerHTML = courseCoverSVG(ic.key, '', `${ic.key}|${_selPal}`) +
        `<div class="cover-icon-label">${ic.label}</div>`;
      div.addEventListener('click', () => {
        _selIcon = i;
        _pickerDirty = true;
        grid.querySelectorAll('.cover-icon-opt').forEach(el => el.classList.remove('active'));
        div.classList.add('active');
        _updatePreview();
      });
      grid.appendChild(div);
    });
  }

  function _refreshPaletteRow() {
    const row = document.getElementById('c-palette-row');
    row.innerHTML = '';
    COVER_PALETTES.forEach((pal, i) => {
      const sw = document.createElement('div');
      sw.className = 'cover-palette-swatch' + (i === _selPal ? ' active' : '');
      sw.title = pal.name;
      sw.style.background = `linear-gradient(135deg, ${pal.c1}, ${pal.c2})`;
      sw.addEventListener('click', () => {
        _selPal = i;
        _pickerDirty = true;
        row.querySelectorAll('.cover-palette-swatch').forEach(el => el.classList.remove('active'));
        sw.classList.add('active');
        _refreshIconGrid();
        _updatePreview();
      });
      row.appendChild(sw);
    });
  }

  _refreshIconGrid();
  _refreshPaletteRow();
  _updatePreview();

  // ---- Tab switching ----
  function _activateTab(tab) {
    _activeTab = tab;
    overlay.querySelectorAll('.cover-tab').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.tab === tab)
    );
    document.getElementById('c-tab-icon').style.display  = tab === 'icon'  ? '' : 'none';
    document.getElementById('c-tab-image').style.display = tab === 'image' ? '' : 'none';
    if (tab === 'image' && !_imageTabLoaded) {
      _imageTabLoaded = true;
      _renderImageTab(document.getElementById('c-tab-image')).catch(() => {});
    }
    _updatePreview();
  }

  document.getElementById('c-cover-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.cover-tab');
    if (btn) _activateTab(btn.dataset.tab);
  });

  _activateTab(_activeTab);

  // ---- Image tab ----
  function _selectImage(imageId, imageUrl) {
    _selImageId  = imageId;
    _selImageUrl = imageUrl;
    overlay.querySelectorAll('.cover-image-opt').forEach(el =>
      el.classList.toggle('active', el.dataset.imgId === imageId)
    );
    _updatePreview();
  }

  function _addImageThumb(grid, img) {
    const thumb = document.createElement('div');
    thumb.className = 'cover-image-opt' + (img.id === _selImageId ? ' active' : '');
    thumb.dataset.imgId  = img.id;
    thumb.dataset.imgUrl = img.url;
    thumb.innerHTML = `
      <img src="${escHtml(img.url)}" alt="${escHtml(img.filename || '')}" loading="lazy">
      <button class="cover-image-del" title="Apagar imagem" aria-label="Apagar imagem">${icon('trash', 10, 'white')}</button>`;

    thumb.addEventListener('click', (e) => {
      if (e.target.closest('.cover-image-del')) return;
      _selectImage(img.id, img.url);
    });

    thumb.querySelector('.cover-image-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await deleteCoverImage(img.id);
        if (_selImageId === img.id) {
          _selImageId  = '';
          _selImageUrl = '';
          _updatePreview();
        }
        thumb.remove();
        if (grid.children.length === 0) {
          grid.replaceWith(
            Object.assign(document.createElement('div'), {
              className: 'cover-image-empty',
              textContent: 'Ainda sem imagens. Carregue a primeira!',
            })
          );
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    grid.appendChild(thumb);
  }

  async function _renderImageTab(container) {
    container.innerHTML = `<div class="admin-loading">${icon('spinner', 16)} A carregar...</div>`;
    let images;
    try {
      images = await getCoverImages();
    } catch {
      container.innerHTML = `<p style="color:var(--red);font-size:13px">Erro ao carregar imagens.</p>`;
      return;
    }

    // Resolve _origImageId from catalog
    if (_selImageUrl) {
      const match = images.find(i => i.url === _selImageUrl);
      if (match) { _selImageId = match.id; _origImageId = match.id; }
    }

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <button class="btn-sm" id="c-img-upload-btn">${icon('plus', 12)} Carregar imagem</button>
        <div id="c-img-progress" style="display:none;flex:1">
          <div class="cover-upload-progress">
            <div class="cover-upload-progress-bar" id="c-img-bar"></div>
          </div>
        </div>
      </div>
      ${images.length
        ? `<div class="cover-image-grid" id="c-image-grid"></div>`
        : `<div class="cover-image-empty" id="c-image-empty">Ainda sem imagens. Carregue a primeira!</div>`}
      <input type="file" id="c-img-input" accept="image/jpeg,image/png,image/webp" style="display:none">`;

    if (images.length) {
      const grid = container.querySelector('#c-image-grid');
      images.forEach(img => _addImageThumb(grid, img));
    }

    const uploadBtn = container.querySelector('#c-img-upload-btn');
    const fileInput = container.querySelector('#c-img-input');

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      uploadBtn.disabled = true;
      const progressDiv = container.querySelector('#c-img-progress');
      const bar         = container.querySelector('#c-img-bar');
      progressDiv.style.display = 'flex';

      try {
        const { user } = getState();
        const newImg = await uploadCoverImage(file, user?.email || '', (pct) => {
          bar.style.width = pct + '%';
        });

        let grid = container.querySelector('#c-image-grid');
        if (!grid) {
          container.querySelector('#c-image-empty')?.remove();
          grid = document.createElement('div');
          grid.className = 'cover-image-grid';
          grid.id = 'c-image-grid';
          container.querySelector('#c-img-upload-btn').closest('div').after(grid);
        }
        _addImageThumb(grid, newImg);
        _selectImage(newImg.id, newImg.url);
      } catch (err) {
        showToast('Erro ao carregar: ' + err.message, 'error');
      } finally {
        uploadBtn.disabled = false;
        progressDiv.style.display = 'none';
        bar.style.width = '0%';
        fileInput.value = '';
      }
    });
  }

  document.getElementById('modal-save').addEventListener('click', async () => {
    const title    = document.getElementById('c-title').value.trim();
    const subtitle = document.getElementById('c-subtitle').value.trim();
    const duration = document.getElementById('c-duration').value.trim();
    const category = document.getElementById('c-category').value.trim();
    const passing  = parseInt(document.getElementById('c-passing').value) || 60;
    const dueDate  = document.getElementById('c-due-date').value || '';
    const isRequired = document.getElementById('c-required').value === 'true';
    const targetDepartments = Array.from(
      document.querySelectorAll('#c-target-departments-group input:checked'),
      el => el.value
    );
    const errEl    = document.getElementById('c-error');

    if (!title) { errEl.textContent = 'O título é obrigatório.'; errEl.style.display = 'block'; return; }
    if (passing < 0 || passing > 100) { errEl.textContent = 'A nota mínima deve estar entre 0 e 100.'; errEl.style.display = 'block'; return; }

    const status   = document.getElementById('c-status').value;
    const courseId = isEdit ? course.id : title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g,'').slice(0,30) + '-' + Date.now();
    const { user } = getState();
    const now = new Date().toISOString();
    const auditFields = isEdit
      ? { editadoPor: user?.email || '', editadoEm: now }
      : { criadoPor: user?.email || '', criadoEm: now, editadoPor: user?.email || '', editadoEm: now };
    let coverId = '';
    let coverImageUrl = '';
    let coverImageId = '';

    if (_activeTab === 'image') {
      if (!_selImageId) {
        errEl.textContent = 'Selecione uma imagem ou mude para o tab Ícone.';
        errEl.style.display = 'block';
        return;
      }
      coverImageUrl = _selImageUrl;
      coverImageId  = _selImageId;
    } else {
      coverId = (_pickerDirty || (isEdit && course?.coverId)) ? `${COVER_ICONS[_selIcon].key}|${_selPal}` : '';
    }

    const data = { title, subtitle, duration, category, passingScore: passing, dueDate, isRequired, targetRoles: [], targetDepartments, status, coverId, coverImageUrl, coverImageId, order: isEdit ? (course.order ?? 0) : _courses.length, ...auditFields };

    const btn = document.getElementById('modal-save');
    btn.disabled = true;
    try {
      await saveCourse(courseId, data, user?.email, user?.role);
      // Update coverImages usedBy tracking
      if (_activeTab === 'image') {
        await setCoverImageUsage(_selImageId, courseId, true);
        if (_origImageId && _origImageId !== _selImageId) {
          await setCoverImageUsage(_origImageId, courseId, false);
        }
      } else if (_origImageId) {
        await setCoverImageUsage(_origImageId, courseId, false);
      }
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
  const ok = await confirmDialog({
    title: 'Eliminar formação',
    message: `Tem a certeza que pretende eliminar <strong>${escHtml(course.title)}</strong>?<br>Todos os módulos associados serão eliminados e esta ação não pode ser desfeita.`,
    confirmLabel: 'Eliminar formação',
    danger: true,
  });
  if (!ok) return;
  try {
    const { user: _u } = getState();
    if (course.coverImageId) {
      await setCoverImageUsage(course.coverImageId, course.id, false);
    }
    await deleteCourseFromDB(course.id, course.title, _u?.email, _u?.role);
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
  _editContent = isEdit && Array.isArray(mod.content) && mod.content.length
    ? mod.content.map(b => ({ ...b, ...(b.items ? { items: [...b.items] } : {}) }))
    : [];
  _editQuiz = isEdit && Array.isArray(mod.quiz)
    ? mod.quiz.map(q => ({ ...q, ...(q.options ? { options: [...q.options] } : {}) }))
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

        <div class="form-grid-2">
          <div>
            <label class="form-label">Duração</label>
            <input id="m-duration" class="form-input" value="${escHtml(mod?.duration || '')}" placeholder="ex.: 45 min" />
          </div>
          <div>
            <label class="form-label">Nº de páginas</label>
            <input id="m-pages" class="form-input" type="number" value="${mod?.pages || 1}" min="1" />
          </div>
        </div>

        <div class="form-section">
          <label class="form-label">Conteúdo do módulo</label>
          <p class="form-section-hint">
            Blocos de texto mostrados quando não existe PDF. Ignored se houver PDF carregado.
          </p>
          <div id="cb-root"></div>
        </div>

        <div class="form-section">
          <label class="form-label">Avaliação</label>
          <div id="qb-root"></div>
        </div>

        <div id="m-error" class="form-error" style="display:none;margin-top:.5rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-save">${icon('check',14)} ${isEdit ? 'Guardar' : 'Criar'}</button>
      </div>
    </div>`);

  renderContentEditor(document.getElementById('cb-root'));
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
    const { user: u } = getState();
    const nowM = new Date().toISOString();
    const auditM = isEdit
      ? { editadoPor: u?.email || '', editadoEm: nowM }
      : { criadoPor: u?.email || '', criadoEm: nowM, editadoPor: u?.email || '', editadoEm: nowM };
    const data     = { title, duration, pages, quiz: _editQuiz, order, content: _editContent, ...auditM };

    const btn = document.getElementById('modal-save');
    btn.disabled = true;
    try {
      await saveModule(course.id, moduleId, data, u?.email, u?.role);
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
/* Content Builder (editor de blocos de texto)                         */
/* ------------------------------------------------------------------ */

const BLOCK_LABELS = {
  h1: 'Título principal', lead: 'Parágrafo destaque',
  h2: 'Subtítulo', p: 'Parágrafo', list: 'Lista', callout: 'Destaque/Nota',
};

function renderContentEditor(root) {
  if (!root) return;
  root.innerHTML = `
    <div class="content-builder">
      ${_editContent.length === 0
        ? `<p class="cb-empty">Ainda sem blocos de conteúdo. Adicione o primeiro!</p>`
        : _editContent.map((block, i) => renderContentBlock(block, i)).join('')}
      <button class="btn-sm primary" id="cb-add" style="margin-top:.25rem">
        ${icon('plus',12)} Adicionar bloco
      </button>
    </div>`;

  root.querySelector('#cb-add').addEventListener('click', () => {
    _editContent.push({ type: 'p', text: '' });
    renderContentEditor(root);
    root.querySelector('.cb-card:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  root.querySelectorAll('[data-cb="type"]').forEach(el =>
    el.addEventListener('change', () => {
      const i = parseInt(el.dataset.bi);
      const t = el.value;
      _editContent[i] = t === 'list'    ? { type: 'list', items: [''] }
                      : t === 'callout' ? { type: 'callout', label: '', text: '' }
                      :                   { type: t, text: '' };
      renderContentEditor(root);
    })
  );
  root.querySelectorAll('[data-cb="text"]').forEach(el =>
    el.addEventListener('input', () => { _editContent[parseInt(el.dataset.bi)].text = el.value; })
  );
  root.querySelectorAll('[data-cb="label"]').forEach(el =>
    el.addEventListener('input', () => { _editContent[parseInt(el.dataset.bi)].label = el.value; })
  );
  root.querySelectorAll('[data-cb="item"]').forEach(el =>
    el.addEventListener('input', () => {
      _editContent[parseInt(el.dataset.bi)].items[parseInt(el.dataset.ii)] = el.value;
    })
  );
  root.querySelectorAll('[data-cb="add-item"]').forEach(el =>
    el.addEventListener('click', () => {
      _editContent[parseInt(el.dataset.bi)].items.push('');
      renderContentEditor(root);
    })
  );
  root.querySelectorAll('[data-cb="del-item"]').forEach(el =>
    el.addEventListener('click', () => {
      const i = parseInt(el.dataset.bi), ii = parseInt(el.dataset.ii);
      if (_editContent[i].items.length > 1) { _editContent[i].items.splice(ii, 1); renderContentEditor(root); }
    })
  );
  root.querySelectorAll('[data-cb="del"]').forEach(el =>
    el.addEventListener('click', () => {
      _editContent.splice(parseInt(el.dataset.bi), 1);
      renderContentEditor(root);
    })
  );
  root.querySelectorAll('[data-cb="up"]').forEach(el =>
    el.addEventListener('click', () => {
      const i = parseInt(el.dataset.bi);
      if (i > 0) { [_editContent[i-1], _editContent[i]] = [_editContent[i], _editContent[i-1]]; renderContentEditor(root); }
    })
  );
  root.querySelectorAll('[data-cb="down"]').forEach(el =>
    el.addEventListener('click', () => {
      const i = parseInt(el.dataset.bi);
      if (i < _editContent.length - 1) { [_editContent[i], _editContent[i+1]] = [_editContent[i+1], _editContent[i]]; renderContentEditor(root); }
    })
  );
}

function renderContentBlock(block, i) {
  const total = _editContent.length;
  const typeSelect = `
    <select class="form-input cb-type-select" data-cb="type" data-bi="${i}">
      ${Object.entries(BLOCK_LABELS).map(([v,l]) => `<option value="${v}" ${block.type===v?'selected':''}>${l}</option>`).join('')}
    </select>`;

  let bodyHtml = '';
  if (block.type === 'list') {
    bodyHtml = `
      <div class="cb-list-items">
        ${(block.items || []).map((item, ii) => `
          <div class="cb-item-row">
            <input class="form-input cb-item-input" data-cb="item" data-bi="${i}" data-ii="${ii}"
                   value="${escHtml(item)}" placeholder="Item ${ii+1}" />
            ${block.items.length > 1
              ? `<button class="btn-icon" data-cb="del-item" data-bi="${i}" data-ii="${ii}"
                         title="Remover" aria-label="Remover item">${icon('x',11)}</button>` : ''}
          </div>`).join('')}
        <button class="btn-sm" data-cb="add-item" data-bi="${i}" style="margin-top:.25rem">
          ${icon('plus',11)} Adicionar item
        </button>
      </div>`;
  } else if (block.type === 'callout') {
    bodyHtml = `
      <input class="form-input" data-cb="label" data-bi="${i}"
             value="${escHtml(block.label||'')}" placeholder="Rótulo (ex.: Importante)" style="margin-top:.5rem" />
      <textarea class="form-input" data-cb="text" data-bi="${i}"
                rows="2" placeholder="Texto do destaque…" style="margin-top:.5rem">${escHtml(block.text||'')}</textarea>`;
  } else {
    const multi = block.type === 'p' || block.type === 'lead';
    bodyHtml = multi
      ? `<textarea class="form-input" data-cb="text" data-bi="${i}" rows="3"
                   placeholder="Escreva o parágrafo…" style="margin-top:.5rem">${escHtml(block.text||'')}</textarea>`
      : `<input class="form-input" data-cb="text" data-bi="${i}"
               value="${escHtml(block.text||'')}" placeholder="Texto do título…" style="margin-top:.5rem" />`;
  }

  return `
    <div class="cb-card">
      <div class="cb-card-top">
        <span class="cb-num">B${i+1}</span>
        ${typeSelect}
        <div style="display:flex;gap:4px;margin-left:auto">
          <button class="btn-icon" data-cb="up"   data-bi="${i}" ${i===0?'disabled':''} title="Mover para cima" aria-label="Mover bloco para cima">${icon('chevronUp',12)}</button>
          <button class="btn-icon" data-cb="down" data-bi="${i}" ${i===total-1?'disabled':''} title="Mover para baixo" aria-label="Mover bloco para baixo">${icon('chevronDown',12)}</button>
          <button class="btn-icon danger" data-cb="del" data-bi="${i}" title="Remover bloco" aria-label="Remover bloco">${icon('trash',12)}</button>
        </div>
      </div>
      ${bodyHtml}
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Quiz Builder                                                         */
/* ------------------------------------------------------------------ */

function renderQuizEditor(root) {
  root.innerHTML = `
    <div class="quiz-builder">
      ${_editQuiz.length === 0
        ? `<p class="qb-empty">Ainda sem perguntas. Adicione a primeira ou importe um CSV.</p>`
        : _editQuiz.map((q, i) => renderQCard(q, i)).join('')}
      <div style="display:flex;gap:8px;margin-top:.75rem;flex-wrap:wrap">
        <button class="btn-sm primary" id="qb-add">
          ${icon('plus',12)} Adicionar pergunta
        </button>
        <button class="btn-sm" id="qb-import-csv">
          ${icon('upload',12)} Importar CSV
        </button>
        <input type="file" id="qb-csv-input" accept=".csv" style="display:none" />
      </div>
    </div>`;

  root.querySelector('#qb-add').addEventListener('click', () => {
    _editQuiz.push({ type: 'mc', question: '', options: ['', '', '', ''], answer: 0, explanation: '' });
    renderQuizEditor(root);
    root.querySelector('.qb-card:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  root.querySelector('#qb-import-csv').addEventListener('click', () => {
    root.querySelector('#qb-csv-input').click();
  });
  root.querySelector('#qb-csv-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importQuizCSV(file, root);
    e.target.value = '';
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

/* ------------------------------------------------------------------ */
/* Importar Quiz via CSV                                                */
/* ------------------------------------------------------------------ */

function importQuizCSV(file, root) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
    const errors = [];
    const imported = [];

    // ignora cabeçalho se a primeira linha começar com "tipo"
    const start = lines[0].toLowerCase().startsWith('tipo') ? 1 : 0;

    lines.slice(start).forEach((raw, idx) => {
      const row = raw.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g)
        ?.map(v => v.replace(/^"|"$/g, '').trim()) || raw.split(',').map(v => v.trim());

      const [tipo, pergunta, op1, op2, op3, op4, resposta, explicacao] = row;

      if (!tipo || !pergunta) { errors.push(`Linha ${start + idx + 1}: tipo e pergunta são obrigatórios`); return; }

      const t = tipo.toLowerCase();

      if (t === 'mc') {
        const options = [op1, op2, op3, op4].filter(Boolean);
        if (options.length < 2) { errors.push(`Linha ${start + idx + 1}: múltipla escolha precisa de pelo menos 2 opções`); return; }
        const ans = parseInt(resposta) - 1;
        if (isNaN(ans) || ans < 0 || ans >= options.length) { errors.push(`Linha ${start + idx + 1}: resposta inválida (use 1-${options.length})`); return; }
        imported.push({ type: 'mc', question: pergunta, options, answer: ans, explanation: explicacao || '' });

      } else if (t === 'tf') {
        const r = (resposta || '').toLowerCase();
        if (!['verdadeiro','falso','true','false','v','f'].includes(r)) { errors.push(`Linha ${start + idx + 1}: resposta deve ser "verdadeiro" ou "falso"`); return; }
        imported.push({ type: 'tf', question: pergunta, answer: ['verdadeiro','true','v'].includes(r), explanation: explicacao || '' });

      } else {
        errors.push(`Linha ${start + idx + 1}: tipo inválido "${tipo}" (use "mc" ou "tf")`);
      }
    });

    if (errors.length) {
      showToast(`${errors.length} erro(s) no CSV. Verifique o formato.`, 'error');
      console.warn('Erros CSV:', errors);
      return;
    }
    if (!imported.length) { showToast('Nenhuma pergunta encontrada no CSV.', 'error'); return; }

    _editQuiz.push(...imported);
    renderQuizEditor(root);
    showToast(`${imported.length} pergunta(s) importada(s) com sucesso.`, 'success');
  };
  reader.readAsText(file, 'UTF-8');
}

/* ------------------------------------------------------------------ */
/* Modal de Ajuda                                                       */
/* ------------------------------------------------------------------ */

function openHelpModal() {
  const overlay = createOverlay(`
    <div class="modal modal-wide" style="max-width:680px">
      <div class="modal-header">
        <h3>${icon('info',16)} Ajuda — Gestão de Conteúdos</h3>
        <button class="btn-icon" id="modal-close" aria-label="Fechar">${icon('x',16)}</button>
      </div>
      <div class="modal-body" style="font-size:14px;line-height:1.7">

        <h4 style="font-size:13px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem">Formações</h4>
        <p style="color:var(--ink-2);margin-bottom:.75rem">Cada formação agrupa um ou mais módulos. Para criar uma formação clique em <strong>Nova formação</strong> e preencha o título, subtítulo, categoria e configurações. A formação fica em <em>Rascunho</em> até ser publicada.</p>

        <h4 style="font-size:13px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;margin-top:1.25rem">Módulos e PDFs</h4>
        <p style="color:var(--ink-2);margin-bottom:.75rem">Clique em <strong>Adicionar módulo</strong> dentro de uma formação para criar um módulo. No separador <em>PDF</em> pode fazer upload do documento de estudo. O PDF substitui o editor de conteúdo — se fizer upload, o colaborador vê o PDF.</p>

        <h4 style="font-size:13px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;margin-top:1.25rem">Questionários — formato CSV</h4>
        <p style="color:var(--ink-2);margin-bottom:.5rem">No separador <em>Questionário</em> do módulo, clique em <strong>Importar CSV</strong> para carregar perguntas em massa. O ficheiro deve ter as seguintes colunas (separadas por vírgula):</p>

        <div style="background:var(--bg);border-radius:8px;padding:.75rem 1rem;font-family:monospace;font-size:12px;color:var(--ink);margin-bottom:.75rem;overflow-x:auto;white-space:nowrap">
          tipo, pergunta, opcao1, opcao2, opcao3, opcao4, resposta, explicacao
        </div>

        <p style="color:var(--ink-2);margin-bottom:.5rem"><strong>Tipos de pergunta:</strong></p>
        <ul style="color:var(--ink-2);padding-left:1.25rem;margin-bottom:.75rem">
          <li style="margin-bottom:.35rem"><strong>mc</strong> — múltipla escolha. Preencha opcao1 a opcao4 (mínimo 2). <em>resposta</em> = número da opção correta (1, 2, 3 ou 4).</li>
          <li><strong>tf</strong> — verdadeiro / falso. Deixe as opções vazias. <em>resposta</em> = <code>verdadeiro</code> ou <code>falso</code>.</li>
        </ul>

        <p style="color:var(--ink-2);margin-bottom:.5rem"><strong>Exemplo de ficheiro CSV:</strong></p>
        <div style="background:var(--bg);border-radius:8px;padding:.75rem 1rem;font-family:monospace;font-size:11.5px;color:var(--ink);margin-bottom:.75rem;overflow-x:auto">
          <div style="color:var(--ink-3)">tipo,pergunta,opcao1,opcao2,opcao3,opcao4,resposta,explicacao</div>
          <div>mc,Qual o equipamento obrigatório em cozinha?,Avental,Luvas,Touca,Todas as anteriores,4,Todo o equipamento é obrigatório por higiene.</div>
          <div>tf,O cliente deve ser sempre cumprimentado à entrada?,,,,, verdadeiro,O acolhimento é essencial no serviço de sala.</div>
          <div>mc,Com que frequência trocar a roupa de cama?,Diariamente,À saída do hóspede,Semanalmente,Nunca,2,A roupa muda a cada saída de hóspede.</div>
        </div>

        <p style="color:var(--ink-3);font-size:12.5px">${icon('info',12,'var(--ink-3)')} A primeira linha do CSV é ignorada se começar com "tipo". O campo <em>explicação</em> é opcional.</p>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" id="modal-close-btn">Percebido</button>
      </div>
    </div>`);

  overlay.querySelector('#modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modal-close-btn').addEventListener('click', () => overlay.remove());
}

async function confirmDeleteModule(course, mod) {
  const ok = await confirmDialog({
    title: 'Eliminar módulo',
    message: `Tem a certeza que pretende eliminar o módulo <strong>${escHtml(mod.title)}</strong>?<br>O progresso e avaliação dos colaboradores neste módulo serão afetados.`,
    confirmLabel: 'Eliminar módulo',
    danger: true,
  });
  if (!ok) return;
  try {
    const { user: _mu } = getState();
    await deleteModuleFromDB(course.id, mod.id, mod.title, _mu?.email, _mu?.role);
    clearCoursesCache();
    showToast('Módulo eliminado.', 'success');
    await loadAndRenderCourses();
  } catch (e) { showToast('Erro ao eliminar: ' + e.message, 'error'); }
}

async function reorderModule(course, moduleId, direction) {
  const mods = [...(course.modules || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const idx = mods.findIndex(m => m.id === moduleId);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= mods.length) return;
  const orderA = mods[idx].order ?? idx;
  const orderB = mods[newIdx].order ?? newIdx;
  mods[idx].order = orderB;
  mods[newIdx].order = orderA;
  try {
    await Promise.all([
      saveModule(course.id, mods[idx].id, { order: mods[idx].order }),
      saveModule(course.id, mods[newIdx].id, { order: mods[newIdx].order }),
    ]);
    clearCoursesCache();
    await loadAndRenderCourses();
  } catch (e) { showToast('Erro ao reordenar: ' + e.message, 'error'); }
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
            <div id="pdf-bar" style="height:100%;background:var(--cyan-2);border-radius:3px;transition:transform .2s;transform-origin:left;transform:scaleX(0)"></div>
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
        document.getElementById('pdf-bar').style.transform = `scaleX(${pct / 100})`;
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
