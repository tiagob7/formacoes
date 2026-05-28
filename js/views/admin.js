import { icon }      from '../icons.js';
import { getState }  from '../state.js';
import { showToast, confirmDialog } from '../ui.js';

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getDepartments,
  logAuditEvent,
} from '../firebase-service.js';

const ROLES = { administrador: 'Administrador', gestor_conteudos: 'Gestor de conteúdos', gestor_colaboradores: 'Gestor de Colaboradores' };
const ROLE_COLOR = { administrador: 'var(--red)', gestor_conteudos: 'var(--amber)', gestor_colaboradores: 'var(--green)' };

const ADMIN_ROLES = ['administrador', 'gestor_conteudos', 'gestor_colaboradores'];

export async function renderAdmin(container) {
  const { user } = getState();
  if (user?.role !== 'administrador') {
    container.innerHTML = '<p class="access-denied">Acesso negado.</p>'; return;
  }

  let employees = [];
  try { employees = await getEmployees(); } catch (e) { console.warn(e); }
  const managers = employees
    .filter(e => ADMIN_ROLES.includes(e.role))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="topbar-title">Administração</h1>
        <div class="topbar-sub">Gestão de administradores e gestores</div>
      </div>
    </div>
    <div class="admin-body">
      <div id="admin-content"></div>
    </div>`;

  renderManagers(managers);
}

function renderManagers(managers) {
  const content = document.getElementById('admin-content');
  if (!content) return;

  content.innerHTML = `
    <div class="admin-toolbar">
      <input id="search-managers" class="form-input" style="max-width:260px"
             placeholder="Pesquisar por nome ou email…" />
      <div class="toolbar-right">
        <span class="admin-count-badge">${managers.length} utilizadores</span>
        <button class="btn-primary" id="btn-new-manager">${icon('plus',14)} Novo utilizador</button>
      </div>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>
          <th>Nome</th><th>Email</th><th>Departamento</th><th>Role</th><th>Estado</th><th></th>
        </tr></thead>
        <tbody id="managers-tbody"></tbody>
      </table>
    </div>`;

  renderManagerRows(managers, managers);

  document.getElementById('search-managers').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderManagerRows(managers.filter(emp =>
      (emp.nome || '').toLowerCase().includes(q)
      || emp.id.toLowerCase().includes(q)
    ), managers);
  });

  document.getElementById('btn-new-manager').addEventListener('click', () =>
    openManagerModal(null, managers)
  );
}

function renderManagerRows(list, all) {
  const tbody = document.getElementById('managers-tbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Nenhum utilizador encontrado</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(emp => `
    <tr>
      <td><strong>${emp.nome || '—'}</strong></td>
      <td class="table-cell-meta">${emp.id}</td>
      <td class="table-cell-meta">${emp.departamento || '—'}</td>
      <td>
        <span class="role-badge"
              style="background:${ROLE_COLOR[emp.role]}18;color:${ROLE_COLOR[emp.role]};border:1px solid ${ROLE_COLOR[emp.role]}30">
          ${ROLES[emp.role] || emp.role}
        </span>
      </td>
      <td>
        <span class="status-dot ${emp.ativo ? 'active' : 'inactive'}"></span>
        ${emp.ativo ? 'Ativo' : 'Inativo'}
      </td>
      <td class="table-actions">
        <button class="btn-icon" data-act="edit" data-id="${emp.id}" title="Editar" aria-label="Editar utilizador">${icon('edit',14)}</button>
        <button class="btn-icon ${emp.ativo ? 'warn' : 'ok'}" data-act="toggle" data-id="${emp.id}" data-ativo="${emp.ativo}"
                title="${emp.ativo ? 'Desativar' : 'Ativar'}" aria-label="${emp.ativo ? 'Desativar' : 'Ativar'}">
          ${emp.ativo ? icon('x',14) : icon('check',14)}
        </button>
        <button class="btn-icon danger" data-act="delete" data-id="${emp.id}" title="Eliminar" aria-label="Eliminar">${icon('trash',14)}</button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-act="edit"]').forEach(btn =>
    btn.addEventListener('click', () => openManagerModal(all.find(e => e.id === btn.dataset.id), all))
  );
  tbody.querySelectorAll('[data-act="toggle"]').forEach(btn =>
    btn.addEventListener('click', () => toggleManager(btn.dataset.id, btn.dataset.ativo === 'true', all))
  );
  tbody.querySelectorAll('[data-act="delete"]').forEach(btn =>
    btn.addEventListener('click', () => confirmDeleteManager(btn.dataset.id, all))
  );
}

