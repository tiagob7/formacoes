# Cover Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir ao gestor de conteúdos escolher visualmente um ícone + cor para a capa de cada formação, guardado como `coverId` em Firestore.

**Architecture:** Extrair a lógica de covers para `js/cover-service.js` (módulo partilhado). O dashboard importa `courseCoverSVG` desse módulo (passando `course.coverId`). O content-manager importa `COVER_ICONS` e `COVER_PALETTES` para renderizar o picker no modal de edição.

**Tech Stack:** Vanilla JS ES modules, CSS custom properties, SVG inline, Firestore (via `saveCourse` já existente)

---

### Task 1: Criar `js/cover-service.js`

**Files:**
- Create: `js/cover-service.js`

- [ ] **Step 1: Criar o ficheiro com os dados de ícones, paletas e a função `courseCoverSVG`**

Cria `js/cover-service.js` com o seguinte conteúdo completo:

```js
export const COVER_PALETTES = [
  { name: 'Navy',      c1: '#1A3A5C', c2: '#0E2540' },
  { name: 'Floresta',  c1: '#1A4A2E', c2: '#0F2E1A' },
  { name: 'Roxo',      c1: '#3A1F5C', c2: '#240E40' },
  { name: 'Vinho',     c1: '#5C1A2E', c2: '#3A0E1A' },
  { name: 'Ardósia',   c1: '#2D3A4A', c2: '#1A2535' },
  { name: 'Esmeralda', c1: '#1A4A3A', c2: '#0E2E25' },
];

export const COVER_ICONS = [
  { key: 'conformidade', label: 'Conformidade',
    shape: `<g transform="translate(72,22)"><path d="M28 4L52 14V32C52 46 40 54 28 58C16 54 4 46 4 32V14Z" fill="white" opacity=".95"/><path d="M18 32L25 39L40 24" stroke="#1A3A5C" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>` },
  { key: 'seguranca', label: 'Segurança',
    shape: `<g transform="translate(76,20)"><rect x="0" y="0" width="48" height="68" rx="8" fill="white" opacity=".9"/><line x1="24" y1="14" x2="24" y2="54" stroke="#1A3A5C" stroke-width="5" stroke-linecap="round"/><line x1="8" y1="34" x2="40" y2="34" stroke="#1A3A5C" stroke-width="5" stroke-linecap="round"/></g>` },
  { key: 'soft', label: 'Soft Skills',
    shape: `<g transform="translate(52,20)"><rect x="0" y="0" width="80" height="50" rx="10" fill="white" opacity=".9"/><path d="M14 50L8 64" stroke="white" stroke-width="2" opacity=".5"/><rect x="14" y="13" width="52" height="5" rx="2.5" fill="#C9D2DE"/><rect x="14" y="25" width="36" height="4" rx="2" fill="#C9D2DE"/><rect x="14" y="35" width="44" height="4" rx="2" fill="#C9D2DE"/></g>` },
  { key: 'tecnico', label: 'Tecnologia',
    shape: `<g transform="translate(60,18)"><rect x="0" y="0" width="80" height="52" rx="6" fill="white" opacity=".9"/><rect x="8" y="8" width="64" height="36" rx="3" fill="#1A3A5C" opacity=".8"/><rect x="28" y="52" width="24" height="5" rx="2" fill="white" opacity=".6"/></g>` },
  { key: 'financas', label: 'Finanças',
    shape: `<g transform="translate(74,18)"><circle cx="26" cy="28" r="28" fill="white" opacity=".9"/><text x="26" y="37" text-anchor="middle" font-size="28" font-family="sans-serif" fill="#1A3A5C" font-weight="bold">€</text></g>` },
  { key: 'mesa', label: 'Restauração',
    shape: `<g transform="translate(60,16)"><circle cx="40" cy="38" r="32" fill="white" opacity=".9"/><circle cx="40" cy="38" r="26" fill="none" stroke="#C9D2DE" stroke-width="1.5"/><ellipse cx="40" cy="30" rx="10" ry="4" fill="#1A3A5C" opacity=".7"/><rect x="26" y="33" width="28" height="2" rx="1" fill="#1A3A5C" opacity=".5"/><rect x="38" y="35" width="4" height="14" rx="2" fill="#1A3A5C" opacity=".7"/><ellipse cx="40" cy="50" rx="14" ry="3" fill="#1A3A5C" opacity=".3"/></g>` },
  { key: 'housekeeping', label: 'Housekeeping',
    shape: `<g transform="translate(58,14)"><rect x="0" y="20" width="60" height="58" rx="6" fill="white" opacity=".9"/><rect x="8" y="28" width="44" height="6" rx="3" fill="#C9D2DE"/><rect x="8" y="40" width="36" height="4" rx="2" fill="#C9D2DE"/><rect x="8" y="50" width="40" height="4" rx="2" fill="#C9D2DE"/><path d="M20 0 Q30 8 40 0 Q50 8 60 0" stroke="white" stroke-width="2.5" fill="none" opacity=".6" stroke-linecap="round"/><circle cx="30" cy="16" r="5" fill="white" opacity=".7"/></g>` },
  { key: 'cozinha', label: 'Cozinha',
    shape: `<g transform="translate(62,12)"><rect x="4" y="28" width="56" height="46" rx="5" fill="white" opacity=".9"/><rect x="12" y="36" width="40" height="6" rx="3" fill="#C9D2DE"/><rect x="12" y="48" width="28" height="4" rx="2" fill="#C9D2DE"/><ellipse cx="32" cy="24" rx="22" ry="10" fill="white" opacity=".9"/><ellipse cx="32" cy="16" rx="14" ry="7" fill="white" opacity=".7"/><rect x="30" y="8" width="4" height="8" rx="2" fill="white" opacity=".5"/></g>` },
  { key: 'limpeza', label: 'Limpeza',
    shape: `<g transform="translate(68,14)"><path d="M18 38 Q16 62 20 68 Q32 74 44 68 Q48 62 46 38Z" fill="white" opacity=".9"/><ellipse cx="32" cy="38" rx="14" ry="5" fill="white" opacity=".7"/><path d="M20 36 Q32 26 44 36" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".6"/><line x1="54" y1="8" x2="36" y2="48" stroke="white" stroke-width="3" stroke-linecap="round" opacity=".85"/><ellipse cx="57" cy="6" rx="8" ry="4" fill="white" opacity=".8" transform="rotate(-30 57 6)"/><line x1="52" y1="4" x2="48" y2="12" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity=".5"/><line x1="57" y1="2" x2="54" y2="11" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity=".5"/><line x1="62" y1="3" x2="60" y2="12" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity=".5"/></g>` },
  { key: 'recepcao', label: 'Receção',
    shape: `<g transform="translate(64,14)"><rect x="0" y="64" width="72" height="8" rx="3" fill="white" opacity=".7"/><path d="M36 10 C20 10 12 24 12 40 L12 56 L60 56 L60 40 C60 24 52 10 36 10Z" fill="white" opacity=".9"/><rect x="30" y="56" width="12" height="6" rx="2" fill="white" opacity=".7"/><circle cx="36" cy="64" r="4" fill="white" opacity=".6"/><rect x="33" y="6" width="6" height="6" rx="3" fill="white" opacity=".5"/><line x1="16" y1="44" x2="56" y2="44" stroke="#1A3A5C" stroke-width="1.5" opacity=".3"/></g>` },
  { key: 'alergénios', label: 'Alergénios',
    shape: `<g transform="translate(66,12)"><line x1="34" y1="80" x2="34" y2="20" stroke="white" stroke-width="3" stroke-linecap="round" opacity=".8"/><ellipse cx="34" cy="28" rx="10" ry="6" fill="white" opacity=".9" transform="rotate(-30 34 28)"/><ellipse cx="34" cy="28" rx="10" ry="6" fill="white" opacity=".9" transform="rotate(30 34 28)"/><ellipse cx="34" cy="42" rx="11" ry="6" fill="white" opacity=".8" transform="rotate(-30 34 42)"/><ellipse cx="34" cy="42" rx="11" ry="6" fill="white" opacity=".8" transform="rotate(30 34 42)"/><ellipse cx="34" cy="56" rx="10" ry="6" fill="white" opacity=".7" transform="rotate(-30 34 56)"/><ellipse cx="34" cy="56" rx="10" ry="6" fill="white" opacity=".7" transform="rotate(30 34 56)"/><ellipse cx="34" cy="18" rx="6" ry="8" fill="white" opacity=".9"/></g>` },
  { key: 'rh', label: 'RH',
    shape: `<g transform="translate(52,16)"><circle cx="28" cy="22" r="12" fill="white" opacity=".9"/><path d="M8 72 C8 52 48 52 48 72" fill="white" opacity=".8"/><circle cx="52" cy="26" r="10" fill="white" opacity=".7"/><path d="M34 72 C34 56 70 56 70 72" fill="white" opacity=".6"/></g>` },
  { key: 'ambiente', label: 'Ambiente',
    shape: `<g transform="translate(66,10)"><path d="M34 80 C34 80 6 60 6 34 C6 14 22 6 34 6 C46 6 62 14 62 34 C62 60 34 80 34 80Z" fill="white" opacity=".9"/><line x1="34" y1="80" x2="34" y2="10" stroke="#1A3A5C" stroke-width="2" opacity=".25" stroke-linecap="round"/><line x1="34" y1="50" x2="18" y2="38" stroke="#1A3A5C" stroke-width="1.5" opacity=".2" stroke-linecap="round"/><line x1="34" y1="50" x2="50" y2="38" stroke="#1A3A5C" stroke-width="1.5" opacity=".2" stroke-linecap="round"/></g>` },
  { key: 'default', label: 'Geral',
    shape: `<g transform="translate(70,16)"><rect x="4" y="0" width="52" height="70" rx="5" fill="white" opacity=".9"/><rect x="14" y="14" width="32" height="4" rx="2" fill="#C9D2DE"/><rect x="14" y="24" width="24" height="3" rx="1.5" fill="#C9D2DE"/><rect x="14" y="33" width="28" height="3" rx="1.5" fill="#C9D2DE"/><rect x="14" y="42" width="20" height="3" rx="1.5" fill="#C9D2DE"/></g>` },
];

function _wrap(shape, c1, c2, uid) {
  const gid = 'cc-' + uid;
  return `<svg viewBox="0 0 200 110" fill="none" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="200" height="110" fill="url(#${gid})"/>
    <circle cx="170" cy="15" r="55" fill="#00AEEF" opacity=".13"/>
    <circle cx="20" cy="95" r="38" fill="#00AEEF" opacity=".09"/>
    ${shape}
  </svg>`;
}

export function courseCoverSVG(id, category = '', coverId = '') {
  // coverId overrides category-based detection
  if (coverId) {
    const [iconKey, palIdx] = coverId.split('|');
    const iconDef = COVER_ICONS.find(ic => ic.key === iconKey);
    const pal = COVER_PALETTES[parseInt(palIdx, 10)] || COVER_PALETTES[0];
    if (iconDef) return _wrap(iconDef.shape, pal.c1, pal.c2, id || 'x');
  }

  // Fallback: category-based detection (existing behaviour)
  const cat = (category || '').toLowerCase();
  const legacyPalettes = [
    ['#1A3A5C','#0E2540'],
    ['#14304D','#0a1f35'],
    ['#1F4060','#152C45'],
    ['#0E3352','#091f33'],
  ];
  const idx = (id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % legacyPalettes.length;
  const [c1, c2] = legacyPalettes[idx];

  let shape;
  if (/conformidade|rgpd|privacidade|lei|gdpr|dados/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'conformidade').shape;
  else if (/seguran|sa[uú]de|sst|emerg|riscos/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'seguranca').shape;
  else if (/soft|comunica|lideran|pessoas|atendimento|rela/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'soft').shape;
  else if (/t[eé]cnic|inform[aá]t|sistema|digital|it|tech/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'tecnico').shape;
  else if (/financ|contabil|gest[aã]o|or[cç]am|custos/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'financas').shape;
  else if (/mesa|restaurante|sala|servi[cç]o|waiter|f&b|f and b/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'mesa').shape;
  else if (/housekeeping|quartos|lavand|andares|camareira/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'housekeeping').shape;
  else if (/limpeza/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'limpeza').shape;
  else if (/cozinha|chef|culin[aá]|pastelaria|gastronomia|cozinheiro/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'cozinha').shape;
  else if (/alergen|al[eé]rg/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'alergénios').shape;
  else if (/recep[cç]|front.?desk|balc[aã]o/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'recepcao').shape;
  else if (/ambiente|sustent|ecolog/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'ambiente').shape;
  else if (/rh|recursos.?human|hr/.test(cat))
    shape = COVER_ICONS.find(i => i.key === 'rh').shape;
  else
    shape = COVER_ICONS.find(i => i.key === 'default').shape;

  return _wrap(shape, c1, c2, id || 'x');
}
```

