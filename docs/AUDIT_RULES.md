# Auditoria de Acesso - Regras Firebase Atualizadas

## Matriz de Acesso por Tipo de Utilizador

| Recurso | Colaborador | Gestor Conteúdos | Gestor Colaboradores | Administrador |
|---------|-------------|------------------|----------------------|---------------|
| **Formações** | ✅ Leitura | ✅ Leitura + Escrita | ✅ Leitura | ✅ Tudo |
| **Certificados** | ✅ Leitura (próprios) | ✅ Leitura | ✅ Leitura | ✅ Tudo |
| **Progresso Pessoal** | ✅ Leitura + Escrita | ✅ Leitura | ✅ Leitura | ✅ Tudo |
| **Conteúdo (Módulos)** | ✅ Leitura | ✅ Leitura + Escrita | ✅ Leitura | ✅ Tudo |
| **PDFs** | ✅ Leitura | ✅ Leitura + Upload | ✅ Leitura | ✅ Tudo |
| **Utilizadores** | ❌ | ❌ | ✅ Leitura + Gestão | ✅ Tudo |
| **Whitelist** | ❌ | ❌ | ✅ Gestão | ✅ Tudo |
| **Auditoria** | ❌ | ✅ Leitura | ✅ Leitura | ✅ Tudo |
| **Certificados (Admin)** | ❌ | ✅ Emissão | ❌ | ✅ Tudo |

## Roles Atualizados

```
- colaborador              → Acesso a formações, certificados, progresso pessoal
- gestor_conteudos        → Acesso a conteúdos, auditoria, emissão de certificados
- gestor_colaboradores    → Acesso a utilizadores, whitelist, auditoria
- administrador           → Acesso total
```

## Estrutura de Dados Necessária

### Nova: `auditoria/{timestamp}`

Log de ações de utilizadores (acesso, mudanças, criações).

```json
{
  "timestamp": 1779742800000,
  "userEmail": "utilizador@empresa.pt",
  "userRole": "gestor_conteudos",
  "acao": "upload_pdf",
  "recurso": "cursos/rgpd/modulos/m1",
  "descricao": "Upload de PDF - RGPD - Módulo 1",
  "resultado": "sucesso",
  "detalhes": {
    "fileName": "RGPD_M1.pdf",
    "fileSize": 2048576,
    "oldVersionUrl": "gs://..."
  }
}
```

### Atualizada: `employees/{email}`

```json
{
  "email": "colaborador@empresa.pt",
  "nome": "Nome Completo",
  "role": "colaborador",  // ou "gestor_conteudos", "gestor_colaboradores", "administrador"
  "departamento": "RH",
  "ativo": true,
  "criadoEm": "2026-05-25T00:00:00.000Z",
  "ultimoAcesso": "2026-05-26T10:30:00.000Z"
}
```

### Nova: `certificados/{email}/{certificadoId}`

Certificados emitidos.

```json
{
  "id": "cert_12345",
  "email": "colaborador@empresa.pt",
  "nome": "Nome Completo",
  "cursoId": "rgpd",
  "titulo": "Protecao de Dados e RGPD",
  "dataEmissao": "2026-05-26T00:00:00.000Z",
  "dataValidade": "2027-05-26T00:00:00.000Z",
  "score": 85,
  "emitidoPor": "gestor_conteudos@empresa.pt",
  "verificacao": "cert_verify_token_12345",
  "status": "ativo"
}
```

