import { initializeApp, deleteApp }                             from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut,
         createUserWithEmailAndPassword }                        from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, query, collection, where, getDocs, orderBy, limit, startAfter, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import { getFunctions, httpsCallable }                           from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';
import { firebaseConfig } from './firebase-config.js';
import { cache } from './cache.js';

/* ------------------------------------------------------------------ */
/* Initialisation (lazy — only if config is set)                       */
/* ------------------------------------------------------------------ */
let _app, _auth, _db, _storage, _functions;

function isConfigured() {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY';
}

function init() {
  if (_app) return;
  if (!isConfigured()) {
    console.warn('[Firebase] Config não preenchida — a usar localStorage como fallback.');
    return;
  }
  _app       = initializeApp(firebaseConfig);
  _auth      = getAuth(_app);
  _db        = getFirestore(_app);
  _storage   = getStorage(_app);
  _functions = getFunctions(_app, 'europe-west1');
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

export async function getEmployeeRecord(email) {
  init();
  if (!isConfigured()) return null;
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const snap = await getDoc(doc(_db, 'employees', normalizedEmail));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { departamento: d.departamento || '', role: d.role || 'colaborador', name: d.nome || '' };
  } catch { return null; }
}

export async function logoutEmployee() {
  init();
  sessionStorage.removeItem('formacoes_user');
  cache.invalidateAll();
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
        cache.invalidate(`pdf:${courseId}_${moduleId}`);
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
  const key = `pdf:${courseId}_${moduleId}`;
  const cached = cache.get(key);
  if (cached !== null) return cached === '' ? null : cached;
  const modRef = doc(_db, 'modules', `${courseId}_${moduleId}`);
  const snap   = await getDoc(modRef);
  const url = snap.exists() ? (snap.data().pdfUrl || '') : '';
  cache.set(key, url);
  return url || null;
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
  const cached = cache.get('employees');
  if (cached !== null) return cached;
  const snap = await getDocs(collection(_db, 'employees'));
  const result = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  cache.set('employees', result);
  return result;
}

export async function getEmployeesPaginated(pageSize = 20, cursorDoc = null) {
  init();
  if (!isConfigured()) return { docs: [], cursor: null, hasMore: false };

  // Se não há cursor (primeira página), usa cache se disponível
  if (!cursorDoc) {
    const cached = cache.get('employees');
    if (cached !== null) {
      const filtered = cached.filter(e => e.role === 'colaborador').sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      const hasMore = filtered.length > pageSize;
      return { docs: filtered.slice(0, pageSize), cursor: filtered[pageSize - 1] ?? null, hasMore };
    }
  }

  const constraints = [
    collection(_db, 'employees'),
    where('role', '==', 'colaborador'),
    orderBy('nome'),
    limit(pageSize + 1),
  ];
  if (cursorDoc) constraints.splice(3, 0, startAfter(cursorDoc));
  const snap = await getDocs(query(...constraints));
  const hasMore = snap.docs.length > pageSize;
  const docs = snap.docs.slice(0, pageSize).map(d => ({ id: d.id, ...d.data() }));
  return { docs, cursor: snap.docs[pageSize - 1] ?? null, hasMore };
}

export async function getWhitelistPaginated(pageSize = 20, cursorDoc = null) {
  init();
  if (!isConfigured()) return { docs: [], cursor: null, hasMore: false };
  const constraints = [
    collection(_db, 'whitelist'),
    orderBy('nome'),
    limit(pageSize + 1),
  ];
  if (cursorDoc) constraints.splice(2, 0, startAfter(cursorDoc));
  const snap = await getDocs(query(...constraints));
  const hasMore = snap.docs.length > pageSize;
  const docs = snap.docs.slice(0, pageSize).map(d => ({ id: d.id, ...d.data() }));
  return { docs, cursor: snap.docs[pageSize - 1] ?? null, hasMore };
}

/* ------------------------------------------------------------------ */
/* Auditoria                                                            */
/* ------------------------------------------------------------------ */

export async function logAuditEvent(action, actor, actorRole, target, details = '') {
  if (!isConfigured()) return;
  init();
  try {
    await addDoc(collection(_db, 'auditoria'), {
      action, actor, actorRole, target, details,
      timestamp: new Date().toISOString(),
    });
  } catch { /* audit never blocks the main operation */ }
  cache.invalidate('audit');
}

export async function getAuditLog(pageSize = 20, afterDoc = null) {
  if (!isConfigured()) return { entries: [], lastVisible: null };
  init();
  try {
    const constraints = [orderBy('timestamp', 'desc'), limit(pageSize)];
    if (afterDoc) constraints.push(startAfter(afterDoc));
    const snap = await getDocs(query(collection(_db, 'auditoria'), ...constraints));
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data(), _snap: d }));
    const lastVisible = snap.docs[snap.docs.length - 1] || null;
    return { entries, lastVisible };
  } catch { return { entries: [], lastVisible: null }; }
}

