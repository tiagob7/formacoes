# Cache de Estado — Redução de Reads Firebase

**Data:** 2026-05-27  
**Estado:** Aprovado

---

## Problema

Três funções do `firebase-service.js` fazem um `getDocs`/`getDoc` ao Firestore em cada navegação:

- `getEmployees()` — chamada em cada visita a `/utilizadores` e `/administration`
- `getAuditLog()` — chamada em cada visita a `/auditoria`
- `getModulePdfUrl(courseId, moduleId)` — chamada por cada módulo visitado

Como há um único administrador de cada vez, os dados entre duas navegações consecutivas são invariavelmente idênticos. Todos estes reads são desnecessários.

---

## Solução

Cache em memória com invalidação-na-escrita. Os dados são guardados na primeira leitura e reutilizados nas seguintes. Quando o administrador faz uma operação de escrita (criar/editar/apagar colaborador, fazer upload de PDF, registar evento de auditoria), o cache da chave afetada é limpo — a próxima leitura vai ao Firestore e repopula.

---

## Arquitectura

### Novo módulo `js/cache.js`

Store simples em memória: um `Map` de `chave → { data, fetchedAt }`. Sem TTL — os dados vivem até ser explicitamente invalidados ou até o utilizador fechar o tab.

```js
// API pública
cache.get(key)         // → data | null
cache.set(key, data)   // guarda data para key
cache.invalidate(key)  // remove entrada
cache.invalidateAll()  // limpa todo o store (usado no logout)
```

### Modificações em `firebase-service.js`

**Leituras com cache:**

| Função | Chave | Comportamento |
|---|---|---|
| `getEmployees()` | `'employees'` | Retorna cache se existir; caso contrário faz `getDocs` e popula cache |
| `getAuditLog(maxEntries)` | `'audit'` | Retorna cache se existir; caso contrário faz `getDocs` e popula cache |
| `getModulePdfUrl(courseId, moduleId)` | `'pdf:${courseId}_${moduleId}'` | Retorna cache se existir; caso contrário faz `getDoc` e popula cache |

**Escritas que invalidam cache:**

| Função | Invalida |
|---|---|
| `createEmployee` | `'employees'` |
| `updateEmployee` | `'employees'` |
| `deleteEmployee` | `'employees'` |
| `importEmployees` | `'employees'` |
| `logAuditEvent` | `'audit'` |
| `uploadModulePDF` | `'pdf:${courseId}_${moduleId}'` |

**Logout:**

`signOutEmployee()` chama `cache.invalidateAll()` para garantir que uma sessão nova não herda dados de uma sessão anterior.

---

## Fora de âmbito

- `course-service.js` — já tem o seu próprio `coursesCache` módulo-level; não é tocado
- `state.progress` — já é mantido em estado local e sincronizado por mutação; não precisa de cache
- Nenhuma view precisa de alterações — o cache é transparente nas funções do `firebase-service.js`
- TTL automático — não implementado; invalidação-na-escrita é suficiente para uso single-admin

---

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `js/cache.js` | Criar — módulo de cache em memória |
| `js/firebase-service.js` | Importar cache; envolver leituras; invalidar em escritas e logout |
