# Design: Catálogo de Imagens para Capas de Formações

**Data:** 2026-05-30
**Estado:** Aprovado

## Resumo

Adicionar ao picker de capa das formações um tab "Imagem" com um catálogo partilhado de imagens reutilizáveis entre formações. As imagens são comprimidas no browser, guardadas no Firebase Storage e referenciadas via Firestore. O tab "Ícone" existente mantém-se intacto.

---

## Modelo de dados

### Nova coleção Firestore: `coverImages`

Cada documento tem ID gerado automaticamente pelo Firestore:

```json
{
  "url": "https://firebasestorage.googleapis.com/.../covers/{imageId}.jpg",
  "storagePath": "covers/{imageId}.jpg",
  "filename": "nome-original-do-ficheiro.jpg",
  "uploadedBy": "admin@empresa.com",
  "uploadedAt": "2026-05-30T10:00:00Z",
  "usedBy": ["curso-id-1", "curso-id-2"]
}
```

- `usedBy` é um array com os IDs das formações que referenciam esta imagem
- Usado para verificar se uma imagem pode ser apagada

### Alterações ao documento `courses/{id}`

Novo campo opcional `coverImageUrl` (string, URL de download do Storage).

Lógica de precedência ao renderizar a capa:
1. Se `coverImageUrl` está preenchido → renderiza a imagem
2. Caso contrário → usa `coverId` como antes (compatibilidade total com formações existentes)

Ambos os campos podem coexistir no documento, mas apenas um é usado de cada vez. Ao guardar, o campo inativo é explicitamente limpo (`""`).

### Firebase Storage

Ficheiros em `covers/{imageId}.jpg` onde `imageId` é o ID do documento Firestore correspondente.

---

## UI/UX

### Picker de capa no modal de formação

O bloco "Capa" passa a ter dois tabs clicáveis:

```
[ Ícone ]  [ Imagem ]
```

O tab ativo ao abrir o modal é determinado pelo estado atual da formação:
- Se a formação tem `coverImageUrl` → abre no tab "Imagem"
- Caso contrário → abre no tab "Ícone"

### Tab "Ícone"

Comportamento exatamente igual ao atual: grelha de ícones SVG + paleta de cores. Sem alterações.

### Tab "Imagem"

Estrutura do tab:
1. **Botão "＋ Carregar imagem"** no topo
   - Abre o seletor de ficheiros (aceita `.jpg`, `.jpeg`, `.png`, `.webp`)
   - Comprime no browser: max 800×450px, qualidade JPEG 85%
   - Mostra barra de progresso inline durante o upload
   - Após upload: nova imagem aparece na grelha e fica selecionada automaticamente
2. **Grelha de miniaturas** (~4 colunas)
   - Cada miniatura tem aspect ratio 16:9 com `object-fit: cover`
   - Canto superior direito: botão de lixo
     - Se `usedBy.length > 0` → toast "Esta imagem está em uso por N formação(ões) e não pode ser apagada"
     - Se `usedBy` vazio → diálogo de confirmação → apaga do Storage e do Firestore
   - Miniatura selecionada tem anel de destaque (mesmo estilo visual dos ícones ativos)
   - Estado vazio: mensagem "Ainda sem imagens. Carregue a primeira!" + botão de upload

### Preview

O painel `.cover-preview` à esquerda do picker continua a funcionar:
- Tab ícone ativo → mostra SVG gerado pelo `courseCoverSVG` (comportamento atual)
- Tab imagem ativo com imagem selecionada → mostra `<img>` com `object-fit: cover`
- Tab imagem ativo sem seleção → mostra placeholder cinzento

### Guardar a formação

Lógica no handler do botão "Guardar"/"Criar":

