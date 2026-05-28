import { icon }      from '../icons.js';
import { getState }  from '../state.js';
import { showToast, confirmDialog } from '../ui.js';
import { loadCourses } from '../course-service.js';

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
import {
  getEmployees, getEmployeesPaginated, createEmployee, updateEmployee, deleteEmployee,
  importWhitelist, getWhitelist, getWhitelistPaginated, addWhitelistEntry, deleteWhitelistEntry, clearWhitelist,
  getAllProgress,
  getDepartments, saveDepartment, deleteDepartment,
  logAuditEvent,
} from '../firebase-service.js';

const ROLES_ALL  = { administrador: 'Administrador', gestor_conteudos: 'Gestor de conteúdos', gestor_colaboradores: 'Gestor de Colaboradores', colaborador: 'Colaborador' };
const ROLE_COLOR = { administrador: 'var(--red)', gestor_conteudos: 'var(--amber)', gestor_colaboradores: 'var(--green)', colaborador: 'var(--cyan-2)' };

export async function renderUtilizadores(container) {
  const { user } = getState();
  const isAdmin         = user?.role === 'administrador';
  const isGestorColabs  = user?.role === 'gestor_colaboradores';

  if (!isAdmin && !isGestorColabs) {
    container.innerHTML = '<p class="access-denied">Acesso negado.</p>'; return;
  }

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="topbar-title">Utilizadores</h1>
        <div class="topbar-sub">Gestão de colaboradores, whitelist e departamentos</div>
      </div>
    </div>
    <div class="admin-body">
      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="users">${icon('user',15)} Colaboradores</button>
        <button class="admin-tab" data-tab="whitelist">${icon('check',15)} Whitelist</button>
        <button class="admin-tab" data-tab="departments">${icon('grid',15)} Departamentos</button>
        <button class="admin-tab" data-tab="progress">${icon('chart',15)} Progresso Global</button>
      </div>
      <div id="utlz-content"></div>
    </div>`;

  document.querySelectorAll('.admin-tab').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTab(btn.dataset.tab, isAdmin);
    })
  );

  loadTab('users', isAdmin);
}

function loadTab(tab, isAdmin) {
  const content = document.getElementById('utlz-content');
  if (!content) return;
  content.innerHTML = `<div class="admin-loading">${icon('spinner',18)} A carregar...</div>`;
  if (tab === 'users')       renderUsers(content, isAdmin);
  if (tab === 'whitelist')   renderWhitelist(content);
  if (tab === 'departments') renderDepartments(content);
  if (tab === 'progress')    renderProgress(content);
}

/* ================================================================== */
/* TAB: COLABORADORES                                                   */
/* ================================================================== */

async function renderUsers(container, isAdmin) {
  let loaded = [];
  let cursor = null;
  let hasMore = false;
  let allForSearch = null; // carregado só quando pesquisa

  container.innerHTML = `
    <div class="admin-toolbar">
      <input id="search-users" class="form-input" style="max-width:260px"
             placeholder="Pesquisar por nome, email ou nº…" />
      <div class="toolbar-right">
        <span class="admin-count-badge" id="users-count">A carregar…</span>
        <button class="btn-primary" id="btn-new-user">${icon('plus',14)} Novo colaborador</button>
      </div>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>
          <th>Nº Col</th><th>Nome</th><th>NIF</th><th>Email</th><th>Departamento</th><th>Estado</th><th></th>
        </tr></thead>
        <tbody id="users-tbody"><tr><td colspan="7" class="table-empty">A carregar…</td></tr></tbody>
      </table>
    </div>
    <div id="users-load-more" style="text-align:center;padding:12px 0;display:none">
      <button class="btn-ghost" id="btn-load-more-users">${icon('chevronDown',14)} Carregar mais</button>
    </div>`;

  async function loadMore() {
    try {
      const result = await getEmployeesPaginated(20, cursor);
      loaded = [...loaded, ...result.docs];
      cursor  = result.cursor;
      hasMore = result.hasMore;
    } catch (e) {
      console.warn('getEmployeesPaginated falhou, a usar getEmployees:', e);
      try {
        const all = await getEmployees();
        loaded = all.filter(emp => emp.role === 'colaborador').sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        allForSearch = loaded;
      } catch (e2) { console.warn(e2); }
    }
    renderUsersRows(loaded, loaded);
    document.getElementById('users-count').textContent = `${loaded.length}${hasMore ? '+' : ''} colaboradores`;
    const lm = document.getElementById('users-load-more');
    if (lm) lm.style.display = hasMore ? 'block' : 'none';
  }

  await loadMore();

  document.getElementById('btn-load-more-users')?.addEventListener('click', loadMore);

  document.getElementById('btn-new-user').addEventListener('click', () =>
    openUserModal(null, loaded)
  );

  document.getElementById('search-users').addEventListener('input', async e => {
    const q = e.target.value.trim().toLowerCase();
    document.getElementById('users-load-more').style.display = 'none';
    if (!q) { renderUsersRows(loaded, loaded); return; }
    // pesquisa: carrega todos uma vez
    if (!allForSearch) {
      document.getElementById('users-tbody').innerHTML =
        `<tr><td colspan="7" class="table-empty">A pesquisar…</td></tr>`;
      try { allForSearch = await getEmployees(); } catch { allForSearch = loaded; }
      allForSearch = allForSearch.filter(e => e.role === 'colaborador');
    }
    renderUsersRows(allForSearch.filter(emp =>
      (emp.nome || '').toLowerCase().includes(q) ||
      emp.id.toLowerCase().includes(q) ||
      (emp.numero || '').toLowerCase().includes(q) ||
      (emp.departamento || '').toLowerCase().includes(q)
    ), allForSearch);
  });
}

function renderUsersRows(list, all) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Nenhum colaborador encontrado</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(emp => `
    <tr>
      <td class="table-cell-meta">${emp.numero || '—'}</td>
      <td><strong>${emp.nome || '—'}</strong></td>
      <td class="table-cell-meta">${emp.contribuinte || '—'}</td>
      <td class="table-cell-meta">${emp.id}</td>
      <td class="table-cell-meta">${emp.departamento || '—'}</td>
      <td>
        <span class="status-dot ${emp.ativo ? 'active' : 'inactive'}"></span>
        ${emp.ativo ? 'Ativo' : 'Inativo'}
      </td>
      <td class="table-actions">
        <button class="btn-icon" data-act="edit" data-id="${emp.id}" title="Editar" aria-label="Editar">${icon('edit',14)}</button>
        <button class="btn-icon ${emp.ativo ? 'warn' : 'ok'}" data-act="toggle" data-id="${emp.id}" data-ativo="${emp.ativo}"
                title="${emp.ativo ? 'Desativar' : 'Ativar'}" aria-label="${emp.ativo ? 'Desativar' : 'Ativar'}">
          ${emp.ativo ? icon('x',14) : icon('check',14)}
        </button>
        <button class="btn-icon danger" data-act="delete" data-id="${emp.id}" title="Eliminar" aria-label="Eliminar">${icon('trash',14)}</button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-act="edit"]').forEach(btn =>
    btn.addEventListener('click', () => openUserModal(all.find(e => e.id === btn.dataset.id), all))
  );
  tbody.querySelectorAll('[data-act="toggle"]').forEach(btn =>
    btn.addEventListener('click', () => toggleUser(btn.dataset.id, btn.dataset.ativo === 'true'))
  );
  tbody.querySelectorAll('[data-act="delete"]').forEach(btn =>
    btn.addEventListener('click', () => confirmDeleteUser(btn.dataset.id))
  );
}

