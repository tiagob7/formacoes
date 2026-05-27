# Plataforma Formações AlgarTempo — Registo de Alterações

## Estado actual

**Versão:** 1.0.0  
**Data:** 2026-05-25  
**Stack:** HTML + CSS + Vanilla JS (ES Modules) · Firebase v10 (CDN) · sem build step

---

## Funcionalidades implementadas

### Autenticação
- [x] Ecrã de login com nome completo + número de colaborador
- [x] Sessão persistida em `sessionStorage` (sobrevive a refresh)
- [x] Integração Firebase Anonymous Auth (com fallback `localStorage` enquanto config não está preenchida)
- [x] Logout com limpeza de sessão

### Dashboard
- [x] Saudação personalizada com primeiro nome
- [x] Banner "Continue onde parou" — detecta formação em curso e navega directamente
- [x] KPI: Progresso global (%)
- [x] KPI: Módulos completos (N/total) + contagem de formações concluídas
- [x] Grelha de cartões de formação (3 formações de exemplo)
- [x] Cartão mostra: categoria, título, subtítulo, duração, nº de módulos, barra de progresso, estado (Não iniciada / Em curso / Concluída)
- [x] CTA dinâmico por cartão: "Começar" / "Continuar" / "Rever"
- [x] Prazos opcionais por formação, com destaque de formações atrasadas ou próximas do fim
- [x] Distinção entre formações obrigatórias e opcionais no gestor, dashboard e detalhe
- [x] Catálogo do dashboard separado entre formações atribuídas e catálogo opcional
- [x] Atribuição de formações obrigatórias por role e departamento
- [x] Página de notificações internas para prazos, novas formações e certificados disponíveis

### Formações disponíveis (dados de exemplo)
- [x] **Proteção de Dados e RGPD** — 3 módulos, 13 perguntas de teste
- [x] **Segurança e Saúde no Trabalho** — 3 módulos, 13 perguntas de teste
- [x] **Comunicação e Atendimento ao Cliente** — 3 módulos, 13 perguntas de teste

### Visualizador de módulo
- [x] Sidebar lateral com lista de módulos, progresso geral e estado por módulo (número / check verde)
- [x] Barra de progresso da formação na sidebar
- [x] Toolbar com nome do ficheiro e nº de páginas
- [x] Conteúdo simulado renderizado como documento (H1, lead, H2, parágrafos, listas, callouts)
- [x] Cabeçalho de documento com logo AlgarTempo + nome da formação
- [x] Rodapé do documento com "Plataforma de Formações ALGARTEMPO" + nº de páginas
- [x] Botão "Marcar como lido" — desbloqueia avaliação e persiste no Firebase
- [x] Navegação entre módulos pela sidebar
- [x] Botão "Descarregar" quando PDF real está disponível (via URL Firebase Storage)
- [x] **Visualizador de PDF real** via `<iframe>` quando URL disponível (em substituição do conteúdo simulado)

### Upload de PDF (Administrador)
- [x] Detecção automática de admin por número de colaborador (`ADMIN_NUMBERS` em `firebase-config.js`)
- [x] Botão "Carregar PDF" visível apenas para admins
- [x] Modal de upload com drag-and-drop ou seleção de ficheiro
- [x] Validação de tipo (apenas `.pdf`)
- [x] Barra de progresso de upload em tempo real
- [x] Persistência de URL em Firestore (`modules/{courseId_moduleId}`)
- [x] Disponibilização imediata do PDF a todos os colaboradores após upload

### Quiz / Avaliação
- [x] Desbloqueado apenas após módulo marcado como lido
- [x] Suporte a perguntas Verdadeiro/Falso com ícones visuais
- [x] Suporte a perguntas de Escolha Múltipla (A/B/C/D)
- [x] Barra de progresso de respostas em tempo real
- [x] Botão "Submeter" activo apenas quando todas as perguntas respondidas
- [x] Feedback visual imediato após submissão (correcto/errado por opção, cor verde/vermelho)
- [x] Explicações por pergunta quando resposta errada (campo `explanation` nos dados)
- [x] Navegação para ecrã de resultados