## Regras Firestore - VERSÃO ATUALIZADA

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

    function userRole() {
      return get(/databases/$(database)/documents/employees/$(userEmail())).data.role;
    }

    function isAdmin() {
      return signedIn() && userRole() == 'administrador';
    }

    function isContentManager() {
      return signedIn() && userRole() in ['gestor_conteudos', 'administrador'];
    }

    function isEmployeeManager() {
      return signedIn() && userRole() in ['gestor_colaboradores', 'administrador'];
    }

    function isAnyManager() {
      return signedIn() && userRole() in ['gestor_conteudos', 'gestor_colaboradores', 'administrador'];
    }

    // === EMPLOYEES ===
    match /employees/{email} {
      // Utilizador vê o próprio; qualquer gestor pode listar todos
      allow read: if signedIn() && (userEmail() == email || isAnyManager());
      
      // Gestores de colaboradores e admin podem criar/editar/deletar
      allow create, update, delete: if isEmployeeManager();

      // === PROGRESS ===
      match /progress/{document=**} {
        // Cada utilizador pode ler/escrever o seu próprio progresso
        allow read, write: if signedIn() && userEmail() == email;
        // Administrador tem acesso completo
        allow read: if isAdmin();
      }
    }

    // === COURSES ===
    match /courses/{courseId} {
      // Todos os utilizadores logados podem ler formações
      allow read: if signedIn();
      // Apenas gestores de conteúdo podem criar/editar/deletar
      allow create, update, delete: if isContentManager();

      // === MODULES ===
      match /modules/{moduleId} {
        allow read: if signedIn();
        allow create, update, delete: if isContentManager();
      }
    }

    // === MODULES (metadata) ===
    match /modules/{id} {
      allow read: if signedIn();
      allow create, update, delete: if isContentManager();
    }

    // === WHITELIST ===
    match /whitelist/{email} {
      // Gestores de colaboradores e administrador podem gerir
      allow read, create, update, delete: if isEmployeeManager();
    }

    // === AUDITORIA ===
    // CORRIGIDO: removida condição 'system' — role está no Firestore, não no token
    match /auditoria/{logId} {
      allow read: if isAnyManager();
      allow create: if isAnyManager();
      allow update, delete: if isAdmin();
    }

    // === CERTIFICADOS ===
    // CORRIGIDO: match unificado; gestor pode ver todos os certificados
    match /certificados/{email}/{certId} {
      allow read: if signedIn() && (userEmail() == email || isAnyManager());
      allow create, update: if isContentManager();
      allow delete: if isAdmin();
    }
  }
}
```

## Regras Storage - VERSÃO ATUALIZADA

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

    function userRole() {
      return firestore.get(/databases/(default)/documents/employees/$(userEmail())).data.role;
    }

    function isContentManager() {
      return signedIn() && userRole() in ['gestor_conteudos', 'administrador'];
    }

    // === PDFs ===
    match /pdfs/{courseId}/{moduleId}.pdf {
      // Todos podem ler
      allow read: if signedIn();
      // Gestores de conteúdo podem fazer upload
      allow write: if isContentManager()
        && request.resource.size < 50 * 1024 * 1024
        && request.resource.contentType == 'application/pdf';
    }

    // === CERTIFICADOS (PDFs) ===
    match /certificados/{email}/{certId}.pdf {
      // Utilizador pode ler os seus certificados
      allow read: if signedIn() && userEmail() == email;
      // Gestores de conteúdo podem criar
      allow write: if isContentManager()
        && request.resource.size < 10 * 1024 * 1024
        && request.resource.contentType == 'application/pdf';
    }
  }
}
```

## Implementação - Passos

### 1. Adicionar novo role a `employees` existentes

```bash
# Via console Firebase ou script administrativo
# Para cada "gestor de colaboradores", definir:
{
  "role": "gestor_colaboradores"
}
```

### 2. Atualizar Firestore Rules

1. Ir a Firebase Console → Firestore Database → Rules
2. Copiar o conteúdo da secção "Regras Firestore - VERSÃO ATUALIZADA"
3. Clicar "Publish"

### 3. Atualizar Storage Rules

1. Ir a Firebase Console → Storage → Rules
2. Copiar o conteúdo da secção "Regras Storage - VERSÃO ATUALIZADA"
3. Clicar "Publish"

### 4. Criar colecção de Auditoria (opcional - podem usar triggers)

```javascript
// Cloud Function para auto-log de auditoria
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.auditLog = functions.firestore
  .document('employees/{email}/progress/{progressId}')
  .onWrite(async (change, context) => {
    const db = admin.firestore();
    const userEmail = context.params.email;
    
    await db.collection('auditoria').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userEmail: userEmail,
      acao: 'atualizacao_progresso',
      recurso: context.params.progressId,
      resultado: 'sucesso'
    });
  });
```

## Verificação de Acesso

Para testar as regras, use o **Firestore Security Rules Simulator**:

1. Firebase Console → Firestore → Rules
2. Clicar "Rules Playground"
3. Selecionar a colecção e documento
4. Definir utilizador (email) e testar read/write

**Casos de teste:**
- ✅ Colaborador lê formações
- ✅ Colaborador não consegue editar formações
- ✅ Gestor conteúdos pode fazer upload PDFs
- ✅ Gestor colaboradores pode ler/editar whitelist
- ✅ Administrador consegue tudo
- ❌ Colaborador não consegue ler whitelist