- [ ] **Step 2: Verificar que o ficheiro foi criado corretamente**

```bash
node -e "import('./js/cover-service.js').then(m => console.log('COVER_ICONS:', m.COVER_ICONS.length, 'COVER_PALETTES:', m.COVER_PALETTES.length))"
```

Esperado: `COVER_ICONS: 14 COVER_PALETTES: 6`

- [ ] **Step 3: Commit**

```bash
git add js/cover-service.js
git commit -m "feat: extract cover icons/palettes into cover-service module"
```

---

### Task 2: Atualizar `dashboard.js` para usar `cover-service`

**Files:**
- Modify: `js/views/dashboard.js`

- [ ] **Step 1: Adicionar import de `courseCoverSVG` no topo do ficheiro**

Localiza a linha 1 de `js/views/dashboard.js`:
```js
import { icon } from '../icons.js';
```

Substitui por:
```js
import { icon } from '../icons.js';
import { courseCoverSVG } from '../cover-service.js';
```

- [ ] **Step 2: Atualizar a chamada em `courseCard` para passar `coverId`**

Localiza (linha ~364):
```js
    <div class="course-cover">${courseCoverSVG(course.id, course.category)}<div class="course-category">${course.category}</div></div>
```

Substitui por:
```js
    <div class="course-cover">${courseCoverSVG(course.id, course.category, course.coverId)}<div class="course-category">${course.category}</div></div>
```

