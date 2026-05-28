# Cache de Estado — Redução de Reads Firebase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um cache em memória que elimina reads Firebase redundantes nas funções `getEmployees`, `getAuditLog` e `getModulePdfUrl`, invalidando o cache quando há escritas relevantes.

**Architecture:** Um novo módulo `js/cache.js` expõe um store simples de `Map`. As funções de leitura em `firebase-service.js` consultam o cache antes de ir ao Firestore; as funções de escrita chamam `cache.invalidate()` depois de concluírem com sucesso. Nenhuma view precisa de alterações.

**Tech Stack:** Vanilla JS ES Modules, Firebase Firestore SDK 10.12.2

---

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `js/cache.js` | Criar — módulo de cache em memória |
| `js/firebase-service.js` | Importar cache; envolver leituras; invalidar em escritas e logout |

---

## Task 1 — Criar `js/cache.js`

**Files:**
- Create: `js/cache.js`

- [ ] **Step 1: Criar o ficheiro com o módulo de cache**

Criar `js/cache.js` com o seguinte conteúdo:

```js
const _store = new Map();

export const cache = {
  get(key) {
    return _store.has(key) ? _store.get(key) : null;
  },
  set(key, data) {
    _store.set(key, data);
  },
  invalidate(key) {
    _store.delete(key);
  },
  invalidateAll() {
    _store.clear();
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add js/cache.js
git commit -m "feat: add in-memory cache module"
```

---

## Task 2 — Envolver leituras em `firebase-service.js`

**Files:**
- Modify: `js/firebase-service.js`

**Contexto:** As três funções a envolver são:
- `getEmployees()` — linha ~188 — faz `getDocs(collection(_db, 'employees'))`
- `getAuditLog(maxEntries)` — linha ~241 — faz `getDocs(query(...))`
- `getModulePdfUrl(courseId, moduleId)` — linha ~172 — faz `getDoc(doc(...))`

- [ ] **Step 1: Importar o cache no topo de `firebase-service.js`**

No topo de `js/firebase-service.js`, após as importações existentes, adicionar:

```js
import { cache } from './cache.js';
```

A linha deve ficar depois de:
```js
import { firebaseConfig } from './firebase-config.js';
```

- [ ] **Step 2: Envolver `getEmployees`**

Substituir:

```js
export async function getEmployees() {
  init();
  if (!isConfigured()) return [];
  const snap = await getDocs(collection(_db, 'employees'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
```

Por:

```js
export async function getEmployees() {
  init();
  if (!isConfigured()) return [];
  const cached = cache.get('employees');
  if (cached) return cached;
  const snap = await getDocs(collection(_db, 'employees'));
  const result = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  cache.set('employees', result);
  return result;
}
```

- [ ] **Step 3: Envolver `getAuditLog`**

Substituir:

```js
export async function getAuditLog(maxEntries = 200) {
  if (!isConfigured()) return [];
  init();
  try {
    const snap = await getDocs(
      query(collection(_db, 'auditoria'), orderBy('timestamp', 'desc'), limit(maxEntries))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}
```

Por:

```js
export async function getAuditLog(maxEntries = 200) {
  if (!isConfigured()) return [];
  init();
  const cached = cache.get('audit');
  if (cached) return cached;
  try {
    const snap = await getDocs(
      query(collection(_db, 'auditoria'), orderBy('timestamp', 'desc'), limit(maxEntries))
    );
    const result = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cache.set('audit', result);
    return result;
  } catch { return []; }
}
```

- [ ] **Step 4: Envolver `getModulePdfUrl`**

Substituir:

```js
export async function getModulePdfUrl(courseId, moduleId) {
  if (!isConfigured()) return null;
  init();
  const modRef = doc(_db, 'modules', `${courseId}_${moduleId}`);
  const snap   = await getDoc(modRef);
  return snap.exists() ? (snap.data().pdfUrl || null) : null;
}
```

Por:

```js
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
```

**Nota:** O cache guarda `''` (string vazia) para "módulo sem PDF" para distinguir de `null` (cache miss). A função converte de volta para `null` ao retornar.

- [ ] **Step 5: Commit**

```bash
git add js/firebase-service.js
git commit -m "feat: cache getEmployees, getAuditLog, getModulePdfUrl reads"
```

---

## Task 3 — Invalidar cache nas escritas

**Files:**
- Modify: `js/firebase-service.js`

**Contexto:** As funções de escrita que afetam os dados cacheados são:
- `createEmployee` — invalida `'employees'`
- `createEmployeeDoc` — invalida `'employees'`
- `updateEmployee` — invalida `'employees'`
- `deleteEmployee` — invalida `'employees'`
- `importEmployees` — invalida `'employees'`
- `logAuditEvent` — invalida `'audit'`
- `uploadModulePDF` — invalida `'pdf:courseId_moduleId'`

- [ ] **Step 1: Invalidar em `createEmployeeDoc`**

`createEmployee` chama `createEmployeeDoc` internamente, portanto basta invalidar em `createEmployeeDoc`.

Substituir:

```js
export async function createEmployeeDoc(email, nome, role = 'colaborador', departamento = '', criadoPor = '') {
  init();
  const normalizedEmail = email.trim().toLowerCase();
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
```

Por:

```js
export async function createEmployeeDoc(email, nome, role = 'colaborador', departamento = '', criadoPor = '') {
  init();
  const normalizedEmail = email.trim().toLowerCase();
  await setDoc(doc(_db, 'employees', normalizedEmail), {
    email: normalizedEmail,
    nome,
    role,
    departamento,
    ativo: true,
    criadoEm: new Date().toISOString(),
    criadoPor,
  });
  cache.invalidate('employees');
}
```

