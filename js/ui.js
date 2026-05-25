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

  const roleLabel = { administrador: 'Administrador', gestor_conteudos: 'Gestor de conteúdos', colaborador: 'Colaborador' }[role] || role;

  return `
    <header class="mobile-shell-bar">
      <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Abrir navegação" aria-expanded="false">
        ${icon('menu', 20)}
      </button>
      <img src="assets/logo-color.png" alt="AlgarTempo" class="mobile-shell-logo" />
      <div class="mobile-shell-role">${roleLabel}</div>
    </header>
    <div class="mobile-nav-overlay" id="mobile-nav-overlay" aria-hidden="true"></div>
    <aside class="sidebar">
      <div class="sidebar-brand">
        <img src="assets/logo-white.png" alt="AlgarTempo" class="sidebar-brand-logo" />
        <div class="sidebar-brand-pill">FORMAÇÕES</div>
        <button class="mobile-sidebar-close" id="mobile-sidebar-close" aria-label="Fechar navegação">
          ${icon('x', 18)}
        </button>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-label">PRINCIPAL</div>
        ${navItem('home',     'Painel',         activeView === 'dashboard',    '/dashboard')}
        ${navItem('award',    'Certificados',   activeView === 'certificates', '/certificates')}
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
  const dataProp = path ? `data-nav-path="${path}"` : '';
  return `
    <button class="${cls}" ${dataProp}>
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
let closeMobileNav = () => {};
let mobileNavKeydownBound = false;

export function wireShell() {
  const shell = document.querySelector('.app-shell');
  const menuBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('mobile-sidebar-close');
  const overlay = document.getElementById('mobile-nav-overlay');

  const setMobileNav = (open) => {
    if (!shell) return;
    shell.classList.toggle('nav-open', open);
    document.body.classList.toggle('mobile-nav-open', open);
    menuBtn?.setAttribute('aria-expanded', String(open));
    overlay?.setAttribute('aria-hidden', String(!open));
  };

  menuBtn?.addEventListener('click', () => setMobileNav(true));
  closeBtn?.addEventListener('click', () => setMobileNav(false));
  overlay?.addEventListener('click', () => setMobileNav(false));
  closeMobileNav = () => setMobileNav(false);
  if (!mobileNavKeydownBound) {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMobileNav();
    });
    mobileNavKeydownBound = true;
  }
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      setMobileNav(false);
      const path = item.dataset.navPath;
      if (path) navigate(path);
    });
  });

  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      setMobileNav(false);
      await logoutEmployee();
      navigate('/login');
    });
  }
}

/* Expose navigate globally so inline onclick handlers in HTML strings work */
window.navigate = navigate;
