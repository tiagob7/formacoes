# Cover Image Catalog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao picker de capa das formações um tab "Imagem" com um catálogo partilhado de imagens reutilizáveis, armazenadas no Firebase Storage e indexadas no Firestore.

**Architecture:** Um novo serviço `cover-image-service.js` gere toda a lógica do catálogo (compressão, upload, CRUD). O `firebase-service.js` fornece as primitivas de Storage e Firestore. O modal de formação em `content-manager.js` ganha tabs Ícone/Imagem. O `dashboard.js` passa a renderizar `<img>` quando `coverImageUrl` está definido.

**Tech Stack:** Firebase Storage (upload de imagens), Firestore (coleção `coverImages`), Canvas API (compressão no browser), JavaScript ES Modules, CSS nativo.

---

## File Map

| Ação | Ficheiro | Responsabilidade |
|------|---------|-----------------|
| Modify | `firestore.rules` | Adicionar regra para coleção `coverImages` |
| Modify | `js/firebase-service.js` | Adicionar imports e funções de Storage/Firestore para cover images |
| **Create** | `js/cover-image-service.js` | Lógica do catálogo: compressão, upload, delete, usedBy |
| Modify | `css/styles.css` | Estilos para tabs, grelha de imagens, progresso de upload |
| Modify | `js/views/dashboard.js` | Renderizar `<img>` quando `coverImageUrl` está definido |
| Modify | `js/views/content-manager.js` | Picker com tabs Ícone/Imagem e lógica de save atualizada |

---

## Task 1: Regra Firestore para `coverImages`

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Adicionar regra para a coleção `coverImages`**

Em `firestore.rules`, antes do fecho `}` final (linha 89), adicionar:

```
    match /coverImages/{imageId} {
      allow read: if signedIn();
      allow create, update, delete: if isContentManager();
    }
```

O ficheiro fica assim na zona relevante:

```
    match /certificados/{email}/{certId} {
      allow read: if signedIn() && (userEmail() == email || isAnyManager());
      allow create, update: if isContentManager();
      allow delete: if isAdmin();
    }

    match /coverImages/{imageId} {
      allow read: if signedIn();
      allow create, update, delete: if isContentManager();
    }
  }
}
```

- [ ] **Step 2: Verificar manualmente que o ficheiro não tem erros de sintaxe**

Abrir `firestore.rules` e confirmar que os `match` e `}` estão balanceados.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add coverImages Firestore rule"
```

---

## Task 2: Primitivas em `firebase-service.js`

**Files:**
- Modify: `js/firebase-service.js` (linhas 4–5 para imports; adicionar funções no final)

- [ ] **Step 1: Adicionar imports em falta**

Na linha 4 de `firebase-service.js`, substituir a linha de import do Firestore:

```js
import { getFirestore, doc, getDoc, setDoc, addDoc, query, collection, where, getDocs, orderBy, limit, startAfter, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
```

por:

```js
import { getFirestore, doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, query, collection, where, getDocs, orderBy, limit, startAfter, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
```

Na linha 5, substituir a linha de import do Storage:

```js
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
```

por:

```js
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
```

- [ ] **Step 2: Adicionar função `uploadImageFile` no final do ficheiro**

Após a última função exportada (linha ~616), adicionar:

```js
/* ------------------------------------------------------------------ */
/* Cover Image Storage                                                  */
/* ------------------------------------------------------------------ */

/**
 * Uploads an image blob to Firebase Storage.
 * Calls onProgress(pct 0-100) during upload.
 * Returns the public download URL.
 */
export function uploadImageFile(storagePath, blob, onProgress) {
  if (!isConfigured()) {
    return Promise.reject(new Error('Firebase não configurado.'));
  }
  init();
  return new Promise((resolve, reject) => {
    const storageRef = ref(_storage, storagePath);
    const task = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });
    task.on('state_changed',
      (snap) => onProgress && onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        try { resolve(await getDownloadURL(task.snapshot.ref)); }
        catch (e) { reject(e); }
      }
    );
  });
}