| Tab ativo | Imagem selecionada | Resultado |
|-----------|-------------------|-----------|
| Ícone | — | Guarda `coverId`, limpa `coverImageUrl` a `""`, chama `setCoverImageUsage(oldImageId, courseId, false)` se havia imagem anterior |
| Imagem | Sim | Guarda `coverImageUrl`, limpa `coverId` a `""`, chama `setCoverImageUsage(newImageId, courseId, true)` e `setCoverImageUsage(oldImageId, courseId, false)` se mudou de imagem |
| Imagem | Não | Não guarda — mostra erro inline "Selecione uma imagem ou mude para o tab Ícone" |

**Nota — criação de nova formação com imagem:** O `courseId` só é gerado no momento de guardar. Por isso, `setCoverImageUsage` é chamado após `saveCourse` retornar com sucesso, passando o `courseId` recém-criado.

---

## Novos ficheiros e alterações

### Novo: `js/cover-image-service.js`

Funções exportadas:

```js
getCoverImages()
// Retorna array de { id, url, storagePath, filename, uploadedBy, uploadedAt, usedBy }
// Query: collection('coverImages'), orderBy('uploadedAt', 'desc')

uploadCoverImage(file, uploaderEmail)
// 1. Comprime com compressImage()
// 2. Cria doc no Firestore (sem url ainda) para obter o imageId
// 3. Faz upload ao Storage em covers/{imageId}.jpg com onProgress callback
// 4. Atualiza o doc Firestore com { url, storagePath }
// 5. Retorna o documento completo

deleteCoverImage(imageId)
// Verifica usedBy — se não vazio, lança erro
// Apaga do Storage: covers/{imageId}.jpg
// Apaga o documento Firestore

setCoverImageUsage(imageId, courseId, used)
// used=true  → adiciona courseId ao array usedBy (arrayUnion)
// used=false → remove courseId do array usedBy (arrayRemove)

// Interna:
compressImage(file, maxW = 800, maxH = 450, quality = 0.85)
// Usa Canvas API para redimensionar mantendo aspect ratio
// Retorna Blob JPEG
```

### Alterações: `js/firebase-service.js`

Adicionar função genérica de upload de imagem:

```js
export function uploadImageFile(storagePath, blob, onProgress)
// Semelhante a uploadModulePDF mas para imagens (contentType: 'image/jpeg')
// Retorna Promise<downloadURL>
```

### Alterações: `js/views/content-manager.js`

- Importar funções de `cover-image-service.js`
- Substituir o bloco HTML do cover picker por versão com tabs
- Nova função `renderImageTab(container, currentUrl, courseId)` — constrói grelha assíncrona
- Nova função `renderIconTab(container)` — extrai lógica atual dos ícones
- Lógica do `modal-save` atualizada para verificar tab ativo e gerir `usedBy`

### Alterações: `js/cover-service.js`

Sem alterações. A função `courseCoverSVG` mantém-se intacta.

### Alterações: `firestore.rules`

Nova regra para a coleção `coverImages`:

```
match /coverImages/{imageId} {
  allow read: if true;
  allow write: if request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
       in ['administrador', 'gestor_conteudos'];
}
```

### Alterações: `css/styles.css`

Novos seletores:
- `.cover-tabs`, `.cover-tab`, `.cover-tab.active` — tabs do picker
- `.cover-image-grid` — grelha de miniaturas
- `.cover-image-opt` — miniatura individual (aspect ratio 16:9)
- `.cover-image-opt.active` — estado selecionado (anel)
- `.cover-image-del` — botão de lixo sobreposto
- `.cover-upload-progress` — barra de progresso inline
- `.cover-image-empty` — estado vazio da grelha

---

## Restrições e considerações

- **Tamanho máximo de upload:** 5MB no ficheiro original (antes de compressão). Validar no cliente antes de comprimir.
- **Formatos aceites:** JPG, JPEG, PNG, WebP. Validar por MIME type, não só por extensão.
- **Permissões:** Apenas `administrador` e `gestor_conteudos` veem o picker de imagens e podem fazer upload/delete. Utilizadores normais apenas leem a URL da capa.
- **Storage rules:** `covers/` — leitura pública, escrita apenas autenticada com papel correto.
- **Compatibilidade:** Formações sem `coverImageUrl` continuam a funcionar exatamente como antes.
