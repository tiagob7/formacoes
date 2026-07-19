# Spec: Selector de Capa nas Formações

**Data:** 2026-05-27
**Scope:** Novo módulo JS + modal de gestão de conteúdos + função de renderização de covers

## Contexto

As capas dos cards de formação são geradas automaticamente com base na categoria do curso (regex sobre o texto). O gestor de conteúdos não tem controlo sobre qual ícone ou cor é usada. Esta feature permite escolher explicitamente um ícone + cor para cada formação, guardado em Firestore.

## Solução

Extrair a lógica de covers para um módulo partilhado `js/cover-service.js`. Adicionar um campo `coverId` (formato `"iconKey|paletteIdx"`) ao documento do curso. Adicionar um picker visual no modal de edição de formação na página de gestão de conteúdos.

## UI

### Picker no modal

```
[ Pré-visualização 16:9 ]    ÍCONE
                              [ ic1 ][ ic2 ][ ic3 ][ ic4 ][ ic5 ][ ic6 ]
                              [ ic7 ][ ic8 ][ ic9 ][ic10 ][ic11 ][ic12 ][ic13]

                              COR
                              ● ● ● ● ● ●
```

- Preview à esquerda (140px largura, ratio 16/9), atualiza em tempo real
- Grelha de 6 colunas com os 13 ícones; hover mostra label; ativo tem borda cyan
- 6 swatches de cor circulares abaixo; ativo tem outline cyan
- Secção tem separador visual (`border-top`) do resto do form

### Comportamento

- Ao abrir modal para editar: pré-seleciona ícone+cor do `coverId` guardado; se ausente, usa ícone 0 + paleta 0
- Clicar ícone ou cor: atualiza preview instantaneamente
- Guardar: inclui `coverId` no payload (`"iconKey|paletteIdx"`)
- Dashboard: quando `course.coverId` existe, usa-o; caso contrário cai no comportamento existente por categoria

## Arquitectura

### Novo módulo `js/cover-service.js`

Exporta:
- `COVER_ICONS` — array de `{ key, label, shape }` (13 ícones)
- `COVER_PALETTES` — array de `{ name, c1, c2 }` (6 paletas)
- `courseCoverSVG(courseId, category, coverId)` — função que gera o SVG; quando `coverId` é passado e válido, usa-o; caso contrário faz a detecção por categoria (comportamento atual)

### `js/views/dashboard.js`

- Remover definição inline de `courseCoverSVG` e os dados de paletas/ícones
- Importar `courseCoverSVG` de `../cover-service.js`
- Alterar chamadas: `courseCoverSVG(course.id, course.category, course.coverId)`

### `js/views/content-manager.js`

- Importar `COVER_ICONS`, `COVER_PALETTES`, `courseCoverSVG` de `../cover-service.js`
- Em `openCourseModal`: adicionar secção "Capa" após o campo "Departamentos alvo"
- Picker renderizado via JS DOM (mesmo padrão do resto da modal)
- No handler de guardar: ler `selectedCoverId` e incluí-lo no objeto `data`

### `css/styles.css`

8–10 regras novas para `.cover-picker`, `.cover-icon-grid`, `.cover-icon-opt`, `.cover-palette-row`, `.cover-palette-swatch`.

## Ícones (13)

| key | Label |
|---|---|
| `conformidade` | Conformidade |
| `seguranca` | Segurança |
| `soft` | Soft Skills |
| `tecnico` | Tecnologia |
| `financas` | Finanças |
| `mesa` | Restauração |
| `housekeeping` | Housekeeping |
| `cozinha` | Cozinha |
| `limpeza` | Limpeza |
| `recepcao` | Receção |
| `alergénios` | Alergénios |
| `rh` | RH |
| `ambiente` | Ambiente |
| `default` | Geral |

## Paletas (6)

| name | c1 | c2 |
|---|---|---|
| Navy | #1A3A5C | #0E2540 |
| Floresta | #1A4A2E | #0F2E1A |
| Roxo | #3A1F5C | #240E40 |
| Vinho | #5C1A2E | #3A0E1A 
| Ardósia | #2D3A4A | #1A2535 |
| Esmeralda | #1A4A3A | #0E2E25 |

## Ficheiros afetados

| Ficheiro | Alteração |
|---|---|
| `js/cover-service.js` | Novo — exporta ícones, paletas, `courseCoverSVG` |
| `js/views/dashboard.js` | Remove inline `courseCoverSVG`, importa do cover-service, passa `coverId` |
| `js/views/content-manager.js` | Importa cover-service, adiciona picker na modal, guarda `coverId` |
| `css/styles.css` | 8–10 regras para o picker |

## O que não muda

- Comportamento por defeito quando `coverId` está ausente (detecção por categoria)
- Estrutura dos cards, progress, CTAs
- Firebase schema para módulos
