import { COURSES, courseProgress as localCourseProgress, globalProgress as localGlobalProgress } from './data.js';
import { getCoursesFromDB } from './firebase-service.js';

let coursesCache = null;
let coursesStatus = {
  source: 'local',
  fallback: false,
  error: null,
};

/**
 * Converte uma string de duração livre em minutos.
 * Aceita formatos como: "15min", "45 min", "1h", "2h 30min", "1h30min", "6h00m".
 * Devolve 0 se não conseguir extrair nada.
 */
export function parseDurationToMinutes(str) {
  if (typeof str !== 'string') return 0;
  const s = str.toLowerCase();
  const hMatch = s.match(/(\d+)\s*h/);
  const mMatch = s.match(/(\d+)\s*m/); // apanha "min" e "m"
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins  = mMatch ? parseInt(mMatch[1], 10) : 0;
  // Caso a string seja só um número sem unidade (ex.: "45"), assume minutos.
  if (!hMatch && !mMatch) {
    const nMatch = s.match(/(\d+)/);
    return nMatch ? parseInt(nMatch[1], 10) : 0;
  }
  return hours * 60 + mins;
}

/**
 * Formata um total de minutos numa string legível: "2h 15min", "45min", "3h".
 * Devolve '' para 0 ou valores inválidos.
 */
export function formatMinutes(total) {
  const min = Math.max(0, Math.round(Number(total) || 0));
  if (min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h)      return `${h}h`;
  return `${m}min`;
}

/**
 * Soma as durações de uma lista de módulos e devolve a string formatada.
 * Devolve '' se nenhum módulo tiver duração parseável.
 */
export function sumModulesDuration(modules) {
  const list = Array.isArray(modules) ? modules : [];
  const total = list.reduce((acc, m) => acc + parseDurationToMinutes(m?.duration), 0);
  return formatMinutes(total);
}

function normalizeCourse(course, index = 0) {
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const dueDate = typeof course.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(course.dueDate)
    ? course.dueDate
    : '';
  const targetRoles = Array.isArray(course.targetRoles) ? course.targetRoles.filter(Boolean) : [];
  const targetDepartments = Array.isArray(course.targetDepartments) ? course.targetDepartments.filter(Boolean) : [];
  // Duração da formação = soma das durações dos módulos (automática).
  // Se nenhum módulo tiver tempo definido, usa o valor guardado como fallback.
  const computedDuration = sumModulesDuration(modules);
  return {
    id: course.id,
    title: course.title || 'Formacao sem titulo',
    subtitle: course.subtitle || '',
    duration: computedDuration || course.duration || '',
    category: course.category || 'Geral',
    passingScore: Number.isFinite(Number(course.passingScore)) ? Number(course.passingScore) : 60,
    dueDate,
    isRequired: course.isRequired === true,
    targetRoles,
    targetDepartments,
    order: Number.isFinite(Number(course.order)) ? Number(course.order) : index,
    status: course.status || 'draft',
    modules: modules.map((mod, modIndex) => ({
      id: mod.id,
      title: mod.title || `Modulo ${modIndex + 1}`,
      duration: mod.duration || '',
      pages: Number.isFinite(Number(mod.pages)) ? Number(mod.pages) : 1,
      content: Array.isArray(mod.content) ? mod.content : [],
      quiz: Array.isArray(mod.quiz) ? mod.quiz : [],
      order: Number.isFinite(Number(mod.order)) ? Number(mod.order) : modIndex,
    })).sort((a, b) => a.order - b.order),
  };
}

export async function loadCourses({ force = false } = {}) {
  if (coursesCache && !force) return coursesCache;

  try {
    const fromDB = await getCoursesFromDB();
    const hasFirestoreCourses = Array.isArray(fromDB) && fromDB.length;
    const source = hasFirestoreCourses ? fromDB : COURSES;
    coursesCache = source.map(normalizeCourse).sort((a, b) => a.order - b.order);
    coursesStatus = {
      source: hasFirestoreCourses ? 'firestore' : 'local',
      fallback: !hasFirestoreCourses,
      error: null,
    };
  } catch (err) {
    console.warn('[Courses] A usar catalogo local como fallback.', err);
    coursesCache = COURSES.map(normalizeCourse);
    coursesStatus = {
      source: 'local',
      fallback: true,
      error: err,
    };
  }

  return coursesCache;
}

