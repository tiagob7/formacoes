# Setup Firebase - Plataforma de Formacoes

Este guia descreve a configuracao Firebase usada pela plataforma atual.

## Servicos Necessarios

Ativar no Firebase Console:

- Authentication: Email/Password
- Firestore Database
- Storage

Regiao recomendada: `europe-west1`.

## Estrutura de Dados

### `employees/{email}`

Dados do colaborador.

```json
{
  "email": "colaborador@empresa.pt",
  "nome": "Nome Completo",
  "role": "colaborador",
  "departamento": "RH",
  "ativo": true,
  "criadoEm": "2026-05-25T00:00:00.000Z"
}
```

Roles suportadas:

- `colaborador`
- `gestor_conteudos`
- `administrador`

### `employees/{email}/progress/data`

Progresso do colaborador.

```json
{
  "rgpd": {
    "m1": {
      "read": true,
      "quizPassed": true,
      "lastScore": 80,
      "bestScore": 80,
      "attempts": 1,
      "lastAttemptAt": 1779742800000,
      "completedAt": 1779742800000,
      "attemptHistory": [
        {
          "attempt": 1,
          "score": 80,
          "correct": 4,
          "total": 5,
          "passed": true,
          "submittedAt": 1779742800000
        }
      ]
    }
  }
}
```

### `courses/{courseId}`

Dados principais da formacao.

```json
{
  "title": "Protecao de Dados e RGPD",
  "subtitle": "Conformidade e boas praticas",
  "duration": "2h 30min",
  "category": "Conformidade",
  "passingScore": 60,
  "dueDate": "2026-06-30",
  "isRequired": true,
  "targetRoles": ["colaborador"],
  "targetDepartments": ["RH", "Operacoes"],
  "order": 0
}
```

### `courses/{courseId}/modules/{moduleId}`

Modulo da formacao.

```json
{
  "title": "Introducao ao RGPD",
  "duration": "45 min",
  "pages": 12,
  "order": 0,
  "content": [],
  "quiz": [
    {
      "type": "mc",
      "question": "Pergunta?",
      "options": ["A", "B", "C", "D"],
      "answer": 0
    }
  ]
}
```

### `modules/{courseId_moduleId}`

Metadados do PDF do modulo.

```json
{
  "pdfUrl": "https://...",
  "updatedAt": "2026-05-25T00:00:00.000Z"
}
```

### `whitelist/{email}`

Entradas autorizadas para registo/importacao.

```json
{
  "email": "colaborador@empresa.pt",
  "nome": "Nome Completo",
  "departamento": "RH",
  "registado": false,
  "criadoEm": "2026-05-25T00:00:00.000Z"
}
```

## Regras Firestore Recomendadas

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null && request.auth.token.email != null;
    }

    function userEmail() {
      return request.auth.token.email;
    }

    function role() {
      return get(/databases/$(database)/documents/employees/$(userEmail())).data.role;
    }

    function isAdmin() {
      return signedIn() && role() == 'administrador';
    }

    function isContentManager() {
      return signedIn() && role() in ['gestor_conteudos', 'administrador'];
    }

    match /employees/{email} {
      allow read: if signedIn() && (userEmail() == email || isAdmin());
      allow create, update, delete: if isAdmin();

      match /progress/{document=**} {
        allow read, write: if signedIn() && userEmail() == email;
        allow read: if isAdmin();
      }
    }

    match /courses/{courseId} {
      allow read: if signedIn();
      allow create, update, delete: if isContentManager();

      match /modules/{moduleId} {
        allow read: if signedIn();
        allow create, update, delete: if isContentManager();
      }
    }

    match /modules/{id} {
      allow read: if signedIn();
      allow create, update, delete: if isContentManager();
    }

    match /whitelist/{email} {
      allow read, create, update, delete: if isAdmin();
    }
  }
}
```

## Regras Storage Recomendadas

```firestore
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function signedIn() {
      return request.auth != null && request.auth.token.email != null;
    }

    function userEmail() {
      return request.auth.token.email;
    }

    function role() {
      return firestore.get(/databases/(default)/documents/employees/$(userEmail())).data.role;
    }

    function isContentManager() {
      return signedIn() && role() in ['gestor_conteudos', 'administrador'];
    }

    match /pdfs/{courseId}/{moduleId}.pdf {
      allow read: if signedIn();
      allow write: if isContentManager()
        && request.resource.size < 50 * 1024 * 1024
        && request.resource.contentType == 'application/pdf';
    }
  }
}
```

## Criar Primeiro Administrador

1. Criar utilizador em Authentication com email/password.
2. Criar documento `employees/{email}` no Firestore:

```json
{
  "email": "admin@empresa.pt",
  "nome": "Administrador",
  "role": "administrador",
  "ativo": true,
  "criadoEm": "2026-05-25T00:00:00.000Z"
}
```

## Notas de Operacao

- O frontend tem fallback para cursos locais se Firestore nao tiver cursos.
- O progresso so deve ser escrito pelo proprio colaborador.
- Gestores de conteudos podem criar/editar formacoes, modulos e PDFs.
- Apenas administradores devem gerir utilizadores e whitelist.
