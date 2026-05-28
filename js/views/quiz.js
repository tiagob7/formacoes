import { icon }                             from '../icons.js';
import { getCourseById, getModuleById, isCourseVisibleToUser }      from '../course-service.js';
import { getState, setState }               from '../state.js';
import { navigate }                         from '../router.js';
import { renderLoadingState, renderEmptyState } from '../ui.js';

export async function renderQuiz(container, { courseId, moduleId }) {
  container.innerHTML = renderLoadingState('A preparar avaliação...');

  setState({ courseId, moduleId, view: 'quiz', quizAnswers: {}, quizSubmitted: false });

  let course = null;
  let mod = null;
  try {
    course = await getCourseById(courseId);
    mod = await getModuleById(courseId, moduleId);
  } catch (err) {
    console.error(err);
  }
  if (!course || !mod || !isCourseVisibleToUser(course, getState().user)) {
    container.innerHTML = renderEmptyState({
      iconName: 'info',
      title: 'Avaliação não encontrada',
      message: 'A formação ou o módulo associado pode ter sido removido.',
      action: `<button class="btn-next" onclick="navigate('/dashboard')">Voltar ao painel</button>`,
    });
    return;
  }

  const { progress } = getState();
  const isRead = !!(progress?.[courseId]?.[moduleId]?.read || progress?.[courseId]?.[moduleId]?.quizPassed);
  if (!isRead) { navigate(`/module/${courseId}/${moduleId}`); return; }

  const questions = mod.quiz;
  if (!questions.length) {
    container.innerHTML = `
      <div class="topbar">
        <div>
          <div class="breadcrumbs">
            <span style="cursor:pointer;color:var(--ink-3)" onclick="history.back()">← Módulo</span>
            <span class="breadcrumb-sep">${icon('chevronRight', 12, '#D1D5DB')}</span>
            <span class="breadcrumb-current">Avaliação</span>
          </div>
          <h1 class="topbar-title">Avaliação indisponível</h1>
          <div class="topbar-sub">${mod.title}</div>
        </div>
      </div>
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon">${icon('info', 32, 'var(--ink-3)')}</div>
          <div class="empty-state-title">Este módulo ainda não tem avaliação</div>
          <div class="empty-state-sub">Quando o gestor publicar perguntas, a avaliação ficará disponível.</div>
          <button class="btn-next" onclick="navigate('/module/${courseId}/${moduleId}')">Voltar ao módulo</button>
        </div>
      </div>`;
    return;
  }

  let answers     = {};    // { idx: value }
  let submitted   = false;

  function render() {
    const answered = Object.keys(answers).length;
    container.innerHTML = `
      <div class="topbar">
        <div>
          <div class="breadcrumbs">
            <span style="cursor:pointer;color:var(--ink-3)" onclick="history.back()">← Módulo</span>
            <span class="breadcrumb-sep">${icon('chevronRight', 12, '#D1D5DB')}</span>
            <span class="breadcrumb-current">Avaliação</span>
          </div>
          <h1 class="topbar-title">Avaliação — ${mod.title}</h1>
        </div>
        <div class="topbar-right">
          <button class="btn-ghost" onclick="history.back()">
            ${icon('arrowLeft', 14)} Voltar ao módulo
          </button>
        </div>
      </div>

      <div class="quiz-layout">
        <div class="quiz-meta">
          ${icon('award', 14, 'var(--cyan-2)')}
          ${questions.length} perguntas · nota mínima ${course.passingScore}%
        </div>
        <h2 class="quiz-title">${mod.title}</h2>

        <div class="quiz-progress">
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width:${Math.round((answered/questions.length)*100)}%"></div>
          </div>
          <span class="quiz-progress-text">${answered}/${questions.length} respondidas</span>
        </div>

        <div class="quiz-questions">
          ${questions.map((q, i) => renderQuestion(q, i, answers, submitted)).join('')}
        </div>

        <div class="quiz-footer">
          <div class="quiz-footer-info">
            ${submitted ? '' : `${questions.length - answered} perguntas por responder`}
          </div>
          ${!submitted
            ? `<button class="btn-submit" id="btn-submit" ${answered < questions.length ? 'disabled' : ''}>
                 Submeter avaliação ${icon('arrowRight', 14)}
               </button>`
            : `<button class="btn-next" id="btn-results">
                 Ver resultados ${icon('arrowRight', 14)}
               </button>`}
        </div>
      </div>`;

    attachListeners();
  }

  function renderQuestion(q, i, ans, done) {
    const userAnswer = ans[i];
    const badge = q.type === 'tf'
      ? `<span class="question-badge badge-tf">V / F</span>`
      : `<span class="question-badge badge-mc">Escolha múltipla</span>`;

    const options = q.type === 'tf'
      ? renderTF(i, userAnswer, done, q.answer)
      : renderMC(q, i, userAnswer, done);

    const explanation = done && userAnswer !== undefined && q.type === 'tf'
      && userAnswer !== q.answer && q.explanation
      ? `<div class="question-explanation">${icon('info', 13, 'var(--amber)')} ${q.explanation}</div>`
      : done && userAnswer !== undefined && q.type === 'mc'
        && userAnswer !== q.answer && q.explanation
        ? `<div class="question-explanation">${icon('info', 13, 'var(--amber)')} ${q.explanation}</div>`
        : '';

    return `
      <div class="question-card">
        <div class="question-num">Pergunta ${i + 1} de ${mod.quiz.length} ${badge}</div>
        <div class="question-text">${q.question}</div>
        ${options}
        ${explanation}
      </div>`;
  }

  function renderTF(idx, answer, done, correct) {
    const trueClass  = done
      ? (correct === true  ? 'correct'  : (answer === true  ? 'wrong' : ''))
      : (answer === true   ? 'selected' : '');
    const falseClass = done
      ? (correct === false ? 'correct'  : (answer === false ? 'wrong' : ''))
      : (answer === false  ? 'selected' : '');

    return `
      <div class="tf-options">
        <div class="tf-item ${trueClass}" data-idx="${idx}" data-val="true">
          ${icon('check', 16, 'currentColor')} Verdadeiro
        </div>
        <div class="tf-item ${falseClass}" data-idx="${idx}" data-val="false">
          ${icon('x', 16, 'currentColor')} Falso
        </div>
      </div>`;
  }

  function renderMC(q, idx, answer, done) {
    const opts = q.options.map((opt, oi) => {
      let cls = '';
      if (done) {
        if (oi === q.answer)     cls = 'correct';
        else if (oi === answer)  cls = 'wrong';
      } else {
        if (oi === answer) cls = 'selected';
      }
      const indicator = cls === 'correct'
        ? icon('check', 12, 'white', 2.5)
        : cls === 'wrong'
          ? icon('x', 12, 'white', 2.5)
          : oi === answer ? icon('check', 12, 'white', 2.5) : String.fromCharCode(65 + oi);
      return `
        <div class="option-item ${cls}" data-idx="${idx}" data-val="${oi}">
          <div class="option-indicator">${indicator}</div>
          ${opt}
        </div>`;
    }).join('');
    return `<div class="options-list">${opts}</div>`;
  }

  function attachListeners() {
    // Results button (shown after submission)
    const btnResults = document.getElementById('btn-results');
    if (btnResults) {
      btnResults.addEventListener('click', () => navigate(`/results/${courseId}/${moduleId}`));
    }

    if (submitted) return;

    // TF choices
    container.querySelectorAll('.tf-item').forEach(el => {
      el.addEventListener('click', () => {
        if (submitted) return;
        const idx = parseInt(el.dataset.idx);
        const val = el.dataset.val === 'true';
        answers[idx] = val;
        render();
      });
    });

    // MC choices
    container.querySelectorAll('.option-item').forEach(el => {
      el.addEventListener('click', () => {
        if (submitted) return;
        const idx = parseInt(el.dataset.idx);
        const val = parseInt(el.dataset.val);
        answers[idx] = val;
        render();
      });
    });

    // Submit
    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        submitted = true;
        setState({ quizAnswers: answers, quizSubmitted: true });
        render();
      });
    }

  }

  render();
}
