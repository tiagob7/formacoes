# Spec: Diferenciação visual de cards de formação

**Data:** 2026-05-27
**Scope:** CSS + JS mínimo no dashboard

## Contexto

Os cards de formação no dashboard têm todos o mesmo aspeto visual independentemente do estado (Não iniciada, Em curso, Concluída). A diferença atual resume-se ao badge de estado e ao texto do CTA — fraca sinalização para o utilizador perceber onde deve focar atenção.

## Solução

Adicionar classes de estado ao elemento `.course-card` e usar CSS para aplicar tratamento visual distinto por estado.

## Estados e tratamento visual

### Em curso (`.course-card--in-progress`)
- Barra de topo de 3px visível em repouso: gradiente `#00AEEF → #47D4FF`
- Border: `1.5px solid rgba(0,174,239,.35)`
- Box-shadow: `0 4px 14px rgba(0,174,239,.10), 0 1px 3px rgba(15,30,60,.04)`

### Concluído (`.course-card--completed`)
- Barra de topo de 3px em verde: `var(--green)` sólido
- Border: `1px solid rgba(31,157,85,.25)`
- Box-shadow: mantém `var(--shadow-sm)` base

### Não iniciado (sem classe adicional)
- Estilo base atual — sem alterações

## Implementação

### CSS (`css/styles.css`)

A regra `.course-card:hover::before { opacity: 1; }` **mantém-se** — continua a dar o efeito de hover nos cards "Não iniciados". Para os outros estados, adicionamos classes que tornam o `::before` permanente:

```css
.course-card--in-progress::before {
  opacity: 1;
  /* herda o gradiente cyan já definido no ::before base */
}

.course-card--in-progress {
  border-color: rgba(0,174,239,.35);
  border-width: 1.5px;
  box-shadow: 0 4px 14px rgba(0,174,239,.10), 0 1px 3px rgba(15,30,60,.04);
}

.course-card--completed::before {
  opacity: 1;
  background: var(--green); /* sobrepõe o gradiente cyan do base */
}

.course-card--completed {
  border-color: rgba(31,157,85,.25);
}
```

### JS (`js/views/dashboard.js`)

Em `renderCourseGrid()`, após `grid.querySelectorAll('.course-card').forEach(...)`, adicionar a classe com base no status:

```js
el.classList.toggle('course-card--in-progress', p.status === 'Em curso');
el.classList.toggle('course-card--completed',   p.status === 'Concluída');
```

## Ficheiros afetados

| Ficheiro | Alteração |
|---|---|
| `css/styles.css` | 3 novas regras CSS (hover::before existente mantém-se) |
| `js/views/dashboard.js` | 2 linhas no forEach existente |

## O que não muda

- Layout dos cards
- Conteúdo interno (badges, progress bar, CTA)
- Comportamento de hover (o `::before` continua a ter o efeito de brilho no hover via herança)
- Cards "Não iniciados" — estado base atual mantém-se
