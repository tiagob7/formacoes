# Dashboard Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converter as secções "Atribuídas a mim" e "Catálogo disponível" em dois tabs na mesma área do dashboard, com o primeiro tab ativo por defeito e badges de contagem.

**Architecture:** Adicionar CSS para a tab bar, uma variável de estado `activeTab` no closure de `renderDashboard`, e reescrever `renderCards()` para renderizar apenas a lista do tab ativo. Tab clicks re-invocam `renderCourseGrid()` que já existe.

**Tech Stack:** CSS custom properties existentes, vanilla JS DOM

---

### Task 1: CSS da tab bar

**Files:**
- Modify: `css/styles.css` — secção Dashboard, após `.filter-clear-btn:hover` (cerca da linha 497)

- [ ] **Step 1: Inserir as regras da tab bar após `.filter-clear-btn:hover { background: var(--red-soft); }`**

```css
.tab-bar {
  display: flex;
  align-items: flex-end;
  gap: 0;
  border-bottom: 2px solid var(--line);
  margin-bottom: 24px;
}
.tab-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px 12px;
  font-size: 13.5px; font-weight: 600; color: var(--ink-3);
  background: none; border: none; border-bottom: 2px solid transparent;
  margin-bottom: -2px; cursor: pointer;
  transition: color .15s, border-color .15s;
  white-space: nowrap; font-family: var(--body);
}
.tab-btn:hover { color: var(--navy); }
.tab-btn.active { color: var(--navy); border-bottom-color: var(--cyan); font-weight: 700; }
.tab-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 6px;
  border-radius: 999px; font-size: 11px; font-weight: 700;
}
.tab-btn.active .tab-count { background: var(--cyan); color: white; }
.tab-btn:not(.active) .tab-count { background: var(--line); color: var(--ink-3); }
```

- [ ] **Step 2: Verificar que não há conflito de nomes** — pesquisar `.tab-` no ficheiro para garantir que não existem classes com o mesmo nome:

```bash
grep -n "\.tab-" css/styles.css
```

Esperado: zero resultados (as classes são novas).

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "style: add tab-bar styles for dashboard course sections"
```

---

### Task 2: Estado `activeTab` e reescrita de `renderCards`

**Files:**
- Modify: `js/views/dashboard.js:127-282`

- [ ] **Step 1: Adicionar `activeTab` junto às outras variáveis de estado (linha ~127)**

Localiza este bloco:
```js
  let activeCategory = 'Todas';
  let activeAssignment = 'Todas';
  let activeStatus = 'Todos';
  let query = '';
```

Substitui por:
```js
  let activeCategory = 'Todas';
  let activeAssignment = 'Todas';
  let activeStatus = 'Todos';
  let query = '';
  let activeTab = 'assigned'; // 'assigned' | 'catalog'
```

- [ ] **Step 2: Substituir o corpo de `renderCards` (linhas 256–282)**

Localiza a função completa:
```js
  function renderCards(list) {
    const empty = document.getElementById('courses-empty');
    grid.innerHTML = '';
    empty.style.display = list.length ? 'none' : 'grid';
    if (!list.length) return;

    const assigned = list.filter(course => isCourseAssignedToUser(course, getState().user));
    const catalog = list.filter(course => !course.isRequired);

    grid.innerHTML = [
      renderCourseSection('Atribuídas a mim', 'Formações obrigatórias para concluir.', assigned),
      renderCourseSection('Catálogo disponível', 'Formações opcionais que pode iniciar quando fizer sentido.', catalog),
    ].filter(Boolean).join('');

    grid.querySelectorAll('.course-card').forEach(el => {
      const course = list.find(item => item.id === el.dataset.courseId);
      if (!course) return;
      const p = courseProgress(course, progress);
      el.classList.toggle('course-card--in-progress', p.status === 'Em curso');
      el.classList.toggle('course-card--completed',   p.status === 'Concluída');
      el.querySelector('.course-cta')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCourse(course);
      });
      el.addEventListener('click', () => openCourse(course));
    });
  }
```

Substitui pelo seguinte:
```js
  function renderCards(list) {
    const empty = document.getElementById('courses-empty');
    grid.innerHTML = '';

    const assigned = list.filter(course => isCourseAssignedToUser(course, getState().user));
    const catalog  = list.filter(course => !course.isRequired);
    const activeList = activeTab === 'assigned' ? assigned : catalog;

    empty.style.display = activeList.length ? 'none' : 'grid';

    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';
    tabBar.innerHTML = `
      <button type="button" class="tab-btn ${activeTab === 'assigned' ? 'active' : ''}" data-tab="assigned">
        Atribuídas a mim <span class="tab-count">${assigned.length}</span>
      </button>
      <button type="button" class="tab-btn ${activeTab === 'catalog' ? 'active' : ''}" data-tab="catalog">
        Catálogo disponível <span class="tab-count">${catalog.length}</span>
      </button>`;
    tabBar.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        renderCourseGrid();
      });
    });
    grid.appendChild(tabBar);

    if (!activeList.length) return;

    const section = document.createElement('div');
    section.innerHTML = renderCourseItems(activeList);
    grid.appendChild(section);

    grid.querySelectorAll('.course-card').forEach(el => {
      const course = list.find(item => item.id === el.dataset.courseId);
      if (!course) return;
      const p = courseProgress(course, progress);
      el.classList.toggle('course-card--in-progress', p.status === 'Em curso');
      el.classList.toggle('course-card--completed',   p.status === 'Concluída');
      el.querySelector('.course-cta')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCourse(course);
      });
      el.addEventListener('click', () => openCourse(course));
    });
  }
```

- [ ] **Step 3: Adicionar `renderCourseItems` imediatamente após `renderCourseSection` (linha ~304)**

Localiza o fim de `renderCourseSection`:
```js
      </section>`;
}
```

Adiciona a seguir:
```js
function renderCourseItems(courses) {
  return `<div class="courses-grid">
    ${courses.map(course => `
      <button type="button" class="course-card" data-course-id="${course.id}" aria-label="Abrir formação: ${course.title}">
        ${courseCard(course, courseProgress(course, getState().progress))}
      </button>`).join('')}
  </div>`;
}
```

- [ ] **Step 4: Verificar no browser**

Abre `http://localhost:8081` (ou o porto do dev server). Confirma:
- Dashboard mostra tab bar com dois tabs
- "Atribuídas a mim" está ativo por defeito com badge de contagem azul
- "Catálogo disponível" tem badge cinzento
- Clicar em "Catálogo disponível" troca o grid
- Clicar de volta em "Atribuídas a mim" volta ao grid original
- Filtros e pesquisa continuam a funcionar dentro de cada tab
- Cards "Em curso" e "Concluídos" continuam a ter o tratamento visual correto

- [ ] **Step 5: Commit**

```bash
git add js/views/dashboard.js
git commit -m "feat: convert course sections to tabs in dashboard"
```
