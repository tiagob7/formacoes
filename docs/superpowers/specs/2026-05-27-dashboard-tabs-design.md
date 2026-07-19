# Spec: Dashboard com tabs "Atribuídas a mim" / "Catálogo disponível"

**Data:** 2026-05-27
**Scope:** CSS + JS no dashboard

## Contexto

O dashboard lista cursos em duas secções empilhadas verticalmente: "Atribuídas a mim" e "Catálogo disponível". Em utilizadores com muitas formações, isto obriga a muito scroll e dilui o foco. As duas secções são mutuamente exclusivas em termos de intenção do utilizador.

## Solução

Converter as duas secções em dois tabs na mesma área de grid. Tab "Atribuídas a mim" ativo por defeito. Filtros e pesquisa existentes aplicam-se ao tab ativo.

## UI

### Tab bar

```
[ Atribuídas a mim  6 ]  [ Catálogo disponível  12 ]
─────────────────────────────────────────────────────
```

- Tab ativo: texto navy bold, underline 2px cyan, badge azul sólido
- Tab inativo: texto cinzento, badge cinzento neutro
- Transição de underline animada (`.15s`)

### Comportamento

- Por defeito: tab "Atribuídas a mim" ativo
- Clicar no outro tab: troca o grid, sem recarregar a página
- Filtros (categoria, atribuição, estado) e pesquisa aplicam-se ao tab ativo
- Ao filtrar/pesquisar o badge mostra o count filtrado (`3 de 6`)
- A tab bar fica sempre visível; o count atualiza quando os filtros mudam

## Implementação

### CSS (`css/styles.css`) — inserir na secção Dashboard

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
  white-space: nowrap;
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

### JS (`js/views/dashboard.js`)

#### Estado do tab

Adicionar no topo de `renderDashboard`, junto às outras variáveis de estado dos filtros:

```js
let activeTab = 'assigned'; // 'assigned' | 'catalog'
```

#### Substituir a renderização das secções

Em `renderCards(list)`, em vez de renderizar ambas as secções, renderizar só a tab ativa e a tab bar:

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

  if (activeList.length) {
    const section = document.createElement('div');
    section.innerHTML = renderCourseItems(activeList);
    grid.appendChild(section);
  }

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

#### Extrair `renderCourseItems`

A função `renderCourseSection` atual gera wrapper + heading. Precisamos de uma versão sem heading para o contexto de tabs:

```js
function renderCourseItems(courses) {
  return `<div class="courses-grid">
    ${courses.map(course => `
      <button type="button" class="course-card" data-course-id="${course.id}" aria-label="Abrir formação: ${course.title}">
        ${courseCard(course, courseProgress(course, progress))}
      </button>`).join('')}
  </div>`;
}
```

> `renderCourseSection` pode manter-se no ficheiro para não quebrar outras referências, mas deixa de ser chamada a partir de `renderCards`.

## Ficheiros afetados

| Ficheiro | Alteração |
|---|---|
| `css/styles.css` | 8 novas regras CSS para tab bar |
| `js/views/dashboard.js` | Reescrever `renderCards()`, adicionar `renderCourseItems()`, variável `activeTab` |

## O que não muda

- Lógica de filtros, pesquisa, dropdowns
- Função `courseCard()` e toda a renderização interna dos cards
- Diferenciação visual de estado (`.course-card--in-progress`, `--completed`)
- `renderCourseSection()` (mantém-se, apenas deixa de ser chamada em `renderCards`)
