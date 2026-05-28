/**
 * Simple hash-based router.
 *
 * Routes:
 *   #/login
 *   #/dashboard
 *   #/course/:courseId
 *   #/module/:courseId/:moduleId
 *   #/quiz/:courseId/:moduleId
 *   #/results/:courseId/:moduleId
 *   #/certificates
 *   #/notifications
 *   #/administration
 *   #/utilizadores
 *   #/conteudos
 *   #/auditoria
 */

import { setState, getState } from './state.js';

const handlers = {};
let _routeVersion = 0;

export function route(pattern, fn) {
  handlers[pattern] = fn;
}

export function navigate(path) {
  window.location.hash = path;
}

export function currentRouteVersion() {
  return _routeVersion;
}

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '') || 'login';
  return hash.split('/').filter(Boolean);
}

function matchPattern(pattern, segments) {
  const parts = pattern.replace(/^\//, '').split('/').filter(Boolean);
  if (parts.length !== segments.length) return null;
  const params = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(':')) params[parts[i].slice(1)] = segments[i];
    else if (parts[i] !== segments[i]) return null;
  }
  return params;
}

export function initRouter() {
  const handle = () => {
    _routeVersion++;
    const segments = parseHash();
    for (const [pattern, fn] of Object.entries(handlers)) {
      const params = matchPattern(pattern, segments);
      if (params !== null) { fn(params); return; }
    }
    // fallback — no pattern matched
    const { user } = getState();
    navigate(user ? '/dashboard' : '/login');
  };
  window.addEventListener('hashchange', handle);
  handle();
}
