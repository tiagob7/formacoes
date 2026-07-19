# Filtros das Formações — Dropdowns Compactos

**Data:** 2026-05-27  
**Estado:** Aprovado

---

## Problema

O dashboard apresenta três grupos de filter chips sem qualquer rótulo visual. O utilizador vê três filas de botões idênticos e não consegue perceber o que cada grupo filtra.

---

## Solução

Substituir os três `course-filter-group` com chips por três **dropdowns compactos** com o rótulo integrado. Quando um ou mais filtros estão ativos, aparece um botão **"Limpar filtros"** à esquerda dos dropdowns.

---

## Design

### Estados visuais

**Padrão (sem filtros ativos)**
- Três dropdowns com borda `var(--line)`, fundo branco
- Rótulo em maiúsculas pequenas (`9px`, `--ink-3`): `CATEGORIA`, `ATRIBUIÇÃO`, `ESTADO`
- Valor selecionado em negrito (`12px`, `--navy`): `Todas` / `Todos`
- Chevron `▾` cinzento à direita
- Botão "Limpar filtros" oculto

**Filtro ativo**
- Borda `var(--cyan)`, fundo `var(--cyan-soft)` (`#E6F7FE`)
- Rótulo e valor em `var(--cyan-2)` (`#0077A8`)

**Dropdown aberto**
- Painel flutuante abaixo do botão, `border-radius: 10px`, sombra `0 8px 24px rgba(0,0,0,.10)`
- Cada opção: `padding: 7px 12px`, `border-radius: 6px`
- Opção selecionada: fundo `var(--cyan-soft)`, texto `var(--cyan-2)`, checkmark `✓` à direita
- Fechar ao clicar fora do painel

**Botão "Limpar filtros"**
- Visível quando pelo menos um filtro está ativo (categoria ≠ "Todas" ou atribuição ≠ "Todas" ou estado ≠ "Todos")
- Texto `12px`, vermelho (`#EF4444`), fundo transparente, sem borda
- Repõe os três filtros para o valor padrão e fecha qualquer dropdown aberto

---

## Arquitetura

### HTML (em `dashboard.js`)

Substituir:
```html
<div class="course-filter-stack">
  <div class="course-filter-group" id="category-filters" ...></div>
  <div class="course-filter-group" id="assignment-filters" ...></div>
  <div class="course-filter-group" id="status-filters" ...></div>
</div>
```

Por:
```html
<div class="course-filter-bar" id="course-filter-bar">
  <button class="filter-clear-btn" id="filter-clear-btn" style="display:none">✕ Limpar filtros</button>
  <div class="filter-dropdown" id="filter-categoria">...</div>
  <div class="filter-dropdown" id="filter-atribuicao">...</div>
  <div class="filter-dropdown" id="filter-estado">...</div>
</div>
```

Cada `.filter-dropdown` contém:
- `.filter-dropdown-btn` — botão trigger (rótulo + valor + chevron)
- `.filter-dropdown-panel` — painel flutuante com lista de opções (`display:none` por padrão)

### CSS (em `styles.css`)

Remover: `.course-filter-stack`, `.course-filter-group`, `.filter-chip`  
Adicionar: `.course-filter-bar`, `.filter-dropdown`, `.filter-dropdown-btn`, `.filter-dropdown-btn.active`, `.filter-dropdown-panel`, `.filter-dropdown-option`, `.filter-dropdown-option.selected`, `.filter-clear-btn`

Responsive (`@media (max-width: 640px)`): `.course-filter-bar` passa a `flex-direction: column; align-items: flex-start`.

### JS (em `dashboard.js`)

- Substituir a renderização de chips pela renderização dos dropdowns
- Adicionar lógica de abrir/fechar painel (toggle `display` + `document.addEventListener('click', ...)` para fechar ao clicar fora)
- Atualizar o valor exibido no botão trigger quando o utilizador seleciona uma opção
- Mostrar/ocultar o botão "Limpar filtros" com base no estado dos três filtros
- Manter as variáveis de estado existentes (`activeCategory`, `activeAssignment`, `activeStatus`) e a função `renderCourseGrid()` sem alterações

---

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `js/views/dashboard.js` | Substituir renderização de chips por dropdowns; adicionar lógica de open/close e clear |
| `css/styles.css` | Remover estilos de chips; adicionar estilos de dropdowns |

---

## Fora de âmbito

- Pesquisa por texto (mantém-se como está)
- Lógica de filtragem (`renderCourseGrid`) — sem alterações
- Outros ecrãs ou vistas