async function toggleManager(email, ativo, all) {
  const { user } = getState();
  try {
    await updateEmployee(email, { ativo: !ativo });
    await logAuditEvent('toggle_user', user?.email, user?.role, email, !ativo ? 'Ativado' : 'Desativado');
    showToast(`Utilizador ${!ativo ? 'ativado' : 'desativado'}.`, 'success');
    renderManagerRows(all.map(e => e.id === email ? { ...e, ativo: !ativo } : e), all.map(e => e.id === email ? { ...e, ativo: !ativo } : e));
  } catch { showToast('Erro ao atualizar.', 'error'); }
}

async function confirmDeleteManager(email, all) {
  const ok = await confirmDialog({
    title: 'Eliminar utilizador',
    message: `Tem a certeza que pretende eliminar permanentemente o utilizador <strong>${email}</strong>?<br>Esta ação não pode ser desfeita.`,
    confirmLabel: 'Eliminar',
    danger: true,
  });
  if (!ok) return;
  try {
    await deleteEmployee(email);
    showToast('Utilizador eliminado.', 'success');
    const updated = all.filter(e => e.id !== email);
    renderManagers(updated);
  } catch (e) { showToast('Erro ao eliminar: ' + e.message, 'error'); }
}

async function openManagerModal(emp, all) {
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
        <h3>${isEdit ? 'Editar utilizador' : 'Novo utilizador'}</h3>
        <button class="btn-icon" id="modal-close" aria-label="Fechar janela">${icon('x',16)}</button>
      </div>
      <div class="modal-body">
        <label class="form-label">Nome completo</label>
        <input id="u-nome"  class="form-input" value="${escHtml(emp?.nome || '')}" placeholder="ex.: Maria Silva" />

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

        <label class="form-label" style="margin-top:1rem">Role</label>
        <select id="u-role" class="form-input">
          ${Object.entries(ROLES).map(([v,l]) =>
            `<option value="${v}" ${emp?.role === v ? 'selected' : ''}>${l}</option>`
          ).join('')}
        </select>

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
    const nome     = document.getElementById('u-nome').value.trim();
    const email    = (document.getElementById('u-email').value || emp?.id || '').trim().toLowerCase();
    const dSel     = document.getElementById('u-departamento');
    const dOutro   = document.getElementById('u-departamento-outro');
    const departamento = dSel?.tagName === 'SELECT'
      ? (dSel.value === '__outro__' ? (dOutro?.value.trim() || '') : dSel.value)
      : (dSel?.value.trim() || '');
    const password = !isEdit ? document.getElementById('u-password').value : null;
    const role     = document.getElementById('u-role').value;
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
        await updateEmployee(email, { nome, role, departamento, ativo }, adminUser?.email || '');
        await logAuditEvent('edit_user', adminUser?.email, adminUser?.role, email, `role: ${role}, ativo: ${ativo}`);
      } else {
        await createEmployee(email, password, nome, role, departamento, adminUser?.email || '');
        await logAuditEvent('create_user', adminUser?.email, adminUser?.role, email, `role: ${role}`);
      }
      showToast(`Utilizador ${isEdit ? 'atualizado' : 'criado'}.`, 'success');
      overlay.remove();
      await renderAdmin(document.getElementById('main'));
    } catch (e) {
      errEl.textContent = 'Erro: ' + e.message;
      errEl.style.display = 'block';
      btn.disabled = false;
    }
  });
}

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
