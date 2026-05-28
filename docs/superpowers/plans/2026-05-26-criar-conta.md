# Criar Conta com Validação por Whitelist — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um fluxo de auto-registo à página de login que valida NIF + email contra a whitelist do Firestore e cria a conta com auto-login.

**Architecture:** Dois novos helpers no `firebase-service.js` (`checkWhitelistEntry`, `markWhitelistRegistered`) expõem a lógica de whitelist. O `login.js` gere três estados visuais — login, passo-1-registo, passo-2-registo — trocando o conteúdo do cartão direito sem tocar no lado esquerdo da página.

**Tech Stack:** Vanilla JS (ES modules), Firebase Auth + Firestore v10 (CDN), sem build tools.

---

## Ficheiros a tocar

| Ficheiro | Operação | Responsabilidade |
|---|---|---|
| `js/firebase-service.js` | Modificar | Adicionar `checkWhitelistEntry` e `markWhitelistRegistered` |
| `js/views/login.js` | Modificar | Gerir estados login / register-step1 / register-step2 |

---

## Task 1: Helpers de whitelist em `firebase-service.js`

**Files:**
- Modify: `js/firebase-service.js`

- [ ] **Step 1: Adicionar `checkWhitelistEntry` logo após a função `isEmailInWhitelist`**

Localiza a função `isEmailInWhitelist` (linha ~403) e adiciona imediatamente a seguir:

```js
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
```

- [ ] **Step 2: Adicionar `markWhitelistRegistered` logo após `checkWhitelistEntry`**

```js
export async function markWhitelistRegistered(email) {
  init();
  await setDoc(doc(_db, 'whitelist', email.trim().toLowerCase()), { registado: true }, { merge: true });
}
```

- [ ] **Step 3: Verificar manualmente no browser**

Abre a consola do browser e corre:
```js
import { checkWhitelistEntry } from './js/firebase-service.js';
// Com um email que existe na whitelist e NIF correto → deve retornar { valid: true, data: {...} }
// Com NIF errado → { valid: false, reason: 'nif_mismatch' }
// Com email inexistente → { valid: false, reason: 'not_found' }
```

- [ ] **Step 4: Commit**

```bash
git add js/firebase-service.js
git commit -m "feat: add checkWhitelistEntry and markWhitelistRegistered helpers"
```

---

## Task 2: Atualizar imports em `login.js`

**Files:**
- Modify: `js/views/login.js`

- [ ] **Step 1: Substituir a linha de imports existente**

Linha atual (linha 2):
```js
import { loginEmployee }    from '../firebase-service.js';
```

Substituir por:
```js
import { loginEmployee, checkWhitelistEntry, markWhitelistRegistered, createEmployee, logAuditEvent } from '../firebase-service.js';
```

- [ ] **Step 2: Commit**

```bash
git add js/views/login.js
git commit -m "chore: add register imports to login.js"
```

---

## Task 3: Botão "Criar conta" e estado de registo — Passo 1

**Files:**
- Modify: `js/views/login.js`

- [ ] **Step 1: Adicionar link "Criar conta" ao HTML do login**

Dentro de `renderLogin`, localiza o parágrafo `.login-hint` (linha ~58):
```html
<p class="login-hint">
  Em caso de dificuldades de acesso, contacte o escritório da sua área.
</p>
```

Substituir por:
```html
<p class="login-hint">
  Em caso de dificuldades de acesso, contacte o escritório da sua área.
</p>
<p class="login-register-link">
  Ainda não tem conta? <button type="button" class="btn-link" id="show-register">Criar conta</button>
</p>
```

- [ ] **Step 2: Adicionar estilos ao `css/styles.css`**

Localiza os estilos de `.login-hint` e adiciona logo a seguir:

