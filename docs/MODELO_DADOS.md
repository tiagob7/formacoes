# Modelo de Dados — Plataforma de Formações AlgarTempo

Stack: Firebase Firestore (NoSQL) + Firebase Storage (PDFs)

---

## Colecoes Firestore

### `employees/{email}`

Documento por colaborador, indexado pelo email em minusculas.

| Campo | Tipo | Descricao |
|---|---|---|
| `email` | string | Email do utilizador (igual ao ID do documento) |
| `nome` | string | Nome completo |
| `role` | string | `colaborador` / `gestor_conteudos` / `administrador` |
| `departamento` | string | Nome do departamento (opcional) |
| `ativo` | boolean | Conta ativa ou desativada |
| `criadoEm` | ISO string | Data de criacao do registo |
| `criadoPor` | string | Email do admin que criou (opcional) |
| `editadoPor` | string | Email do ultimo editor (opcional) |
| `editadoEm` | ISO string | Data da ultima edicao (opcional) |

#### Subcollection: `employees/{email}/progress/data`

Documento unico com todo o progresso do colaborador.

```
{
  "{courseId}": {
    "{moduleId}": {
      read: boolean,
      quizPassed: boolean,
      lastScore: number (0-100),
      bestScore: number (0-100),
      attempts: number,
      attemptHistory: [
        { date: ISO string, score: number, passed: boolean, correct: number, total: number }
      ]
    }
  }
}
```

---

### `courses/{courseId}`

Documento por formacao. O `courseId` e gerado automaticamente (slug + timestamp).

| Campo | Tipo | Descricao |
|---|---|---|
| `title` | string | Titulo da formacao |
| `subtitle` | string | Subtitulo (opcional) |
| `duration` | string | Texto de duracao, ex.: "2h 30min" |
| `category` | string | Categoria, ex.: "Conformidade" |
| `status` | string | `draft` / `published` / `archived` |
| `passingScore` | number | Nota minima de aprovacao (0-100) |
| `isRequired` | boolean | Formacao obrigatoria ou opcional |
| `dueDate` | string | Data limite no formato YYYY-MM-DD (opcional) |
| `targetRoles` | string[] | Roles a quem a formacao esta atribuida |
| `targetDepartments` | string[] | Departamentos alvo (opcional) |
| `order` | number | Ordem de apresentacao |
| `criadoPor` | string | Email do gestor que criou |
| `criadoEm` | ISO string | Data de criacao |
| `editadoPor` | string | Email do ultimo editor |
| `editadoEm` | ISO string | Data da ultima edicao |

#### Subcollection: `courses/{courseId}/modules/{moduleId}`

| Campo | Tipo | Descricao |
|---|---|---|
| `title` | string | Titulo do modulo |
| `duration` | string | Duracao estimada, ex.: "45 min" |
| `pages` | number | Numero de paginas (informativo) |
| `order` | number | Ordem de apresentacao dentro da formacao |
| `quiz` | object[] | Array de perguntas (ver abaixo) |
| `content` | object[] | Array de blocos de conteudo (ver abaixo) |
| `criadoPor` | string | Email do gestor que criou |
| `criadoEm` | ISO string | Data de criacao |
| `editadoPor` | string | Email do ultimo editor |
| `editadoEm` | ISO string | Data da ultima edicao |

**Estrutura de uma pergunta (`quiz[i]`):**

```json
{
  "type": "mc",
  "question": "Texto da pergunta",
  "options": ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
  "answer": 1,
  "explanation": "Explicacao mostrada quando o colaborador erra (opcional)"
}
```

```json
{
  "type": "tf",
  "question": "Afirmacao verdadeira ou falsa",
  "answer": true,
  "explanation": "..."
}
```

**Estrutura de um bloco de conteudo (`content[i]`):**

| `type` | Campos adicionais | Descricao |
|---|---|---|
| `h1` | `text` | Titulo principal |
| `lead` | `text` | Paragrafo de destaque |
| `h2` | `text` | Subtitulo de seccao |
| `p` | `text` | Paragrafo normal |
| `list` | `items: string[]` | Lista nao numerada |
| `callout` | `label`, `text` | Caixa de destaque / nota |

---

### `modules/{courseId_moduleId}`

Documento auxiliar que guarda o URL do PDF carregado para cada modulo.
O ID e a concatenacao `{courseId}_{moduleId}`.

| Campo | Tipo | Descricao |
|---|---|---|
| `pdfUrl` | string | URL publico do Firebase Storage |
| `updatedAt` | ISO string | Data do ultimo upload |

---

### `whitelist/{email}`

Lista de emails autorizados a registar conta na plataforma.

| Campo | Tipo | Descricao |
|---|---|---|
| `email` | string | Email (igual ao ID) |
| `nome` | string | Nome do colaborador |
| `departamento` | string | Departamento (opcional) |
| `registado` | boolean | Ja criou conta ou nao |
| `criadoEm` | ISO string | Data de adicao a whitelist |

---

### `departments/{deptId}`

Lista de departamentos geridos pelo admin. O ID e o slug do nome.

| Campo | Tipo | Descricao |
|---|---|---|
| `nome` | string | Nome do departamento |
| `criadoPor` | string | Email do admin que criou |
| `criadoEm` | ISO string | Data de criacao |

---

## Firebase Storage

Estrutura de paths dos PDFs:

```
pdfs/
  {courseId}/
    {moduleId}.pdf
```

---

## Regras de Seguranca Recomendadas (Firestore)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() { return request.auth != null; }
    function isAdmin() {
      return isAuth() && get(/databases/$(database)/documents/employees/$(request.auth.token.email)).data.role == 'administrador';
    }
    function isGestor() {
      return isAuth() && get(/databases/$(database)/documents/employees/$(request.auth.token.email)).data.role in ['administrador', 'gestor_conteudos'];
    }

    match /employees/{email} {
      allow read: if isAdmin();
      allow write: if isAdmin();
      match /progress/data {
        allow read, write: if isAuth() && request.auth.token.email == email;
        allow read: if isAdmin();
      }
    }

    match /courses/{courseId} {
      allow read: if isAuth();
      allow write: if isGestor();
      match /modules/{moduleId} {
        allow read: if isAuth();
        allow write: if isGestor();
      }
    }

    match /modules/{docId} {
      allow read: if isAuth();
      allow write: if isGestor();
    }

    match /whitelist/{email} {
      allow read, write: if isAdmin();
    }

    match /departments/{deptId} {
      allow read: if isAuth();
      allow write: if isAdmin();
    }
  }
}
```

---

## Notas

- O `email` e sempre normalizado para minusculas antes de ser usado como chave.
- O progresso e guardado num unico documento por colaborador (merge incremental) para minimizar leituras.
- O campo `content` do modulo e ignorado pelo visualizador quando existe `pdfUrl` — o PDF tem prioridade.
- A whitelist nao cria a conta automaticamente; serve apenas para validar quem pode registar-se.
