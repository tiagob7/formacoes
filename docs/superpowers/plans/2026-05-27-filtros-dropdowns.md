# Filtros das Formações — Dropdowns Compactos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os três grupos de filter chips sem rótulo por três dropdowns compactos com rótulo integrado e um botão "Limpar filtros" que aparece quando algum filtro está ativo.

**Architecture:** Duas alterações independentes — primeiro o CSS (sem quebrar nada), depois o JS em `dashboard.js` que substitui a renderização de chips pela de dropdowns e adiciona uma função auxiliar `buildDropdown`. A lógica de filtragem (`renderCourseGrid`) não muda.

**Tech Stack:** Vanilla JS (ES Modules), CSS custom properties (já definidas no projeto)

---

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `css/styles.css` | Remover linhas 452–469 (chips) e referências em responsive; adicionar estilos dropdown |
| `js/views/dashboard.js` | Substituir HTML do filter bar (linhas 89–93) e toda a lógica de inicialização/eventos dos filtros (linhas 116–178) |

---

## Task 1 — CSS: remover chip styles, adicionar dropdown styles

**Files:**
- Modify: `css/styles.css:452-469` (remover chip styles)
- Modify: `css/styles.css:1249-1257` (responsive — remover `.filter-chip`)
- Modify: `css/styles.css:1323-1325` (responsive — substituir stack/group por bar)

- [ ] **Step 1: Remover os estilos de chip e substituir pelo bloco de dropdown**

Em `css/styles.css`, substituir as linhas 452–469:

```css
.course-filter-stack {
  display: flex; flex-direction: column; align-items: flex-end;
  gap: 8px;
}
.course-filter-group {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 8px; flex-wrap: wrap;
}
.filter-chip {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 32px; padding: 0 12px;
  border: 1px solid var(--line); border-radius: 999px;
  background: white; color: var(--ink-2);
  font-size: 12px; font-weight: 700;
  transition: all .15s;
}
.filter-chip:hover { border-color: var(--cyan); color: var(--cyan-2); }
.filter-chip.active { background: var(--navy); color: white; border-color: var(--navy); }
```

Por:

```css
.course-filter-bar {
  display: flex; align-items: center; gap: 8px;
}
.filter-dropdown { position: relative; }
.filter-dropdown-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 12px; border: 1.5px solid var(--line);
  border-radius: 8px; background: white;
  cursor: pointer; transition: border-color .15s, background .15s;
  text-align: left;
}
.filter-dropdown-btn:hover { border-color: var(--cyan); }
.filter-dropdown-btn.active { border-color: var(--cyan); background: #E6F7FE; }
.filter-dropdown-btn.active .filter-dropdown-label,
.filter-dropdown-btn.active .filter-dropdown-value,
.filter-dropdown-btn.active .filter-dropdown-chevron { color: var(--cyan-2); }
.filter-dropdown-label {
  display: block; font-size: 9px; font-weight: 700;
  color: var(--ink-3); text-transform: uppercase;
  letter-spacing: .08em; line-height: 1.2;
}
.filter-dropdown-value { display: block; font-size: 12px; font-weight: 700; color: var(--navy); }
.filter-dropdown-chevron { color: var(--ink-3); font-size: 12px; }
.filter-dropdown-panel {
  position: absolute; top: calc(100% + 6px); right: 0;
  min-width: 160px; background: white;
  border: 1.5px solid var(--line); border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.10);
  padding: 6px; z-index: 100;
}
.filter-dropdown-option {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 12px; border-radius: 6px;
  font-size: 13px; font-weight: 600; color: var(--ink-1);
  cursor: pointer; transition: background .1s;
}
.filter-dropdown-option:hover { background: #F4F6FA; }
.filter-dropdown-option.selected { background: #E6F7FE; color: var(--cyan-2); font-weight: 700; }
.filter-dropdown-check { color: var(--cyan-2); font-size: 12px; }
.filter-clear-btn {
  display: inline-flex; align-items: center; gap: 4px;
  border: none; background: none; padding: 4px 6px;
  font-size: 12px; font-weight: 600; color: #EF4444;
  cursor: pointer; border-radius: 6px; transition: background .1s;
}
.filter-clear-btn:hover { background: #FEF2F2; }
```

- [ ] **Step 2: Atualizar responsive — remover `.filter-chip` do grupo de `min-height: 44px`**

Em `css/styles.css`, no bloco `@media (max-width: 760px)` (à volta da linha 1249), substituir:

```css
  .btn-icon,
  .icon-btn,
  .logout-btn,
  .filter-chip {
    min-width: 44px;
    min-height: 44px;
    padding: 8px;
  }
```

Por:

