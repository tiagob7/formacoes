import { icon }          from '../icons.js';
import { getState }      from '../state.js';
import { showToast }     from '../ui.js';
import { getEmployees, createEmployee, updateEmployee, importEmployees, getAllProgress } from '../firebase-service.js';
import { COURSES }       from '../data.js';

const ROLES = { administrador: 'Administrador', gestor_conteudos: 'Gestor Conteúdos', colaborador: 'Colaborador' };
const ROLE_COLORS = { administrador: 'var(--red)', gestor_conteudos: 'var(--amber)', colaborador: 'var(--cyan-2)' };

export async function renderAdmin(container) {
  const { user } = getState();
  if (user?.role !== 'administrador') { container.innerHTML = '<p style="padding:2rem">Acesso negado.</p>'; return; }

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="topbar-title">Administração</h1>
        <div class="topbar-sub">Gestão de utilizadores e monitorização da plataforma</div>
      </div>
    </div>
    <div style="padding:0 2rem 2rem">
      <div class="admin-tabs" id="admin-tabs">
        <button class="admin-tab active" data-tab="users">${icon('user',15)} Utilizadores</button>
        <button class="admin-tab" data-tab="import">${icon('upload',15)} Importar Excel</button>
        <button class="admin-tab" data-tab="progress">${icon('chart',15)} Progresso Global</button>
      </div>
      <div id="admin-content"></div>
    </div>`;

  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab);
    });
  });

  renderTab('users');
}

async function renderTab(tab) {
  const content = document.getElementById('admin-content');
  content.innerHTML = `<div class="admin-loading">${icon('spinner',20)} A carregar...</div>`;
  if (tab === 'users')    await renderUsers(content);
  if (tab === 'import')   renderImport(content);
  if (tab === 'progress') await renderProgress(content);
}

/* ------------------------------------------------------------------ */
/* Tab: Utilizadores                                                    */
/* ------------------------------------------------------------------ */

async function renderUsers(container) {
  let employees = [];
  try { employees = await getEmployees(); } catch (e) { console.warn(e); }

  container.innerHTML = `
    <div class="admin-toolbar">
      <input id="search-users" class="form-input" style="max-width:280px" placeholder="${icon('search',13)} Pesquisar utilizador..." />
      <button class="btn-primary" id="btn-new-user" style="margin-left:auto">
        ${icon('plus',14)} Novo utilizador
      </button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table" id="users-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Role</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="users-tbody"></tbody>
      </table>
    </div>`;

  renderUsersTable(employees);

  document.getElementById('search-users').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderUsersTable(employees.filter(emp =>
      emp.nome?.toLowerCase().includes(q) || emp.id?.toLowerCase().includes(q)
    ));
  });

  document.getElementById('btn-new-user').addEventListener('click', () => openUserModal(null, employees, container));
}

function renderUsersTable(list) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--ink-3)">Sem utilizadores</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(emp => `
    <tr>
      <td><strong>${emp.nome || '—'}</strong></td>
      <td style="color:var(--ink-3);font-size:13px">${emp.id}</td>
      <td><span class="role-badge" style="background:${ROLE_COLORS[emp.role]}20;color:${ROLE_COLORS[emp.role]};border:1px solid ${ROLE_COLORS[emp.role]}40">${ROLES[emp.role] || emp.role}</span></td>
      <td>
        <span class="status-dot ${emp.ativo ? 'active' : 'inactive'}"></span>
        ${emp.ativo ? 'Ativo' : 'Inativo'}
      </td>
      <td class="table-actions">
        <button class="btn-icon" data-action="edit" data-email="${emp.id}" title="Editar">${icon('edit',14)}</button>
        <button class="btn-icon ${emp.ativo ? 'warn' : 'ok'}" data-action="toggle" data-email="${emp.id}" data-ativo="${emp.ativo}" title="${emp.ativo ? 'Desativar' : 'Ativar'}">
          ${emp.ativo ? icon('x',14) : icon('check',14)}
        </button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      const ativo = btn.dataset.ativo === 'true';
      try {
        await updateEmployee(email, { ativo: !ativo });
        showToast(`Utilizador ${!ativo ? 'ativado' : 'desativado'}.`, 'success');
        document.querySelector('.admin-tab.active')?.click();
      } catch { showToast('Erro ao atualizar.', 'error'); }
    });
  });

  tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const emp = list.find(e => e.id === btn.dataset.email);
      openUserModal(emp, list, document.getElementById('admin-content'));
    });
  });
}

