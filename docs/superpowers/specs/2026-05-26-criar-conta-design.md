# Design: Fluxo "Criar Conta" com validação por whitelist

**Data:** 2026-05-26
**Estado:** Aprovado

---

## Contexto

A plataforma já possui uma coleção `whitelist` no Firestore com os colaboradores autorizados a criar conta. Cada entrada contém: `email` (ID do documento), `nome`, `contribuinte` (NIF), `numero`, `departamento`, `registado` (bool). O campo `registado` está a `false` até o utilizador criar conta.

A página de login não tem atualmente qualquer forma de auto-registo. Este spec define a funcionalidade de criação de conta acessível diretamente na página de login.

---

## Objetivo

Permitir que colaboradores autorizados (presentes na whitelist) criem a sua própria conta introduzindo NIF + email, sem intervenção do administrador, com auto-login após registo bem sucedido.

---

## Fluxo de utilizador

### Ponto de entrada
- Na página de login, abaixo do botão "Entrar", existe um link/botão discreto: `Criar conta`
- Ao clicar, o cartão de login é substituído pelo cartão de registo com animação de transição (slide ou fade). O lado esquerdo da página mantém-se inalterado.

### Passo 1 — Verificação de identidade
Campos:
- **NIF** (input text, maxlength=9, placeholder: `ex.: 123456789`)
- **Email** (input email, placeholder: `ex.: nome@email.pt`)

Botão: `Verificar identidade →`
Link secundário: `← Já tenho conta` (volta ao cartão de login)

Validação ao submeter:
1. Lookup na whitelist pelo email (doc ID → O(1))
2. Verifica se o campo `contribuinte` corresponde ao NIF introduzido
3. Verifica se `registado === false`

Mensagens de erro (todas genéricas, sem revelar qual campo falhou):
- NIF/email não encontrados: `"Os dados introduzidos não correspondem a nenhum registo autorizado."`
- Já registado (`registado === true`): `"Esta conta já foi ativada. Utilize o login normal ou contacte o administrador."`

### Passo 2 — Definir palavra-passe
Mostrado apenas após validação bem sucedida no passo 1.

Estado visual: badge verde com `✓ [email] — identidade confirmada`
Indicador de passos: passo 1 marcado como concluído (✓ verde), passo 2 ativo.

Campos:
- **Nova palavra-passe** (input password, placeholder: `Mínimo 8 caracteres`)
- **Confirmar palavra-passe** (input password, placeholder: `Repita a palavra-passe`)

Validação do lado do cliente:
- Mínimo 8 caracteres
- As duas palavras-passe coincidem

Botão: `Criar conta e entrar →`
Link secundário: `← Recomeçar` (volta ao passo 1, limpa o estado)

### Após submissão bem sucedida
1. Chama `createEmployee(email, password, nome, 'colaborador', departamento)` — já existe em `firebase-service.js`
2. Marca `registado: true` na whitelist (novo helper `markWhitelistRegistered(email)`)
3. Regista evento de auditoria: `logAuditEvent('self_register', email, 'colaborador', email)`
4. Faz login automático via `loginEmployee(email, password)` e navega para `/dashboard`

---

## Componentes a criar/modificar

### `js/firebase-service.js`
- Nova função `checkWhitelistEntry(email, nif)` — lookup por email, verifica `contribuinte` e `registado`
- Nova função `markWhitelistRegistered(email)` — faz `setDoc` com `{ registado: true }`

### `js/views/login.js`
- Adicionar botão "Criar conta" abaixo do formulário de login
- Adicionar `renderRegisterStep1(container)` e `renderRegisterStep2(container, whitelistData)`
- Gerir transição entre: cartão-login → passo-1 → passo-2

---

## Segurança

- Os erros do passo 1 são sempre genéricos — não se revela se o email existe ou não na whitelist
- A criação da conta no Firebase Auth usa a instância secundária (`secondary-*`) já implementada em `createEmployee`, para não interferir com sessões de administrador
- O campo `registado: true` impede re-registo após conta criada
- Não é exposta qualquer informação da whitelist ao cliente além da confirmação de match

---

## Fora de âmbito

- Recuperação de palavra-passe (fluxo separado)
- Validação de formato do NIF (verificação do dígito de controlo)
- Envio de email de boas-vindas
