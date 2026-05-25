import { icon }         from './icons.js';
import { getState }     from './state.js';
import { navigate }     from './router.js';
import { logoutEmployee } from './firebase-service.js';

/* ------------------------------------------------------------------ */
/* App Shell                                                            */
/* ------------------------------------------------------------------ */
export function renderShell(activeView) {
  const { user } = getState();
  const initial  = user?.name?.charAt(0)?.toUpperCase() || '?';

  const role = user?.role || 'colaborador';

  const adminNav = role === 'administrador' ? `
    <div class="nav-spacer"></div>
    <div class="nav-label">ADMINISTRAÇÃO</div>
    ${navItem('settings', 'Admin', activeView === 'admin', '/admin')}
    ${navItem('edit', 'Conteúdos', activeView === 'conteudos', '/conteudos')}` : '';

  const gestorNav = role === 'gestor_conteudos' ? `
    <div class="nav-spacer"></div>
    <div class="nav-label">GESTÃO</div>
    ${navItem('edit', 'Conteúdos', activeView === 'conteudos', '/conteudos')}` : '';

  const roleLabel = { administrador: 'Administrador', gestor_conteudos: 'Gestor Conteúdos', colaborador: 'Colaborador' }[role] || role;

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <img src="assets/logo-white.png" alt="AlgarTempo" class="sidebar-brand-logo" />
        <div class="sidebar-brand-pill">FORMAÇÕES</div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-label">PRINCIPAL</div>
        ${navItem('home',  'Dashboard', activeView === 'dashboard', '/dashboard')}
        ${adminNav}
        ${gestorNav}
      </nav>
      <div class="sidebar-user">
        <div class="avatar">${initial}</div>
        <div style="flex:1;min-width:0">
          <div class="user-name">${user?.name || ''}</div>
          <div class="user-meta">${roleLabel}</div>
        </div>
        <button class="logout-btn" id="logout-btn" title="Terminar sessão">
          ${icon('logout', 16)}
        </button>
      </div>
    </aside>`;
}

function navItem(iconName, label, active, path, badge) {
  const cls = active ? 'nav-item active' : 'nav-item';
  const onclick = path ? `onclick="navigate('${path}')"` : '';
  return `
    <button class="${cls}" ${onclick}>
      ${icon(iconName, 17)}
      <span>${label}</span>
      ${badge ? `<span class="nav-badge">${badge}</span>` : ''}
    </button>`;
}

/* ------------------------------------------------------------------ */
/* Toast notifications                                                  */
/* ------------------------------------------------------------------ */
let toastTimer;

export function showToast(message, type = 'info') {
  const existing = document.getElementById('app-toast');
  if (existing) existing.remove();
  clearTimeout(toastTimer);

  const iconName = type === 'success' ? 'check' : type === 'error' ? 'x' : 'info';
  const toast    = document.createElement('div');
  toast.id        = 'app-toast';
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icon(iconName, 16)} ${message}`;
  document.body.appendChild(toast);

  toastTimer = setTimeout(() => toast.remove(), 4000);
}

/* ------------------------------------------------------------------ */
/* Reusable view states                                                 */
/* ------------------------------------------------------------------ */
export function renderLoadingState(message = 'A carregar dados...') {
  return `
    <div class="view-state view-state-loading" role="status" aria-live="polite">
      <span class="spinner"></span>
      <div class="view-state-title">${message}</div>
    </div>`;
}

export function renderEmptyState({ iconName = 'info', title, message, action = '' }) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">${icon(iconName, 32, 'var(--ink-3)')}</div>
        <div class="empty-state-title">${title}</div>
        <div class="empty-state-sub">${message}</div>
        ${action}
      </div>
    </div>`;
}

export function renderInlineNotice({ type = 'info', title, message }) {
  const iconName = type === 'warning' ? 'info' : type === 'error' ? 'x' : 'info';
  return `
    <div class="inline-notice ${type}" role="status">
      ${icon(iconName, 16)}
      <div>
        <strong>${title}</strong>
        <span>${message}</span>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Shell wiring (logout button)                                         */
/* ------------------------------------------------------------------ */
export function wireShell() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      await logoutEmployee();
      navigate('/login');
    });
  }
}

/* Expose navigate globally so inline onclick handlers in HTML strings work */
window.navigate = navigate;
