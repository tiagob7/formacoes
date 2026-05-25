import { COURSES, courseProgress as localCourseProgress, globalProgress as localGlobalProgress } from './data.js';
import { getCoursesFromDB } from './firebase-service.js';

let coursesCache = null;
let coursesStatus = {
  source: 'local',
  fallback: false,
  error: null,
};

function normalizeCourse(course, index = 0) {
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const dueDate = typeof course.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(course.dueDate)
    ? course.dueDate
    : '';
  const targetRoles = Array.isArray(course.targetRoles) ? course.targetRoles.filter(Boolean) : [];
  const targetDepartments = Array.isArray(course.targetDepartments) ? course.targetDepartments.filter(Boolean) : [];
  return {
    id: course.id,
    title: course.title || 'Formacao sem titulo',
    subtitle: course.subtitle || '',
    duration: course.duration || '',
    category: course.category || 'Geral',
    passingScore: Number.isFinite(Number(course.passingScore)) ? Number(course.passingScore) : 60,
    dueDate,
    isRequired: course.isRequired === true,
    targetRoles,
    targetDepartments,
    order: Number.isFinite(Number(course.order)) ? Number(course.order) : index,
    status: course.status || 'published',
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