export async function signInOnly(email, password) {
  init();
  const normalizedEmail = email.trim().toLowerCase();
  const userCred = await signInWithEmailAndPassword(_auth, normalizedEmail, password);
  const uid = userCred.user.uid;
  sessionStorage.setItem('formacoes_user', JSON.stringify({ email: normalizedEmail, uid }));
  return uid;
}

export async function createAuthUser(email, password) {
  init();
  const normalizedEmail = email.trim().toLowerCase();
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
}

export async function createEmployeeDoc(email, nome, role = 'colaborador', departamento = '', nrCol = '', nif = '', criadoPor = '') {
  init();
  const normalizedEmail = email.trim().toLowerCase();
  await setDoc(doc(_db, 'employees', normalizedEmail), {
    email: normalizedEmail,
    nome,
    role,
    departamento,
    nrCol,
    nif,
    ativo: true,
    criadoEm: new Date().toISOString(),
    criadoPor,
  });
  cache.invalidate('employees');
}

export async function createEmployee(email, password, nome, role = 'colaborador', departamento = '', nrCol = '', nif = '', criadoPor = '') {
  await createAuthUser(email, password);
  await createEmployeeDoc(email, nome, role, departamento, nrCol, nif, criadoPor);
}

export async function updateEmployee(email, data, editadoPor = '') {
  init();
  const payload = { ...data };
  if (editadoPor) { payload.editadoPor = editadoPor; payload.editadoEm = new Date().toISOString(); }
  await setDoc(doc(_db, 'employees', email), payload, { merge: true });
  cache.invalidate('employees');
}

export async function deleteEmployee(email, actor = '', actorRole = '') {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'employees', email));
  cache.invalidate('employees');
  // Apaga também a conta de Authentication via Cloud Function (Admin SDK)
  try {
    const fn = httpsCallable(_functions, 'deleteAuthUser');
    await fn({ email });
  } catch (err) {
    console.warn('[deleteEmployee] Auth não apagado (Cloud Function indisponível):', err.message);
  }
  await logAuditEvent('delete_user', actor, actorRole, email, '');
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
  if (results.created > 0) cache.invalidate('employees');
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

export async function importWhitelist(list, { update = false } = {}) {
  init();
  const results = { created: 0, updated: 0, skipped: 0 };

  // 1. Buscar todos os emails existentes numa única query
  const existingSnap = await getDocs(collection(_db, 'whitelist'));
  const existingEmails = new Set(existingSnap.docs.map(d => d.id));

  // 2. Separar em novas, a actualizar e inválidas
  const toCreate = [];
  const toUpdate = [];
  for (const entry of list) {
    const email = entry.email?.trim().toLowerCase();
    if (!email) { results.skipped++; continue; }
    if (existingEmails.has(email)) {
      if (update) toUpdate.push(entry);
      else results.skipped++;
    } else {
      toCreate.push(entry);
    }
  }

  const BATCH_SIZE = 500;
  const now = new Date().toISOString();

  // 3. Criar entradas novas
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = writeBatch(_db);
    for (const entry of toCreate.slice(i, i + BATCH_SIZE)) {
      const email = entry.email.trim().toLowerCase();
      batch.set(doc(_db, 'whitelist', email), {
        email,
        nome:         entry.nome || entry.name || '',
        numero:       entry.numero || '',
        contribuinte: entry.contribuinte || '',
        departamento: entry.departamento || entry.dept || '',
        registado:    false,
        criadoEm:     now,
      });
      results.created++;
    }
    await batch.commit();
  }

  // 4. Actualizar entradas existentes (só campos não vazios — preserva registado/criadoEm)
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = writeBatch(_db);
    for (const entry of toUpdate.slice(i, i + BATCH_SIZE)) {
      const email = entry.email.trim().toLowerCase();
      const patch = {};
      if (entry.nome)         patch.nome         = entry.nome;
      if (entry.numero)       patch.numero       = entry.numero;
      if (entry.contribuinte) patch.contribuinte = entry.contribuinte;
      if (entry.departamento) patch.departamento = entry.departamento;
      if (Object.keys(patch).length) batch.update(doc(_db, 'whitelist', email), patch);
      results.updated++;
    }
    await batch.commit();
  }

  return results;
}

export async function addWhitelistEntry({ email, nome = '', numero = '', contribuinte = '', departamento = '' }) {
  init();
  const normalizedEmail = email.trim().toLowerCase();
  const ref = doc(_db, 'whitelist', normalizedEmail);
  const snap = await getDoc(ref);
  if (snap.exists()) throw new Error('Este email já existe na whitelist.');
  await setDoc(ref, {
    email: normalizedEmail,
    nome,
    numero,
    contribuinte,
    departamento,
    registado:  false,
    criadoEm:   new Date().toISOString(),
  });
}

export async function deleteWhitelistEntry(email) {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'whitelist', email));
}

