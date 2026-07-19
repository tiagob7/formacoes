import { icon } from '../icons.js';
import { loadCourses, getCachedCourses } from '../course-service.js';
import { buildNotifications, dismissNotification, dismissAllNotifications, notificationCount } from '../notification-service.js';
import { getState } from '../state.js';
import { navigate } from '../router.js';
import { renderLoadingState, renderEmptyState } from '../ui.js';

export async function renderNotifications(container) {
  container.innerHTML = renderLoadingState('A carregar notificações...');

  const { user, progress } = getState();
  let courses = [];
  try {
    const all = await loadCourses();
    courses = all.filter(course => course.status === 'published');
  } catch (err) {
    console.error(err);
  }

  const notifications = buildNotifications(courses, progress, user);

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1 class="topbar-title">Notificações</h1>
        <div class="topbar-sub">Prazos, novas formações e certificados disponíveis</div>
      </div>
      ${notifications.length
        ? `<button class="btn-ghost" id="clear-all-notif">
             ${icon('x', 14)} Limpar todas
           </button>`
        : ''}
    </div>

    <div class="notifications-layout">
      ${notifications.length
        ? `<div class="notifications-list">
            ${notifications.map(item => notificationItem(item)).join('')}
          </div>`
        : renderEmptyState({
            iconName: 'bell',
            title: 'Sem notificações ativas',
            message: 'Não existem prazos urgentes, formações por iniciar ou certificados por consultar.',
            action: `<button class="btn-next" onclick="navigate('/dashboard')">Voltar ao painel</button>`,
          })}
    </div>`;

  container.querySelectorAll('[data-notification-path]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { user, progress } = getState();
      const notifId = btn.dataset.notificationId;
      if (notifId && user?.email) {
        dismissNotification(notifId, user.email);
        updateSidebarBadge(user, progress);
      }
      navigate(btn.dataset.notificationPath);
    });
  });

  document.getElementById('clear-all-notif')?.addEventListener('click', () => {
    const { user, progress } = getState();
    if (!user?.email) return;
    dismissAllNotifications(courses, progress, user);
    updateSidebarBadge(user, progress);
    renderNotifications(container);
  });
}

function notificationItem(item) {
  const actionLabel = item.path === '/certificates' ? 'Ver certificados' : 'Abrir formação';
  return `
    <article class="notification-item ${item.type}">
      <div class="notification-icon">${icon(item.iconName, 18, 'currentColor')}</div>
      <div class="notification-body">
        <div class="notification-title">${item.title}</div>
        <div class="notification-message">${item.message}</div>
      </div>
      <button class="btn-ghost notification-action"
              data-notification-path="${item.path}"
              data-notification-id="${item.id}">
        ${actionLabel} ${icon('arrowRight', 13)}
      </button>
    </article>`;
}

function updateSidebarBadge(user, progress) {
  const count = notificationCount(getCachedCourses(), progress, user);
  const badge = document.querySelector('.sidebar-notif-badge');
  if (count > 0) {
    if (badge) badge.textContent = count;
    else {
      const bellBtn = document.querySelector('.sidebar-icon-btn');
      if (bellBtn) {
        const span = document.createElement('span');
        span.className = 'sidebar-notif-badge';
        span.textContent = count;
        bellBtn.appendChild(span);
      }
    }
  } else {
    badge?.remove();
  }
}
