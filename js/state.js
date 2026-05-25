/**
 * Lightweight reactive state store.
 * Subscribers are called with the full state on every update.
 */

const state = {
  user:          null,    // { email, name, role, uid } — role: 'colaborador' | 'gestor_conteudos' | 'administrador'
  progress:      {},      // { courseId: { moduleId: { read, quizPassed, lastScore, bestScore, attempts, attemptHistory } } }
  view:          'login', // login | dashboard | module | quiz | results
  courseId:      null,
  moduleId:      null,
  quizAnswers:   {},      // { questionIndex: answer }
  quizSubmitted: false,
  loading:       false,
  error:         null,
};

const subscribers = new Set();

export function getState() {
  return state;
}

export function setState(updates) {
  Object.assign(state, updates);
  subscribers.forEach(fn => fn(state));
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/* Convenience: update a single module's progress record */
export function updateModuleProgress(courseId, moduleId, data) {
  const progress = { ...state.progress };
  if (!progress[courseId]) progress[courseId] = {};
  progress[courseId][moduleId] = { ...(progress[courseId][moduleId] || {}), ...data };
  setState({ progress });
}
