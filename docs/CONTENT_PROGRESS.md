# Progresso — Conteúdo dos Módulos (seed-data.js)

Acompanhamento da adição do campo `content:[...]` a cada módulo de `seed-data.js`.  
O conteúdo de cada módulo cobre o material testado no quiz, usando os blocos: `h1`, `lead`, `h2`, `p`, `list`, `callout`.

---

## Estado geral

| Concluídos | Total módulos | Restantes |
|:----------:|:-------------:|:---------:|
| 145        | 145           | 0         |

**COMPLETO** — todos os módulos têm conteúdo estruturado.

---

## Cursos obrigatórios (`isRequired: true`)

| # | ID | Título | Módulos | Conteúdo |
|---|-----|--------|:-------:|:--------:|
| 1 | `haccp` | Higiene e Segurança Alimentar (HACCP) | 9 | ✅ Feito |
| 2 | `hst` | Higiene e Segurança no Trabalho | 8 | ✅ Feito |
| 3 | `primeiros-socorros` | Primeiros Socorros | 8 | ✅ Feito |
| 4 | `rgpd` | Proteção de Dados (RGPD) | 8 | ✅ Feito |
| 11 | `alergenios` | Alergénios e Dietas Especiais | 8 | ✅ Feito |
| 18 | `diversidade-inclusao` | Diversidade, Inclusão e Prevenção de Assédio | 8 | ✅ Feito |

---

## Cursos opcionais (`isRequired: false`)

| # | ID | Título | Módulos | Conteúdo |
|---|-----|--------|:-------:|:--------:|
| 5 | `limpeza-desinfecao` | Técnicas de Limpeza e Desinfeção | 8 | ✅ Feito |
| 6 | `produtos-quimicos` | Uso e Armazenamento de Produtos Químicos | 8 | ✅ Feito |
| 7 | `servico-mesa` | Serviço de Mesa e Protocolo | 8 | ✅ Feito |
| 8 | `gestao-reclamacoes` | Gestão de Reclamações e Conflitos | 8 | ✅ Feito |
| 9 | `carta-vinhos` | Carta de Vinhos e Maridagem | 8 | ✅ Feito |
| 10 | `cozinha-profissional` | Técnicas de Cozinha Profissional | 8 | ✅ Feito |
| 12 | `gestao-stocks` | Gestão de Stocks e Redução de Desperdício | 8 | ✅ Feito |
| 13 | `atendimento-cliente` | Atendimento ao Cliente e Etiqueta Hoteleira | 8 | ✅ Feito |
| 14 | `ingles-hotelaria` | Inglês para Hotelaria | 8 | ✅ Feito |
| 15 | `bagagem-logistica` | Manuseamento de Bagagem e Logística | 8 | ✅ Feito |
| 16 | `checkin-checkout-pms` | Check-in, Check-out e Sistemas PMS | 8 | ✅ Feito |
| 17 | `sustentabilidade` | Sustentabilidade e Práticas Eco-Responsáveis | 8 | ✅ Feito |

---

## Notas

- Módulos sem `content` renderizam o placeholder "Este módulo ainda não tem conteúdo publicado" — funciona mas não é formativo.
- Quando um PDF for carregado para um módulo, o `content` deixa de ser exibido (o iframe do PDF tem prioridade).
- **Todos os 145 módulos têm agora conteúdo estruturado.** Para publicar no Firebase, abrir `seed.html` no browser e clicar em "Fazer Seed".