async function toggleUser(email, ativo) {
  const { user } = getState();
  try {
    await updateEmployee(email, { ativo: !ativo });
    await logAuditEvent('toggle_user', user?.email, user?.role, email, !ativo ? 'Ativado' : 'Desativado');
    showToast(`Colaborador ${!ativo ? 'ativado' : 'desativado'}.`, 'success');
    loadTab('users', user?.role === 'administrador');
  } catch { showToast('Erro ao atualizar.', 'error'); }
}

async function confirmDeleteUser(email) {
  const ok = await confirmDialog({
    title: 'Eliminar colaborador',
    message: `Tem a certeza que pretende eliminar permanentemente o utilizador <strong>${email}</strong>?<br>Esta ação não pode ser desfeita.`,
    confirmLabel: 'Eliminar',
    danger: true,
  });
  if (!ok) return;
  try {
    await deleteEmployee(email);
    showToast('Colaborador eliminado.', 'success');
    const { user } = getState();
    loadTab('users', user?.role === 'administrador');
  } catch (e) { showToast('Erro ao eliminar: ' + e.message, 'error'); }
}

async function openUserModal(emp, all) {
  const isEdit = !!emp;
  let departments = [];
  try { departments = await getDepartments(); } catch { /* sem deps → campo texto */ }

  const deptOptions = departments.length
    ? `<select id="u-departamento" class="form-input">
         <option value="">— Sem departamento —</option>
         ${departments.map(d => `<option value="${escHtml(d.nome)}" ${emp?.departamento === d.nome ? 'selected' : ''}>${escHtml(d.nome)}</option>`).join('')}
         <option value="__outro__">Outro…</option>
       </select>
       <input id="u-departamento-outro" class="form-input" placeholder="Escreva o departamento"
              style="margin-top:.5rem;display:none" />`
    : `<input id="u-departamento" class="form-input" value="${escHtml(emp?.departamento || '')}" placeholder="ex.: RH" />`;

  const overlay = createOverlay(`
    <div class="modal">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar colaborador' : 'Novo colaborador'}</h3>
        <button class="btn-icon" id="modal-close" aria-label="Fechar janela">${icon('x',16)}</button>
      </div>
      <div class="modal-body">
        <label class="form-label">Nome completo</label>
        <input id="u-nome" class="form-input" value="${escHtml(emp?.nome || '')}" placeholder="ex.: Maria Silva" />

        <label class="form-label" style="margin-top:1rem">Email</label>
        <input id="u-email" class="form-input" type="email" value="${emp?.id || ''}"
               placeholder="email@empresa.pt" ${isEdit ? 'disabled style="opacity:.6"' : ''} />

        <label class="form-label" style="margin-top:1rem">Departamento</label>
        ${deptOptions}

        ${!isEdit ? `
        <label class="form-label" style="margin-top:1rem">Palavra-passe</label>
        <input id="u-password" class="form-input" type="password"
               placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
        ` : ''}

        ${isEdit ? `
        <label class="form-label" style="margin-top:1rem">Estado</label>
        <select id="u-ativo" class="form-input">
          <option value="true"  ${emp?.ativo ? 'selected' : ''}>Ativo</option>
          <option value="false" ${!emp?.ativo ? 'selected' : ''}>Inativo</option>
        </select>` : ''}

        <div id="u-error" class="form-error" style="display:none;margin-top:.75rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-save">
          ${icon('check',14)} ${isEdit ? 'Guardar' : 'Criar'}
        </button>
      </div>
    </div>`);

  const deptSelect = document.getElementById('u-departamento');
  const deptOutro  = document.getElementById('u-departamento-outro');
  if (deptSelect?.tagName === 'SELECT') {
    deptSelect.addEventListener('change', () => {
      if (deptOutro) deptOutro.style.display = deptSelect.value === '__outro__' ? 'block' : 'none';
    });
  }

  document.getElementById('modal-save').addEventListener('click', async () => {
    const nome   = document.getElementById('u-nome').value.trim();
    const email  = (document.getElementById('u-email').value || emp?.id || '').trim().toLowerCase();
    const dSel   = document.getElementById('u-departamento');
    const dOutro = document.getElementById('u-departamento-outro');
    const departamento = dSel?.tagName === 'SELECT'
      ? (dSel.value === '__outro__' ? (dOutro?.value.trim() || '') : dSel.value)
      : (dSel?.value.trim() || '');
    const password = !isEdit ? document.getElementById('u-password').value : null;
    const ativo    = isEdit ? document.getElementById('u-ativo').value === 'true' : true;
    const errEl    = document.getElementById('u-error');

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!nome) { errEl.textContent = 'Preencha o nome completo.'; errEl.style.display = 'block'; return; }
    if (!email || !emailRe.test(email)) { errEl.textContent = 'Introduza um email válido.'; errEl.style.display = 'block'; return; }
    if (!isEdit && !password) { errEl.textContent = 'Defina uma palavra-passe.'; errEl.style.display = 'block'; return; }
    if (!isEdit && password.length < 6) { errEl.textContent = 'A palavra-passe deve ter pelo menos 6 caracteres.'; errEl.style.display = 'block'; return; }
    if (!isEdit && all.find(e => e.id === email)) { errEl.textContent = 'Este email já existe.'; errEl.style.display = 'block'; return; }

    const btn = document.getElementById('modal-save');
    btn.disabled = true;
    const { user: adminUser } = getState();
    try {
      if (isEdit) {
        await updateEmployee(email, { nome, departamento, ativo }, adminUser?.email || '');
        await logAuditEvent('edit_user', adminUser?.email, adminUser?.role, email, `ativo: ${ativo}`);
      } else {
        await createEmployee(email, password, nome, 'colaborador', departamento, adminUser?.email || '');
        await logAuditEvent('create_user', adminUser?.email, adminUser?.role, email, 'role: colaborador');
      }
      showToast(`Colaborador ${isEdit ? 'atualizado' : 'criado'}.`, 'success');
      overlay.remove();
      loadTab('users', adminUser?.role === 'administrador');
    } catch (e) {
      errEl.textContent = 'Erro: ' + e.message;
      errEl.style.display = 'block';
      btn.disabled = false;
    }
  });
}