```css
.login-register-link {
  text-align: center;
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
}

.btn-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent, #3b82f6);
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
  font-family: inherit;
}

.btn-link:hover {
  color: var(--accent-hover, #60a5fa);
}

.register-step-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.step-dot--active  { background: var(--accent, #3b82f6); color: #fff; }
.step-dot--done    { background: #22c55e; color: #fff; }
.step-dot--pending { background: var(--surface-2, #334155); color: var(--text-muted, #64748b); }

.step-sep {
  flex: 1;
  height: 1px;
  background: var(--border, #334155);
}

.step-label { font-size: 12px; color: var(--text-muted, #94a3b8); }
.step-label--active { color: var(--text, #e2e8f0); font-weight: 600; }

.register-badge-ok {
  background: #14532d;
  color: #4ade80;
  font-size: 12px;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}
```

- [ ] **Step 3: Adicionar a função `showRegisterStep1` em `login.js`**

Adiciona antes da última linha do ficheiro (após o `renderLogin`):

```js
function showRegisterStep1(rightEl) {
  rightEl.innerHTML = `
    <form class="login-card" id="reg1-form" novalidate>
      <div class="login-card-eyebrow">CRIAR CONTA</div>
      <h2 class="login-card-title">Bem-vindo(a)</h2>
      <p class="login-card-lead">Confirme a sua identidade para ativar o acesso à plataforma.</p>

      <div class="register-step-indicator">
        <div class="step-dot step-dot--active">1</div>
        <span class="step-label step-label--active">Verificação</span>
        <div class="step-sep"></div>
        <div class="step-dot step-dot--pending">2</div>
        <span class="step-label">Palavra-passe</span>
      </div>

      <label class="form-label" for="reg-nif">NIF (Número de Contribuinte)</label>
      <input id="reg-nif" type="text" class="form-input" placeholder="ex.: 123456789" maxlength="9" autocomplete="off" />

      <label class="form-label" for="reg-email">Email</label>
      <input id="reg-email" type="email" class="form-input" placeholder="ex.: nome@email.pt" autocomplete="email" />

      <div id="reg1-error" class="form-error" role="alert" aria-live="polite" style="display:none"></div>

      <button type="submit" class="btn-primary" id="reg1-btn">
        Verificar identidade
        <span id="reg1-arrow">${icon('arrowRight', 16)}</span>
        <span id="reg1-spinner" class="spinner" style="display:none"></span>
      </button>

      <button type="button" class="btn-link" id="back-to-login" style="display:block;text-align:center;margin-top:12px">
        ← Já tenho conta
      </button>
    </form>`;

  const form     = document.getElementById('reg1-form');
  const nifEl    = document.getElementById('reg-nif');
  const emailEl  = document.getElementById('reg-email');
  const errEl    = document.getElementById('reg1-error');
  const btn      = document.getElementById('reg1-btn');
  const arrow    = document.getElementById('reg1-arrow');
  const spinner  = document.getElementById('reg1-spinner');

  document.getElementById('back-to-login').addEventListener('click', () => {
    renderLogin(rightEl.closest('.login-page').parentElement);
  });

  nifEl.addEventListener('input', () => { errEl.style.display = 'none'; });
  emailEl.addEventListener('input', () => { errEl.style.display = 'none'; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nif   = nifEl.value.trim();
    const email = emailEl.value.trim();

    if (!nif || !email) {
      errEl.textContent = 'Preencha todos os campos para continuar.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    arrow.style.display   = 'none';
    spinner.style.display = 'block';

    try {
      const result = await checkWhitelistEntry(email, nif);
      if (!result.valid) {
        const msg = result.reason === 'already_registered'
          ? 'Esta conta já foi ativada. Utilize o login normal ou contacte o administrador.'
          : 'Os dados introduzidos não correspondem a nenhum registo autorizado.';
        errEl.textContent = msg;
        errEl.style.display = 'block';
        btn.disabled = false;
        arrow.style.display   = 'inline-block';
        spinner.style.display = 'none';
        return;
      }
      showRegisterStep2(rightEl, email, result.data);
    } catch {
      errEl.textContent = 'Erro ao verificar identidade. Tente novamente.';
      errEl.style.display = 'block';
      btn.disabled = false;
      arrow.style.display   = 'inline-block';
      spinner.style.display = 'none';
    }
  });

  nifEl.focus();
}
```