/**
 * Deletes a file from Firebase Storage by path.
 */
export async function deleteStorageFile(storagePath) {
  if (!isConfigured()) return;
  init();
  await deleteObject(ref(_storage, storagePath));
}

/* ------------------------------------------------------------------ */
/* Cover Image Firestore CRUD                                           */
/* ------------------------------------------------------------------ */

export async function getCoverImagesFromDB() {
  if (!isConfigured()) return [];
  init();
  const snap = await getDocs(query(collection(_db, 'coverImages'), orderBy('uploadedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function newCoverImageRef() {
  init();
  return doc(collection(_db, 'coverImages'));
}

export async function saveCoverImageDoc(docRef, data) {
  init();
  await setDoc(docRef, data);
}

export async function deleteCoverImageDoc(imageId) {
  init();
  await deleteDoc(doc(_db, 'coverImages', imageId));
}

export async function getCoverImageDoc(imageId) {
  init();
  const snap = await getDoc(doc(_db, 'coverImages', imageId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateCoverImageUsageInDB(imageId, courseId, used) {
  init();
  await updateDoc(doc(_db, 'coverImages', imageId), {
    usedBy: used ? arrayUnion(courseId) : arrayRemove(courseId),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add js/firebase-service.js
git commit -m "feat: add cover image Storage and Firestore primitives"
```

---

## Task 3: Criar `js/cover-image-service.js`

**Files:**
- Create: `js/cover-image-service.js`

- [ ] **Step 1: Criar o ficheiro com todas as funções do serviço**

```js
import {
  uploadImageFile,
  deleteStorageFile,
  getCoverImagesFromDB,
  newCoverImageRef,
  saveCoverImageDoc,
  deleteCoverImageDoc,
  getCoverImageDoc,
  updateCoverImageUsageInDB,
} from './firebase-service.js';

function compressImage(file, maxW = 800, maxH = 450, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const ratio = Math.min(maxW / width, maxH / height, 1);
      width  = Math.round(width  * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Falha na compressão da imagem')),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}

export async function getCoverImages() {
  return getCoverImagesFromDB();
}

export async function uploadCoverImage(file, uploaderEmail, onProgress) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Ficheiro demasiado grande (máx. 5 MB)');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Formato não suportado. Use JPG, PNG ou WebP');
  }

  const blob       = await compressImage(file);
  const docRef     = newCoverImageRef();
  const imageId    = docRef.id;
  const storagePath = `covers/${imageId}.jpg`;

  const url = await uploadImageFile(storagePath, blob, onProgress);

  const data = {
    url,
    storagePath,
    filename: file.name,
    uploadedBy: uploaderEmail,
    uploadedAt: new Date().toISOString(),
    usedBy: [],
  };
  await saveCoverImageDoc(docRef, data);
  return { id: imageId, ...data };
}

export async function deleteCoverImage(imageId) {
  const imgDoc = await getCoverImageDoc(imageId);
  if (!imgDoc) throw new Error('Imagem não encontrada');
  if (imgDoc.usedBy && imgDoc.usedBy.length > 0) {
    throw new Error(
      `Esta imagem está em uso por ${imgDoc.usedBy.length} formação(ões) e não pode ser apagada`
    );
  }
  await deleteStorageFile(imgDoc.storagePath);
  await deleteCoverImageDoc(imageId);
}

export async function setCoverImageUsage(imageId, courseId, used) {
  if (!imageId || !courseId) return;
  await updateCoverImageUsageInDB(imageId, courseId, used);
}
```

- [ ] **Step 2: Verificar que o ficheiro não tem erros de sintaxe abrindo-o no editor**

- [ ] **Step 3: Commit**

```bash
git add js/cover-image-service.js
git commit -m "feat: add cover-image-service with catalog CRUD and compression"
```

---

## Task 4: CSS — estilos para o picker de imagens

**Files:**
- Modify: `css/styles.css` (inserir após linha 548, depois de `.cover-palette-swatch.active`)

- [ ] **Step 1: Adicionar estilos após `.cover-palette-swatch.active { ... }` (linha 548)**

Inserir imediatamente a seguir:

```css
.cover-tabs { display: flex; gap: 4px; margin-bottom: 10px; }
.cover-tab {
  padding: 5px 14px; border-radius: 6px; border: 1.5px solid var(--line);
  background: var(--surface-1); color: var(--ink-2); font-size: 12px;
  font-weight: 600; cursor: pointer; transition: all .15s;
}
.cover-tab.active {
  background: var(--cyan); color: white; border-color: var(--cyan);
}
.cover-tab:not(.active):hover { border-color: var(--cyan); color: var(--cyan); }

.cover-image-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 4px;
}
.cover-image-opt {
  aspect-ratio: 16/9; border-radius: 6px; overflow: hidden; cursor: pointer;
  border: 2px solid transparent; transition: border-color .15s, transform .1s;
  position: relative; background: var(--surface-1);
}
.cover-image-opt:hover { transform: scale(1.04); }
.cover-image-opt.active { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(0,145,214,.2); }
.cover-image-opt img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-image-del {
  position: absolute; top: 4px; right: 4px;
  background: rgba(0,0,0,.55); border: none; border-radius: 4px;
  width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; opacity: 0; transition: opacity .15s;
}
.cover-image-opt:hover .cover-image-del { opacity: 1; }
.cover-image-del:hover { background: var(--red); }

.cover-upload-progress {
  height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; width: 100%;
}
.cover-upload-progress-bar {
  height: 100%; background: var(--cyan); border-radius: 3px;
  width: 0%; transition: width .2s;
}
.cover-image-empty {
  font-size: 13px; color: var(--ink-3); padding: 16px 0; text-align: center;
}
.cover-preview img { display: block; width: 100%; height: 100%; object-fit: cover; }
.cover-preview-placeholder {
  width: 100%; height: 100%; background: var(--surface-1);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-3); font-size: 11px;
}
```

- [ ] **Step 2: Commit**

```bash
git add css/styles.css
git commit -m "feat: add cover image tab CSS"
```

---

## Task 5: `dashboard.js` — renderizar `coverImageUrl`

**Files:**
- Modify: `js/views/dashboard.js` (linha 365)

- [ ] **Step 1: Atualizar a função `courseCard` para lidar com `coverImageUrl`**

Na linha 365, substituir:

```js
    <div class="course-cover">${courseCoverSVG(course.id, course.category, course.coverId)}<div class="course-category">${course.category}</div></div>
```

por:

```js
    <div class="course-cover">${
      course.coverImageUrl
        ? `<img src="${course.coverImageUrl.replace(/"/g, '&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">`
        : courseCoverSVG(course.id, course.category, course.coverId)
    }<div class="course-category">${course.category}</div></div>
```

- [ ] **Step 2: Commit**

```bash
git add js/views/dashboard.js
git commit -m "feat: render coverImageUrl in dashboard course cards"
```

---

## Task 6: `content-manager.js` — picker com tabs

**Files:**
- Modify: `js/views/content-manager.js`

Esta tarefa tem vários passos porque modifica a função `openCourseModal` de forma significativa.

- [ ] **Step 1: Adicionar imports no topo do ficheiro**

Na linha 1 de `content-manager.js`, adicionar a importação do serviço de imagens após os imports existentes:

```js
import { getCoverImages, uploadCoverImage, deleteCoverImage, setCoverImageUsage } from '../cover-image-service.js';
```

Após a linha:
```js
import { clearCoursesCache } from '../course-service.js';
```

- [ ] **Step 2: Substituir o bloco HTML do cover picker no modal**

Dentro de `openCourseModal`, localizar o bloco HTML do picker (que começa com `<div class="cover-picker">`):

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
```

Substituir por:

```html
        <div class="cover-picker">
          <label class="form-label">Capa</label>
          <div class="cover-picker-layout">
            <div class="cover-preview" id="c-cover-preview"></div>
            <div>
              <div class="cover-tabs" id="c-cover-tabs">
                <button class="cover-tab" data-tab="icon">Ícone</button>
                <button class="cover-tab" data-tab="image">Imagem</button>
              </div>
              <div id="c-tab-icon">
                <div style="font-size:11px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Ícone</div>
                <div class="cover-icon-grid" id="c-icon-grid"></div>
                <div style="font-size:11px;color:var(--ink-3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:10px;margin-bottom:6px">Cor</div>
                <div class="cover-palette-row" id="c-palette-row"></div>
              </div>
              <div id="c-tab-image" style="display:none"></div>
            </div>
          </div>
        </div>
```

- [ ] **Step 3: Atualizar as variáveis de estado do picker**

Localizar o bloco de variáveis após `document.getElementById('modal-cancel').addEventListener(...)`:

```js
  // Cover picker
  let _selIcon = 0;
  let _selPal  = 0;
  let _pickerDirty = false;
```

Substituir por:

```js
  // Cover picker state
  let _selIcon = 0;
  let _selPal  = 0;
  let _pickerDirty   = false;
  let _activeTab     = course?.coverImageUrl ? 'image' : 'icon';
  let _selImageId    = '';
  let _selImageUrl   = course?.coverImageUrl || '';
  let _origImageId   = '';
  let _imageTabLoaded = false;
```

- [ ] **Step 4: Substituir `_refreshPreview` por `_updatePreview`**

Localizar:

```js
  function _refreshPreview() {
    const ic = COVER_ICONS[_selIcon];
    document.getElementById('c-cover-preview').innerHTML =
      courseCoverSVG('preview', '', `${ic.key}|${_selPal}`);
  }
```

Substituir por:

```js
  function _updatePreview() {
    const prev = document.getElementById('c-cover-preview');
    if (_activeTab === 'image' && _selImageUrl) {
      prev.innerHTML = `<img src="${_selImageUrl.replace(/"/g,'&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    } else if (_activeTab === 'image') {
      prev.innerHTML = `<div class="cover-preview-placeholder">Sem imagem</div>`;
    } else {
      prev.innerHTML = courseCoverSVG('preview', '', `${COVER_ICONS[_selIcon].key}|${_selPal}`);
    }
  }
```

- [ ] **Step 5: Atualizar as referências a `_refreshPreview()` no código existente**

Há três chamadas a `_refreshPreview()`:
1. Dentro do event listener de clique em `.cover-icon-opt`
2. Dentro do event listener de clique em `.cover-palette-swatch`
3. A chamada final após `_refreshIconGrid(); _refreshPaletteRow();`

Substituir cada `_refreshPreview()` por `_updatePreview()`.

O bloco no final da configuração do picker fica:

```js
  _refreshIconGrid();
  _refreshPaletteRow();
  _updatePreview();
```

- [ ] **Step 6: Adicionar lógica de tabs após `_refreshPaletteRow()`**

Imediatamente após `_refreshPaletteRow();`, adicionar:

```js
  // ---- Tab switching ----
  function _activateTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.cover-tab').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.tab === tab)
    );
    document.getElementById('c-tab-icon').style.display  = tab === 'icon'  ? '' : 'none';
    document.getElementById('c-tab-image').style.display = tab === 'image' ? '' : 'none';
    if (tab === 'image' && !_imageTabLoaded) {
      _imageTabLoaded = true;
      _renderImageTab(document.getElementById('c-tab-image'));
    }
    _updatePreview();
  }

  document.getElementById('c-cover-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.cover-tab');
    if (btn) _activateTab(btn.dataset.tab);
  });

  _activateTab(_activeTab);