### Resultados
- [x] Pontuação final em percentagem (círculo destacado)
- [x] Estado APTO / NÃO APTO com nota mínima configurável por formação (`passingScore`)
- [x] Estatísticas: respostas correctas, incorrectas, total
- [x] Revisão pergunta a pergunta com resposta correcta e explicação
- [x] CTA "Próximo módulo" (quando existir) ou "Formação concluída" ou "Repetir avaliação"
- [x] Persistência em Firebase: `read`, `quizPassed`, `lastScore`, `attempts`
- [x] Histórico de tentativas por módulo com data, nota, estado e respostas corretas

### Persistência de dados (Firebase Firestore)
- [x] Progresso por colaborador: `employees/{number}/progress/data`
- [x] URLs de PDF por módulo: `modules/{courseId_moduleId}`
- [x] Fallback automático para `localStorage` quando Firebase não configurado
- [x] Carregamento de progresso ao retomar sessão

### Design / UI
- [x] Paleta corporativa: Navy `#1A3A5C` + Cyan `#00AEEF` + brancos e cinzentos
- [x] Tipografia: Lato (display/títulos) + Open Sans (corpo)
- [x] Sidebar de navegação fixa à esquerda
- [x] Animações de entrada (`fadeIn`, `fadeUp`) em todas as vistas
- [x] Hover states e transições suaves em cartões e botões
- [x] Toasts de notificação (sucesso / erro)
- [x] Branding AlgarTempo: logo branco na sidebar e login, logo cor no documento, ícone no favicon e marca de água
- [x] Breadcrumbs em todas as vistas internas
- [x] Interface totalmente em Português de Portugal

---

## A fazer / Melhorias previstas

### Funcionalidades
- [ ] Ecrã de Progresso detalhado (gráficos por formação)
- [ ] Ecrã de Catálogo com filtros por categoria
- [ ] Certificados de conclusão (download PDF)
- [ ] Ecrã de Perfil do colaborador
- [x] Histórico de tentativas por módulo
- [ ] Notificações (prazos de formação obrigatória)
- [ ] Modo de revisão (rever módulo já concluído sem recomeçar)

### Administração
- [ ] Painel de administração (ver progresso de todos os colaboradores)
- [ ] Adicionar / editar formações e módulos pela interface
- [ ] Exportar relatório de formações (CSV)
- [ ] Gestão de utilizadores (activar/desactivar colaboradores)

### Técnico
- [ ] Preencher `js/firebase-config.js` com credenciais reais
- [ ] Definir regras de segurança Firestore (ver comentário no `firebase-config.js`)
- [ ] Substituir conteúdo simulado dos módulos por PDFs reais (via upload de admin)
- [ ] Testes em dispositivos móveis / responsividade completa
- [ ] Modo offline (Service Worker / cache)
- [ ] Suporte a múltiplos idiomas

---

## Estrutura de ficheiros

```
formacoes/
├── index.html                  # Shell HTML, importa CSS e main.js
├── css/
│   └── styles.css              # Todas as variáveis, reset e estilos
├── js/
│   ├── main.js                 # Entry point: router, boot, session restore
│   ├── router.js               # Hash router (/login, /dashboard, /module, /quiz, /results)
│   ├── state.js                # Store pub-sub simples
│   ├── data.js                 # Dados das formações + helpers de progresso
│   ├── icons.js                # Helper SVG: icon(name, size, color)
│   ├── ui.js                   # Shell (sidebar), toasts, window.navigate
│   ├── firebase-config.js      # ⚠️ Preencher com credenciais reais
│   ├── firebase-service.js     # Auth, Firestore, Storage (com fallback localStorage)
│   └── views/
│       ├── login.js
│       ├── dashboard.js
│       ├── module.js
│       ├── quiz.js
│       └── results.js
└── assets/
    ├── icon.png
    ├── logo-white.png          # Logótipo horizontal branco (sidebar, login)
    ├── logo-color.png          # Logótipo positivo (cabeçalho do documento)
    └── ...                     # Restantes variantes do logótipo
```

---

## Como correr localmente

```bash
# Na pasta do projecto:
python -m http.server 8081
# Abrir: http://localhost:8081
```

> ES Modules requerem HTTP — não abre directamente com `file://`.

## Configurar Firebase

1. Criar projecto em [console.firebase.google.com](https://console.firebase.google.com)
2. Activar: **Authentication → Anonymous** · **Firestore** · **Storage**
3. Preencher `js/firebase-config.js` com os dados do projecto
4. Adicionar número de colaborador admin ao array `ADMIN_NUMBERS` (para upload de PDFs)
