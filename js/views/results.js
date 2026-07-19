import { icon }                                      from '../icons.js';
import { getCourseById, getModuleById, courseProgress, isCourseVisibleToUser } from '../course-service.js';
import { getState, updateModuleProgress }             from '../state.js';
import { navigate }                                   from '../router.js';
import { saveModuleProgress, logAuditEvent }           from '../firebase-service.js';
import { renderLoadingState, renderEmptyState, renderInlineNotice } from '../ui.js';
import { openCertificate }                            from '../certificate-service.js';

export async function renderResults(container, { courseId, moduleId }) {
  container.innerHTML = renderLoadingState('A calcular resultados...');

  const { user, progress, quizAnswers, quizSubmitted } = getState();

  if (!quizSubmitted) { navigate(`/module/${courseId}/${moduleId}`); return; }

  let course = null;
  let mod = null;
  try {
    course = await getCourseById(courseId);
    mod = await getModuleById(courseId, moduleId);
  } catch (err) {
    console.error(err);
  }
  if (!course || !mod || !isCourseVisibleToUser(course, user)) {
    container.innerHTML = renderEmptyState({
      iconName: 'info',
      title: 'Resultados indisponíveis',
      message: 'A formação ou o módulo associado pode ter sido removido.',
      action: `<button class="btn-next" onclick="navigate('/dashboard')">Voltar ao painel</button>`,
    });
    return;
  }

  const questions = mod.quiz;
  if (!questions.length) {
    container.innerHTML = renderEmptyState({
      iconName: 'info',
      title: 'Avaliação sem perguntas',
      message: 'Não existem respostas para corrigir neste módulo.',
      action: `<button class="btn-next" onclick="navigate('/module/${courseId}/${moduleId}')">Voltar ao módulo</button>`,
    });
    return;
  }
  const answers   = quizAnswers;

  // Score calculation
  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.answer) correct++;
  });
  const score  = Math.round((correct / questions.length) * 100);
  const passed = score >= course.passingScore;

  // Persist progress
  const existing        = progress?.[courseId]?.[moduleId] || {};
  const previousHistory = Array.isArray(existing.attemptHistory) ? existing.attemptHistory : [];
  const submittedAt     = Date.now();
  const attempts        = Math.max(existing.attempts || 0, previousHistory.length) + 1;
  const bestScore       = Math.max(score, existing.bestScore || 0);
  const completedAt     = (passed && !existing.quizPassed) ? submittedAt : (existing.completedAt || null);
  const attemptEntry    = {
    attempt: attempts,
    score,
    correct,
    total: questions.length,
    passed,
    submittedAt,
  };
  const attemptHistory = [...previousHistory, attemptEntry];
  const modData     = {
    read:        true,
    quizPassed:  passed || !!existing.quizPassed,
    lastScore:   score,
    bestScore,
    attempts,
    lastAttemptAt: submittedAt,
    attemptHistory,
    completedAt,
  };
  updateModuleProgress(courseId, moduleId, modData);
  try {
    await saveModuleProgress(user.email, courseId, moduleId, modData);
    if (passed) {
      await logAuditEvent('complete_quiz', user.email, user.role,
        `${course.title} — ${mod.title}`,
        `${score}% (tentativa ${attempts})`);
    }
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
          <button class="breadcrumb-back" onclick="navigate('/dashboard')">Painel</button>
          <span class="breadcrumb-sep">${icon('chevronRight', 12, '#D1D5DB')}</span>
          <button class="breadcrumb-back" onclick="history.go(-2)">${course.title}</button>
          <span class="breadcrumb-sep">${icon('chevronRight', 12, '#D1D5DB')}</span>
          <span class="breadcrumb-current">Resultados</span>
        </div>
        <h1 class="topbar-title">Resultados da Avaliação</h1>
      </div>
    </div>
    ${!user?.email ? renderInlineNotice({
      type: 'warning',
      title: 'Sessão sem email',
      message: 'O resultado foi calculado neste dispositivo, mas pode não ficar associado ao colaborador.',
    }) : ''}

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
          <div class="result-stat-l">Respostas corretas</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-n" style="color:var(--red)">${questions.length - correct}</div>
          <div class="result-stat-l">Respostas incorretas</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-n">${questions.length}</div>
          <div class="result-stat-l">Total de perguntas</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-n" style="color:var(--cyan-2)">${bestScore}<span style="font-size:14px">%</span></div>
          <div class="result-stat-l">Melhor nota</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-n">${attempts}</div>
          <div class="result-stat-l">${attempts === 1 ? 'Tentativa' : 'Tentativas'}</div>
        </div>
      </div>

      <h3 class="results-review-title">${icon('clock', 16, 'var(--navy)')} Historico de tentativas</h3>
      <div class="attempt-history">
        ${attemptHistory.slice().reverse().map(attempt => renderAttemptHistoryItem(attempt, attempts)).join('')}
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
            ? `<button class="btn-outline" onclick="navigate('/dashboard')">
                 ${icon('home', 14)} Voltar ao painel
               </button>
               <button class="btn-next" id="btn-certificate">
                 ${icon('award', 14)} Ver certificado
               </button>`
            : `<button class="btn-next" onclick="navigate('/dashboard')">
                 ${icon('home', 14)} Voltar ao painel
               </button>`}
      </div>
    </div>`;

  if (courseComplete && passed) {
    document.getElementById('btn-certificate')?.addEventListener('click', () => {
      const { progress: updatedProgress } = getState();
      const cp    = updatedProgress?.[courseId] || {};
      const dates = course.modules.map(m => cp[m.id]?.completedAt).filter(Boolean);
      openCertificate({
        userName:    user?.name || user?.email || 'Colaborador',
        courseName:  course.title,
        category:    course.category,
        completedAt: dates.length ? Math.max(...dates) : Date.now(),
      });
    });
  }
}

function renderAttemptHistoryItem(attempt, currentAttempt) {
  const isCurrent = attempt.attempt === currentAttempt;
  const submittedAt = attempt.submittedAt ? formatAttemptDate(attempt.submittedAt) : 'Data indisponivel';
  const correct = Number.isFinite(attempt.correct) ? attempt.correct : '-';
  const total = Number.isFinite(attempt.total) ? attempt.total : '-';
  const score = Number.isFinite(attempt.score) ? `${attempt.score}%` : '-';

  return `
    <div class="attempt-item ${attempt.passed ? 'pass' : 'fail'} ${isCurrent ? 'current' : ''}">
      <div class="attempt-main">
        <div class="attempt-title">Tentativa ${attempt.attempt || '-'}${isCurrent ? ' atual' : ''}</div>
        <div class="attempt-meta">${submittedAt} &middot; ${correct}/${total} respostas corretas</div>
      </div>
      <div class="attempt-score">
        <strong>${score}</strong>
        <span>${attempt.passed ? 'Apto' : 'Nao apto'}</span>
      </div>
    </div>`;
}

function formatAttemptDate(value) {
  try {
    return new Intl.DateTimeFormat('pt-PT', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return 'Data indisponivel';
  }
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
          ? `Resposta correta: <strong>${correctText}</strong>`
          : `A sua resposta: <strong>${answerText}</strong> · Correto: <strong>${correctText}</strong>`}
      </div>
      ${!isCorrect && q.explanation
        ? `<div class="result-q-explanation">${icon('info', 12, 'var(--amber)')} ${q.explanation}</div>`
        : ''}
    </div>`;
}
