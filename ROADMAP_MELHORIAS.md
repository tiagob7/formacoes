# Roadmap de Melhorias - Plataforma de Formacoes

## Objetivo

Evoluir a plataforma de formacoes online para uma ferramenta operacional, robusta e agradavel de usar por colaboradores, gestores de conteudos e administradores.

Este documento serve para acompanhar as melhorias por fases, com estado, prioridade e criterios de conclusao.

## Legenda de Estado

- [ ] Por fazer
- [~] Em curso
- [x] Concluido
- [!] Bloqueado

## Prioridades

- P0: Essencial para base tecnica, seguranca ou funcionamento real.
- P1: Alto impacto para utilizacao diaria.
- P2: Importante, mas pode vir depois da base estar estavel.
- P3: Melhoria futura.

---

## Fase 1 - Base Solida

Objetivo: alinhar dados, seguranca e funcionalidades existentes antes de adicionar novas camadas.

| Estado | Prioridade | Melhoria | Criterio de conclusao |
|---|---:|---|---|
| [x] | P0 | Criar uma camada unica de cursos | Dashboard, modulo, quiz e gestor de conteudos usam a mesma fonte de dados |
| [x] | P0 | Ligar dashboard aos cursos do Firestore | Formacoes criadas no gestor aparecem para colaboradores |
| [x] | P0 | Manter fallback para cursos locais | Se Firestore falhar, a app continua utilizavel com `COURSES` |
| [x] | P0 | Rever regras Firestore e Storage | Regras cobrem `employees`, `progress`, `courses`, `modules`, `whitelist` e PDFs |
| [x] | P0 | Atualizar documentacao Firebase | `SETUP_FIREBASE.md` reflete a arquitetura atual |
| [x] | P1 | Remover ou esconder placeholders | Certificados, notificacoes e pesquisa nao aparecem como funcionais sem estarem ligados |
| [x] | P1 | Tratar estados de erro e loading | Ecras mostram mensagens claras quando dados falham ou estao a carregar |
| [x] | P1 | Normalizar textos e nomenclatura | Portugues consistente: sessao, formacao, avaliacao, utilizador, colaborador |

### Notas

- O gestor de conteudos ja le/grava cursos em Firestore.
- O dashboard ainda usa `COURSES` de `js/data.js`.
- Esta fase deve ser feita antes de certificados, relatorios e atribuicoes.

---

## Fase 2 - UI e Experiencia do Colaborador

Objetivo: tornar a experiencia mais clara, responsiva e eficiente para quem faz formacoes.

| Estado | Prioridade | Melhoria | Criterio de conclusao |
|---|---:|---|---|
| [x] | P0 | Responsividade mobile/tablet | Login, dashboard, modulo, quiz e resultados funcionam em ecras pequenos |
| [x] | P1 | Sidebar colapsavel ou navegacao mobile | Colaborador consegue navegar confortavelmente em mobile |
| [x] | P1 | Filtros no dashboard | Filtrar por categoria, estado e pesquisa textual |
| [x] | P1 | Pesquisa real no dashboard | Campo de pesquisa filtra formacoes por titulo, subtitulo e categoria |
| [x] | P1 | Pagina de detalhe da formacao | Antes do modulo, mostrar objetivos, duracao, modulos, progresso e CTA |
| [x] | P1 | Melhorar estado "continuar onde parou" | Retoma o modulo correto e mostra progresso contextual |
| [x] | P1 | Melhorar leitor de modulo | Estados claros: por ler, lido, quiz disponivel, concluido |
| [x] | P2 | Modo rever formacao | Rever modulo concluido sem parecer que esta a refazer progresso |
| [x] | P2 | Melhorar feedback visual do quiz | Revisao mais clara, com explicacoes e resumo por tema |
| [x] | P2 | Acessibilidade basica | Foco visivel, labels, contraste, navegacao por teclado |

### Notas

- A app usa grelhas fixas e ainda nao tem `@media` robusto.
- A pesquisa ja esta desenhada, mas sem logica.

---

## Fase 3 - Funcionalidades de Formacao

Objetivo: transformar a plataforma num sistema completo de aprendizagem e certificacao.

| Estado | Prioridade | Melhoria | Criterio de conclusao |
|---|---:|---|---|
| [x] | P1 | Certificados PDF | Formacao concluida gera certificado descarregavel |
| [x] | P1 | Pagina "Certificados" | Colaborador ve certificados ganhos e pendentes |
| [x] | P1 | Historico de tentativas | Contador de tentativas, melhor nota e historico completo por data guardados e apresentados nos resultados |
| [x] | P1 | Melhor nota por modulo | bestScore calculado e apresentado na pagina de resultados |
| [x] | P1 | Prazos de formacoes obrigatorias | Formacoes podem ter data limite editavel, visivel no dashboard e detalhe da formacao |
| [x] | P2 | Notificacoes internas | Alertas para prazos, novas formacoes e certificados |
| [x] | P2 | Formacoes obrigatorias/opcionais | Catalogo distingue atribuicoes obrigatorias e opcionais |
| [x] | P2 | Atribuicao por departamento/role | Admin atribui formacoes a grupos de colaboradores |
| [x] | P2 | Catalogo geral | Separar "Atribuidas a mim" de "Catalogo disponivel" |
| [>] | P3 | Modo offline/cache | Movido para Fase 7 |

