import { initializeApp }                                        from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut }          from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, query, collection, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';

/* ------------------------------------------------------------------ */
/* Initialisation (lazy — only if config is set)                       */
/* ------------------------------------------------------------------ */
let _app, _auth, _db, _storage;

function isConfigured() {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY';
}

function init() {
  if (_app) return;
  if (!isConfigured()) {
    console.warn('[Firebase] Config não preenchida — a usar localStorage como fallback.');
    return;
  }
  _app     = initializeApp(firebaseConfig);
  _auth    = getAuth(_app);
  _db      = getFirestore(_app);
  _storage = getStorage(_app);
}

/* ------------------------------------------------------------------ */
/* localStorage fallback (useful while Firebase is not yet configured) */
/* ------------------------------------------------------------------ */
const LS_KEY = 'formacoes_progress_v2';

function lsLoadProgress(number) {
  try { return JSON.parse(localStorage.getItem(`${LS_KEY}_${number}`) || '{}'); }
  catch { return {}; }
}

function lsSaveProgress(number, progress) {
  localStorage.setItem(`${LS_KEY}_${number}`, JSON.stringify(progress));
}

/* ------------------------------------------------------------------ */
/* Auth                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Log in with email + password.
 * Fetches user role from Firestore and validates credentials.
 * Returns { email, name, role, progress }.
 */
export async function loginEmployee(email, password) {
  init();

  if (!isConfigured()) {
    throw new Error('Firebase não configurado.');
  }

  try {
    const userCred = await signInWithEmailAndPassword(_auth, email, password);
    const uid = userCred.user.uid;

    const normalizedEmail = email.trim().toLowerCase();

    const empRef = doc(_db, 'employees', normalizedEmail);
    const snap = await getDoc(empRef);

    if (!snap.exists()) {
      await signOut(_auth);
      throw new Error('Utilizador não encontrado.');
    }

    const userData = snap.data();
    if (!userData.ativo) {
      await signOut(_auth);
      throw new Error('Conta desativada. Contacte o administrador.');
    }

    const role = userData.role || 'colaborador';

    const progressRef = doc(_db, 'employees', normalizedEmail, 'progress', 'data');
    const progressSnap = await getDoc(progressRef);
    const progress = progressSnap.exists() ? progressSnap.data() : {};

    const userObj = { email: normalizedEmail, name: userData.nome, role, uid };
    sessionStorage.setItem('formacoes_user', JSON.stringify(userObj));

    return { ...userObj, progress };
  } catch (err) {
    throw err;
  }
}

export async function logoutEmployee() {
  init();
  sessionStorage.removeItem('formacoes_user');
  if (isConfigured() && _auth?.currentUser) {
    await signOut(_auth);
  }
}

export function getSessionUser() {
  try { return JSON.parse(sessionStorage.getItem('formacoes_user') || 'null'); }
  catch { return null; }
}

/* ------------------------------------------------------------------ */
/* Progress                                                             */
/* ------------------------------------------------------------------ */

/**
 * Saves a single module's progress record.
 * Shape: { read, quizPassed, lastScore, attempts }
 */
export async function saveModuleProgress(email, courseId, moduleId, data) {
  if (!isConfigured()) {
    const all = lsLoadProgress(email);
    if (!all[courseId]) all[courseId] = {};
    all[courseId][moduleId] = { ...(all[courseId][moduleId] || {}), ...data };
    lsSaveProgress(email, all);
    return;
  }
  const progressRef = doc(_db, 'employees', email, 'progress', 'data');
  await setDoc(progressRef, { [courseId]: { [moduleId]: data } }, { merge: true });
}

export async function loadProgress(email) {
  if (!isConfigured()) return lsLoadProgress(email);
  init();
  const progressRef = doc(_db, 'employees', email, 'progress', 'data');
  const snap        = await getDoc(progressRef);
  return snap.exists() ? snap.data() : {};
}

/* ------------------------------------------------------------------ */
/* PDF Storage                                                          */
/* ------------------------------------------------------------------ */

/**
 * Uploads a PDF file for a module.
 * Calls onProgress(pct 0-100) during upload.
 * Returns the public download URL.
 */