function openUserModal(emp, employees, container) {
  const isEdit = !!emp;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar utilizador' : 'Novo utilizador'}</h3>
        <button class="btn-icon" id="modal-close">${icon('x',16)}</button>
      </div>
      <div class="modal-body">
        <label class="form-label">Nome completo</label>
        <input id="m-nome" class="form-input" value="${emp?.nome || ''}" placeholder="ex.: Maria Silva" />
        <label class="form-label" style="margin-top:1rem">Email</label>
        <input id="m-email" class="form-input" type="email" value="${emp?.id || ''}" placeholder="email@empresa.pt" ${isEdit ? 'disabled' : ''} />
        <label class="form-label" style="margin-top:1rem">Role</label>
        <select id="m-role" class="form-input">
          ${Object.entries(ROLES).map(([v,l]) => `<option value="${v}" ${emp?.role===v?'selected':''}>${l}</option>`).join('')}
        </select>
        <div id="m-error" class="form-error" style="display:none;margin-top:.5rem"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn-primary" id="modal-save">${icon('check',14)} ${isEdit ? 'Guardar' : 'Criar'}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.getElementById?.('modal-close')?.addEventListener('click', close);
  document.getElementById('modal-close').addEventListener('click', close);
  document.getElementById('modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.getElementById('modal-save').addEventListener('click', async () => {
    const nome  = document.getElementById('m-nome').value.trim();
    const email = document.getElementById('m-email').value.trim().toLowerCase();
    const role  = document.getElementById('m-role').value;
    const errEl = document.getElementById('m-error');

    if (!nome || !email) { errEl.textContent = 'Preencha todos os campos.'; errEl.style.display = 'block'; return; }
    if (!isEdit && employees.find(e => e.id === email)) {
      errEl.textContent = 'Este email já existe.'; errEl.style.display = 'block'; return;
    }

    const btn = document.getElementById('modal-save');
    btn.disabled = true; btn.textContent = 'A guardar...';
    try {
      if (isEdit) {
        await updateEmployee(email, { nome, role });
      } else {
        await createEmployee(email, nome, role);
      }
      showToast(`Utilizador ${isEdit ? 'atualizado' : 'criado'}.`, 'success');
      close();
      document.querySelector('.admin-tab.active')?.click();
    } catch (e) {
      errEl.textContent = 'Erro ao guardar: ' + e.message;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = isEdit ? 'Guardar' : 'Criar';
    }
  });
}

/* ------------------------------------------------------------------ */
/* Tab: Importar Excel                                                  */
/* ------------------------------------------------------------------ */