export async function clearWhitelist() {
  init();
  const snap = await getDocs(collection(_db, 'whitelist'));
  if (snap.empty) return 0;
  const BATCH_SIZE = 500;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(_db);
    snap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.docs.length;
}

export async function isEmailInWhitelist(email) {
  init();
  if (!isConfigured()) return false;
  const snap = await getDoc(doc(_db, 'whitelist', email.trim().toLowerCase()));
  return snap.exists();
}

/**
 * Verifica se o par (email, nif) existe na whitelist e ainda não foi registado.
 * Retorna { valid: true, data } ou { valid: false, reason }
 * reason: 'not_found' | 'nif_mismatch' | 'already_registered'
 */
export async function checkWhitelistEntry(email, nif) {
  init();
  if (!isConfigured()) return { valid: false, reason: 'not_found' };
  const normalizedEmail = email.trim().toLowerCase();
  const snap = await getDoc(doc(_db, 'whitelist', normalizedEmail));
  if (!snap.exists()) return { valid: false, reason: 'not_found' };
  const data = snap.data();
  if ((data.contribuinte || '').trim() !== nif.trim()) return { valid: false, reason: 'nif_mismatch' };
  if (data.registado) return { valid: false, reason: 'already_registered' };
  return { valid: true, data };
}

export async function markWhitelistRegistered(email) {
  init();
  if (!isConfigured()) return;
  await setDoc(doc(_db, 'whitelist', email.trim().toLowerCase()), { registado: true }, { merge: true });
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

export async function saveCourse(courseId, data, actor = '', actorRole = '') {
  init();
  await setDoc(doc(_db, 'courses', courseId), data, { merge: true });
  const action = data.criadoEm === data.editadoEm ? 'create_course' : 'edit_course';
  await logAuditEvent(action, actor, actorRole, data.title || courseId, '');
}

export async function deleteCourseFromDB(courseId, title = '', actor = '', actorRole = '') {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'courses', courseId));
  await logAuditEvent('delete_course', actor, actorRole, title || courseId, '');
}

export async function saveModule(courseId, moduleId, data, actor = '', actorRole = '') {
  init();
  await setDoc(doc(_db, 'courses', courseId, 'modules', moduleId), data, { merge: true });
  const action = data.criadoEm === data.editadoEm ? 'create_module' : 'edit_module';
  await logAuditEvent(action, actor, actorRole, data.title || moduleId, `Formação: ${courseId}`);
}

export async function deleteModuleFromDB(courseId, moduleId, title = '', actor = '', actorRole = '') {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'courses', courseId, 'modules', moduleId));
  await logAuditEvent('delete_module', actor, actorRole, title || moduleId, `Formação: ${courseId}`);
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
  const hierarchy = { colaborador: 0, gestor_conteudos: 1, gestor_colaboradores: 1, administrador: 2 };
  return (hierarchy[currentRole] ?? -1) >= (hierarchy[requiredRole] ?? -1);
}

/* ------------------------------------------------------------------ */
/* Cover Image Storage                                                  */
/* ------------------------------------------------------------------ */

/**
 * Uploads an image blob to Firebase Storage.
 * Calls onProgress(pct 0-100) during upload.
 * Returns the public download URL.
 */
export function uploadImageFile(storagePath, blob, onProgress) {
  if (!isConfigured()) {
    return Promise.reject(new Error('Firebase não configurado.'));
  }
  init();
  return new Promise((resolve, reject) => {
    const storageRef = ref(_storage, storagePath);
    const task = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });
    task.on('state_changed',
      (snap) => onProgress && onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        try { resolve(await getDownloadURL(task.snapshot.ref)); }
        catch (e) { reject(e); }
      }
    );
  });
}

/**
 * Deletes a file from Firebase Storage by path.
 */
export async function deleteStorageFile(storagePath) {
  if (!isConfigured()) return;
  init();
  await deleteObject(ref(_storage, storagePath));
}

/* ------------------------------------------------------------------ */
/* Cover Image Firestore CRUD                                           */
/* ------------------------------------------------------------------ */

export async function getCoverImagesFromDB() {
  if (!isConfigured()) return [];
  init();
  const snap = await getDocs(query(collection(_db, 'coverImages'), orderBy('uploadedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function newCoverImageRef() {
  if (!isConfigured()) throw new Error('Firebase não configurado.');
  init();
  return doc(collection(_db, 'coverImages'));
}

export async function saveCoverImageDoc(docRef, data) {
  init();
  await setDoc(docRef, data);
}

export async function deleteCoverImageDoc(imageId) {
  init();
  await deleteDoc(doc(_db, 'coverImages', imageId));
}

export async function getCoverImageDoc(imageId) {
  init();
  const snap = await getDoc(doc(_db, 'coverImages', imageId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateCoverImageUsageInDB(imageId, courseId, used) {
  init();
  await updateDoc(doc(_db, 'coverImages', imageId), {
    usedBy: used ? arrayUnion(courseId) : arrayRemove(courseId),
  });
}