/* ================================================================== */
/* TAB: WHITELIST                                                       */
/* ================================================================== */

async function renderWhitelist(container) {
  let loaded = [];
  let cursor = null;
  let hasMore = false;
  let allForSearch = null;

  container.innerHTML = `
    <div class="whitelist-layout">
      <div>
        <div class="admin-toolbar">
          <input id="search-wl" class="form-input" style="max-width:240px" placeholder="Pesquisar…" />
          <div class="toolbar-right">
            <span id="wl-count" style="font-size:13px;color:var(--ink-3)">A carregar…</span>
            <button class="btn-ghost" id="btn-add-wl">${icon('plus',14)} Adicionar entrada</button>
            <button class="btn-ghost danger" id="btn-clear-wl">${icon('trash',14)} Eliminar tudo</button>
          </div>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr>
              <th>Nº Col</th><th>Nome</th><th>NIF</th><th>Email</th><th>Departamento</th><th>Estado</th><th></th>
            </tr></thead>
            <tbody id="wl-tbody"><tr><td colspan="7" class="table-empty">A carregar…</td></tr></tbody>
          </table>
        </div>
        <div id="wl-load-more" style="text-align:center;padding:12px 0;display:none">
          <button class="btn-ghost" id="btn-load-more-wl">${icon('chevronDown',14)} Carregar mais</button>
        </div>
      </div>
      <div class="wl-import-panel">
        <div class="wl-import-header">
          ${icon('upload',16,'var(--cyan-2)')}
          <strong>Importar Excel / CSV</strong>
        </div>
        <p class="wl-import-desc">
          Colunas obrigatórias: <code>email</code>.<br>
          Opcionais: <code>nome</code>, <code>numero</code>, <code>contribuinte</code>, <code>departamento</code>.
        </p>
        <label class="wl-update-row">
          <input type="checkbox" id="wl-update-toggle" style="accent-color:var(--cyan-2);cursor:pointer">
          <span>Atualizar registos existentes <small style="color:var(--ink-3)">(preserva registo/criadoEm)</small></span>
        </label>
        <div class="file-drop-zone" id="wl-drop-zone">
          ${icon('upload',24,'var(--ink-3)')}
          <span>Arraste o ficheiro ou</span>
          <label class="btn-sm primary" style="cursor:pointer">
            Escolher ficheiro
            <input type="file" id="wl-file-input" accept=".xlsx,.xls,.csv" style="display:none" />
          </label>
        </div>
        <div id="wl-preview" style="display:none">
          <div id="wl-preview-info" style="font-size:13px;color:var(--ink-3);margin:.75rem 0"></div>
          <button class="btn-primary" style="width:100%" id="wl-confirm">
            ${icon('upload',14)} Confirmar importação
          </button>
        </div>
      </div>
    </div>`;

  async function loadMore() {
    try {
      const result = await getWhitelistPaginated(20, cursor);
      loaded = [...loaded, ...result.docs];
      cursor  = result.cursor;
      hasMore = result.hasMore;
    } catch (e) { console.warn(e); }
    renderWhitelistRows(loaded, loaded);
    document.getElementById('wl-count').textContent = `${loaded.length}${hasMore ? '+' : ''} entradas`;
    const lm = document.getElementById('wl-load-more');
    if (lm) lm.style.display = hasMore ? 'block' : 'none';
  }

  await loadMore();

  document.getElementById('btn-load-more-wl')?.addEventListener('click', loadMore);

  document.getElementById('btn-add-wl')?.addEventListener('click', () => openWhitelistModal());

  document.getElementById('btn-clear-wl')?.addEventListener('click', async () => {
    const count = document.getElementById('wl-count')?.textContent || '';
    const ok = await confirmDialog({
      title: 'Eliminar toda a whitelist',
      message: `Tem a certeza que pretende eliminar <strong>todos</strong> os registos da whitelist (${count})?<br>
                Esta ação <strong>não pode ser desfeita</strong> e não afeta utilizadores já registados.`,
      confirmLabel: 'Eliminar tudo',
      danger: true,
    });
    if (!ok) return;
    const btn = document.getElementById('btn-clear-wl');
    btn.disabled = true; btn.textContent = 'A eliminar…';
    try {
      const { user } = getState();
      const deleted = await clearWhitelist();
      await logAuditEvent('clear_whitelist', user?.email, user?.role, `${deleted} entradas`, 'Whitelist limpa');
      showToast(`${deleted} entradas eliminadas.`, 'success');
      loadTab('whitelist');
    } catch (e) {
      showToast('Erro: ' + e.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `${icon('trash',14)} Eliminar tudo`;
    }
  });

  document.getElementById('search-wl').addEventListener('input', async e => {
    const q = e.target.value.trim().toLowerCase();
    document.getElementById('wl-load-more').style.display = 'none';
    if (!q) { renderWhitelistRows(loaded, loaded); return; }
    if (!allForSearch) {
      document.getElementById('wl-tbody').innerHTML =
        `<tr><td colspan="7" class="table-empty">A pesquisar…</td></tr>`;
      try { allForSearch = await getWhitelist(); } catch { allForSearch = loaded; }
    }
    renderWhitelistRows(allForSearch.filter(r =>
      (r.nome || '').toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.numero || '').toLowerCase().includes(q) ||
      (r.contribuinte || '').toLowerCase().includes(q)
    ), allForSearch);
  });

  setupWhitelistImport(loaded);
}