function renderImport(container) {
  container.innerHTML = `
    <div class="import-panel">
      <div class="import-info">
        ${icon('info',16,'var(--cyan-2)')}
        <div>
          <strong>Formato esperado do ficheiro Excel/CSV:</strong>
          <p style="margin:.25rem 0 0;color:var(--ink-3)">
            O ficheiro deve ter colunas: <code>email</code>, <code>nome</code>, e opcionalmente <code>role</code>
            (valores: <code>colaborador</code>, <code>gestor_conteudos</code>, <code>administrador</code>).
          </p>
        </div>
      </div>

      <label class="form-label" style="margin-top:1.5rem">Ficheiro (.xlsx, .xls, .csv)</label>
      <div class="file-drop-zone" id="drop-zone">
        ${icon('upload',28,'var(--ink-3)')}
        <div>Arraste o ficheiro aqui ou</div>
        <label class="btn-sm primary" style="cursor:pointer">
          Escolher ficheiro
          <input type="file" id="excel-input" accept=".xlsx,.xls,.csv" style="display:none" />
        </label>
      </div>

      <div id="import-preview" style="display:none">
        <h4 style="margin:1.5rem 0 .75rem">Pré-visualização</h4>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Email</th><th>Nome</th><th>Role</th></tr></thead>
            <tbody id="preview-tbody"></tbody>
          </table>
        </div>
        <div id="import-summary" style="margin:.75rem 0;color:var(--ink-3);font-size:13px"></div>
        <button class="btn-primary" id="btn-confirm-import">${icon('upload',14)} Confirmar importação</button>
      </div>
    </div>`;

  let parsedData = [];

  document.getElementById('excel-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  const dropZone = document.getElementById('drop-zone');
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    if (!window.XLSX) { showToast('Biblioteca Excel não carregada. Tente novamente.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb    = XLSX.read(ev.target.result, { type: 'array' });
        const ws    = wb.Sheets[wb.SheetNames[0]];
        const rows  = XLSX.utils.sheet_to_json(ws, { defval: '' });
        parsedData  = rows.map(r => ({
          email: r.email || r.Email || r.EMAIL || '',
          nome:  r.nome  || r.Nome  || r.NOME  || r.name || r.Name || '',
          role:  r.role  || r.Role  || 'colaborador',
        })).filter(r => r.email);

        const tbody = document.getElementById('preview-tbody');
        tbody.innerHTML = parsedData.map(r => `
          <tr>
            <td>${r.email}</td>
            <td>${r.nome}</td>
            <td><span class="role-badge" style="background:${ROLE_COLORS[r.role] || 'var(--ink-4)'}20;color:${ROLE_COLORS[r.role] || 'var(--ink-3)'}">
              ${ROLES[r.role] || r.role}
            </span></td>
          </tr>`).join('');

        document.getElementById('import-summary').textContent = `${parsedData.length} utilizadores encontrados no ficheiro.`;
        document.getElementById('import-preview').style.display = 'block';
      } catch { showToast('Erro ao ler o ficheiro. Verifique o formato.', 'error'); }
    };
    reader.readAsArrayBuffer(file);
  }

  document.getElementById('btn-confirm-import')?.addEventListener('click', async () => {
    if (!parsedData.length) return;
    const btn = document.getElementById('btn-confirm-import');
    btn.disabled = true; btn.textContent = 'A importar...';
    try {
      const result = await importEmployees(parsedData);
      showToast(`Importação concluída: ${result.created} criados, ${result.skipped} ignorados.`, 'success');
      document.getElementById('import-preview').style.display = 'none';
      parsedData = [];
    } catch (e) {
      showToast('Erro na importação: ' + e.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `${icon('upload',14)} Confirmar importação`;
    }
  });
}

/* ------------------------------------------------------------------ */
/* Tab: Progresso Global                                                */
/* ------------------------------------------------------------------ */

async function renderProgress(container) {
  let employees = [], allProgress = [];
  try {
    employees   = await getEmployees();
    allProgress = await getAllProgress(employees.filter(e => e.ativo));
  } catch (e) { console.warn(e); }

  const courses = COURSES;

  container.innerHTML = `
    <div class="progress-overview">
      <div class="progress-cards" id="progress-cards"></div>
      <h3 style="margin:2rem 0 1rem">Progresso por colaborador</h3>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Colaborador</th>
              ${courses.map(c => `<th style="min-width:120px">${c.title.split(' ').slice(0,2).join(' ')}</th>`).join('')}
              <th>Global</th>
            </tr>
          </thead>
          <tbody id="progress-tbody"></tbody>
        </table>
      </div>
    </div>`;

  // Summary cards
  const cards = document.getElementById('progress-cards');
  cards.innerHTML = courses.map(course => {
    const totalModules = course.modules.length;
    let totalPassed = 0, totalPossible = 0;
    allProgress.forEach(({ progress }) => {
      const cp = progress?.[course.id] || {};
      course.modules.forEach(m => { if (cp[m.id]?.quizPassed) totalPassed++; });
      totalPossible += totalModules;
    });
    const pct = totalPossible ? Math.round((totalPassed / totalPossible) * 100) : 0;
    return `
      <div class="kpi-card" style="min-width:200px">
        <div class="kpi-label">${course.title}</div>
        <div class="kpi-value">${pct}<span class="kpi-unit">%</span></div>
        <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${pct}%"></div></div>
        <div class="kpi-sub" style="margin-top:.5rem;color:var(--ink-3);font-size:12px">
          ${allProgress.filter(({progress}) => {
            const cp = progress?.[course.id] || {};
            return course.modules.every(m => cp[m.id]?.quizPassed);
          }).length} / ${allProgress.length} concluíram
        </div>
      </div>`;
  }).join('');

  // Per-user table
  const tbody = document.getElementById('progress-tbody');
  tbody.innerHTML = allProgress.map(({ email, nome, progress }) => {
    let totalDone = 0, totalMods = 0;
    const cols = courses.map(course => {
      const cp = progress?.[course.id] || {};
      const done = course.modules.filter(m => cp[m.id]?.quizPassed).length;
      const total = course.modules.length;
      totalDone += done; totalMods += total;
      const pct = Math.round((done / total) * 100);
      const color = pct === 100 ? 'var(--green)' : pct > 0 ? 'var(--amber)' : 'var(--ink-4)';
      return `<td>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="flex:1;height:6px;background:var(--ink-6);border-radius:3px">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:3px"></div>
          </div>
          <span style="font-size:12px;color:var(--ink-3);width:32px;text-align:right">${pct}%</span>
        </div>
      </td>`;
    }).join('');
    const globalPct = totalMods ? Math.round((totalDone / totalMods) * 100) : 0;
    return `<tr>
      <td>
        <div style="font-weight:600">${nome || email}</div>
        <div style="font-size:12px;color:var(--ink-3)">${email}</div>
      </td>
      ${cols}
      <td><strong>${globalPct}%</strong></td>
    </tr>`;
  }).join('') || `<tr><td colspan="${courses.length + 2}" style="text-align:center;padding:2rem;color:var(--ink-3)">Sem dados</td></tr>`;
}
