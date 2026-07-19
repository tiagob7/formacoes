import { courseProgress, getCourseDeadlineState, isCourseVisibleToUser } from './course-service.js';

/* ------------------------------------------------------------------ */
/* Dismissed-notification persistence (localStorage, per user)         */
/* ------------------------------------------------------------------ */

function storageKey(userEmail) {
  return `notif_dismissed:${userEmail}`;
}

export function getDismissedIds(userEmail) {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(userEmail)) || '[]'));
  } catch { return new Set(); }
}

export function dismissNotification(id, userEmail) {
  const set = getDismissedIds(userEmail);
  set.add(id);
  try { localStorage.setItem(storageKey(userEmail), JSON.stringify([...set])); } catch {}
}

export function clearDismissedNotifications(userEmail) {
  try { localStorage.removeItem(storageKey(userEmail)); } catch {}
}

export function dismissAllNotifications(courses, progress, user) {
  const notifications = buildNotifications(courses, progress, user);
  const set = getDismissedIds(user.email);
  notifications.forEach(n => set.add(n.id));
  try { localStorage.setItem(storageKey(user.email), JSON.stringify([...set])); } catch {}
}

/* ------------------------------------------------------------------ */
/* Build & count                                                        */
/* ------------------------------------------------------------------ */

export function buildNotifications(courses, progress, user = null) {
  if (!Array.isArray(courses)) return [];

  const notifications = [];

  courses
    .filter(course => course.status === 'published' && isCourseVisibleToUser(course, user))
    .forEach(course => {
      const p = courseProgress(course, progress || {});
      const deadline = getCourseDeadlineState(course, progress || {});

      if (deadline?.isOverdue) {
        notifications.push({
          id: `${course.id}-overdue`,
          type: 'error',
          iconName: 'clock',
          title: 'Formação atrasada',
          message: `${course.title} terminou em ${deadline.label}.`,
          path: `/course/${course.id}`,
          priority: 1,
        });
      } else if (deadline?.isDueSoon) {
        notifications.push({
          id: `${course.id}-due-soon`,
          type: 'warning',
          iconName: 'clock',
          title: 'Prazo próximo',
          message: `${course.title} termina em ${Math.max(deadline.daysRemaining, 0)} dias.`,
          path: `/course/${course.id}`,
          priority: 2,
        });
      }

      if (course.modules.length && p.pct === 100) {
        notifications.push({
          id: `${course.id}-certificate`,
          type: 'success',
          iconName: 'award',
          title: 'Certificado disponível',
          message: `Já pode descarregar o certificado de ${course.title}.`,
          path: '/certificates',
          priority: 3,
        });
      }

      if (course.modules.length && p.started === 0) {
        notifications.push({
          id: `${course.id}-new`,
          type: course.isRequired ? 'warning' : 'info',
          iconName: 'book',
          title: course.isRequired ? 'Formação obrigatória por iniciar' : 'Formação disponível',
          message: `${course.title} ainda não foi iniciada.`,
          path: `/course/${course.id}`,
          priority: course.isRequired ? 4 : 5,
        });
      }
    });

  const dismissed = user?.email ? getDismissedIds(user.email) : new Set();
  return notifications
    .filter(n => !dismissed.has(n.id))
    .sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}

export function notificationCount(courses, progress, user = null) {
  return buildNotifications(courses, progress, user).length;
}