- [ ] **Step 3: Remover a função `courseCoverSVG` inline**

Localiza e remove todo o bloco desde:
```js
function courseCoverSVG(id, category = '') {
```
até ao `}` de fecho da função (linha ~477 — a função termina com o `return wrap(...)` do default seguido de `}`).

A função `documentStack` que vem a seguir (`function documentStack() {`) deve ficar intacta.

- [ ] **Step 4: Verificar no browser que os cards continuam a mostrar covers**

Abre `http://localhost:8081`, faz login e confirma que os cards no dashboard ainda têm capas com gradiente e ícones. O comportamento deve ser idêntico ao anterior.

- [ ] **Step 5: Commit**

```bash
git add js/views/dashboard.js
git commit -m "refactor: use cover-service for courseCoverSVG in dashboard"
```

---

### Task 3: CSS do cover picker

**Files:**
- Modify: `css/styles.css` — após `.tab-btn:not(.active) .tab-count { ... }` (cerca da linha 507)

- [ ] **Step 1: Inserir regras CSS após `.tab-btn:not(.active) .tab-count`**

Localiza:
```css
.tab-btn:not(.active) .tab-count { background: var(--line); color: var(--ink-3); }
```

Adiciona imediatamente a seguir:
```css
.cover-picker { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
.cover-picker-layout { display: grid; grid-template-columns: 140px 1fr; gap: 20px; align-items: start; margin-top: 12px; }
.cover-preview { border-radius: 10px; overflow: hidden; aspect-ratio: 16/9; width: 140px; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
.cover-preview svg { display: block; width: 100%; height: 100%; }
.cover-icon-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; }
.cover-icon-opt { aspect-ratio: 1; border-radius: 7px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: border-color .15s, transform .1s; position: relative; }
.cover-icon-opt:hover { transform: scale(1.06); }
.cover-icon-opt.active { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(0,145,214,.2); }
.cover-icon-opt svg { width: 100%; height: 100%; display: block; }
.cover-icon-label { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,.55); color: white; font-size: 7px; font-weight: 700; text-align: center; padding: 2px 2px 3px; opacity: 0; transition: opacity .15s; }
.cover-icon-opt:hover .cover-icon-label { opacity: 1; }
.cover-palette-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.cover-palette-swatch { width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2.5px solid transparent; transition: transform .1s, border-color .15s; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.cover-palette-swatch:hover { transform: scale(1.15); }
.cover-palette-swatch.active { border-color: white; outline: 2px solid var(--cyan); outline-offset: 1px; }
```