export function uploadModulePDF(courseId, moduleId, file, onProgress) {
  if (!isConfigured()) {
    return Promise.reject(new Error('Firebase não configurado. Configure firebase-config.js para activar uploads.'));
  }
  init();
  return new Promise((resolve, reject) => {
    const storageRef = ref(_storage, `pdfs/${courseId}/${moduleId}.pdf`);
    const task       = uploadBytesResumable(storageRef, file, { contentType: 'application/pdf' });

    task.on('state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress && onProgress(pct);
      },
      reject,
      async () => {
        const url     = await getDownloadURL(task.snapshot.ref);
        const modRef  = doc(_db, 'modules', `${courseId}_${moduleId}`);
        await setDoc(modRef, { pdfUrl: url, updatedAt: new Date().toISOString() }, { merge: true });
        resolve(url);
      }
    );
  });
}

/**
 * Fetches the PDF URL stored in Firestore for a module, if any.
 */
export async function getModulePdfUrl(courseId, moduleId) {
  if (!isConfigured()) return null;
  init();
  const modRef = doc(_db, 'modules', `${courseId}_${moduleId}`);
  const snap   = await getDoc(modRef);
  return snap.exists() ? (snap.data().pdfUrl || null) : null;
}

/* ------------------------------------------------------------------ */
/* Admin functions (user management)                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Admin — employee management                                         */
/* ------------------------------------------------------------------ */

export async function getEmployees() {
  init();
  if (!isConfigured()) return [];
  const { getDocs: _getDocs, collection: _col } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await _getDocs(_col(_db, 'employees'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createEmployee(email, nome, role = 'colaborador') {
  init();
  const empRef = doc(_db, 'employees', email.trim().toLowerCase());
  await setDoc(empRef, { email: email.trim().toLowerCase(), nome, role, ativo: true, criadoEm: new Date().toISOString() });
}

export async function updateEmployee(email, data) {
  init();
  await setDoc(doc(_db, 'employees', email), data, { merge: true });
}

export async function importEmployees(list) {
  init();
  const results = { created: 0, skipped: 0 };
  for (const emp of list) {
    const email = emp.email?.trim().toLowerCase();
    if (!email) { results.skipped++; continue; }
    const empRef = doc(_db, 'employees', email);
    const snap   = await getDoc(empRef);
    if (snap.exists()) { results.skipped++; continue; }
    await setDoc(empRef, { email, nome: emp.nome || emp.name || '', role: emp.role || 'colaborador', ativo: true, criadoEm: new Date().toISOString() });
    results.created++;
  }
  return results;
}

export async function getAllProgress(employees) {
  init();
  const results = [];
  for (const emp of employees) {
    const snap = await getDoc(doc(_db, 'employees', emp.id, 'progress', 'data'));
    results.push({ email: emp.id, nome: emp.nome, progress: snap.exists() ? snap.data() : {} });
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* Content manager — courses / modules                                 */
/* ------------------------------------------------------------------ */

export async function getCoursesFromDB() {
  init();
  if (!isConfigured()) return null;
  const { getDocs: _getDocs, collection: _col } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await _getDocs(_col(_db, 'courses'));
  if (snap.empty) return null;
  const courses = [];
  for (const d of snap.docs) {
    const modSnap = await _getDocs(_col(_db, 'courses', d.id, 'modules'));
    const modules = modSnap.docs.map(m => ({ id: m.id, ...m.data() })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    courses.push({ id: d.id, ...d.data(), modules });
  }
  return courses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function saveCourse(courseId, data) {
  init();
  await setDoc(doc(_db, 'courses', courseId), data, { merge: true });
}

export async function deleteCourseFromDB(courseId) {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'courses', courseId));
}

export async function saveModule(courseId, moduleId, data) {
  init();
  await setDoc(doc(_db, 'courses', courseId, 'modules', moduleId), data, { merge: true });
}

export async function deleteModuleFromDB(courseId, moduleId) {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'courses', courseId, 'modules', moduleId));
}

/* ------------------------------------------------------------------ */
/* Role helper                                                          */
/* ------------------------------------------------------------------ */

export function hasRole(currentRole, requiredRole) {
  const hierarchy = { colaborador: 0, gestor_conteudos: 1, administrador: 2 };
  return (hierarchy[currentRole] ?? -1) >= (hierarchy[requiredRole] ?? -1);
}
