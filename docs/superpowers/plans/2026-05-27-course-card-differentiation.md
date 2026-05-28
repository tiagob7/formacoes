# Course Card Differentiation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar tratamento visual distinto aos cards de formação "Em curso" (barra cyan + border) e "Concluídos" (barra verde + border), mantendo os "Não iniciados" com o estilo base atual.

**Architecture:** Adicionar classes BEM modifier (`.course-card--in-progress`, `.course-card--completed`) via JS no forEach existente, e definir os estilos CSS correspondentes que activam o `::before` permanentemente para esses estados.

**Tech Stack:** CSS custom properties existentes (`--cyan`, `--green`, `--shadow-sm`), vanilla JS DOM classList

---

### Task 1: Adicionar classes CSS para os estados de card

**Files:**
- Modify: `css/styles.css` — secção "Dashboard", após `.course-card:hover::before { opacity: 1; }` (linha ~554)

- [ ] **Step 1: Localizar o ponto de inserção no CSS**

No `css/styles.css`, encontra este bloco (cerca da linha 544–554):

```css
.course-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0;
  height: 3px; z-index: 2;
  background: linear-gradient(90deg, var(--cyan), #47D4FF, var(--cyan));
  opacity: 0; transition: opacity .2s ease;
}
.course-card:hover { transform: translateY(-4px); ... }
.course-card:hover::before { opacity: 1; }
```

- [ ] **Step 2: Inserir as novas regras CSS imediatamente após `.course-card:hover::before { opacity: 1; }`**

```css
.course-card--in-progress::before {
  opacity: 1;
}

.course-card--in-progress {
  border-color: rgba(0,174,239,.35);
  border-width: 1.5px;
  box-shadow: 0 4px 14px rgba(0,174,239,.10), 0 1px 3px rgba(15,30,60,.04);
}

.course-card--completed::before {
  opacity: 1;
  background: var(--green);
}

.course-card--completed {
  border-color: rgba(31,157,85,.25);
}
```

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "style: add in-progress and completed modifier classes to course-card"
```

---

### Task 2: Aplicar as classes de estado via JS

**Files:**
- Modify: `js/views/dashboard.js` — função `renderCourseGrid()`, no forEach sobre `.course-card` (cerca da linha 270)

- [ ] **Step 1: Localizar o forEach existente em `renderCourseGrid()`**

```js
grid.querySelectorAll('.course-card').forEach(el => {
  const course = list.find(item => item.id === el.dataset.courseId);
  if (!course) return;
  el.querySelector('.course-cta')?.addEventListener('click', (e) => {
    e.stopPropagation();
    // ...
  });
});
```

- [ ] **Step 2: Adicionar as duas linhas de classList após `if (!course) return;`**

```js
grid.querySelectorAll('.course-card').forEach(el => {
  const course = list.find(item => item.id === el.dataset.courseId);
  if (!course) return;
  const p = courseProgress(course, progress);
  el.classList.toggle('course-card--in-progress', p.status === 'Em curso');
  el.classList.toggle('course-card--completed',   p.status === 'Concluída');
  el.querySelector('.course-cta')?.addEventListener('click', (e) => {
    e.stopPropagation();
    // ...
  });
});
```

> Nota: `courseProgress` e `progress` já estão em scope — `courseProgress` é importado no topo, `progress` vem do closure de `renderDashboard`. Não precisas de adicionar imports nem chamar `getState()`.

- [ ] **Step 3: Verificar visualmente no browser**

Abre a app, faz login, vai ao dashboard. Confirma:
- Cursos com progresso parcial têm barra cyan no topo e border azul
- Cursos concluídos têm barra verde no topo e border verde subtil
- Cursos não iniciados têm o aspeto base (sem barra, border neutra)
- O hover em qualquer card continua a funcionar (elevação + barra no hover para não iniciados)

- [ ] **Step 4: Commit**

```bash
git add js/views/dashboard.js
git commit -m "feat: apply in-progress and completed visual state to course cards"
```