```

- [ ] **Step 7: Adicionar funções `_renderImageTab`, `_addImageThumb`, `_selectImage`**

Após o bloco de tab switching, adicionar as três funções:

```js
  // ---- Image tab ----
  function _selectImage(imageId, imageUrl) {
    _selImageId  = imageId;
    _selImageUrl = imageUrl;
    document.querySelectorAll('.cover-image-opt').forEach(el =>
      el.classList.toggle('active', el.dataset.imgId === imageId)
    );
    _updatePreview();
  }

  function _addImageThumb(grid, img) {
    const thumb = document.createElement('div');
    thumb.className = 'cover-image-opt' + (img.id === _selImageId ? ' active' : '');
    thumb.dataset.imgId  = img.id;
    thumb.dataset.imgUrl = img.url;
    thumb.innerHTML = `
      <img src="${escHtml(img.url)}" alt="${escHtml(img.filename || '')}" loading="lazy">
      <button class="cover-image-del" title="Apagar imagem" aria-label="Apagar imagem">${icon('trash', 10, 'white')}</button>`;

    thumb.addEventListener('click', (e) => {
      if (e.target.closest('.cover-image-del')) return;
      _selectImage(img.id, img.url);
    });

    thumb.querySelector('.cover-image-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await deleteCoverImage(img.id);
        if (_selImageId === img.id) {
          _selImageId  = '';
          _selImageUrl = '';
          _updatePreview();
        }
        thumb.remove();
        const g = document.getElementById('c-image-grid');
        if (g && g.children.length === 0) {
          g.replaceWith(
            Object.assign(document.createElement('div'), {
              className: 'cover-image-empty',
              textContent: 'Ainda sem imagens. Carregue a primeira!',
            })
          );
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    grid.appendChild(thumb);
  }

  async function _renderImageTab(container) {
    container.innerHTML = `<div class="admin-loading">${icon('spinner', 16)} A carregar...</div>`;
    let images;
    try {
      images = await getCoverImages();
    } catch {
      container.innerHTML = `<p style="color:var(--red);font-size:13px">Erro ao carregar imagens.</p>`;
      return;
    }

    // Resolve _origImageId from catalog
    if (_selImageUrl) {
      const match = images.find(i => i.url === _selImageUrl);
      if (match) { _selImageId = match.id; _origImageId = match.id; }
    }

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <button class="btn-sm" id="c-img-upload-btn">${icon('plus', 12)} Carregar imagem</button>
        <div id="c-img-progress" style="display:none;flex:1">
          <div class="cover-upload-progress">
            <div class="cover-upload-progress-bar" id="c-img-bar"></div>
          </div>
        </div>
      </div>
      ${images.length
        ? `<div class="cover-image-grid" id="c-image-grid"></div>`
        : `<div class="cover-image-empty" id="c-image-empty">Ainda sem imagens. Carregue a primeira!</div>`}
      <input type="file" id="c-img-input" accept="image/jpeg,image/png,image/webp" style="display:none">`;

    if (images.length) {
      const grid = container.querySelector('#c-image-grid');
      images.forEach(img => _addImageThumb(grid, img));
    }

    const uploadBtn = container.querySelector('#c-img-upload-btn');
    const fileInput = container.querySelector('#c-img-input');

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      uploadBtn.disabled = true;
      const progressDiv = container.querySelector('#c-img-progress');
      const bar         = container.querySelector('#c-img-bar');
      progressDiv.style.display = 'flex';

      try {
        const { user } = getState();
        const newImg = await uploadCoverImage(file, user?.email || '', (pct) => {
          bar.style.width = pct + '%';
        });

        let grid = container.querySelector('#c-image-grid');
        if (!grid) {
          container.querySelector('#c-image-empty')?.remove();
          grid = document.createElement('div');
          grid.className = 'cover-image-grid';
          grid.id = 'c-image-grid';
          container.querySelector('#c-img-upload-btn').closest('div').after(grid);
        }
        _addImageThumb(grid, newImg);
        _selectImage(newImg.id, newImg.url);
      } catch (err) {
        showToast('Erro ao carregar: ' + err.message, 'error');
      } finally {
        uploadBtn.disabled = false;
        progressDiv.style.display = 'none';
        bar.style.width = '0%';
        fileInput.value = '';
      }
    });
  }
```

- [ ] **Step 8: Atualizar o handler de `modal-save`**

Localizar o bloco de `modal-save` que actualmente tem:

```js
    const coverId  = (_pickerDirty || (isEdit && course?.coverId)) ? `${COVER_ICONS[_selIcon].key}|${_selPal}` : '';
    const data     = { title, subtitle, duration, category, passingScore: passing, dueDate, isRequired, targetRoles: [], targetDepartments, status, coverId, order: isEdit ? (course.order ?? 0) : _courses.length, ...auditFields };
```

Substituir por:

```js
    let coverId = '';
    let coverImageUrl = '';

    if (_activeTab === 'image') {
      if (!_selImageId) {
        errEl.textContent = 'Selecione uma imagem ou mude para o tab Ícone.';
        errEl.style.display = 'block';
        return;
      }
      coverImageUrl = _selImageUrl;
    } else {
      coverId = (_pickerDirty || (isEdit && course?.coverId)) ? `${COVER_ICONS[_selIcon].key}|${_selPal}` : '';
    }

    const data = { title, subtitle, duration, category, passingScore: passing, dueDate, isRequired, targetRoles: [], targetDepartments, status, coverId, coverImageUrl, order: isEdit ? (course.order ?? 0) : _courses.length, ...auditFields };
```

E, logo após `await saveCourse(courseId, data, user?.email, user?.role);`, adicionar a actualização de `usedBy`:

```js
      // Update coverImages usedBy tracking
      if (_activeTab === 'image') {
        await setCoverImageUsage(_selImageId, courseId, true);
        if (_origImageId && _origImageId !== _selImageId) {
          await setCoverImageUsage(_origImageId, courseId, false);
        }
      } else if (_origImageId) {
        await setCoverImageUsage(_origImageId, courseId, false);
      }
```

- [ ] **Step 9: Commit**

```bash
git add js/views/content-manager.js
git commit -m "feat: add image catalog tab to cover picker in content manager"
```

---

## Task 7: Verificação manual

- [ ] **Step 1: Abrir a aplicação no browser**

Navegar para a app em localhost (ou Firebase Hosting preview).

- [ ] **Step 2: Testar upload de imagem**

1. Fazer login como `administrador` ou `gestor_conteudos`
2. Ir a Gestão de Conteúdos → criar nova formação ou editar existente
3. No picker de capa, clicar no tab "Imagem"
4. Clicar em "+ Carregar imagem" e selecionar um ficheiro JPG/PNG
5. Confirmar que a barra de progresso aparece e o upload conclui
6. Confirmar que a imagem aparece na grelha e fica selecionada
7. Confirmar que o preview à esquerda mostra a imagem

- [ ] **Step 3: Testar selecção de imagem existente**

1. Fazer upload de 2 imagens
2. Clicar numa segunda imagem — confirmar que o anel de seleção muda e o preview atualiza

- [ ] **Step 4: Guardar e verificar no dashboard**

1. Guardar a formação com imagem selecionada
2. Ir ao Dashboard e confirmar que o card da formação mostra a imagem em vez do SVG

- [ ] **Step 5: Testar protecção de imagem em uso**

1. Tentar apagar a imagem que está associada à formação — confirmar que aparece um toast de erro
2. Editar a formação, mudar para o tab Ícone, guardar
3. Tentar apagar a imagem novamente — confirmar que agora funciona

- [ ] **Step 6: Testar tab Ícone ainda funciona**

1. Criar/editar formação sem imagem — confirmar que o tab Ícone funciona igual ao comportamento anterior

- [ ] **Step 7: Commit final (se não houver bugs)**

```bash
git add -A
git commit -m "feat: cover image catalog — verified and working"
```
