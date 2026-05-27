import { icon }             from '../icons.js';
import { loginEmployee, checkWhitelistEntry, markWhitelistRegistered, createEmployee, logAuditEvent } from '../firebase-service.js';
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
          © 2026 Algartempo · Departamento de Recursos Humanos · v1.0
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
            placeholder="ex.: joao@algartempo.pt" autocomplete="email" />

          <label class="form-label" for="login-password">Palavra-passe</label>
          <input id="login-password" type="password" class="form-input"
            placeholder="••••••••" autocomplete="current-password" />

          <div id="login-error" class="form-error" role="alert" aria-live="polite" style="display:none"></div>

          <button type="submit" class="btn-primary" id="login-btn">
            Entrar
            <span id="login-arrow">${icon('arrowRight', 16)}</span>
            <span id="login-spinner" class="spinner" style="display:none"></span>
          </button>

          <p class="login-hint">
            Em caso de dificuldades de acesso, contacte o escritório da sua área.
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
    const email    = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
      showError('Preencha todos os campos para continuar.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginEmployee(email, password);
      setState({ user: { email: result.email, name: result.name, role: result.role, uid: result.uid }, progress: result.progress });
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
    errEl.style.display = 'block';
  }

  function setLoading(on) {
    btn.disabled       = on;
    spinner.style.display = on ? 'block' : 'none';
    arrow.style.display   = on ? 'none'  : 'inline-block';
  }

  emailEl.addEventListener('input',    () => { errEl.style.display = 'none'; });
  passEl.addEventListener('input',     () => { errEl.style.display = 'none'; });
  emailEl.focus();
}