export function clearCoursesCache() {
  coursesCache = null;
}

export function getCachedCourses() {
  return coursesCache || COURSES.map(normalizeCourse);
}

export function getCoursesStatus() {
  return coursesStatus;
}

export async function getCourseById(courseId) {
  const courses = await loadCourses();
  return courses.find(course => course.id === courseId) || null;
}

export async function getModuleById(courseId, moduleId) {
  const course = await getCourseById(courseId);
  return course?.modules.find(mod => mod.id === moduleId) || null;
}

export function courseProgress(course, progress) {
  if (!course?.modules?.length) {
    return { pct: 0, completed: 0, total: 0, status: 'Sem modulos', started: 0 };
  }
  return localCourseProgress(course, progress || {});
}

export function isCourseAssignedToUser(course, user) {
  if (!course?.isRequired) return false;

  const targetRoles = Array.isArray(course.targetRoles) ? course.targetRoles : [];
  const targetDepartments = Array.isArray(course.targetDepartments) ? course.targetDepartments : [];
  if (!targetRoles.length && !targetDepartments.length) return true;

  const userRole = normalizeToken(user?.role);
  const userDepartment = normalizeToken(user?.departamento || user?.department);
  const roleMatch = targetRoles.map(normalizeToken).includes(userRole);
  const departmentMatch = targetDepartments.map(normalizeToken).includes(userDepartment);

  return roleMatch || departmentMatch;
}

export function isCourseAttachedToUser(course, user) {
  // Formação obrigatória designada ao utilizador
  if (course?.isRequired && isCourseAssignedToUser(course, user)) return true;

  // Formação do departamento do utilizador (independentemente de ser obrigatória)
  const targetDepartments = Array.isArray(course?.targetDepartments) ? course.targetDepartments : [];
  const userDepartment = normalizeToken(user?.departamento || user?.department);
  return targetDepartments.map(normalizeToken).includes(userDepartment);
}

export function isCourseVisibleToUser(course, user) {
  return !course?.isRequired || isCourseAssignedToUser(course, user);
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

export function getCourseDeadlineState(course, progress) {
  if (!course?.dueDate) return null;

  const p = courseProgress(course, progress || {});
  const deadline = parseDateOnlyEndOfDay(course.dueDate);
  if (!deadline) return null;

  const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
  const completed = p.pct === 100;
  const isOverdue = !completed && daysRemaining < 0;
  const isDueSoon = !completed && daysRemaining >= 0 && daysRemaining <= 7;

  return {
    date: course.dueDate,
    label: formatDateOnly(course.dueDate),
    daysRemaining,
    completed,
    isOverdue,
    isDueSoon,
    status: completed ? 'completed' : isOverdue ? 'overdue' : isDueSoon ? 'soon' : 'open',
  };
}

function parseDateOnlyEndOfDay(value) {
  const parts = String(value || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
}

function formatDateOnly(value) {
  const parts = String(value || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return value || '';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(parts[0], parts[1] - 1, parts[2]));
}

export function globalProgress(courses, progress) {
  if (!Array.isArray(courses) || !courses.length) return localGlobalProgress(progress || {});

  let totalMods = 0, doneMods = 0, completedCourses = 0, inProgressCourses = 0;
  courses.forEach(course => {
    totalMods += course.modules.length;
    const cp = progress?.[course.id] || {};
    course.modules.forEach(mod => { if (cp[mod.id]?.quizPassed) doneMods++; });
    const p = courseProgress(course, progress || {});
    if (p.pct === 100) completedCourses++;
    else if (p.pct > 0) inProgressCourses++;
  });

  return {
    pct: totalMods ? Math.round((doneMods / totalMods) * 100) : 0,
    doneMods,
    totalMods,
    completedCourses,
    inProgressCourses,
  };
}

export function getResumeCourse(courses, progress) {
  return getResumeTarget(courses, progress)?.course || null;
}

export function getResumeTarget(courses, progress) {
  if (!Array.isArray(courses)) return null;

  for (const course of courses) {
    const p = courseProgress(course, progress || {});
    if (p.started > 0 && p.completed < p.total) {
      const cp = progress?.[course.id] || {};
      const module = course.modules.find(mod => !cp[mod.id]?.quizPassed) || course.modules[0];
      return { course, module, progress: p };
    }
  }

  return null;
}
