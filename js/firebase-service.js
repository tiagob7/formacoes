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

    const empRef = doc(_db, 'employees', email);
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

    const progressRef = doc(_db, 'employees', email, 'progress', 'data');
    const progressSnap = await getDoc(progressRef);
    const progress = progressSnap.exists() ? progressSnap.data() : {};

    const userObj = { email, name: userData.nome, role, uid };
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

/**
 * Create a new employee account (admin only).
 * Must be called by authenticated admin user.
 */
export async function createEmployeeAccount(email, password, nome, role = 'colaborador') {
  init();
  if (!isConfigured()) {
    throw new Error('Firebase não configurado.');
  }

  try {
    // Create auth user
    const userCred = await signInWithEmailAndPassword(_auth, _auth.currentUser.email, _auth.currentUser.password);
    // Note: We can't actually get the password here, so this is a placeholder.
    // In practice, this should be done via Firebase Admin SDK on the backend.

    // For now, just create the Firestore document
    const empRef = doc(_db, 'employees', email);
    await setDoc(empRef, {
      email,
      nome,
      role,
      ativo: true,
      criadoEm: new Date().toISOString()
    });

    return { email, nome, role };
  } catch (err) {
    throw err;
  }
}

/**
 * Check if current user has required role.
 */
export function hasRole(currentRole, requiredRole) {
  const roleHierarchy = { 'colaborador': 0, 'gestor_conteudos': 1, 'administrador': 2 };
  return (roleHierarchy[currentRole] || -1) >= (roleHierarchy[requiredRole] || -1);
}
