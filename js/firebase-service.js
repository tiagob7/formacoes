import { initializeApp, deleteApp }                             from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut,
         createUserWithEmailAndPassword }                        from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
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

    const userObj = { email: normalizedEmail, name: userData.nome, role, uid, departamento: userData.departamento || '' };
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
 * Shape: { read, quizPassed, lastScore, bestScore, attempts, attemptHistory }
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

export async function createEmployee(email, password, nome, role = 'colaborador', departamento = '', criadoPor = '') {
  init();
  const normalizedEmail = email.trim().toLowerCase();

  // Segunda instância para criar Auth sem fazer logout do admin
  const secondaryApp  = initializeApp(firebaseConfig, 'secondary-' + Date.now());
  const secondaryAuth = getAuth(secondaryApp);
  try {
    await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
    await signOut(secondaryAuth);
  } catch (err) {
    await deleteApp(secondaryApp);
    throw err;
  }
  await deleteApp(secondaryApp);

  // Criar documento Firestore com a instância principal
  await setDoc(doc(_db, 'employees', normalizedEmail), {
    email: normalizedEmail,
    nome,
    role,
    departamento,
    ativo: true,
    criadoEm: new Date().toISOString(),
    criadoPor,
  });
}

export async function updateEmployee(email, data, editadoPor = '') {
  init();
  const payload = { ...data };
  if (editadoPor) { payload.editadoPor = editadoPor; payload.editadoEm = new Date().toISOString(); }
  await setDoc(doc(_db, 'employees', email), payload, { merge: true });
}

export async function deleteEmployee(email) {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'employees', email));
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

/* ------------------------------------------------------------------ */
/* Whitelist                                                            */
/* ------------------------------------------------------------------ */

export async function getWhitelist() {
  init();
  if (!isConfigured()) return [];
  const { getDocs: _getDocs, collection: _col } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await _getDocs(_col(_db, 'whitelist'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function importWhitelist(list) {
  init();
  const results = { created: 0, skipped: 0 };
  for (const entry of list) {
    const email = entry.email?.trim().toLowerCase();
    if (!email) { results.skipped++; continue; }
    const ref  = doc(_db, 'whitelist', email);
    const snap = await getDoc(ref);
    if (snap.exists()) { results.skipped++; continue; }
    await setDoc(ref, { email, nome: entry.nome || entry.name || '', departamento: entry.departamento || entry.dept || '', registado: false, criadoEm: new Date().toISOString() });
    results.created++;
  }
  return results;
}

export async function deleteWhitelistEntry(email) {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'whitelist', email));
}

export async function isEmailInWhitelist(email) {
  init();
  if (!isConfigured()) return false;
  const snap = await getDoc(doc(_db, 'whitelist', email.trim().toLowerCase()));
  return snap.exists();
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
/* Departments                                                          */
/* ------------------------------------------------------------------ */

export async function getDepartments() {
  init();
  if (!isConfigured()) return [];
  const { getDocs: _getDocs, collection: _col } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await _getDocs(_col(_db, 'departments'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

export async function saveDepartment(nome, criadoPor = '') {
  init();
  const id = nome.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
  if (!id) throw new Error('Nome inválido.');
  await setDoc(doc(_db, 'departments', id), {
    nome: nome.trim(),
    criadoPor,
    criadoEm: new Date().toISOString(),
  });
  return id;
}

export async function deleteDepartment(id) {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'departments', id));
}

/* ------------------------------------------------------------------ */
/* Role helper                                                          */
/* ------------------------------------------------------------------ */

export function hasRole(currentRole, requiredRole) {
  const hierarchy = { colaborador: 0, gestor_conteudos: 1, administrador: 2 };
  return (hierarchy[currentRole] ?? -1) >= (hierarchy[requiredRole] ?? -1);
}