- [ ] **Step 4: Ligar o botão "Criar conta" no `renderLogin`**

Após a linha `emailEl.focus();` (última linha do event listener setup), adiciona:

```js
  document.getElementById('show-register').addEventListener('click', () => {
    const rightEl = document.querySelector('.login-right');
    showRegisterStep1(rightEl);
  });
```

- [ ] **Step 5: Verificar manualmente**

Abre a app no browser, vai à página de login, clica em "Criar conta". Deves ver o cartão substituído pelo formulário do passo 1 com indicador de progresso. O link "← Já tenho conta" deve repor o login original.

- [ ] **Step 6: Commit**

```bash
git add js/views/login.js css/styles.css
git commit -m "feat: add register step 1 — whitelist identity verification"
```

---

## Task 4: Passo 2 — Definir palavra-passe e criar conta

**Files:**
- Modify: `js/views/login.js`

- [ ] **Step 1: Adicionar a função `showRegisterStep2` em `login.js`**

Adiciona imediatamente após `showRegisterStep1`:

```js
function showRegisterStep2(rightEl, email, whitelistData) {
  rightEl.innerHTML = `
    <form class="login-card" id="reg2-form" novalidate>
      <div class="login-card-eyebrow">CRIAR CONTA</div>
      <h2 class="login-card-title">Definir palavra-passe</h2>
      <p class="login-card-lead">Identidade confirmada. Escolha uma palavra-passe para aceder à plataforma.</p>

      <div class="register-step-indicator">
        <div class="step-dot step-dot--done">✓</div>
        <span class="step-label">Verificação</span>
        <div class="step-sep"></div>
        <div class="step-dot step-dot--active">2</div>
        <span class="step-label step-label--active">Palavra-passe</span>
      </div>

      <div class="register-badge-ok">✓ ${email} — identidade confirmada</div>

      <label class="form-label" for="reg-pass">Nova palavra-passe</label>
      <input id="reg-pass" type="password" class="form-input" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />

      <label class="form-label" for="reg-confirm">Confirmar palavra-passe</label>
      <input id="reg-confirm" type="password" class="form-input" placeholder="Repita a palavra-passe" autocomplete="new-password" />

      <div id="reg2-error" class="form-error" role="alert" aria-live="polite" style="display:none"></div>

      <button type="submit" class="btn-primary" id="reg2-btn">
        Criar conta e entrar
        <span id="reg2-arrow">${icon('arrowRight', 16)}</span>
        <span id="reg2-spinner" class="spinner" style="display:none"></span>
      </button>

      <button type="button" class="btn-link" id="back-to-step1" style="display:block;text-align:center;margin-top:12px">
        ← Recomeçar
      </button>
    </form>`;

  const form      = document.getElementById('reg2-form');
  const passEl    = document.getElementById('reg-pass');
  const confirmEl = document.getElementById('reg-confirm');
  const errEl     = document.getElementById('reg2-error');
  const btn       = document.getElementById('reg2-btn');
  const arrow     = document.getElementById('reg2-arrow');
  const spinner   = document.getElementById('reg2-spinner');

  document.getElementById('back-to-step1').addEventListener('click', () => {
    showRegisterStep1(rightEl);
  });

  passEl.addEventListener('input',    () => { errEl.style.display = 'none'; });
  confirmEl.addEventListener('input', () => { errEl.style.display = 'none'; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passEl.value;
    const confirm  = confirmEl.value;

    if (password.length < 8) {
      errEl.textContent = 'A palavra-passe deve ter pelo menos 8 caracteres.';
      errEl.style.display = 'block';
      return;
    }
    if (password !== confirm) {
      errEl.textContent = 'As palavras-passe não coincidem.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    arrow.style.display   = 'none';
    spinner.style.display = 'block';

    try {
      await createEmployee(
        email,
        password,
        whitelistData.nome || '',
        'colaborador',
        whitelistData.departamento || '',
        'auto-registo',
      );
      await markWhitelistRegistered(email);
      await logAuditEvent('self_register', email, 'colaborador', email, '');

      const result = await loginEmployee(email, password);
      setState({ user: { email: result.email, name: result.name, role: result.role, uid: result.uid }, progress: result.progress });
      navigate('/dashboard');
    } catch (err) {
      console.warn('[Register] Falha:', err.code || err.message);
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Este email já tem uma conta. Use o login normal.'
        : 'Erro ao criar conta. Verifique a ligação e tente novamente.';
      errEl.textContent = msg;
      errEl.style.display = 'block';
      btn.disabled = false;
      arrow.style.display   = 'inline-block';
      spinner.style.display = 'none';
    }
  });

  passEl.focus();
}
```

