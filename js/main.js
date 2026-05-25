/**
 * AlgarTempo Formações — Entry point
 * Initialises the router, checks for an existing session,
 * and mounts the correct view.
 */
import { route, initRouter, navigate } from './router.js';
import { getState, setState }           from './state.js';
import { getSessionUser, loadProgress, hasRole } from './firebase-service.js';
import { renderShell, wireShell }       from './ui.js';
import { renderLogin }                  from './views/login.js';
import { renderDashboard }              from './views/dashboard.js';
import { renderModule }                 from './views/module.js';
import { renderQuiz }                   from './views/quiz.js';
import { renderResults }                from './views/results.js';
import { renderAdmin }                  from './views/admin.js';
import { renderContentManager }         from './views/content-manager.js';

const app = document.getElementById('app');

/* ------------------------------------------------------------------ */
/* Route helpers                                                        */
/* ------------------------------------------------------------------ */

function requireAuth(requiredRole = null) {
  const { user } = getState();
  if (!user) { navigate('/login'); return false; }
  if (requiredRole && !hasRole(user.role, requiredRole)) { navigate('/dashboard'); return false; }
  return true;
}

function mountShell(activeView) {
  // Only rebuild shell if not already present
  if (!document.querySelector('.app-shell')) {
    app.innerHTML = `<div class="app-shell">${renderShell(activeView)}<main class="main-area" id="main"></main></div>`;
    wireShell();
  } else {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  }
  return document.getElementById('main');
}

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

route('login', () => {
  const { user } = getState();
  if (user) { navigate('/dashboard'); return; }
  app.innerHTML = '';
  renderLogin(app);
});

route('dashboard', () => {
  if (!requireAuth()) return;
  const main = mountShell('dashboard');
  renderDashboard(main);
});

route('module/:courseId/:moduleId', async (params) => {
  if (!requireAuth()) return;
  const main = mountShell('module');
  await renderModule(main, params);
});

route('quiz/:courseId/:moduleId', (params) => {
  if (!requireAuth()) return;
  const main = mountShell('quiz');
  renderQuiz(main, params);
});

route('results/:courseId/:moduleId', async (params) => {
  if (!requireAuth()) return;
  const main = mountShell('results');
  await renderResults(main, params);
});

route('admin', async () => {
  if (!requireAuth('administrador')) return;
  const main = mountShell('admin');
  await renderAdmin(main);
});

route('conteudos', async () => {
  if (!requireAuth('gestor_conteudos')) return;
  const main = mountShell('conteudos');
  await renderContentManager(main);
});

/* ------------------------------------------------------------------ */
/* Bootstrap                                                            */
/* ------------------------------------------------------------------ */

async function boot() {
  // Check for existing session (survives page refresh)
  const sessionUser = getSessionUser();
  if (sessionUser) {
    try {
      const progress = await loadProgress(sessionUser.email);
      setState({ user: sessionUser, progress });
    } catch {
      setState({ user: sessionUser, progress: {} });
    }
  }
  initRouter();
}

boot();