async function openWhitelistModal() {
  let departments = [];
  try { departments = await getDepartments(); } catch { /* sem deps → campo texto */ }

  const deptOptions = departments.length
    ? `<select id="wl-departamento" class="form-input">
         <option value="">— Sem departamento —</option>
         ${departments.map(d => `<option value="${escHtml(d.nome)}">${escHtml(d.nome)}</option>`).join('')}
         <option value="__outro__">Outro…</option>
       </select>
       <input id="wl-departamento-outro" class="form-input" placeholder="Escreva o departamento"
              style="margin-top:.5rem;display:none" />`
    : `<input id="wl-departamento" class="form-input" placeholder="ex.: Recursos Humanos" />`;

  const overlay = createOverlay(`
    <div class="modal">
      <div class="modal-header">
        <h3>Adicionar à whitelist</h3>
        <button class="btn-icon" id="modal-close" aria-label="Fechar janela">${icon('x',16)}</button>
      </div>
      <div class="modal-body">
        <label class="form-label">Email <span style="color:var(--red)">*</span></label>
        <input id="wl-email" class="form-input" type="email" placeholder="colaborador@empresa.pt" autocomplete="off" />

        <label class="form-label" style="margin-top:1rem">Nome completo</label>
        <input id="wl-nome" class="form-input" placeholder="ex.: Maria Silva" />

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:1rem">
          <div>
            <label class="form-label">Nº Colaborador</label>
            <input id="wl-numero" class="form-input" placeholder="ex.: 12345" />
          </div>
          <div>
            <label class="form-label">NIF</label>
            <input id="wl-nif" class="form-input" placeholder="ex.: 123456789" maxlength="9" />
          </div>
        </div>

        <label class="form-label" style="margin-top:1rem">Departamento</label>
        ${deptOptions}

        <div id="wl-modal-error" class="form-error" style="display:none;margin-top:.75rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-save">
          ${icon('check',14)} Adicionar
        </button>
      </div>
    </div>`);

  const deptSelect = document.getElementById('wl-departamento');
  const deptOutro  = document.getElementById('wl-departamento-outro');
  if (deptSelect?.tagName === 'SELECT') {
    deptSelect.addEventListener('change', () => {
      if (deptOutro) deptOutro.style.display = deptSelect.value === '__outro__' ? 'block' : 'none';
    });
  }

  document.getElementById('modal-close').addEventListener('click',  () => overlay.remove());
  document.getElementById('modal-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('modal-save').addEventListener('click', async () => {
    const email  = document.getElementById('wl-email').value.trim().toLowerCase();
    const nome   = document.getElementById('wl-nome').value.trim();
    const numero = document.getElementById('wl-numero').value.trim();
    const contribuinte = document.getElementById('wl-nif').value.trim();
    const dSel   = document.getElementById('wl-departamento');
    const dOutro = document.getElementById('wl-departamento-outro');
    const departamento = dSel?.tagName === 'SELECT'
      ? (dSel.value === '__outro__' ? (dOutro?.value.trim() || '') : dSel.value)
      : (dSel?.value.trim() || '');
    const errEl  = document.getElementById('wl-modal-error');

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !emailRe.test(email)) {
      errEl.textContent = 'Introduza um email válido.';
      errEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('modal-save');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:14px;height:14px"></span> A guardar…`;

    try {
      const { user } = getState();
      await addWhitelistEntry({ email, nome, numero, contribuinte, departamento });
      await logAuditEvent('add_whitelist', user?.email, user?.role, email, nome);
      overlay.remove();
      showToast('Entrada adicionada à whitelist.', 'success');
      loadTab('whitelist');
    } catch (e) {
      errEl.textContent = e.message || 'Erro ao adicionar entrada.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `${icon('check',14)} Adicionar`;
    }
  });

  document.getElementById('wl-email').focus();
}

