import { icon }         from '../icons.js';
import { getState }     from '../state.js';
import { getAuditLog }  from '../firebase-service.js';
import { renderLoadingState, renderEmptyState } from '../ui.js';

const PAGE_SIZE = 20;

const ACTION_META = {
  create_user:    { label: 'Criar utilizador',   color: 'var(--cyan-2)',  iconName: 'plus'     },
  edit_user:      { label: 'Editar utilizador',   color: 'var(--amber)',   iconName: 'edit'     },
  delete_user:    { label: 'Eliminar utilizador', color: 'var(--red)',     iconName: 'trash'    },
  toggle_user:    { label: 'Ativar/Desativar',    color: 'var(--amber)',   iconName: 'check'    },
  create_course:  { label: 'Criar formação',      color: 'var(--cyan-2)',  iconName: 'plus'     },
  edit_course:    { label: 'Editar formação',     color: 'var(--amber)',   iconName: 'edit'     },
  delete_course:  { label: 'Eliminar formação',   color: 'var(--red)',     iconName: 'trash'    },
  create_module:  { label: 'Criar módulo',        color: 'var(--cyan-2)',  iconName: 'plus'     },
  edit_module:    { label: 'Editar módulo',       color: 'var(--amber)',   iconName: 'edit'     },
  delete_module:  { label: 'Eliminar módulo',     color: 'var(--red)',     iconName: 'trash'    },
  complete_quiz:     { label: 'Quiz concluído',        color: 'var(--green)',   iconName: 'award'    },
  login:             { label: 'Início de sessão',      color: 'var(--ink-3)',   iconName: 'user'     },
  delete_whitelist:  { label: 'Remover whitelist',     color: 'var(--red)',     iconName: 'trash'    },
  import_whitelist:  { label: 'Importar whitelist',    color: 'var(--cyan-2)',  iconName: 'upload'   },
};

function meta(action) {
  return ACTION_META[action] || { label: action, color: 'var(--ink-3)', iconName: 'info' };
}

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ts; }
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const ROLE_LABEL = { administrador: 'Administrador', gestor_conteudos: 'Gestor de Conteúdos', gestor_colaboradores: 'Gestor de Colaboradores', colaborador: 'Colaborador' };

export async function renderAudit(container) {
  const { user } = getState();
  if (user?.role !== 'administrador') {
    container.innerHTML = '<p class="access-denied">Acesso negado.</p>'; return;
  }

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="topbar-title">Auditoria</h1>
        <div class="topbar-sub">Registo de todas as ações realizadas na plataforma</div>
      </div>
    </div>
    <div class="audit-body">
      ${renderLoadingState('A carregar registos...')}
    </div>`;

  const { entries: firstPage, lastVisible } = await getAuditLog(PAGE_SIZE).catch(() => ({ entries: [], lastVisible: null }));

  const body = container.querySelector('.audit-body');
  if (!firstPage.length) {
    body.innerHTML = renderEmptyState({
      iconName: 'activity',
      title: 'Sem registos',
      message: 'Ainda não existem eventos registados.',
    });
    return;
  }

  let allEntries = firstPage;
  let cursor = lastVisible;
  let hasMore = firstPage.length === PAGE_SIZE;

  body.innerHTML = `
    <div class="audit-toolbar">
      <input id="audit-search" class="form-input" style="max-width:280px"
             placeholder="Pesquisar por ator, alvo ou detalhes…" />
      <select id="audit-filter" class="form-input" style="max-width:200px">
        <option value="">Todos os tipos</option>
        ${Object.keys(ACTION_META).map(k => `<option value="${k}">${ACTION_META[k].label}</option>`).join('')}
      </select>
      <span id="audit-count" class="admin-count-badge">${firstPage.length} eventos</span>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table audit-table">
        <thead><tr>
          <th style="width:160px">Data</th>
          <th style="width:180px">Ação</th>
          <th>Ator</th>
          <th>Alvo</th>
          <th>Detalhes</th>
        </tr></thead>
        <tbody id="audit-tbody"></tbody>
      </table>
    </div>
    <div id="audit-load-more" style="display:${hasMore ? 'flex' : 'none'};justify-content:center;padding:1.25rem 0">
      <button class="btn-ghost" id="btn-load-more">
        ${icon('chevron-down', 14)} Carregar mais
      </button>
    </div>`;

  const searchEl  = document.getElementById('audit-search');
  const filterEl  = document.getElementById('audit-filter');
  const countEl   = document.getElementById('audit-count');

  renderRows(allEntries, searchEl.value, filterEl.value, countEl);

  searchEl.addEventListener('input',  () => renderRows(allEntries, searchEl.value, filterEl.value, countEl));
  filterEl.addEventListener('change', () => renderRows(allEntries, searchEl.value, filterEl.value, countEl));

  document.getElementById('btn-load-more')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-load-more');
    btn.disabled = true;
    btn.innerHTML = `${icon('spinner', 14)} A carregar…`;

    const { entries: nextPage, lastVisible: newCursor } = await getAuditLog(PAGE_SIZE, cursor).catch(() => ({ entries: [], lastVisible: null }));

    allEntries = [...allEntries, ...nextPage];
    cursor = newCursor;
    hasMore = nextPage.length === PAGE_SIZE;

    renderRows(allEntries, searchEl.value, filterEl.value, countEl);

    const loadMoreDiv = document.getElementById('audit-load-more');
    if (!hasMore) {
      loadMoreDiv.style.display = 'none';
    } else {
      btn.disabled = false;
      btn.innerHTML = `${icon('chevron-down', 14)} Carregar mais`;
    }
  });
}

function renderRows(list, query = '', actionFilter = '', countEl) {
  const q = query.toLowerCase();
  const filtered = list.filter(e => {
    if (actionFilter && e.action !== actionFilter) return false;
    if (q) {
      const haystack = `${e.actor} ${e.target} ${e.details} ${e.actorRole}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = `${filtered.length} evento${filtered.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Nenhum evento encontrado</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(e => {
    const m = meta(e.action);
    const roleLabel = ROLE_LABEL[e.actorRole] || e.actorRole || '';
    return `
      <tr>
        <td class="table-cell-meta" style="white-space:nowrap">${escHtml(fmtDate(e.timestamp))}</td>
        <td>
          <span class="audit-action-badge" style="background:${m.color}18;color:${m.color};border:1px solid ${m.color}30">
            ${icon(m.iconName, 12, m.color)} ${escHtml(m.label)}
          </span>
        </td>
        <td>
          <div style="line-height:1.3">
            <div style="font-weight:500">${escHtml(e.actor || '—')}</div>
            ${roleLabel ? `<div class="table-cell-meta" style="font-size:11px">${escHtml(roleLabel)}</div>` : ''}
          </div>
        </td>
        <td style="font-weight:500">${escHtml(e.target || '—')}</td>
        <td class="table-cell-meta">${escHtml(e.details || '')}</td>
      </tr>`;
  }).join('');
}
