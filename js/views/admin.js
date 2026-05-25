import { icon }      from '../icons.js';
import { getState }  from '../state.js';
import { showToast } from '../ui.js';
import { loadCourses } from '../course-service.js';
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  importWhitelist, getWhitelist, deleteWhitelistEntry,
  getAllProgress,
} from '../firebase-service.js';

const ROLES = { administrador: 'Administrador', gestor_conteudos: 'Gestor de conteúdos', colaborador: 'Colaborador' };
const ROLE_COLOR = { administrador: 'var(--red)', gestor_conteudos: 'var(--amber)', colaborador: 'var(--cyan-2)' };

export async function renderAdmin(container) {
  const { user } = getState();
  if (user?.role !== 'administrador') {
    container.innerHTML = '<p style="padding:2rem">Acesso negado.</p>'; return;
  }

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="topbar-title">Administração</h1>
        <div class="topbar-sub">Gestão de utilizadores, whitelist e monitorização</div>
      </div>
    </div>
    <div style="padding:0 2rem 2rem">
      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="users">${icon('user',15)} Utilizadores</button>
        <button class="admin-tab" data-tab="whitelist">${icon('check',15)} Whitelist</button>
        <button class="admin-tab" data-tab="progress">${icon('chart',15)} Progresso Global</button>
      </div>
      <div id="admin-content"></div>
    </div>`;

  document.querySelectorAll('.admin-tab').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTab(btn.dataset.tab);
    })
  );

  loadTab('users');
}

function loadTab(tab) {
  const content = document.getElementById('admin-content');
  content.innerHTML = `<div class="admin-loading">${icon('spinner',18)} A carregar...</div>`;
  if (tab === 'users')    renderUsers(content);
  if (tab === 'whitelist') renderWhitelist(content);
  if (tab === 'progress') renderProgress(content);
}

/* ================================================================== */
/* TAB: UTILIZADORES                                                    */
/* ================================================================== */

async function renderUsers(container) {
  let employees = [];
  try { employees = await getEmployees(); } catch (e) { console.warn(e); }
  employees.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  container.innerHTML = `
    <div class="admin-toolbar">
      <input id="search-users" class="form-input" style="max-width:260px"
             placeholder="Pesquisar por nome ou email…" />
      <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
        <span class="admin-count-badge">${employees.length} utilizadores</span>
        <button class="btn-primary" id="btn-new-user">${icon('plus',14)} Novo utilizador</button>
      </div>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>
          <th>Nome</th><th>Email</th><th>Role</th><th>Estado</th><th></th>
        </tr></thead>
        <tbody id="users-tbody"></tbody>
      </table>
    </div>`;

  renderUsersRows(employees, employees);

  document.getElementById('search-users').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderUsersRows(employees.filter(emp =>
      (emp.nome || '').toLowerCase().includes(q) || emp.id.toLowerCase().includes(q)
    ), employees);
  });

  document.getElementById('btn-new-user').addEventListener('click', () =>
    openUserModal(null, employees)
  );
}

function renderUsersRows(list, all) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Nenhum utilizador encontrado</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(emp => `
    <tr>
      <td><strong>${emp.nome || '—'}</strong></td>
      <td style="color:var(--ink-3);font-size:13px">${emp.id}</td>
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
                title="${emp.ativo ? 'Desativar' : 'Ativar'}" aria-label="${emp.ativo ? 'Desativar utilizador' : 'Ativar utilizador'}">
          ${emp.ativo ? icon('x',14) : icon('check',14)}
        </button>
        <button class="btn-icon danger" data-act="delete" data-id="${emp.id}" title="Eliminar" aria-label="Eliminar utilizador">${icon('trash',14)}</button>
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
  try {
    await updateEmployee(email, { ativo: !ativo });
    showToast(`Utilizador ${!ativo ? 'ativado' : 'desativado'}.`, 'success');
    loadTab('users');
  } catch { showToast('Erro ao atualizar.', 'error'); }
}

async function confirmDeleteUser(email) {
  if (!confirm(`Eliminar permanentemente o utilizador "${email}"?\nEsta ação não pode ser desfeita.`)) return;
  try {
    await deleteEmployee(email);
    showToast('Utilizador eliminado.', 'success');
    loadTab('users');
  } catch (e) { showToast('Erro ao eliminar: ' + e.message, 'error'); }
}

