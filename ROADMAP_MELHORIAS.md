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
| [ ] | P1 | Certificados PDF | Formacao concluida gera certificado descarregavel |
| [ ] | P1 | Pagina "Certificados" | Colaborador ve certificados ganhos e pendentes |
| [~] | P1 | Historico de tentativas | Contador de tentativas e melhor nota guardados; historico completo por data e tentativa pendente |
| [x] | P1 | Melhor nota por modulo | bestScore calculado e apresentado na pagina de resultados |
| [ ] | P1 | Prazos de formacoes obrigatorias | Formacoes podem ter data limite |
| [ ] | P2 | Notificacoes internas | Alertas para prazos, novas formacoes e certificados |
| [ ] | P2 | Formacoes obrigatorias/opcionais | Catalogo distingue atribuicoes obrigatorias e opcionais |
| [ ] | P2 | Atribuicao por departamento/role | Admin atribui formacoes a grupos de colaboradores |
| [ ] | P2 | Catalogo geral | Separar "Atribuidas a mim" de "Catalogo disponivel" |
| [ ] | P3 | Modo offline/cache | Leitura de conteudos ja abertos sem ligacao |

### Notas

- Certificados devem depender da conclusao de todos os modulos da formacao.
- Historico de tentativas deve ser desenhado antes dos relatorios admin.

---

## Fase 4 - Administracao e Gestao de Conteudos

Objetivo: dar autonomia real a RH/gestores sem exigir edicao tecnica.

| Estado | Prioridade | Melhoria | Criterio de conclusao |
|---|---:|---|---|
| [x] | P0 | Editor visual de quiz | Gestor cria perguntas sem editar JSON |
| [x] | P1 | Validacao de quiz | Nao permite guardar perguntas incompletas ou sem resposta correta |
| [ ] | P1 | Editor de conteudo do modulo | Permitir texto estruturado alem de PDF |
| [x] | P1 | Estados de publicacao | Rascunho, publicado, arquivado — dashboard filtra apenas publicados |
| [ ] | P1 | Importacao de colaboradores com validacao | Excel/CSV mostra erros antes de importar |
| [x] | P1 | Exportar relatorios CSV/Excel | Admin exporta progresso por colaborador e por formacao |
| [ ] | P1 | Dashboard admin com KPIs | Taxa de conclusao, pendentes, atrasados e medias |
| [ ] | P2 | Auditoria de alteracoes | Registar quem criou/editou cursos, modulos e utilizadores |
| [ ] | P2 | Reordenar cursos e modulos | Drag/drop ou controlos de ordem |
| [ ] | P2 | Gestao de departamentos | Criar departamentos e associar colaboradores |

### Notas

- O editor atual de quiz usa JSON, bom para MVP mas fraco para uso diario.
- A importacao ja existe, mas precisa de pre-validacao e relatorio mais claro.

---

## Fase 5 - Qualidade, Seguranca e Manutencao

Objetivo: preparar a plataforma para utilizacao interna continua.

| Estado | Prioridade | Melhoria | Criterio de conclusao |
|---|---:|---|---|
| [ ] | P0 | Rever permissoes por role | Colaborador, gestor e administrador so acedem ao que devem |
| [ ] | P0 | Proteger operacoes destrutivas | Confirmacoes melhores para apagar cursos, modulos e utilizadores |
| [ ] | P1 | Testes manuais por fluxo | Checklist login, curso, quiz, admin, upload, importacao |
| [ ] | P1 | Tratamento de dados sensiveis | Evitar expor informacao desnecessaria no frontend |
| [ ] | P1 | Validacao de inputs | Email, percentagens, nomes, ficheiros e JSON/quiz |
| [ ] | P2 | Estruturar CSS por secoes/componentes | Facilitar manutencao sem reescrever a UI |
| [ ] | P2 | Reduzir estilos inline | Mover estilos repetidos para classes CSS |
| [ ] | P2 | Documentar modelo de dados | Colecoes, documentos e campos esperados |
| [ ] | P3 | Criar ambiente staging | Testar mudancas sem afetar producao |

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

### Colaborador

- [ ] Login com credenciais validas.
- [ ] Login com credenciais invalidas.
- [ ] Ver dashboard com formacoes atribuidas.
- [ ] Pesquisar e filtrar formacoes.
- [ ] Abrir formacao.
- [ ] Ler modulo.
- [ ] Marcar modulo como lido.
- [ ] Fazer quiz.
- [ ] Ver resultados.
- [ ] Repetir quiz apos reprovar.
- [ ] Continuar para modulo seguinte.
- [ ] Concluir formacao.
- [ ] Descarregar certificado.

### Gestor de Conteudos

- [ ] Criar formacao.
- [ ] Editar formacao.
- [ ] Criar modulo.
- [ ] Editar modulo.
- [ ] Criar quiz visual.
- [ ] Carregar PDF.
- [ ] Publicar formacao.
- [ ] Arquivar formacao.

### Administrador

- [ ] Criar utilizador.
- [ ] Editar utilizador.
- [ ] Desativar/ativar utilizador.
- [ ] Importar whitelist.
- [ ] Ver progresso global.
- [ ] Exportar relatorio.
- [ ] Confirmar que colaboradores nao acedem a admin.

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