function renderWhitelistRows(filtered, all) {
  const tbody = document.getElementById('wl-tbody');
  if (!tbody) return;
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Nenhuma entrada encontrada</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(entry => `
    <tr>
      <td class="table-cell-meta">${entry.numero || '—'}</td>
      <td><strong>${entry.nome || '—'}</strong></td>
      <td class="table-cell-meta">${entry.contribuinte || '—'}</td>
      <td class="table-cell-meta">${entry.id}</td>
      <td class="table-cell-meta">${entry.departamento || '—'}</td>
      <td>
        ${entry.registado
          ? `<span style="color:var(--green);font-size:13px">${icon('check',13,'var(--green)')} Registado</span>`
          : `<span style="color:var(--ink-3);font-size:13px">Pendente</span>`}
      </td>
      <td class="table-actions">
        <button class="btn-icon danger" data-act="del-wl" data-id="${entry.id}" title="Remover" aria-label="Remover">${icon('trash',14)}</button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-act="del-wl"]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Remover da whitelist',
        message: `Remover <strong>${btn.dataset.id}</strong> da whitelist?`,
        confirmLabel: 'Remover',
        danger: true,
      });
      if (!ok) return;
      try {
        const { user } = getState();
        await deleteWhitelistEntry(btn.dataset.id);
        await logAuditEvent('delete_whitelist', user?.email, user?.role, btn.dataset.id, '');
        showToast('Entrada removida.', 'success');
        loadTab('whitelist');
      } catch { showToast('Erro ao remover.', 'error'); }
    })
  );
}

function setupWhitelistImport(existingList) {
  let parsed  = [];
  let invalid = [];

  const existingEmails = new Set(existingList.map(e => e.id));

  function updatePreview() {
    const updateMode = document.getElementById('wl-update-toggle')?.checked || false;
    const newCount      = parsed.filter(r => !existingEmails.has(r.email)).length;
    const existingCount = parsed.length - newCount;

    const invalidHtml = invalid.length
      ? `<div style="margin-top:.5rem;font-size:12px;color:var(--red,#c0392b)">
           ${icon('x',12,'var(--red,#c0392b)')} ${invalid.length} linha(s) ignorada(s) por email inválido ou em falta:
           <ul style="margin:.25rem 0 0 1rem;padding:0">
             ${invalid.slice(0, 5).map(r => `<li>Linha ${r.linha}: "${r.email || '(vazio)'}"</li>`).join('')}
             ${invalid.length > 5 ? `<li>… e mais ${invalid.length - 5}</li>` : ''}
           </ul>
         </div>`
      : '';

    const countsHtml = updateMode
      ? `<strong>${parsed.length}</strong> linhas válidas &nbsp;·&nbsp;
         <strong style="color:var(--green)">${newCount}</strong> novas &nbsp;·&nbsp;
         <strong style="color:var(--cyan-2)">${existingCount}</strong> a atualizar`
      : `<strong>${parsed.length}</strong> linhas válidas &nbsp;·&nbsp;
         <strong style="color:var(--green)">${newCount}</strong> novas &nbsp;·&nbsp;
         <strong style="color:var(--ink-3)">${existingCount}</strong> já existentes (ignoradas)`;

    document.getElementById('wl-preview-info').innerHTML = countsHtml + invalidHtml;

    const confirmBtn = document.getElementById('wl-confirm');
    if (confirmBtn) {
      confirmBtn.innerHTML = updateMode
        ? `${icon('upload',14)} Confirmar atualização`
        : `${icon('upload',14)} Confirmar importação`;
    }
  }

  const handleFile = file => {
    if (!window.XLSX) { showToast('Biblioteca Excel não carregada.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        const wb   = XLSX.read(ev.target.result, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        const allRows = rows.map((r, i) => ({
          linha: i + 2,
          email:        (r.email || r.Email || r.EMAIL || '').trim().toLowerCase(),
          nome:         (r.nome || r.Nome || r.name || r.Name || '').trim(),
          numero:       String(r.numero || r.Numero || r['nº colaborador'] || r['Nº Colaborador'] || r.num || '').trim(),
          contribuinte: String(r.contribuinte || r.Contribuinte || r.nif || r.NIF || r.nifNipc || '').trim(),
          departamento: (r.departamento || r.Departamento || r.dept || '').trim(),
        }));

        invalid = allRows.filter(r => !r.email || !emailRe.test(r.email));
        parsed  = allRows.filter(r => r.email && emailRe.test(r.email));

        updatePreview();
        document.getElementById('wl-preview').style.display = 'block';
      } catch { showToast('Erro ao ler o ficheiro.', 'error'); }
    };
    reader.readAsArrayBuffer(file);
  };

  document.getElementById('wl-file-input').addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  document.getElementById('wl-update-toggle')?.addEventListener('change', () => {
    if (parsed.length) updatePreview();
  });

  const dz = document.getElementById('wl-drop-zone');
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  document.getElementById('wl-confirm')?.addEventListener('click', async () => {
    if (!parsed.length) return;
    const updateMode = document.getElementById('wl-update-toggle')?.checked || false;
    const btn = document.getElementById('wl-confirm');
    btn.disabled = true; btn.textContent = 'A importar…';
    try {
      const { user } = getState();
      const result = await importWhitelist(parsed, { update: updateMode });
      const detail = updateMode
        ? `${result.created} criados, ${result.updated} atualizados, ${result.skipped} ignorados`
        : `${result.created} adicionados, ${result.skipped} ignorados`;
      await logAuditEvent('import_whitelist', user?.email, user?.role, `${result.created} criados`, detail);
      showToast(detail + '.', 'success');
      loadTab('whitelist');
    } catch (e) {
      showToast('Erro: ' + e.message, 'error');
      btn.disabled = false;
      btn.innerHTML = document.getElementById('wl-update-toggle')?.checked
        ? `${icon('upload',14)} Confirmar atualização`
        : `${icon('upload',14)} Confirmar importação`;
    }
  });
}

/* ================================================================== */
/* TAB: DEPARTAMENTOS                                                   */
/* ================================================================== */

async function renderDepartments(container) {
  let deps = [];
  try { deps = await getDepartments(); } catch (e) { console.warn(e); }
  const { user } = getState();

  container.innerHTML = `
    <div class="admin-toolbar">
      <span class="admin-count-badge">${deps.length} departamento(s)</span>
      <button class="btn-primary" id="btn-new-dept" style="margin-left:auto">
        ${icon('plus',14)} Novo departamento
      </button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>
          <th>Nome</th><th>Criado por</th><th>Data</th><th></th>
        </tr></thead>
        <tbody id="dept-tbody"></tbody>
      </table>
    </div>`;

  renderDeptRows(deps);
  document.getElementById('btn-new-dept').addEventListener('click', () => openDeptModal(deps, user));

  function renderDeptRows(list) {
    const tbody = document.getElementById('dept-tbody');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Nenhum departamento criado ainda.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(d => `
      <tr>
        <td><strong>${escHtml(d.nome)}</strong></td>
        <td class="table-cell-meta">${escHtml(d.criadoPor || '—')}</td>
        <td class="table-cell-meta">${d.criadoEm ? new Date(d.criadoEm).toLocaleDateString('pt-PT') : '—'}</td>
        <td class="table-actions">
          <button class="btn-icon danger" data-act="del-dept" data-id="${escHtml(d.id)}" data-nome="${escHtml(d.nome)}"
                  title="Eliminar" aria-label="Eliminar">${icon('trash',14)}</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-act="del-dept"]').forEach(btn =>
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Eliminar departamento',
          message: `Eliminar o departamento <strong>${escHtml(btn.dataset.nome)}</strong>?`,
          confirmLabel: 'Eliminar',
          danger: true,
        });
        if (!ok) return;
        try {
          await deleteDepartment(btn.dataset.id);
          showToast('Departamento eliminado.', 'success');
          loadTab('departments');
        } catch { showToast('Erro ao eliminar.', 'error'); }
      })
    );
  }

  function openDeptModal(depsList, currentUser) {
    const ov = createOverlay(`
      <div class="modal" style="max-width:380px">
        <div class="modal-header">
          <h3>Novo departamento</h3>
          <button class="btn-icon" id="modal-close" aria-label="Fechar">${icon('x',16)}</button>
        </div>
        <div class="modal-body">
          <label class="form-label">Nome do departamento</label>
          <input id="dept-nome" class="form-input" placeholder="ex.: Recursos Humanos" />
          <div id="dept-error" class="form-error" style="display:none;margin-top:.75rem"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" id="modal-cancel">Cancelar</button>
          <button class="btn-primary" id="modal-save">${icon('check',14)} Criar</button>
        </div>
      </div>`);

    ov.querySelector('#modal-save').addEventListener('click', async () => {
      const nome  = document.getElementById('dept-nome').value.trim();
      const errEl = document.getElementById('dept-error');
      if (!nome) { errEl.textContent = 'Escreva o nome do departamento.'; errEl.style.display = 'block'; return; }
      if (depsList.find(d => d.nome.toLowerCase() === nome.toLowerCase())) {
        errEl.textContent = 'Este departamento já existe.'; errEl.style.display = 'block'; return;
      }
      const btn = ov.querySelector('#modal-save');
      btn.disabled = true;
      try {
        await saveDepartment(nome, currentUser?.email || '');
        showToast('Departamento criado.', 'success');
        ov.remove();
        loadTab('departments');
      } catch (e) {
        errEl.textContent = 'Erro: ' + e.message; errEl.style.display = 'block'; btn.disabled = false;
      }
    });
  }
}