- [ ] **Step 2: Adicionar import de `setState` e `navigate` no topo do ficheiro** (já devem estar presentes — confirma)

As linhas 3-4 do `login.js` atual já têm:
```js
import { setState }  from '../state.js';
import { navigate }  from '../router.js';
```
Se estiverem presentes, nada a fazer. Se faltarem, adiciona-as.

- [ ] **Step 3: Verificar o fluxo completo manualmente**

1. Abre a app e vai à página de login
2. Clica em "Criar conta"
3. Passo 1: introduz NIF e email de um utilizador na whitelist com `registado: false`
4. Deve avançar para o passo 2 com o badge verde a confirmar o email
5. Passo 2: define uma palavra-passe com ≥ 8 caracteres, confirma
6. Deve entrar direto no dashboard
7. Verifica no Firestore que foi criado documento em `employees/{email}` e que `whitelist/{email}.registado` passou a `true`
8. Verifica em Firebase Auth que o utilizador existe
9. Verifica em `audit_log` que existe entrada com `action: 'self_register'`

Testa também os erros:
- NIF errado no passo 1 → mensagem genérica
- Email não na whitelist → mensagem genérica
- `registado: true` → mensagem de conta já ativada
- Palavras-passe com < 8 chars → erro de validação
- Palavras-passe não coincidem → erro de validação

- [ ] **Step 4: Commit**

```bash
git add js/views/login.js
git commit -m "feat: add register step 2 — create account and auto-login"
```

---

## Self-Review

**Spec coverage:**
- ✅ Botão "Criar conta" na página de login
- ✅ Substituição do cartão (layout B)
- ✅ Passo 1: NIF + email, lookup por email, verificação de NIF e `registado`
- ✅ Mensagens de erro genéricas
- ✅ Passo 2: palavra-passe mínimo 8 chars, confirmação
- ✅ `createEmployee` reutilizado
- ✅ `markWhitelistRegistered` marca `registado: true`
- ✅ `logAuditEvent` com `self_register`
- ✅ Auto-login após registo
- ✅ Placeholder genérico `ex.: nome@email.pt`

**Placeholder scan:** Nenhum TBD/TODO presente.

**Type consistency:**
- `checkWhitelistEntry(email, nif)` → retorna `{ valid, data?, reason? }` — usada corretamente no step 1
- `markWhitelistRegistered(email)` — usada corretamente no step 2
- `createEmployee(email, password, nome, role, departamento, criadoPor)` — assinatura confirmada contra `firebase-service.js` linha 252
- `logAuditEvent(action, actor, actorRole, target, details)` — assinatura confirmada contra `firebase-service.js` linha 230
- `loginEmployee(email, password)` — retorna `{ email, name, role, uid, progress }` — usado corretamente