### Notas

- Certificados devem depender da conclusao de todos os modulos da formacao.
- Historico de tentativas ja fica guardado no progresso do modulo e visivel no ecra de resultados.

---

## Fase 4 - Administracao e Gestao de Conteudos

Objetivo: dar autonomia real a RH/gestores sem exigir edicao tecnica.

| Estado | Prioridade | Melhoria | Criterio de conclusao |
|---|---:|---|---|
| [x] | P0 | Editor visual de quiz | Gestor cria perguntas sem editar JSON |
| [x] | P1 | Validacao de quiz | Nao permite guardar perguntas incompletas ou sem resposta correta |
| [x] | P1 | Editor de conteudo do modulo | Editor visual de blocos (titulo, paragrafo, lista, destaque) no modal de modulo; guardado em Firestore e renderizado quando nao ha PDF |
| [x] | P1 | Estados de publicacao | Rascunho, publicado, arquivado — dashboard filtra apenas publicados |
| [x] | P1 | Importacao de colaboradores com validacao | Whitelist import mostra linhas invalidas (email vazio ou mal formado) antes de confirmar |
| [x] | P1 | Exportar relatorios CSV/Excel | Admin exporta progresso por colaborador e por formacao |
| [x] | P1 | Dashboard admin com KPIs | Taxa de conclusao, pendentes, atrasados e medias — KPIs globais, cards por formacao e tabela por colaborador |
| [x] | P2 | Auditoria de alteracoes | criadoPor/editadoPor/editadoEm em cursos, modulos e utilizadores; visivel no gestor de conteudos |
| [x] | P2 | Reordenar cursos e modulos | Botoes de subir/descer por modulo no gestor de conteudos |
| [x] | P2 | Gestao de departamentos | Tab "Departamentos" no admin; CRUD; dropdown no modal de utilizador |

### Notas

- O editor atual de quiz usa JSON, bom para MVP mas fraco para uso diario.
- A importacao ja existe, mas precisa de pre-validacao e relatorio mais claro.

---

## Fase 5 - Qualidade, Seguranca e Manutencao

Objetivo: preparar a plataforma para utilizacao interna continua.

| Estado | Prioridade | Melhoria | Criterio de conclusao |
|---|---:|---|---|
| [x] | P0 | Rever permissoes por role | Router, sidebar e views validam role; colaborador nao acede a admin nem conteudos |
| [x] | P0 | Proteger operacoes destrutivas | Modal de confirmacao com titulo, contexto e botao vermelho substitui confirm() nativo |
| [x] | P1 | Testes manuais por fluxo | Checklist detalhada no ROADMAP (ver abaixo) — pronta para execucao manual |
| [x] | P1 | Tratamento de dados sensiveis | Erros de login sanitizados (so expoe code, nao objeto); sessionStorage limpo no logout; passwords nunca registadas |
| [x] | P1 | Validacao de inputs | Email (regex), nota minima (0-100), whitelist import com deteccao de linhas invalidas |
| [x] | P2 | Estruturar CSS por secoes/componentes | Indice de seccoes no topo; cabeçalhos --- padronizados; Quiz/Content Builder e KPI integrados na seccao Admin |
| [x] | P2 | Reduzir estilos inline | Classes utilitarias (table-cell-meta, form-grid-2, form-section, section-title, progress-cell, etc.) substituem padroes repetidos em admin.js e content-manager.js |
| [x] | P2 | Documentar modelo de dados | MODELO_DADOS.md com colecoes, campos, quiz, content blocks e regras Firestore |

---

## Fase 6 - Engagement e Aprendizagem Continua

> **SUSPENSA** — Retomar depois de concluir Fases 1 a 5.

Objetivo: aumentar a adesao dos colaboradores e tornar a formacao um habito, nao uma obrigacao pontual.

