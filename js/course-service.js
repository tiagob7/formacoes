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
  return {
    id: course.id,
    title: course.title || 'Formacao sem titulo',
    subtitle: course.subtitle || '',
    duration: course.duration || '',
    category: course.category || 'Geral',
    passingScore: Number.isFinite(Number(course.passingScore)) ? Number(course.passingScore) : 60,
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
