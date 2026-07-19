---
name: folder-cleanup
description: Reorganização da raiz do projeto — mover docs para docs/, utilitários para tools/, apagar ficheiros gerados
metadata:
  type: project
---

# Folder Cleanup Design

## Objetivo

Limpar a raiz do projeto movendo ficheiros de documentação e ferramentas utilitárias para pastas adequadas, e apagar ficheiros gerados/logs desnecessários.

## Alterações

### Mover para `docs/`
- `AUDIT_LOG.md`
- `AUDIT_RULES.md`
- `CHANGELOG.md`
- `CONTENT_PROGRESS.md`
- `EXPORT_INSTRUCTIONS.md`
- `FIREBASE_RULES_COPY.txt`
- `MATRIZ_ACESSO.txt`
- `MODELO_DADOS.md`
- `ROADMAP_MELHORIAS.md`
- `SETUP_FIREBASE.md`

### Criar `tools/` e mover para lá
- `export-to-word.js`
- `export-tool.html`
- `seed-data.js`
- `seed.html`

### Apagar
- `formacoes-export.docx`
- `server.log`
- `C:tempserver.log`

### Ficam na raiz (inalterado)
- `index.html`, `firebase.json`, `firestore.rules`, `package.json`, `package-lock.json`
- Pastas: `js/`, `css/`, `assets/`, `docs/`, `functions/`, `node_modules/`
