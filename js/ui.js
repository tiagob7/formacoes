import { icon }         from './icons.js';
import { getState, setState } from './state.js';
import { navigate }     from './router.js';
import { logoutEmployee } from './firebase-service.js';
import { clearDismissedNotifications } from './notification-service.js';
import { getCachedCourses } from './course-service.js';
import { notificationCount } from './notification-service.js';

/* ------------------------------------------------------------------ */
/* App Shell                                                            */
/* ------------------------------------------------------------------ */
export function renderShell(activeView) {
  const { user, progress } = getState();
  const initial  = user?.name?.charAt(0)?.toUpperCase() || '?';
  const unreadNotifications = notificationCount(getCachedCourses(), progress, user);

  const role = user?.role || 'colaborador';

  const adminNav = role === 'administrador' ? `
    <div class="nav-spacer"></div>
    <div class="nav-label">ADMINISTRAÇÃO</div>
    ${navItem('lock',     'Administração',   activeView === 'administration', '/administration')}
    ${navItem('user',     'Utilizadores',    activeView === 'utilizadores',  '/utilizadores')}
    ${navItem('edit',     'Conteúdos',       activeView === 'conteudos',     '/conteudos')}
    ${navItem('activity', 'Auditoria',       activeView === 'auditoria',     '/auditoria')}` : '';

  const gestorConteudosNav = role === 'gestor_conteudos' ? `
    <div class="nav-spacer"></div>
    <div class="nav-label">GESTÃO</div>
    ${navItem('edit', 'Conteúdos', activeView === 'conteudos', '/conteudos')}
    ${navItem('activity', 'Auditoria', activeView === 'auditoria', '/auditoria')}` : '';

  const gestorColaboradoresNav = role === 'gestor_colaboradores' ? `
    <div class="nav-spacer"></div>
    <div class="nav-label">GESTÃO</div>
    ${navItem('user', 'Utilizadores', activeView === 'utilizadores', '/utilizadores')}
    ${navItem('activity', 'Auditoria', activeView === 'auditoria', '/auditoria')}` : '';

  const roleLabel = { administrador: 'Administrador', gestor_conteudos: 'Gestor de conteúdos', gestor_colaboradores: 'Gestor de Colaboradores', colaborador: 'Colaborador' }[role] || role;

  const notifBadge = unreadNotifications
    ? `<span class="sidebar-notif-badge">${unreadNotifications}</span>` : '';

  return `
    <header class="mobile-shell-bar">
      <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Abrir navegação" aria-expanded="false">
        ${icon('menu', 20)}
      </button>
      <img src="assets/logo-color.png" alt="Algartempo" class="mobile-shell-logo" />
      <div class="mobile-shell-role">${roleLabel}</div>
    </header>
    <div class="mobile-nav-overlay" id="mobile-nav-overlay" aria-hidden="true"></div>
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-text">
          <div class="sidebar-brand-name">Formações</div>
          <div class="sidebar-brand-tag">Plataforma de E-Learning</div>
        </div>
        <button class="mobile-sidebar-close" id="mobile-sidebar-close" aria-label="Fechar navegação">
          ${icon('x', 18)}
        </button>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-label">PRINCIPAL</div>
        ${navItem('home',  'Formações',   activeView === 'dashboard',   '/dashboard')}
        ${navItem('award', 'Certificados', activeView === 'certificates', '/certificates')}
        ${adminNav}
        ${gestorConteudosNav}
        ${gestorColaboradoresNav}
      </nav>
      <div class="sidebar-logo-secondary">
        <img src="assets/logo-vertical-white.png" alt="Algartempo" />
      </div>
      <div class="sidebar-user">
        <div class="avatar">${initial}</div>
        <div style="flex:1;min-width:0">
          <div class="user-name">${user?.name || ''}</div>
          <div class="user-meta">${roleLabel}</div>
        </div>
        <button class="sidebar-icon-btn ${activeView === 'notifications' ? 'active' : ''}"
                data-nav-path="/notifications" title="Notificações" aria-label="Notificações" style="position:relative">
          ${icon('bell', 16)}${notifBadge}
        </button>
        <button class="logout-btn" id="logout-btn" title="Terminar sessão" aria-label="Terminar sessão">
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
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
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
  document.querySelectorAll('.nav-item, .sidebar-icon-btn').forEach(item => {
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
      const { user } = getState();
      if (user?.email) clearDismissedNotifications(user.email);
      setState({ user: null });
      await logoutEmployee();
      navigate('/login');
    });
  }
}

/* ------------------------------------------------------------------ */
/* Confirmation dialog (replaces browser confirm())                    */
/* ------------------------------------------------------------------ */
export function confirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const btnStyle = danger ? 'background:var(--red,#c0392b);border-color:var(--red,#c0392b);color:#fff' : '';
    overlay.innerHTML = `
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <h3>${title}</h3>
        </div>
        <div class="modal-body">
          <p style="margin:0;color:var(--ink-2);line-height:1.6">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" id="cd-cancel">Cancelar</button>
          <button class="btn-primary" id="cd-confirm" style="${btnStyle}">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = result => { overlay.remove(); resolve(result); };
    overlay.querySelector('#cd-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('#cd-confirm').addEventListener('click', () => close(true));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    const onKey = e => { if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(false); } };
    document.addEventListener('keydown', onKey);
    overlay.querySelector('#cd-confirm').focus();
  });
}

/* Expose navigate globally so inline onclick handlers in HTML strings work */
window.navigate = navigate;