- [ ] **Step 2: Invalidar em `updateEmployee`**

Substituir:

```js
export async function updateEmployee(email, data, editadoPor = '') {
  init();
  const payload = { ...data };
  if (editadoPor) { payload.editadoPor = editadoPor; payload.editadoEm = new Date().toISOString(); }
  await setDoc(doc(_db, 'employees', email), payload, { merge: true });
}
```

Por:

```js
export async function updateEmployee(email, data, editadoPor = '') {
  init();
  const payload = { ...data };
  if (editadoPor) { payload.editadoPor = editadoPor; payload.editadoEm = new Date().toISOString(); }
  await setDoc(doc(_db, 'employees', email), payload, { merge: true });
  cache.invalidate('employees');
}
```

- [ ] **Step 3: Invalidar em `deleteEmployee`**

Substituir:

```js
export async function deleteEmployee(email, actor = '', actorRole = '') {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'employees', email));
  await logAuditEvent('delete_user', actor, actorRole, email, '');
}
```

Por:

```js
export async function deleteEmployee(email, actor = '', actorRole = '') {
  init();
  const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  await deleteDoc(doc(_db, 'employees', email));
  cache.invalidate('employees');
  await logAuditEvent('delete_user', actor, actorRole, email, '');
}
```

- [ ] **Step 4: Invalidar em `importEmployees`**

Substituir o fim da função `importEmployees`:

```js
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
```

Por:

```js
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
```

- [ ] **Step 5: Invalidar em `logAuditEvent`**

Substituir:

```js
export async function logAuditEvent(action, actor, actorRole, target, details = '') {
  if (!isConfigured()) return;
  init();
  try {
    await addDoc(collection(_db, 'auditoria'), {
      action, actor, actorRole, target, details,
      timestamp: new Date().toISOString(),
    });
  } catch { /* audit never blocks the main operation */ }
}
```

Por:

```js
export async function logAuditEvent(action, actor, actorRole, target, details = '') {
  if (!isConfigured()) return;
  init();
  try {
    await addDoc(collection(_db, 'auditoria'), {
      action, actor, actorRole, target, details,
      timestamp: new Date().toISOString(),
    });
    cache.invalidate('audit');
  } catch { /* audit never blocks the main operation */ }
}
```

- [ ] **Step 6: Invalidar em `uploadModulePDF`**

Dentro de `uploadModulePDF`, no callback de sucesso do `task.on('state_changed', ..., ..., async () => { ... })`, adicionar `cache.invalidate(...)` antes do `resolve`:

Substituir o callback de conclusão:

```js
      async () => {
        const url     = await getDownloadURL(task.snapshot.ref);
        const modRef  = doc(_db, 'modules', `${courseId}_${moduleId}`);
        await setDoc(modRef, { pdfUrl: url, updatedAt: new Date().toISOString() }, { merge: true });
        resolve(url);
      }
```

Por:

```js
      async () => {
        const url     = await getDownloadURL(task.snapshot.ref);
        const modRef  = doc(_db, 'modules', `${courseId}_${moduleId}`);
        await setDoc(modRef, { pdfUrl: url, updatedAt: new Date().toISOString() }, { merge: true });
        cache.invalidate(`pdf:${courseId}_${moduleId}`);
        resolve(url);
      }
```

- [ ] **Step 7: Commit**

```bash
git add js/firebase-service.js
git commit -m "feat: invalidate cache on employee, audit, and pdf write operations"
```

---

## Task 4 — Invalidar tudo no logout

**Files:**
- Modify: `js/firebase-service.js`

**Contexto:** `logoutEmployee` está em `js/firebase-service.js` (linha ~94). Deve chamar `cache.invalidateAll()` para garantir que uma nova sessão não herda dados de uma sessão anterior.

- [ ] **Step 1: Adicionar invalidação no logout**

Substituir:

```js
export async function logoutEmployee() {
  init();
  sessionStorage.removeItem('formacoes_user');
  if (isConfigured() && _auth?.currentUser) {
    await signOut(_auth);
  }
}
```

Por:

```js
export async function logoutEmployee() {
  init();
  sessionStorage.removeItem('formacoes_user');
  cache.invalidateAll();
  if (isConfigured() && _auth?.currentUser) {
    await signOut(_auth);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/firebase-service.js
git commit -m "feat: clear cache on logout"
```

---

## Task 5 — Verificação manual no browser

**Files:** nenhum

- [ ] **Step 1: Abrir o dashboard no browser e fazer login**

Iniciar o servidor se não estiver a correr:
```bash
python -m http.server 8081
```
Abrir `http://localhost:8081` e fazer login com uma conta de administrador.

- [ ] **Step 2: Verificar cache de colaboradores**

Abrir a consola do browser (F12 → Console). Navegar para `/utilizadores`. Deves ver um request ao Firestore (network tab: `firestore.googleapis.com`). Navegar para outra rota (ex: `/dashboard`) e voltar a `/utilizadores`. O segundo carregamento **não deve fazer** novo request Firestore para `employees`.

- [ ] **Step 3: Verificar invalidação após criação**

Em `/utilizadores`, criar um novo colaborador. Navegar para `/dashboard` e voltar a `/utilizadores`. A lista deve incluir o colaborador recém-criado (o cache foi invalidado pela escrita).

- [ ] **Step 4: Verificar cache de auditoria**

Navegar para `/auditoria`. Deves ver um request ao Firestore. Navegar para `/dashboard` e voltar a `/auditoria`. O segundo carregamento não deve fazer novo request.

- [ ] **Step 5: Verificar limpeza no logout**

Fazer logout. Fazer login novamente. A primeira visita a `/utilizadores` deve fazer um novo request Firestore (cache foi limpo no logout).