```css
  .btn-icon,
  .icon-btn,
  .logout-btn {
    min-width: 44px;
    min-height: 44px;
    padding: 8px;
  }
  .filter-dropdown-btn { min-height: 44px; }
```

- [ ] **Step 3: Atualizar responsive — substituir stack/group por bar**

Em `css/styles.css`, no bloco `@media (max-width: 640px)` (à volta da linha 1323), substituir:

```css
  .course-filter-stack { align-items: flex-start; }
  .course-filter-group { justify-content: flex-start; }
```

Por:

```css
  .course-filter-bar { flex-wrap: wrap; justify-content: flex-start; }
```

- [ ] **Step 4: Commit**

```bash
git add css/styles.css
git commit -m "style: replace filter chips with dropdown styles"
```

---

## Task 2 — JS: substituir HTML do filter bar

**Files:**
- Modify: `js/views/dashboard.js:89-93`

- [ ] **Step 1: Substituir o bloco HTML dos filtros no template**

Em `js/views/dashboard.js`, substituir (linhas 89–93):

```html
          <div class="course-filter-stack">
            <div class="course-filter-group" id="category-filters" aria-label="Filtrar por categoria"></div>
            <div class="course-filter-group" id="assignment-filters" aria-label="Filtrar por tipo de atribuição"></div>
            <div class="course-filter-group" id="status-filters" aria-label="Filtrar por estado"></div>
          </div>
```

Por:

```html
          <div class="course-filter-bar" id="course-filter-bar">
            <button class="filter-clear-btn" id="filter-clear-btn" style="display:none">✕ Limpar filtros</button>
            <div class="filter-dropdown" id="filter-categoria"></div>
            <div class="filter-dropdown" id="filter-atribuicao"></div>
            <div class="filter-dropdown" id="filter-estado"></div>
          </div>
```

- [ ] **Step 2: Commit**

```bash
git add js/views/dashboard.js
git commit -m "feat: update filter bar HTML structure for dropdowns"
```

---

## Task 3 — JS: substituir lógica de filtros por dropdowns

**Files:**
- Modify: `js/views/dashboard.js:116-178`

- [ ] **Step 1: Substituir a inicialização dos filtros**

Em `js/views/dashboard.js`, substituir o bloco que começa em:
```js
  const searchInput = document.querySelector('.search-input');
  const categoryFilters = document.getElementById('category-filters');
  const assignmentFilters = document.getElementById('assignment-filters');
  const statusFilters = document.getElementById('status-filters');
  const grid = document.getElementById('courses-grid');
  if (!searchInput || !categoryFilters || !assignmentFilters || !statusFilters || !grid) return;
  const categories = ['Todas', ...new Set(courses.map(course => course.category).filter(Boolean))];
  const assignmentTypes = ['Todas', 'Obrigatórias', 'Opcionais'];
  const statuses = ['Todos', 'Não iniciada', 'Em curso', 'Concluída', 'Atrasada'];
  let activeCategory = 'Todas';
  let activeAssignment = 'Todas';
  let activeStatus = 'Todos';
  let query = '';

  categoryFilters.innerHTML = categories.map((category, index) => `
    <button class="filter-chip ${index === 0 ? 'active' : ''}" data-category="${category}">
      ${category}
    </button>
  `).join('');

  statusFilters.innerHTML = statuses.map((status, index) => `
    <button class="filter-chip ${index === 0 ? 'active' : ''}" data-status="${status}">
      ${status}
    </button>
  `).join('');

  assignmentFilters.innerHTML = assignmentTypes.map((type, index) => `
    <button class="filter-chip ${index === 0 ? 'active' : ''}" data-assignment="${type}">
      ${type}
    </button>
  `).join('');

  categoryFilters.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      categoryFilters.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      renderCourseGrid();
    });
  });

  statusFilters.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatus = btn.dataset.status;
      statusFilters.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      renderCourseGrid();
    });
  });

  assignmentFilters.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeAssignment = btn.dataset.assignment;
      assignmentFilters.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      renderCourseGrid();
    });
  });

  searchInput.addEventListener('input', e => {
    query = e.target.value.trim().toLowerCase();
    renderCourseGrid();
  });

  renderCourseGrid();
```

Por:

```js
  const searchInput = document.querySelector('.search-input');
  const clearBtn = document.getElementById('filter-clear-btn');
  const catContainer = document.getElementById('filter-categoria');
  const assContainer = document.getElementById('filter-atribuicao');
  const stateContainer = document.getElementById('filter-estado');
  const grid = document.getElementById('courses-grid');
  if (!searchInput || !clearBtn || !catContainer || !assContainer || !stateContainer || !grid) return;

  const categories = ['Todas', ...new Set(courses.map(c => c.category).filter(Boolean))];
  const assignmentTypes = ['Todas', 'Obrigatórias', 'Opcionais'];
  const statuses = ['Todos', 'Não iniciada', 'Em curso', 'Concluída', 'Atrasada'];

  let activeCategory = 'Todas';
  let activeAssignment = 'Todas';
  let activeStatus = 'Todos';
  let query = '';

  function updateClearBtn() {
    const hasFilter = activeCategory !== 'Todas' || activeAssignment !== 'Todas' || activeStatus !== 'Todos';
    clearBtn.style.display = hasFilter ? 'inline-flex' : 'none';
  }

  function buildDropdown(container, labelText, options, defaultVal, onSelect) {
    let current = defaultVal;

    const btn = document.createElement('button');
    const panel = document.createElement('div');
    panel.className = 'filter-dropdown-panel';
    panel.style.display = 'none';

    function renderBtn() {
      btn.className = 'filter-dropdown-btn' + (current !== defaultVal ? ' active' : '');
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = `
        <span>
          <span class="filter-dropdown-label">${labelText}</span>
          <span class="filter-dropdown-value">${current}</span>
        </span>
        <span class="filter-dropdown-chevron">▾</span>`;
    }

    function renderPanel() {
      panel.innerHTML = options.map(opt => `
        <div class="filter-dropdown-option${opt === current ? ' selected' : ''}"
             role="option" aria-selected="${opt === current}" data-value="${opt}">
          ${opt}${opt === current ? '<span class="filter-dropdown-check">✓</span>' : ''}
        </div>`).join('');
      panel.querySelectorAll('.filter-dropdown-option').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          current = el.dataset.value;
          renderBtn();
          renderPanel();
          panel.style.display = 'none';
          onSelect(current);
        });
      });
    }

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = panel.style.display !== 'none';
      document.querySelectorAll('.filter-dropdown-panel').forEach(p => { p.style.display = 'none'; });
      if (!isOpen) {
        panel.style.display = 'block';
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    container.appendChild(btn);
    container.appendChild(panel);
    renderBtn();
    renderPanel();

    return {
      reset() {
        current = defaultVal;
        renderBtn();
        renderPanel();
      }
    };
  }

  const catDrop = buildDropdown(catContainer, 'Categoria', categories, 'Todas', val => {
    activeCategory = val; updateClearBtn(); renderCourseGrid();
  });
  const assDrop = buildDropdown(assContainer, 'Atribuição', assignmentTypes, 'Todas', val => {
    activeAssignment = val; updateClearBtn(); renderCourseGrid();
  });
  const stateDrop = buildDropdown(stateContainer, 'Estado', statuses, 'Todos', val => {
    activeStatus = val; updateClearBtn(); renderCourseGrid();
  });

  clearBtn.addEventListener('click', () => {
    activeCategory = 'Todas'; activeAssignment = 'Todas'; activeStatus = 'Todos';
    catDrop.reset(); assDrop.reset(); stateDrop.reset();
    updateClearBtn(); renderCourseGrid();
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.filter-dropdown-panel').forEach(p => { p.style.display = 'none'; });
  });

  searchInput.addEventListener('input', e => {
    query = e.target.value.trim().toLowerCase();
    renderCourseGrid();
  });

  renderCourseGrid();
```

- [ ] **Step 2: Commit**

```bash
git add js/views/dashboard.js
git commit -m "feat: replace filter chips with dropdown components"
```

---

## Task 4 — Verificação manual

**Files:** nenhum

- [ ] **Step 1: Abrir o dashboard no browser**

Iniciar o servidor (se não estiver a correr):
```bash
python -m http.server 8081
```
Abrir `http://localhost:8081` e fazer login.

- [ ] **Step 2: Verificar estado padrão**

Os três dropdowns devem aparecer alinhados à direita, com borda cinzenta, sem estado ativo. O botão "Limpar filtros" deve estar oculto.

- [ ] **Step 3: Verificar filtro ativo**

Clicar em "Estado" → selecionar "Em curso". O dropdown deve fechar, ficar com borda e fundo azul, mostrar "Em curso". O botão "Limpar filtros" deve aparecer. A contagem de formações deve atualizar.

- [ ] **Step 4: Verificar "Limpar filtros"**

Clicar em "Limpar filtros". Os três dropdowns devem voltar ao valor padrão (borda cinzenta). O botão deve desaparecer. O grid deve mostrar todas as formações novamente.

- [ ] **Step 5: Verificar fechar ao clicar fora**

Abrir um dropdown, depois clicar fora do painel. O painel deve fechar.

- [ ] **Step 6: Verificar responsive (mobile)**

Reduzir a janela para menos de 640px. Os dropdowns devem empilhar verticalmente e alinhar à esquerda.
