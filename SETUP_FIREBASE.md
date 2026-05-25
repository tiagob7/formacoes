# Setup Firebase - Formações AlgarTempo

## 1. Ativar Serviços no Firebase Console

### 🔐 Authentication
1. Vai a: **Authentication** → **Sign-in method**
2. Clica em **Email/Password**
3. Ativa "**Email/Password**" e "**Enable email enumeration protection**"
4. Salva

### 🗄️ Firestore Database
1. Vai a: **Firestore Database**
2. Clica em **Create Database**
3. Escolhe: **Production mode**
4. Região: **europe-west1** (Portugal)
5. Cria

### 📦 Storage
1. Vai a: **Storage**
2. Clica em **Get started**
3. Region: **europe-west1**
4. Cria

---

## 2. Criar Conta de Admin

Como o frontend não tem acesso ao Firebase Admin SDK, precisas de criar a conta manualmente:

### Via Firebase Console (Recomendado)
1. Vai a: **Authentication** → **Users**
2. Clica em **Add user**
3. Email: `tiago.bandeira@algartempo.pt`
4. Password: `tomas7`
5. Clica em **Create user**

### Depois, Criar Documento no Firestore
1. Vai a: **Firestore Database** → **Coleção** → **+ Create collection**
2. ID: `employees`
3. First document ID: `tiago.bandeira@algartempo.pt`
4. Adiciona estes campos:
   ```
   - email: "tiago.bandeira@algartempo.pt"
   - nome: "Tiago Bandeira"
   - role: "administrador"
   - ativo: true
   - criadoEm: (auto - timestamp atual)
   ```
5. Salva

---

## 3. Configurar Firestore Security Rules

Vai a: **Firestore Database** → **Rules** e cola isto:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Employees collection - user data + progress
    match /employees/{email} {
      allow read: if request.auth != null && (
        request.auth.token.email == email ||
        getRole(request.auth.token.email) in ['administrador']
      );
      allow write: if request.auth != null && getRole(request.auth.token.email) == 'administrador';
      
      match /progress/{document=**} {
        allow read, write: if request.auth != null && request.auth.token.email == email;
      }
    }
    
    // Modules collection - readable by all authenticated users
    match /modules/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && getRole(request.auth.token.email) in ['gestor_conteudos', 'administrador'];
    }
  }
  
  function getRole(email) {
    return get(/databases/$(database)/documents/employees/$(email)).data.role;
  }
}
```

---

## 4. Configurar Storage Rules

Vai a: **Storage** → **Rules** e cola isto:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /pdfs/{courseId}/{moduleId}.pdf {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        getRole(request.auth.token.email) in ['gestor_conteudos', 'administrador'];
    }
  }
  
  function getRole(email) {
    return firestore.get(/databases/(default)/documents/employees/$(email)).data.role;
  }
}
```

---

## 5. Adicionar Mais Colaboradores

Depois de tudo configurado, para adicionar novos colaboradores:

1. **Criar auth user** em Authentication → Users
2. **Criar documento Firestore** em `employees/{email}` com:
   - `email`: o email deles
   - `nome`: nome completo
   - `role`: `"colaborador"`, `"gestor_conteudos"` ou `"administrador"`
   - `ativo`: `true` ou `false`
   - `criadoEm`: timestamp (auto)

---

## 6. Roles e Permissões

| Funcionalidade | Colaborador | Gestor Conteúdos | Administrador |
|---|:---:|:---:|:---:|
| Fazer login | ✅ | ✅ | ✅ |
| Ver formações | ✅ | ✅ | ✅ |
| Fazer quizzes | ✅ | ✅ | ✅ |
| Ver seu progresso | ✅ | ✅ | ✅ |
| Upload de PDFs | ❌ | ✅ | ✅ |
| Criar/editar conteúdo | ❌ | ✅ | ✅ |
| Gerir utilizadores | ❌ | ❌ | ✅ |
| Ver progresso global | ❌ | ❌ | ✅ |

---

## 🎯 Próximas Fases

**Fase 2 (Auto-registo com whitelist):**
- Importar Excel com funcionários
- Implementar registo automático com validação de email
- Atribuir role padrão (colaborador) automaticamente

**Phase 3 (Dashboard de Admin):**
- Gerir utilizadores (criar, editar, desativar)
- Ver progresso global de todos os colaboradores
- Gerar relatórios de conclusão