- [ ] **Step 2: Verificar que não há conflitos de nomes**

```bash
grep -n "\.cover-" css/styles.css | head -20
```

Esperado: apenas as linhas recém-adicionadas.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "style: add cover picker styles"
```

---

### Task 4: Cover picker no modal de edição de formação

**Files:**
- Modify: `js/views/content-manager.js`

- [ ] **Step 1: Adicionar import de cover-service no topo**

Localiza a linha 1 de `js/views/content-manager.js`:
```js
import { icon }       from '../icons.js';
```

Substitui por:
```js
import { icon }       from '../icons.js';
import { COVER_ICONS, COVER_PALETTES, courseCoverSVG } from '../cover-service.js';
```

- [ ] **Step 2: Adicionar HTML do cover picker na modal**

Em `openCourseModal`, localiza:
```html
        <div id="c-error" class="form-error" style="display:none;margin-top:.5rem"></div>
```

Substitui por:
```html
        <div class="cover-picker">
          <label class="form-label">Capa</label>
          <div class="cover-picker-layout">
            <div class="cover-preview" id="c-cover-preview"></div>
            <div>
              <div style="font-size:11px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Ícone</div>
              <div class="cover-icon-grid" id="c-icon-grid"></div>
              <div style="font-size:11px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:10px;margin-bottom:6px">Cor</div>
              <div class="cover-palette-row" id="c-palette-row"></div>
            </div>
          </div>
        </div>
        <div id="c-error" class="form-error" style="display:none;margin-top:.5rem"></div>
