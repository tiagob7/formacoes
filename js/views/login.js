import { icon }             from '../icons.js';
import { loginEmployee, checkWhitelistEntry, markWhitelistRegistered, createEmployee, createAuthUser, signInOnly, createEmployeeDoc, logAuditEvent } from '../firebase-service.js';
import { setState }         from '../state.js';
import { navigate }         from '../router.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="login-page">
      <div class="login-left">
        <div class="login-brand">
          <img src="assets/logo-white.png" alt="Algartempo" class="login-brand-logo" />
          <div class="login-brand-div"></div>
          <div>
            <div class="login-brand-name">Formações</div>
            <div class="login-brand-tag">Plataforma de E-Learning</div>
          </div>
        </div>

        <div class="login-hero">
          <div class="login-eyebrow">BEM-VINDO DE VOLTA</div>
          <h1 class="login-title">O conhecimento que faz&nbsp;<span class="accent">a diferença.</span></h1>
          <p class="login-lead">
            Aceda às suas formações internas, complete módulos ao seu ritmo e
            certifique as competências essenciais para o seu percurso profissional.
          </p>
        </div>

        <div class="login-footer">
          <img src="assets/icon.png" alt="" />
          © 2026 Algartempo - empresa de trabalho temporário,lda
        </div>
      </div>

      <div class="login-right">
        <form class="login-card" id="login-form" novalidate>
          <div class="login-card-eyebrow">ACESSO À PLATAFORMA</div>
          <h2 class="login-card-title">Iniciar sessão</h2>
          <p class="login-card-lead">
            Identifique-se com o seu email corporativo e palavra-passe.
          </p>

          <label class="form-label" for="login-email">Email</label>
          <input id="login-email" type="email" class="form-input"
            placeholder="ex.: nome@empresa.pt" autocomplete="email" aria-describedby="login-error" />

          <label class="form-label" for="login-password">Palavra-passe</label>
          <input id="login-password" type="password" class="form-input"
            placeholder="••••••••" autocomplete="current-password" aria-describedby="login-error" />

          <div id="login-error" class="form-error" role="alert" aria-live="polite"></div>

          <button type="submit" class="btn-primary" id="login-btn">
            Entrar
            <span id="login-arrow">${icon('arrowRight', 16)}</span>
            <span id="login-spinner" class="spinner" style="display:none"></span>
          </button>

          <p class="login-hint">
            Em caso de dificuldades de acesso, contacte o escritório da sua área.
          </p>
          <p class="login-register-link">
            Ainda não tem conta? <button type="button" class="btn-link" id="show-register">Criar conta</button>
          </p>
        </form>
      </div>
    </div>`;

  const form      = document.getElementById('login-form');
  const emailEl   = document.getElementById('login-email');
  const passEl    = document.getElementById('login-password');
  const errEl     = document.getElementById('login-error');
  const btn       = document.getElementById('login-btn');
  const spinner   = document.getElementById('login-spinner');
  const arrow     = document.getElementById('login-arrow');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Reset aria-invalid on new attempt
    emailEl.setAttribute('aria-invalid', 'false');
    passEl.setAttribute('aria-invalid', 'false');

    const email    = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
      showError('Preencha todos os campos para continuar.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginEmployee(email, password);
      setState({ user: { email: result.email, name: result.name, role: result.role, uid: result.uid, departamento: result.departamento || '' }, progress: result.progress });
      navigate('/dashboard');
    } catch (err) {
      console.warn('[Login] Falha:', err.code || err.message);
      const errorMsg = err.code === 'auth/invalid-credential'
        ? 'Email ou palavra-passe incorretos.'
        : 'Erro ao aceder à plataforma. Verifique a ligação e tente novamente.';
      showError(errorMsg);
      setLoading(false);
    }
  });

  function showError(msg) {
    errEl.textContent = msg;
    emailEl.setAttribute('aria-invalid', 'true');
    passEl.setAttribute('aria-invalid', 'true');
  }

  function setLoading(on) {
    btn.disabled       = on;
    spinner.style.display = on ? 'block' : 'none';
    arrow.style.display   = on ? 'none'  : 'inline-block';
  }

  emailEl.addEventListener('input',    () => {
    errEl.textContent = '';
    emailEl.setAttribute('aria-invalid', 'false');
    passEl.setAttribute('aria-invalid', 'false');
  });
  passEl.addEventListener('input',     () => {
    errEl.textContent = '';
    emailEl.setAttribute('aria-invalid', 'false');
    passEl.setAttribute('aria-invalid', 'false');
  });
  document.getElementById('show-register').addEventListener('click', () => {
    const rightEl = document.querySelector('.login-right');
    showRegisterStep1(rightEl);
  });

  emailEl.focus();
}

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
      <input id="reg-nif" type="text" class="form-input" placeholder="ex.: 123456789" maxlength="9" autocomplete="off" aria-describedby="reg1-error" />

      <label class="form-label" for="reg-email">Email</label>
      <input id="reg-email" type="email" class="form-input" placeholder="ex.: nome@email.pt" autocomplete="email" aria-describedby="reg1-error" />

      <div id="reg1-error" class="form-error" role="alert" aria-live="polite"></div>

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

  nifEl.addEventListener('input', () => {
    errEl.textContent = '';
    nifEl.setAttribute('aria-invalid', 'false');
    emailEl.setAttribute('aria-invalid', 'false');
  });
  emailEl.addEventListener('input', () => {
    errEl.textContent = '';
    nifEl.setAttribute('aria-invalid', 'false');
    emailEl.setAttribute('aria-invalid', 'false');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    nifEl.setAttribute('aria-invalid', 'false');
    emailEl.setAttribute('aria-invalid', 'false');
    const nif   = nifEl.value.trim();
    const email = emailEl.value.trim().toLowerCase();

    if (!nif || !email) {
      errEl.textContent = 'Preencha todos os campos para continuar.';
      nifEl.setAttribute('aria-invalid', 'true');
      emailEl.setAttribute('aria-invalid', 'true');
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
        nifEl.setAttribute('aria-invalid', 'true');
        emailEl.setAttribute('aria-invalid', 'true');
        btn.disabled = false;
        arrow.style.display   = 'inline-block';
        spinner.style.display = 'none';
        return;
      }
      showRegisterStep2(rightEl, email, result.data);
    } catch {
      errEl.textContent = 'Erro ao verificar identidade. Tente novamente.';
      nifEl.setAttribute('aria-invalid', 'true');
      emailEl.setAttribute('aria-invalid', 'true');
      btn.disabled = false;
      arrow.style.display   = 'inline-block';
      spinner.style.display = 'none';
    }
  });

  nifEl.focus();
}

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
      <input id="reg-pass" type="password" class="form-input" placeholder="Mínimo 8 caracteres" autocomplete="new-password" aria-describedby="reg2-error" />

      <label class="form-label" for="reg-confirm">Confirmar palavra-passe</label>
      <input id="reg-confirm" type="password" class="form-input" placeholder="Repita a palavra-passe" autocomplete="new-password" aria-describedby="reg2-error" />

      <div id="reg2-error" class="form-error" role="alert" aria-live="polite"></div>

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

  passEl.addEventListener('input',    () => {
    errEl.textContent = '';
    passEl.setAttribute('aria-invalid', 'false');
    confirmEl.setAttribute('aria-invalid', 'false');
  });
  confirmEl.addEventListener('input', () => {
    errEl.textContent = '';
    passEl.setAttribute('aria-invalid', 'false');
    confirmEl.setAttribute('aria-invalid', 'false');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    passEl.setAttribute('aria-invalid', 'false');
    confirmEl.setAttribute('aria-invalid', 'false');
    const password = passEl.value;
    const confirm  = confirmEl.value;

    if (password.length < 8) {
      errEl.textContent = 'A palavra-passe deve ter pelo menos 8 caracteres.';
      passEl.setAttribute('aria-invalid', 'true');
      confirmEl.setAttribute('aria-invalid', 'true');
      return;
    }
    if (password !== confirm) {
      errEl.textContent = 'As palavras-passe não coincidem.';
      passEl.setAttribute('aria-invalid', 'true');
      confirmEl.setAttribute('aria-invalid', 'true');
      return;
    }

    btn.disabled = true;
    arrow.style.display   = 'none';
    spinner.style.display = 'block';

    try {
      await createAuthUser(email, password);

      // Fazer sign-in direto (sem verificação Firestore) para ficar autenticado
      const uid = await signInOnly(email, password);

      // Agora autenticado — criar o documento antes de qualquer leitura
      const normalizedEmail = email.trim().toLowerCase();
      await createEmployeeDoc(normalizedEmail, whitelistData.nome || '', 'colaborador', whitelistData.departamento || '', 'auto-registo');
      await markWhitelistRegistered(normalizedEmail);
      await logAuditEvent('self_register', normalizedEmail, 'colaborador', normalizedEmail, '');

      // Definir state com os dados que já temos (evita uma leitura extra ao Firestore)
      setState({
        user: { email: normalizedEmail, name: whitelistData.nome || '', role: 'colaborador', uid, departamento: whitelistData.departamento || '' },
        progress: {},
      });

      navigate('/dashboard');
    } catch (err) {
      console.warn('[Register] Falha:', err.code || err.message);
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Erro ao concluir o registo. Contacte o administrador se o problema persistir.'
        : 'Erro ao criar conta. Verifique a ligação e tente novamente.';
      errEl.textContent = msg;
      passEl.setAttribute('aria-invalid', 'true');
      confirmEl.setAttribute('aria-invalid', 'true');
      btn.disabled = false;
      arrow.style.display   = 'inline-block';
      spinner.style.display = 'none';
    }
  });

  passEl.focus();
}