function openUserModal(emp, all) {
  const isEdit = !!emp;
  const overlay = createOverlay(`
    <div class="modal">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar utilizador' : 'Novo utilizador'}</h3>
        <button class="btn-icon" id="modal-close" aria-label="Fechar janela">${icon('x',16)}</button>
      </div>
      <div class="modal-body">
        <label class="form-label">Nome completo</label>
        <input id="u-nome"  class="form-input" value="${emp?.nome || ''}" placeholder="ex.: Maria Silva" />

        <label class="form-label" style="margin-top:1rem">Email</label>
        <input id="u-email" class="form-input" type="email" value="${emp?.id || ''}"
               placeholder="email@empresa.pt" ${isEdit ? 'disabled style="opacity:.6"' : ''} />

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

  document.getElementById('modal-save').addEventListener('click', async () => {
    const nome     = document.getElementById('u-nome').value.trim();
    const email    = (document.getElementById('u-email').value || emp?.id || '').trim().toLowerCase();
    const password = !isEdit ? document.getElementById('u-password').value : null;
    const role     = document.getElementById('u-role').value;
    const ativo    = isEdit ? document.getElementById('u-ativo').value === 'true' : true;
    const errEl    = document.getElementById('u-error');

    if (!nome || !email) {
      errEl.textContent = 'Preencha nome e email.'; errEl.style.display = 'block'; return;
    }
    if (!isEdit && !password) {
      errEl.textContent = 'Defina uma palavra-passe.'; errEl.style.display = 'block'; return;
    }
    if (!isEdit && password.length < 6) {
      errEl.textContent = 'A palavra-passe deve ter pelo menos 6 caracteres.'; errEl.style.display = 'block'; return;
    }
    if (!isEdit && all.find(e => e.id === email)) {
      errEl.textContent = 'Este email já existe.'; errEl.style.display = 'block'; return;
    }

    const btn = document.getElementById('modal-save');
    btn.disabled = true;
    try {
      if (isEdit) {
        await updateEmployee(email, { nome, role, ativo });
      } else {
        await createEmployee(email, password, nome, role);
      }
      showToast(`Utilizador ${isEdit ? 'atualizado' : 'criado'}.`, 'success');
      overlay.remove();
      loadTab('users');
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
  let list = [];
  try { list = await getWhitelist(); } catch (e) { console.warn(e); }
  list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  container.innerHTML = `
    <div class="whitelist-layout">

      <!-- Tabela -->
      <div>
        <div class="admin-toolbar">
          <input id="search-wl" class="form-input" style="max-width:240px"
                 placeholder="Pesquisar…" />
          <span style="font-size:13px;color:var(--ink-3);margin-left:auto">${list.length} entradas</span>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr>
              <th>Nome</th><th>Email</th><th>Departamento</th><th>Estado</th><th></th>
            </tr></thead>
            <tbody id="wl-tbody"></tbody>
          </table>
        </div>
      </div>

      <!-- Painel de importação -->
      <div class="wl-import-panel">
        <div class="wl-import-header">
          ${icon('upload',16,'var(--cyan-2)')}
          <strong>Importar Excel / CSV</strong>
        </div>
        <p class="wl-import-desc">
          Colunas esperadas: <code>email</code>, <code>nome</code> e opcionalmente <code>departamento</code>.
          Emails já existentes na whitelist são ignorados.
        </p>
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

  renderWhitelistRows(list, list);

  document.getElementById('search-wl').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderWhitelistRows(list.filter(r =>
      (r.nome || '').toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    ), list);
  });

  setupWhitelistImport(list);
}

