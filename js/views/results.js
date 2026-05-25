import { icon }                                      from '../icons.js';
import { getCourse, getModule, courseProgress }       from '../data.js';
import { getState, updateModuleProgress }             from '../state.js';
import { navigate }                                   from '../router.js';
import { saveModuleProgress }                         from '../firebase-service.js';

export async function renderResults(container, { courseId, moduleId }) {
  const { user, progress, quizAnswers, quizSubmitted } = getState();

  if (!quizSubmitted) { navigate(`/module/${courseId}/${moduleId}`); return; }

  const course    = getCourse(courseId);
  const mod       = getModule(courseId, moduleId);
  if (!course || !mod) { navigate('/dashboard'); return; }

  const questions = mod.quiz;
  const answers   = quizAnswers;

  // Score calculation
  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.answer) correct++;
  });
  const score  = Math.round((correct / questions.length) * 100);
  const passed = score >= course.passingScore;

  // Persist progress
  const existing = progress?.[courseId]?.[moduleId] || {};
  const attempts = (existing.attempts || 0) + 1;
  const modData  = {
    read:       true,
    quizPassed: passed || !!existing.quizPassed,
    lastScore:  score,
    attempts,
  };
  updateModuleProgress(courseId, moduleId, modData);
  try {
    await saveModuleProgress(user.email, courseId, moduleId, modData);
  } catch (e) { console.warn('Could not persist to Firebase:', e); }

  // Find next module
  const modIdx   = course.modules.findIndex(m => m.id === moduleId);
  const nextMod  = course.modules[modIdx + 1] || null;
  const { progress: updatedProgress } = getState();
  const courseComplete = courseProgress(course, updatedProgress).pct === 100;

  container.innerHTML = `
    <div class="topbar">
      <div>
        <div class="breadcrumbs">
          <span style="cursor:pointer;color:var(--ink-3)" onclick="navigate('/dashboard')">Dashboard</span>
          <span class="breadcrumb-sep">${icon('chevronRight', 12, '#D1D5DB')}</span>
          <span style="cursor:pointer;color:var(--ink-3)" onclick="history.go(-2)">${course.title}</span>
          <span class="breadcrumb-sep">${icon('chevronRight', 12, '#D1D5DB')}</span>
          <span class="breadcrumb-current">Resultados</span>
        </div>
        <h1 class="topbar-title">Resultados da Avaliação</h1>
      </div>
    </div>

    <div class="results-layout">
      <!-- Score card -->
      <div class="results-score-card">
        <div>
          <div class="results-eyebrow">AVALIAÇÃO CONCLUÍDA</div>
          <h2 class="results-title">${mod.title}</h2>
          <p class="results-subtitle">${course.title}</p>
          <div class="results-status ${passed ? 'pass' : 'fail'}">
            ${passed ? icon('check', 14, 'var(--green)', 2.5) : icon('x', 14, 'var(--red)', 2.5)}
            ${passed ? 'APTO' : 'NÃO APTO'} — nota mínima: ${course.passingScore}%
          </div>
        </div>
        <div class="score-circle">
          <div class="score-number">${score}<span style="font-size:18px;font-weight:400">%</span></div>
          <div class="score-label">pontuação</div>
        </div>
      </div>

      <!-- Stats -->
      <div class="results-stats">
        <div class="result-stat">
          <div class="result-stat-n" style="color:var(--green)">${correct}</div>
          <div class="result-stat-l">Respostas correctas</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-n" style="color:var(--red)">${questions.length - correct}</div>
          <div class="result-stat-l">Respostas incorrectas</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-n">${questions.length}</div>
          <div class="result-stat-l">Total de perguntas</div>
        </div>
      </div>

      <!-- Per-question review -->
      <h3 class="results-review-title">${icon('chart', 16, 'var(--navy)')} Revisão pergunta a pergunta</h3>
      <div class="results-questions">
        ${questions.map((q, i) => questionReview(q, i, answers[i])).join('')}
      </div>

      <!-- Actions -->
      <div class="results-actions">
        ${!passed
          ? `<button class="btn-outline" onclick="navigate('/quiz/${courseId}/${moduleId}')">
               ${icon('refresh', 14)} Repetir avaliação
             </button>`
          : ''}
        ${nextMod
          ? `<button class="btn-next" onclick="navigate('/module/${courseId}/${nextMod.id}')">
               Próximo módulo: ${nextMod.title} ${icon('arrowRight', 14)}
             </button>`
          : courseComplete
            ? `<button class="btn-next" onclick="navigate('/dashboard')">
                 ${icon('award', 14)} Formação concluída! Voltar ao painel
               </button>`
            : `<button class="btn-next" onclick="navigate('/dashboard')">
                 ${icon('home', 14)} Voltar ao painel
               </button>`}
      </div>
    </div>`;
}

function questionReview(q, i, answer) {
  const isCorrect  = answer === q.answer;
  const answerText = q.type === 'tf'
    ? (answer === true ? 'Verdadeiro' : answer === false ? 'Falso' : '—')
    : (answer !== undefined ? q.options[answer] : '—');
  const correctText = q.type === 'tf'
    ? (q.answer === true ? 'Verdadeiro' : 'Falso')
    : q.options[q.answer];

  return `
    <div class="result-q ${isCorrect ? 'correct' : 'wrong'}">
      <div class="result-q-top">
        <div class="result-q-icon">
          ${isCorrect
            ? icon('check', 16, 'var(--green)', 2.5)
            : icon('x',    16, 'var(--red)',   2.5)}
        </div>
        <div class="result-q-text">
          <span style="color:var(--ink-3);font-size:11px;font-weight:700;letter-spacing:.1em">
            P${i + 1}
          </span>
          ${q.question}
        </div>
      </div>
      <div class="result-q-answer">
        ${isCorrect
          ? `Resposta correcta: <strong>${correctText}</strong>`
          : `A sua resposta: <strong>${answerText}</strong> · Correcto: <strong>${correctText}</strong>`}
      </div>
      ${!isCorrect && q.explanation
        ? `<div class="result-q-explanation">${icon('info', 12, 'var(--amber)')} ${q.explanation}</div>`
        : ''}
    </div>`;
}