| Estado | Prioridade | Melhoria | Criterio de conclusao |
|---|---:|---|---|
| [ ] | P1 | Lembretes por email | Email automatico X dias antes do prazo de formacoes obrigatorias |
| [ ] | P1 | Resumo semanal por email | Colaborador recebe resumo do progresso e pendentes |
| [ ] | P2 | Badges e conquistas | Marcos visiveis: 1a formacao, 5 formacoes, 100% no quiz, sem atrasos |
| [ ] | P2 | Sequencias de conclusao (streaks) | Contador de semanas/meses consecutivos com atividade |
| [ ] | P2 | Ranking por equipa/departamento | Opcional e configuravel pelo admin; respeita cultura interna |
| [ ] | P2 | Perguntas e comentarios por modulo | Colaborador deixa duvida; RH responde no painel admin |
| [ ] | P2 | Avaliacao do colaborador a formacao | Estrelas e comentario livre apos concluir |
| [ ] | P2 | Recomendacoes de formacoes | Sugerir catalogo com base em role/departamento/historico |
| [ ] | P3 | Microaprendizagem | Modulos curtos de 5 min para revisao periodica |
| [ ] | P3 | Lembrete de revalidacao | Formacoes com validade (ex: 12 meses) reabrem automaticamente |

### Notas

- Toda a gamificacao deve ser opcional por configuracao — algumas culturas internas reagem mal a rankings publicos.
- Emails dependem de uma camada de envio (ex: Firebase Functions + SendGrid/Mailgun) que ainda nao existe.

---

## Fase 7 - Integracoes e Escala

> **SUSPENSA** — Retomar depois de concluir Fases 1 a 5.

Objetivo: encaixar a plataforma no ecossistema de TI da empresa e preparar crescimento.

| Estado | Prioridade | Melhoria | Criterio de conclusao |
|---|---:|---|---|
| [ ] | P1 | SSO Microsoft/Google Workspace | Login corporativo substitui nome + numero |
| [ ] | P1 | Sincronizacao de colaboradores via API/HR | Lista de colaboradores e departamentos vem do sistema de RH |
| [ ] | P2 | Webhooks de eventos | Eventos (conclusao, certificado, atraso) enviados para sistemas externos |
| [ ] | P2 | API publica read-only | Endpoint autenticado para extrair progresso e relatorios |
| [ ] | P2 | Assinatura digital de leitura | Para formacoes legais — registo com timestamp e IP |
| [ ] | P2 | Multilingua (PT/EN/ES) | Conteudos e UI traduziveis sem duplicar formacoes |
| [ ] | P3 | Formacoes presenciais hibridas | Sessoes presenciais com checkin + componente online |
| [ ] | P3 | App mobile (PWA instalavel) | Plataforma instalavel como app no telemovel |
| [ ] | P3 | Integracao com calendario | Prazos sincronizados com Outlook/Google Calendar |
| [ ] | P3 | SCORM/xAPI | Importar conteudos de autores externos em formato standard |
| [ ] | P3 | Criar ambiente staging | Testar mudancas sem afetar producao |
| [ ] | P3 | Modo offline/cache | Leitura de conteudos ja abertos sem ligacao (Service Worker) |

### Notas

- SSO deve coexistir com login por numero — nem todos os colaboradores tem conta corporativa.
- API/Webhooks exigem rotacao de chaves e auditoria; nao avancar sem Fase 5 concluida.

---

## Metricas de Sucesso

Indicadores a monitorizar para validar se as melhorias estao a produzir efeito real.

| Metrica | Objetivo | Como medir |
|---|---|---|
| Taxa de conclusao de formacoes obrigatorias | > 90% dentro do prazo | Relatorio admin |
| Tempo medio entre atribuicao e conclusao | < 14 dias | Diferenca entre data de atribuicao e ultima atividade |
| Taxa de aprovacao a primeira tentativa | > 70% | `attempts` no progresso do modulo |
| Adesao a formacoes opcionais | > 30% dos colaboradores ativos/mes | Inscricoes no catalogo |
| NPS interno da plataforma | > 30 | Inquerito trimestral |
| Tickets de suporte sobre a plataforma | Tendencia decrescente | Registo manual ou via Helpdesk |

---

## Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Firestore atinge limites do plano gratuito | Plataforma fica indisponivel | Monitorizar quotas; preparar upgrade para Blaze antes de saturar |
| Conteudo desatualizado em formacoes legais | Risco regulatorio | Lembrete de revalidacao (Fase 6) e responsavel por formacao |
| Adocao baixa pelos colaboradores | Investimento sem retorno | Fase 6 (engagement), comunicacao interna e patrocinio de gestao |
| Dependencia de uma so pessoa para conteudos | Bottleneck | Multiplos gestores de conteudo + auditoria (Fase 4) |
| Dados sensiveis expostos no frontend | Risco RGPD | Fase 5 — rever permissoes por role e tratamento de dados |
| Browser sem suporte a ES Modules ou Firebase v10 | Utilizadores ficam de fora | Documentar requisitos minimos e detetar/avisar no login |

---

## Backlog de Ideias