```

- [ ] **Step 3: Adicionar lógica JS do picker após `document.getElementById('modal-save').addEventListener`**

Localiza imediatamente após `createOverlay(...)` e antes de `document.getElementById('modal-save').addEventListener`:

```js
  document.getElementById('modal-close').addEventListener('click', () => overlay.remove());
  document.getElementById('modal-cancel').addEventListener('click', () => overlay.remove());
```

Substitui estes dois addEventListener por:

```js
  document.getElementById('modal-close').addEventListener('click', () => overlay.remove());
  document.getElementById('modal-cancel').addEventListener('click', () => overlay.remove());

  // Cover picker
  let _selIcon = 0;
  let _selPal  = 0;

  if (course?.coverId) {
    const [k, p] = course.coverId.split('|');
    const ki = COVER_ICONS.findIndex(ic => ic.key === k);
    if (ki >= 0) _selIcon = ki;
    if (p !== undefined) _selPal = Math.min(parseInt(p, 10), COVER_PALETTES.length - 1);
  }

  function _refreshPreview() {
    const ic = COVER_ICONS[_selIcon];
    document.getElementById('c-cover-preview').innerHTML =
      courseCoverSVG('preview', '', `${ic.key}|${_selPal}`);
  }

  function _refreshIconGrid() {
    const grid = document.getElementById('c-icon-grid');
    grid.innerHTML = '';
    COVER_ICONS.forEach((ic, i) => {
      const div = document.createElement('div');
      div.className = 'cover-icon-opt' + (i === _selIcon ? ' active' : '');
      // use ic.key as uid so each SVG gradient id is unique within the grid
      div.innerHTML = courseCoverSVG(ic.key, '', `${ic.key}|${_selPal}`) +
        `<div class="cover-icon-label">${ic.label}</div>`;
      div.addEventListener('click', () => {
        _selIcon = i;
        grid.querySelectorAll('.cover-icon-opt').forEach(el => el.classList.remove('active'));
        div.classList.add('active');
        _refreshPreview();
      });
      grid.appendChild(div);
    });
  }

  function _refreshPaletteRow() {
    const row = document.getElementById('c-palette-row');
    row.innerHTML = '';
    COVER_PALETTES.forEach((pal, i) => {
      const sw = document.createElement('div');
      sw.className = 'cover-palette-swatch' + (i === _selPal ? ' active' : '');
      sw.title = pal.name;
      sw.style.background = `linear-gradient(135deg, ${pal.c1}, ${pal.c2})`;
      sw.addEventListener('click', () => {
        _selPal = i;
        row.querySelectorAll('.cover-palette-swatch').forEach(el => el.classList.remove('active'));
        sw.classList.add('active');
        _refreshIconGrid();
        _refreshPreview();
      });
      row.appendChild(sw);
    });
  }

  _refreshIconGrid();
  _refreshPaletteRow();
  _refreshPreview();
```

- [ ] **Step 4: Incluir `coverId` no objeto `data` ao guardar**

Localiza (linha ~231):
```js
    const data     = { title, subtitle, duration, category, passingScore: passing, dueDate, isRequired, targetRoles: [], targetDepartments, status, order: isEdit ? (course.order ?? 0) : _courses.length, ...auditFields };
```

Substitui por:
```js
    const coverId  = `${COVER_ICONS[_selIcon].key}|${_selPal}`;
    const data     = { title, subtitle, duration, category, passingScore: passing, dueDate, isRequired, targetRoles: [], targetDepartments, status, coverId, order: isEdit ? (course.order ?? 0) : _courses.length, ...auditFields };
```

- [ ] **Step 5: Verificar no browser**

1. Abre `http://localhost:8081`, vai à página de Gestão de Conteúdos
2. Clica em "Editar" numa formação — deve aparecer a secção "Capa" no modal com preview, grelha de ícones e swatches de cor
3. Seleciona um ícone e uma cor diferentes; o preview deve atualizar imediatamente
4. Clica "Guardar"
5. Volta ao dashboard — o card da formação deve mostrar a nova capa selecionada

- [ ] **Step 6: Commit**

```bash
git add js/views/content-manager.js
git commit -m "feat: add cover picker to course edit modal"
```