/* ================================================================== */
/* TAB: PROGRESSO GLOBAL                                                */
/* ================================================================== */

async function renderProgress(container) {
  let employees = [], allProgress = [], courses = [];
  try {
    employees   = await getEmployees();
    allProgress = await getAllProgress(employees.filter(e => e.ativo && e.role === 'colaborador'));
    courses     = await loadCourses();
  } catch (e) { console.warn(e); }

  if (!allProgress.length) {
    container.innerHTML = `<p class="access-denied">Sem dados de progresso.</p>`;
    return;
  }

  const totalColabs = allProgress.length;
  let totalDoneGlobal = 0, totalModsGlobal = 0, scoresSum = 0, scoresCount = 0, completedAll = 0;
  allProgress.forEach(({ progress: prog }) => {
    let allCourseDone = true;
    courses.forEach(course => {
      const cp = prog?.[course.id] || {};
      course.modules.forEach(m => {
        if (cp[m.id]?.quizPassed) totalDoneGlobal++;
        if (cp[m.id]?.bestScore != null) { scoresSum += cp[m.id].bestScore; scoresCount++; }
        totalModsGlobal++;
      });
      if (course.modules.length && !course.modules.every(m => cp[m.id]?.quizPassed)) allCourseDone = false;
    });
    if (allCourseDone && courses.length) completedAll++;
  });
  const globalPct = totalModsGlobal ? Math.round((totalDoneGlobal / totalModsGlobal) * 100) : 0;
  const avgScore  = scoresCount ? Math.round(scoresSum / scoresCount) : null;

  container.innerHTML = `
    <div class="kpi-summary-row">
      <div class="kpi-summary-card">
        <div class="kpi-summary-n">${totalColabs}</div>
        <div class="kpi-summary-l">Colaboradores ativos</div>
      </div>
      <div class="kpi-summary-card">
        <div class="kpi-summary-n" style="color:var(--cyan-2)">${globalPct}<span style="font-size:16px">%</span></div>
        <div class="kpi-summary-l">Conclusão global</div>
      </div>
      <div class="kpi-summary-card">
        <div class="kpi-summary-n" style="color:var(--green)">${completedAll}</div>
        <div class="kpi-summary-l">Concluíram tudo</div>
      </div>
      <div class="kpi-summary-card">
        <div class="kpi-summary-n" style="color:var(--amber)">${avgScore != null ? avgScore + '%' : '—'}</div>
        <div class="kpi-summary-l">Nota média</div>
      </div>
    </div>
    <div class="section-title-row">
      <h3 class="section-title">Resumo por formação</h3>
      <button class="btn-sm primary" id="btn-export-csv">${icon('download',13)} Exportar CSV</button>
    </div>
    <div class="progress-cards" id="progress-cards"></div>
    <h3 class="section-title--spaced">Detalhe por colaborador</h3>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>
          <th>Colaborador</th>
          ${courses.map(c => `<th style="min-width:110px;white-space:nowrap">${c.title.split(' ').slice(0,3).join(' ')}</th>`).join('')}
          <th>Global</th>
        </tr></thead>
        <tbody id="progress-tbody"></tbody>
      </table>
    </div>`;

  document.getElementById('progress-cards').innerHTML = courses.map(course => {
    const modCount = course.modules.length;
    let passed = 0, possible = 0;
    allProgress.forEach(({ progress }) => {
      const cp = progress?.[course.id] || {};
      course.modules.forEach(m => { if (cp[m.id]?.quizPassed) passed++; });
      possible += modCount;
    });
    const pct      = possible ? Math.round((passed / possible) * 100) : 0;
    const finished = allProgress.filter(({ progress }) => {
      if (!course.modules.length) return false;
      const cp = progress?.[course.id] || {};
      return course.modules.every(m => cp[m.id]?.quizPassed);
    }).length;
    return `
      <div class="kpi-card" style="min-width:180px;flex:1">
        <div class="kpi-label">${course.title}</div>
        <div class="kpi-value">${pct}<span class="kpi-unit">%</span></div>
        <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${pct}%"></div></div>
        <div class="kpi-sub" style="margin-top:.4rem;font-size:12px">
          ${finished} / ${allProgress.length} concluíram
        </div>
      </div>`;
  }).join('');

  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const header = ['Colaborador', 'Email', ...courses.map(c => c.title), 'Global (%)'];
    const rows = allProgress
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
      .map(({ email, nome, progress: prog }) => {
        let totalDone = 0, totalMods = 0;
        const cols = courses.map(course => {
          const cp   = prog?.[course.id] || {};
          const done = course.modules.filter(m => cp[m.id]?.quizPassed).length;
          const tot  = course.modules.length;
          totalDone += done; totalMods += tot;
          return tot ? Math.round((done / tot) * 100) + '%' : '—';
        });
        const global = totalMods ? Math.round((totalDone / totalMods) * 100) + '%' : '—';
        return [nome || email, email, ...cols, global];
      });
    const csv  = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `progresso_formacoes_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  });

  document.getElementById('progress-tbody').innerHTML = allProgress
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    .map(({ email, nome, progress }) => {
      let totalDone = 0, totalMods = 0;
      const cols = courses.map(course => {
        const cp   = progress?.[course.id] || {};
        const done = course.modules.filter(m => cp[m.id]?.quizPassed).length;
        const tot  = course.modules.length;
        totalDone += done; totalMods += tot;
        const pct   = tot ? Math.round((done / tot) * 100) : 0;
        const color = pct === 100 ? 'var(--green)' : pct > 0 ? 'var(--amber)' : 'var(--line)';
        return `<td>
          <div class="progress-cell">
            <div class="progress-bar-mini">
              <div class="progress-bar-mini-fill" style="width:${pct}%;background:${color}"></div>
            </div>
            <span class="cell-meta" style="width:28px;text-align:right">${pct}%</span>
          </div>
        </td>`;
      }).join('');
      const global = totalMods ? Math.round((totalDone / totalMods) * 100) : 0;
      return `<tr>
        <td>
          <div class="cell-name">${nome || email}</div>
          <div class="cell-meta">${email}</div>
        </td>
        ${cols}
        <td><strong>${global}%</strong></td>
      </tr>`;
    }).join('');
}

/* ================================================================== */
/* Helper                                                               */
/* ================================================================== */

function createOverlay(html) {
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.innerHTML = html;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.querySelector('#modal-close')?.addEventListener('click', close);
  el.querySelector('#modal-cancel')?.addEventListener('click', close);
  el.addEventListener('click', e => { if (e.target === el) close(); });
  return el;
}
