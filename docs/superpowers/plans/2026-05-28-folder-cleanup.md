# Folder Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limpar a raiz do projeto movendo documentação para `docs/`, ferramentas utilitárias para `tools/`, e apagando ficheiros gerados/logs.

**Architecture:** Operações puras de sistema de ficheiros — mover e apagar. Não há código de aplicação a alterar. O git rastreia os moves como `git mv` para preservar histórico.

**Tech Stack:** Git (bash/PowerShell)

---

### Task 1: Mover ficheiros de documentação para `docs/`

**Files:**
- Move: `AUDIT_LOG.md` → `docs/AUDIT_LOG.md`
- Move: `AUDIT_RULES.md` → `docs/AUDIT_RULES.md`
- Move: `CHANGELOG.md` → `docs/CHANGELOG.md`
- Move: `CONTENT_PROGRESS.md` → `docs/CONTENT_PROGRESS.md`
- Move: `EXPORT_INSTRUCTIONS.md` → `docs/EXPORT_INSTRUCTIONS.md`
- Move: `FIREBASE_RULES_COPY.txt` → `docs/FIREBASE_RULES_COPY.txt`
- Move: `MATRIZ_ACESSO.txt` → `docs/MATRIZ_ACESSO.txt`
- Move: `MODELO_DADOS.md` → `docs/MODELO_DADOS.md`
- Move: `ROADMAP_MELHORIAS.md` → `docs/ROADMAP_MELHORIAS.md`
- Move: `SETUP_FIREBASE.md` → `docs/SETUP_FIREBASE.md`

- [ ] **Step 1: Mover os ficheiros com git mv**

```bash
git mv AUDIT_LOG.md docs/AUDIT_LOG.md
git mv AUDIT_RULES.md docs/AUDIT_RULES.md
git mv CHANGELOG.md docs/CHANGELOG.md
git mv CONTENT_PROGRESS.md docs/CONTENT_PROGRESS.md
git mv EXPORT_INSTRUCTIONS.md docs/EXPORT_INSTRUCTIONS.md
git mv FIREBASE_RULES_COPY.txt docs/FIREBASE_RULES_COPY.txt
git mv MATRIZ_ACESSO.txt docs/MATRIZ_ACESSO.txt
git mv MODELO_DADOS.md docs/MODELO_DADOS.md
git mv ROADMAP_MELHORIAS.md docs/ROADMAP_MELHORIAS.md
git mv SETUP_FIREBASE.md docs/SETUP_FIREBASE.md
```

- [ ] **Step 2: Verificar que os moves foram registados**

```bash
git status
```

Expected: 10 entradas `renamed: XXXX.md -> docs/XXXX.md`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: move documentation files to docs/"
```

---

### Task 2: Criar `tools/` e mover utilitários

**Files:**
- Create dir: `tools/`
- Move: `export-to-word.js` → `tools/export-to-word.js`
- Move: `export-tool.html` → `tools/export-tool.html`
- Move: `seed-data.js` → `tools/seed-data.js`
- Move: `seed.html` → `tools/seed.html`

- [ ] **Step 1: Criar a pasta tools/ e mover os ficheiros**

```bash
mkdir tools
git mv export-to-word.js tools/export-to-word.js
git mv export-tool.html tools/export-tool.html
git mv seed-data.js tools/seed-data.js
git mv seed.html tools/seed.html
```

- [ ] **Step 2: Verificar os moves**

```bash
git status
```

Expected: 4 entradas `renamed: XXXX -> tools/XXXX`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: move utility tools to tools/"
```

---

### Task 3: Apagar ficheiros gerados e logs

**Files:**
- Delete: `formacoes-export.docx`
- Delete: `server.log`
- Delete: `C:tempserver.log` (ficheiro com caminho corrompido)

- [ ] **Step 1: Apagar os ficheiros**

```bash
git rm --force "formacoes-export.docx"
git rm --force "server.log"
git rm --force "C:tempserver.log" 2>/dev/null || rm -f "C:tempserver.log"
```

> Nota: `C:tempserver.log` é um ficheiro untracked com nome corrompido — se não estiver no git, usar `rm` diretamente.

- [ ] **Step 2: Verificar que foram removidos**

```bash
git status
ls *.log *.docx 2>/dev/null && echo "AINDA EXISTEM" || echo "OK - apagados"
```

Expected: nenhum `.log` ou `.docx` na raiz.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete generated files and logs from root"
```