function renderWhitelistRows(filtered, all) {
  const tbody = document.getElementById('wl-tbody');
  if (!tbody) return;
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Nenhuma entrada encontrada</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(entry => `
    <tr>
      <td><strong>${entry.nome || '—'}</strong></td>
      <td style="font-size:13px;color:var(--ink-3)">${entry.id}</td>
      <td style="font-size:13px;color:var(--ink-3)">${entry.departamento || '—'}</td>
      <td>
        ${entry.registado
          ? `<span style="color:var(--green);font-size:13px">${icon('check',13,'var(--green)')} Registado</span>`
          : `<span style="color:var(--ink-3);font-size:13px">Pendente</span>`}
      </td>
      <td class="table-actions">
        <button class="btn-icon danger" data-act="del-wl" data-id="${entry.id}" title="Remover" aria-label="Remover entrada da whitelist">${icon('trash',14)}</button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-act="del-wl"]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (!confirm(`Remover "${btn.dataset.id}" da whitelist?`)) return;
      try {
        await deleteWhitelistEntry(btn.dataset.id);
        showToast('Entrada removida.', 'success');
        loadTab('whitelist');
      } catch { showToast('Erro ao remover.', 'error'); }
    })
  );
}

function setupWhitelistImport(existingList) {
  let parsed = [];

  const handleFile = file => {
    if (!window.XLSX) { showToast('Biblioteca Excel não carregada.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        parsed = rows.map(r => ({
          email:       (r.email || r.Email || r.EMAIL || '').trim().toLowerCase(),
          nome:        r.nome || r.Nome || r.name || r.Name || '',
          departamento: r.departamento || r.Departamento || r.dept || '',
        })).filter(r => r.email);

        const newCount  = parsed.filter(r => !existingList.find(e => e.id === r.email)).length;
        const skipCount = parsed.length - newCount;
        document.getElementById('wl-preview-info').innerHTML =
          `<strong>${parsed.length}</strong> linhas lidas &nbsp;·&nbsp;
           <strong style="color:var(--green)">${newCount}</strong> novas &nbsp;·&nbsp;
           <strong style="color:var(--ink-3)">${skipCount}</strong> já existentes`;
        document.getElementById('wl-preview').style.display = 'block';
      } catch { showToast('Erro ao ler o ficheiro.', 'error'); }
    };
    reader.readAsArrayBuffer(file);
  };

  document.getElementById('wl-file-input').addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
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
    const btn = document.getElementById('wl-confirm');
    btn.disabled = true; btn.textContent = 'A importar…';
    try {
      const result = await importWhitelist(parsed);
      showToast(`${result.created} adicionados, ${result.skipped} ignorados.`, 'success');
      loadTab('whitelist');
    } catch (e) {
      showToast('Erro: ' + e.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `${icon('upload',14)} Confirmar importação`;
    }
  });
}

/* ================================================================== */
/* TAB: PROGRESSO GLOBAL                                                */
/* ================================================================== */

async function renderProgress(container) {
  let employees = [], allProgress = [], courses = [];
  try {
    employees   = await getEmployees();
    allProgress = await getAllProgress(employees.filter(e => e.ativo));
    courses     = await loadCourses();
  } catch (e) { console.warn(e); }

  if (!allProgress.length) {
    container.innerHTML = `<p style="padding:2rem;color:var(--ink-3)">Sem dados de progresso.</p>`;
    return;
  }

  // Global KPIs
  const totalColabs   = allProgress.length;
  let totalDoneGlobal = 0, totalModsGlobal = 0, scoresSum = 0, scoresCount = 0;
  let completedAll = 0;
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
  const globalPct  = totalModsGlobal ? Math.round((totalDoneGlobal / totalModsGlobal) * 100) : 0;
  const avgScore   = scoresCount ? Math.round(scoresSum / scoresCount) : null;

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

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
      <h3 style="font-size:15px;color:var(--ink-2)">Resumo por formação</h3>
      <button class="btn-sm primary" id="btn-export-csv">${icon('download',13)} Exportar CSV</button>
    </div>
    <div class="progress-cards" id="progress-cards"></div>
    <h3 style="margin:2rem 0 1rem;font-size:15px;color:var(--ink-2)">Detalhe por colaborador</h3>
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

  // Cards de resumo
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

  // CSV export
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
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `progresso_formacoes_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  });

  // Tabela por colaborador
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
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:5px;background:var(--line);border-radius:3px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${color}"></div>
            </div>
            <span style="font-size:12px;color:var(--ink-3);width:28px;text-align:right">${pct}%</span>
          </div>
        </td>`;
      }).join('');
      const global = totalMods ? Math.round((totalDone / totalMods) * 100) : 0;
      return `<tr>
        <td>
          <div style="font-weight:600;font-size:14px">${nome || email}</div>
          <div style="font-size:12px;color:var(--ink-3)">${email}</div>
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