- Gamificacao leve: badges, sequencias de conclusao, ranking por equipa se fizer sentido culturalmente.
- Comentarios/perguntas por modulo para RH responder.
- Formacoes presenciais misturadas com online.
- Assinatura digital ou validacao de leitura para formacoes legais.
- Lembretes por email.
- Integracao com Microsoft/Google Workspace para login corporativo.
- Multilingua: portugues, ingles, espanhol.

---

## Ordem Recomendada de Execucao

1. Unificar fonte de dados dos cursos.
2. Rever regras/documentacao Firebase.
3. Melhorar responsividade principal.
4. Ligar pesquisa e filtros.
5. Criar detalhe da formacao.
6. Implementar certificados.
7. Substituir editor JSON por editor visual de quiz.
8. Criar relatorios admin/exportacao.
9. Implementar atribuicoes por departamento/role.
10. Polir acessibilidade, estados vazios, erros e manutencao.

---

## Checklist de Teste Manual

> Marcar com [x] apos testar. Repetir apos cada deploy relevante.
> Ultimo teste: por realizar

### Colaborador

- [ ] Login com credenciais validas — sessao fica guardada apos refresh.
- [ ] Login com credenciais invalidas — mensagem de erro sem expor detalhes.
- [ ] Login com conta desativada — mensagem clara.
- [ ] Ver dashboard com formacoes atribuidas ao seu role/departamento.
- [ ] Banner "continuar onde parou" aparece quando ha formacao em curso.
- [ ] Pesquisar formacoes por titulo.
- [ ] Filtrar por categoria e estado.
- [ ] Abrir pagina de detalhe de formacao.
- [ ] Navegar para modulo a partir do detalhe.
- [ ] Ler conteudo do modulo (bloco de texto ou PDF).
- [ ] Marcar modulo como lido — botao de quiz desbloqueia.
- [ ] Tentar aceder ao quiz antes de marcar como lido — bloqueado.
- [ ] Fazer quiz e submeter respostas.
- [ ] Ver revisao e feedback por pergunta.
- [ ] Reprovar e repetir quiz — contagem de tentativas sobe.
- [ ] Aprovar quiz — modulo marcado como concluido.
- [ ] Continuar para modulo seguinte.
- [ ] Concluir todos os modulos — formacao marcada como concluida.
- [ ] Ver certificado gerado e descarregar PDF.
- [ ] Tentar navegar para /admin — redirecionado para dashboard.
- [ ] Logout — sessao apagada, redireciona para login.

### Gestor de Conteudos

- [ ] Criar formacao — aparece na lista como rascunho.
- [ ] Editar titulo, categoria, nota minima e data limite.
- [ ] Adicionar bloco de conteudo (titulo, paragrafo, lista, destaque).
- [ ] Reordenar blocos de conteudo com setas.
- [ ] Criar quiz com pergunta de multipla escolha.
- [ ] Criar quiz com pergunta verdadeiro/falso.
- [ ] Guardar quiz — validacao impede perguntas incompletas.
- [ ] Carregar PDF num modulo.
- [ ] Publicar formacao — aparece no dashboard dos colaboradores.
- [ ] Arquivar formacao — desaparece do dashboard.
- [ ] Reordenar modulos com setas.
- [ ] Eliminar modulo — modal de confirmacao aparece.
- [ ] Eliminar formacao — modal de confirmacao aparece.
- [ ] Tentar aceder a /admin — redirecionado para dashboard.

### Administrador

- [ ] Criar utilizador com email, palavra-passe e role.
- [ ] Email invalido — erro de validacao antes de submeter.
- [ ] Editar nome, role e departamento de utilizador existente.
- [ ] Desativar utilizador — nao consegue fazer login.
- [ ] Reativar utilizador.
- [ ] Eliminar utilizador — modal de confirmacao aparece.
- [ ] Importar whitelist via Excel — linhas invalidas mostradas antes de confirmar.
- [ ] Confirmar importacao — novas entradas adicionadas.
- [ ] Criar departamento — aparece na lista e no dropdown de utilizadores.
- [ ] Eliminar departamento — modal de confirmacao aparece.
- [ ] Ver KPIs globais de progresso.
- [ ] Ver detalhe por formacao e por colaborador.
- [ ] Exportar relatorio CSV — ficheiro descarregado com dados corretos.

### Responsividade

- [ ] Mobile pequeno.
- [ ] Mobile grande.
- [ ] Tablet.
- [ ] Desktop normal.
- [ ] Desktop largo.

---

## Decisoes a Tomar

- Como serao atribuidas formacoes: todos veem tudo, por departamento, por role, ou manualmente?
- Certificado deve ter assinatura/logo oficial?
- A nota final da formacao e media dos modulos ou apenas estado concluido?
- Tentativas devem ser ilimitadas ou limitadas?
- Um gestor de conteudos pode ver progresso ou apenas editar conteudos?
- Os colaboradores podem autoinscrever-se em formacoes opcionais?
