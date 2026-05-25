/**
 * Catálogo de formações com módulos e quizzes.
 * Para adicionar uma nova formação, basta inserir um objecto no array COURSES.
 */
export const COURSES = [
  {
    id: 'rgpd',
    title: 'Proteção de Dados e RGPD',
    subtitle: 'Conformidade, direitos dos titulares e boas práticas',
    duration: '2h 30min',
    category: 'Conformidade',
    passingScore: 60,
    modules: [
      {
        id: 'm1',
        title: 'Introdução ao RGPD',
        duration: '45 min',
        pages: 12,
        content: [
          { type: 'h1',   text: 'Módulo 1 — Introdução ao RGPD' },
          { type: 'lead', text: 'O Regulamento Geral sobre a Proteção de Dados (RGPD) é o quadro legal europeu que regula o tratamento de dados pessoais por organizações públicas e privadas em todos os Estados-Membros da União Europeia.' },
          { type: 'h2',   text: '1.1 Objetivos do Regulamento' },
          { type: 'p',    text: 'O RGPD entrou em vigor a 25 de maio de 2018 e tem como principal objetivo harmonizar a legislação europeia em matéria de proteção de dados, reforçando os direitos dos cidadãos e responsabilizando as entidades que tratam os seus dados.' },
          { type: 'p',    text: 'No contexto profissional, todos os colaboradores que tratem dados pessoais — sejam de clientes, fornecedores ou colegas — devem conhecer e aplicar os princípios fundamentais do regulamento.' },
          { type: 'h2',   text: '1.2 Princípios Fundamentais' },
          { type: 'list', items: ['Licitude, lealdade e transparência no tratamento', 'Limitação das finalidades — apenas para o fim declarado', 'Minimização dos dados recolhidos', 'Exatidão e atualização dos dados', 'Limitação da conservação no tempo', 'Integridade e confidencialidade (segurança)', 'Responsabilidade do responsável pelo tratamento'] },
          { type: 'callout', label: 'A reter', text: 'O incumprimento do RGPD pode acarretar coimas até 20 milhões de euros ou 4% do volume de negócios anual, consoante o que for mais elevado.' },
          { type: 'h2', text: '1.3 Conceitos-chave' },
          { type: 'p',  text: 'Dados pessoais são qualquer informação relativa a uma pessoa singular identificada ou identificável. O tratamento abrange qualquer operação efetuada sobre dados — recolha, registo, organização, conservação, consulta, divulgação ou eliminação.' },
          { type: 'p',  text: 'O titular dos dados é a pessoa a quem os dados dizem respeito. O responsável pelo tratamento é a entidade que determina as finalidades e os meios do tratamento.' },
        ],
        quiz: [
          { type: 'mc', question: 'Quando entrou em vigor o RGPD na União Europeia?', options: ['1 de janeiro de 2016', '25 de maio de 2018', '1 de janeiro de 2020', '25 de maio de 2020'], answer: 1 },
          { type: 'tf', question: 'O RGPD aplica-se apenas a empresas com mais de 250 trabalhadores.', answer: false, explanation: 'O RGPD aplica-se a qualquer entidade que trate dados pessoais, independentemente da sua dimensão.' },
          { type: 'mc', question: 'Qual dos seguintes NÃO é um princípio fundamental do RGPD?', options: ['Minimização dos dados', 'Maximização da recolha para fins futuros', 'Limitação das finalidades', 'Integridade e confidencialidade'], answer: 1 },
          { type: 'tf', question: 'O titular dos dados é a entidade que determina as finalidades do tratamento.', answer: false, explanation: 'O titular dos dados é a pessoa singular a quem os dados dizem respeito. Quem determina as finalidades é o responsável pelo tratamento.' },
          { type: 'mc', question: 'O valor máximo de coima previsto pelo RGPD pode atingir:', options: ['100 mil euros', '1 milhão de euros', '20 milhões de euros ou 4% do volume de negócios', '50 milhões de euros'], answer: 2 },
        ],
      },
      {
        id: 'm2',
        title: 'Direitos dos Titulares dos Dados',
        duration: '40 min',
        pages: 10,
        content: [
          { type: 'h1',   text: 'Módulo 2 — Direitos dos Titulares dos Dados' },
          { type: 'lead', text: 'O RGPD reforça e clarifica um conjunto de direitos que assistem aos titulares dos dados pessoais. Conhecer estes direitos é essencial para garantir o seu cumprimento na prática diária.' },
          { type: 'h2',   text: '2.1 Direito de informação e acesso' },
          { type: 'p',    text: 'O titular tem o direito de ser informado sobre o tratamento dos seus dados de forma clara e acessível, bem como de obter confirmação de que os mesmos estão a ser tratados e aceder a uma cópia dos dados.' },
          { type: 'h2',   text: '2.2 Direito de retificação e apagamento' },
          { type: 'p',    text: 'Sempre que os dados estejam incorretos ou desatualizados, o titular pode solicitar a sua retificação. O direito ao apagamento — também conhecido como "direito ao esquecimento" — permite ao titular pedir a eliminação dos seus dados quando já não sejam necessários para a finalidade original.' },
          { type: 'h2',   text: '2.3 Portabilidade e oposição' },
          { type: 'list', items: ['Portabilidade: receber os dados num formato estruturado e transmiti-los a outro responsável', 'Oposição: opor-se ao tratamento por motivos legítimos', 'Limitação: restringir o tratamento em situações específicas', 'Decisões automatizadas: não ficar sujeito a decisões baseadas exclusivamente em tratamento automatizado'] },
          { type: 'callout', label: 'Prazo de resposta', text: 'O responsável pelo tratamento dispõe de 1 mês para responder a um pedido de exercício de direitos, prorrogável até 2 meses adicionais em casos complexos.' },
          { type: 'h2', text: '2.4 Procedimento interno' },
          { type: 'p',  text: 'Todos os pedidos relacionados com o exercício de direitos devem ser encaminhados, sem demora, para o Encarregado de Proteção de Dados (DPO) da organização. O incumprimento dos prazos pode dar origem a queixas junto da CNPD.' },
        ],
        quiz: [
          { type: 'tf', question: 'O direito ao apagamento é também conhecido como "direito ao esquecimento".', answer: true },
          { type: 'mc', question: 'Qual é o prazo geral de resposta a um pedido de exercício de direitos?', options: ['72 horas', '15 dias', '1 mês', '6 meses'], answer: 2 },
          { type: 'mc', question: 'O direito de portabilidade permite ao titular:', options: ['Cancelar todos os tratamentos automaticamente', 'Receber os seus dados em formato estruturado e transmiti-los a outro responsável', 'Ser indemnizado por qualquer tratamento', 'Auditar o sistema informático da organização'], answer: 1 },
          { type: 'tf', question: 'Pedidos de exercício de direitos podem ser respondidos quando a organização tiver disponibilidade, sem prazo definido.', answer: false, explanation: 'Existe um prazo legal de 1 mês para resposta, prorrogável até 2 meses em casos complexos.' },
        ],
      },
      {
        id: 'm3',
        title: 'Boas Práticas e Conformidade no Local de Trabalho',
        duration: '50 min',
        pages: 14,
        content: [
          { type: 'h1',   text: 'Módulo 3 — Boas Práticas e Conformidade' },
          { type: 'lead', text: 'Conhecer o RGPD é importante, mas a verdadeira proteção dos dados é construída na rotina diária. Este módulo apresenta práticas concretas para aplicar nos seus processos.' },
          { type: 'h2',   text: '3.1 Gestão de credenciais' },
          { type: 'list', items: ['Utilize palavras-passe com no mínimo 12 caracteres, combinando letras, números e símbolos', 'Nunca partilhe credenciais com colegas, mesmo em situações urgentes', 'Ative a autenticação multifator (MFA) sempre que disponível', 'Bloqueie o ecrã quando se ausentar do posto de trabalho'] },
          { type: 'h2', text: '3.2 Comunicação de dados' },
          { type: 'p',  text: 'O envio de dados pessoais por correio eletrónico deve ser feito com recurso a encriptação ou através de plataformas seguras aprovadas pela organização. Evite reencaminhar mensagens com listas extensas de destinatários em "Para" ou "CC" — utilize sempre "BCC".' },
          { type: 'callout', label: 'Atenção', text: 'O envio de uma lista de e-mails em campo "Para" é uma das violações de dados mais comuns reportadas à CNPD.' },
          { type: 'h2', text: '3.3 Resposta a incidentes' },
          { type: 'p',  text: 'Em caso de suspeita de violação de dados pessoais — perda de dispositivo, acesso indevido, envio errado de informação — comunique de imediato ao DPO. A organização tem 72 horas para notificar a CNPD a partir do conhecimento do incidente.' },
          { type: 'h2', text: '3.4 Documentação e registo' },
          { type: 'p',  text: 'Mantenha registos atualizados das atividades de tratamento sob a sua responsabilidade. A documentação é a primeira linha de defesa numa eventual inspeção da autoridade de controlo.' },
        ],
        quiz: [
          { type: 'mc', question: 'Em caso de suspeita de violação de dados, qual é o prazo para a organização notificar a CNPD?', options: ['24 horas', '48 horas', '72 horas', '7 dias'], answer: 2 },
          { type: 'tf', question: 'Partilhar a palavra-passe com um colega de confiança é aceitável em situações urgentes.', answer: false, explanation: 'A partilha de credenciais é sempre proibida, independentemente da urgência. Devem ser usados mecanismos alternativos (delegação formal, conta partilhada).' },
          { type: 'mc', question: 'Ao enviar um e-mail para múltiplos destinatários externos, deve utilizar:', options: ['Campo "Para" com todos os endereços', 'Campo "CC" para maior transparência', 'Campo "BCC" para proteger os endereços', 'Sem preferência'], answer: 2 },
          { type: 'tf', question: 'A autenticação multifator (MFA) deve ser utilizada sempre que esteja disponível.', answer: true },
          { type: 'mc', question: 'Qual é o comprimento mínimo recomendado para uma palavra-passe segura?', options: ['6 caracteres', '8 caracteres', '12 caracteres', '20 caracteres'], answer: 2 },
        ],
      },
    ],
  },
  {
    id: 'sst',
    title: 'Segurança e Saúde no Trabalho',
    subtitle: 'Prevenção de riscos, ergonomia e procedimentos de emergência',
    duration: '3h 00min',
    category: 'Obrigatória',
    passingScore: 60,
    modules: [
      {
        id: 'm1',
        title: 'Princípios Gerais de SST',
        duration: '55 min',
        pages: 11,
        content: [
          { type: 'h1',   text: 'Módulo 1 — Princípios Gerais de SST' },
          { type: 'lead', text: 'A Segurança e Saúde no Trabalho (SST) é um direito fundamental dos trabalhadores e uma responsabilidade partilhada entre empregador e colaboradores.' },
          { type: 'h2',   text: '1.1 Enquadramento legal' },
          { type: 'p',    text: 'A Lei n.º 102/2009, de 10 de setembro, estabelece o regime jurídico da promoção da segurança e saúde no trabalho em Portugal, transpondo as diretivas europeias aplicáveis.' },
          { type: 'h2',   text: '1.2 Direitos e deveres' },
          { type: 'list', items: ['Direito a condições de trabalho que garantam a segurança e a saúde', 'Direito a informação e formação adequadas', 'Dever de cumprir as prescrições de segurança', 'Dever de utilizar corretamente os equipamentos de proteção', 'Dever de comunicar avarias e situações de risco'] },
          { type: 'callout', label: 'Importante', text: 'Em caso de perigo grave e iminente, o trabalhador tem o direito de interromper a atividade e abandonar o local de trabalho sem sofrer qualquer prejuízo.' },
        ],
        quiz: [
          { type: 'mc', question: 'Qual a lei que estabelece o regime jurídico da SST em Portugal?', options: ['Lei n.º 7/2009', 'Lei n.º 102/2009', 'Lei n.º 35/2014', 'Lei n.º 4/2008'], answer: 1 },
          { type: 'tf', question: 'Em situação de perigo grave e iminente, o trabalhador pode interromper a atividade sem prejuízo.', answer: true },
          { type: 'mc', question: 'A SST é uma responsabilidade:', options: ['Exclusiva do empregador', 'Exclusiva do trabalhador', 'Partilhada entre empregador e trabalhador', 'Exclusiva da ACT'], answer: 2 },
          { type: 'tf', question: 'O trabalhador não tem o dever de comunicar situações de risco que detete.', answer: false, explanation: 'Constitui um dever expresso do trabalhador comunicar de imediato avarias e situações de risco.' },
        ],
      },
      {
        id: 'm2',
        title: 'Ergonomia e Postura no Posto de Trabalho',
        duration: '50 min',
        pages: 9,
        content: [
          { type: 'h1',   text: 'Módulo 2 — Ergonomia e Postura' },
          { type: 'lead', text: 'Posturas inadequadas e equipamento mal ajustado estão entre as principais causas de lesões músculo-esqueléticas relacionadas com o trabalho.' },
          { type: 'h2',   text: '2.1 Ajuste da cadeira e secretária' },
          { type: 'list', items: ['Pés apoiados no chão ou num apoio', 'Ângulo dos joelhos próximo dos 90°', 'Costas apoiadas no encosto, mantendo a curvatura lombar', 'Antebraços apoiados, ombros relaxados'] },
          { type: 'h2',   text: '2.2 Posicionamento do ecrã' },
          { type: 'p',    text: 'O topo do ecrã deve estar ao nível dos olhos, a uma distância equivalente ao comprimento do braço (cerca de 50 a 70 cm). Evite reflexos diretos de janelas ou lâmpadas.' },
          { type: 'callout', label: 'Regra 20-20-20', text: 'A cada 20 minutos, olhe durante 20 segundos para um objeto a 20 pés (cerca de 6 metros) de distância. Reduz a fadiga visual.' },
        ],
        quiz: [
          { type: 'mc', question: 'A que altura deve estar o topo do ecrã do computador?', options: ['Acima da cabeça', 'Ao nível dos olhos', 'À altura do peito', 'À altura do queixo'], answer: 1 },
          { type: 'tf', question: 'Manter os ombros tensos durante o trabalho é correto desde que se faça pausas.', answer: false, explanation: 'Os ombros devem estar sempre relaxados. Tensão prolongada é causa frequente de lesões cervicais.' },
          { type: 'mc', question: 'A regra 20-20-20 destina-se a:', options: ['Reduzir a fadiga visual', 'Aumentar a concentração', 'Melhorar a postura', 'Reduzir o stress auditivo'], answer: 0 },
          { type: 'tf', question: 'O ângulo recomendado para os joelhos quando sentado é próximo dos 90 graus.', answer: true },
          { type: 'mc', question: 'A distância recomendada entre os olhos e o ecrã situa-se entre:', options: ['10 a 20 cm', '30 a 40 cm', '50 a 70 cm', '90 a 120 cm'], answer: 2 },
        ],
      },
      {
        id: 'm3',
        title: 'Emergência e Primeiros Socorros',
        duration: '1h 15min',
        pages: 16,
        content: [
          { type: 'h1',   text: 'Módulo 3 — Emergência e Primeiros Socorros' },
          { type: 'lead', text: 'Saber como agir nos primeiros minutos de uma emergência pode fazer a diferença entre a vida e a morte. Este módulo apresenta os procedimentos essenciais.' },
          { type: 'h2',   text: '3.1 Plano de emergência interno' },
          { type: 'p',    text: 'Familiarize-se com as saídas de emergência, pontos de encontro e localização dos extintores e bocas-de-incêndio do seu local de trabalho.' },
          { type: 'h2',   text: '3.2 Procedimento PAS' },
          { type: 'list', items: ['Proteger — assegurar que a vítima e o socorrista estão fora de perigo', 'Alertar — ligar 112 e fornecer informação precisa', 'Socorrer — prestar os primeiros cuidados dentro das competências'] },
          { type: 'callout', label: 'Número europeu de emergência', text: 'O 112 é gratuito, funciona em qualquer telemóvel (mesmo sem rede) e atende em várias línguas.' },
        ],
        quiz: [
          { type: 'mc', question: 'O que significa "PAS" em primeiros socorros?', options: ['Prevenir, Avisar, Socorrer', 'Proteger, Alertar, Socorrer', 'Parar, Analisar, Salvar', 'Posicionar, Atender, Segurar'], answer: 1 },
          { type: 'tf', question: 'O número europeu de emergência (112) é gratuito e funciona em qualquer telemóvel.', answer: true },
          { type: 'mc', question: 'A primeira ação ao prestar socorro é:', options: ['Mover a vítima para um local seguro', 'Ligar 112 imediatamente', 'Garantir a segurança do local', 'Identificar a vítima'], answer: 2 },
          { type: 'tf', question: 'O 112 só funciona em telemóveis com cartão SIM e saldo.', answer: false, explanation: 'O 112 funciona em qualquer telemóvel, mesmo sem cartão SIM ou sem rede da operadora habitual.' },
        ],
      },
    ],
  },
  {
    id: 'comunicacao',
    title: 'Comunicação e Atendimento ao Cliente',
    subtitle: 'Competências interpessoais para um atendimento de excelência',
    duration: '2h 15min',
    category: 'Soft skills',
    passingScore: 60,
    modules: [
      {
        id: 'm1',
        title: 'Fundamentos da Comunicação',
        duration: '40 min',
        pages: 8,
        content: [
          { type: 'h1',   text: 'Módulo 1 — Fundamentos da Comunicação' },
          { type: 'lead', text: 'Comunicar é mais do que falar. Envolve escuta ativa, linguagem corporal, tom de voz e capacidade de adaptar a mensagem ao interlocutor.' },
          { type: 'h2',   text: '1.1 Os elementos da comunicação' },
          { type: 'list', items: ['Emissor', 'Recetor', 'Mensagem', 'Canal', 'Código', 'Contexto', 'Ruído'] },
          { type: 'h2',   text: '1.2 Comunicação verbal e não-verbal' },
          { type: 'p',    text: 'Estudos sugerem que numa interação presencial, a mensagem é transmitida em apenas 7% pelas palavras, 38% pelo tom de voz e 55% pela linguagem corporal.' },
          { type: 'callout', label: 'A reter', text: 'A escuta ativa é a competência mais subestimada e mais valiosa de qualquer profissional de atendimento.' },
        ],
        quiz: [
          { type: 'mc', question: 'Segundo o estudo de Mehrabian, que percentagem da mensagem é transmitida pela linguagem corporal?', options: ['7%', '38%', '55%', '93%'], answer: 2 },
          { type: 'tf', question: 'Comunicar é apenas a transmissão de palavras de um emissor para um recetor.', answer: false, explanation: 'A comunicação envolve múltiplos elementos: verbal, paraverbal, não-verbal, contexto e capacidade de escuta.' },
          { type: 'mc', question: 'Qual destes NÃO é um elemento da comunicação?', options: ['Emissor', 'Recetor', 'Canal', 'Empatia'], answer: 3 },
          { type: 'tf', question: 'A escuta ativa é uma competência menor no atendimento ao cliente.', answer: false, explanation: 'A escuta ativa é uma das competências mais importantes — permite compreender a verdadeira necessidade do cliente.' },
        ],
      },
      {
        id: 'm2',
        title: 'Gestão de Reclamações',
        duration: '45 min',
        pages: 10,
        content: [
          { type: 'h1',   text: 'Módulo 2 — Gestão de Reclamações' },
          { type: 'lead', text: 'Uma reclamação bem gerida pode transformar um cliente insatisfeito num cliente fidelizado. A forma como respondemos é mais importante do que o problema em si.' },
          { type: 'h2',   text: '2.1 O método LAST' },
          { type: 'list', items: ['Listen — ouvir sem interromper', 'Apologise — pedir desculpa de forma sincera', 'Solve — apresentar uma solução', 'Thank — agradecer o feedback'] },
          { type: 'callout', label: 'Estatística', text: 'Um cliente que vê o seu problema bem resolvido tem maior probabilidade de voltar a comprar do que um cliente que nunca teve qualquer problema.' },
        ],
        quiz: [
          { type: 'mc', question: 'O "S" do método LAST corresponde a:', options: ['Sorrir', 'Suportar', 'Solucionar', 'Silenciar'], answer: 2 },
          { type: 'tf', question: 'Interromper o cliente para esclarecer rapidamente um mal-entendido é uma boa prática.', answer: false, explanation: 'Devemos deixar o cliente terminar de expor a sua reclamação antes de responder. Interromper é desrespeitoso e dificulta a resolução.' },
          { type: 'mc', question: 'Uma reclamação bem gerida pode:', options: ['Fidelizar o cliente', 'Apenas atrasar o trabalho', 'Comprometer a marca', 'Ser ignorada se for menor'], answer: 0 },
          { type: 'tf', question: 'Pedir desculpa de forma sincera faz parte da gestão eficaz de uma reclamação.', answer: true },
        ],
      },
      {
        id: 'm3',
        title: 'Excelência no Atendimento',
        duration: '50 min',
        pages: 11,
        content: [
          { type: 'h1',   text: 'Módulo 3 — Excelência no Atendimento' },
          { type: 'lead', text: 'A excelência no atendimento resulta da combinação entre competências técnicas, atitude e cultura organizacional. Não é um momento, é uma prática contínua.' },
          { type: 'h2',   text: '3.1 Os 4 pilares da excelência' },
          { type: 'list', items: ['Conhecimento profundo do produto ou serviço', 'Empatia e adaptação ao perfil do cliente', 'Resposta atempada e cumprimento de promessas', 'Acompanhamento pós-atendimento'] },
          { type: 'h2',   text: '3.2 Indicadores de qualidade' },
          { type: 'p',    text: 'Os indicadores mais utilizados na medição da qualidade do atendimento incluem o NPS (Net Promoter Score), o CSAT (Customer Satisfaction Score) e o tempo médio de resposta.' },
          { type: 'callout', label: 'NPS', text: 'O Net Promoter Score mede a probabilidade de um cliente recomendar a marca, numa escala de 0 a 10.' },
        ],
        quiz: [
          { type: 'mc', question: 'O que significa NPS?', options: ['New Product Score', 'Net Promoter Score', 'National Performance Score', 'Negative Process Solution'], answer: 1 },
          { type: 'tf', question: 'O acompanhamento pós-atendimento é desnecessário se o cliente não apresentou queixa.', answer: false, explanation: 'O acompanhamento pós-atendimento é um pilar da excelência — fideliza e demonstra cuidado independentemente do resultado imediato.' },
          { type: 'mc', question: 'A escala utilizada pelo NPS vai de:', options: ['0 a 5', '0 a 10', '1 a 7', '1 a 100'], answer: 1 },
          { type: 'tf', question: 'A excelência no atendimento é um evento pontual, não uma prática contínua.', answer: false, explanation: 'A excelência é construída continuamente em todas as interações.' },
          { type: 'mc', question: 'Qual NÃO é um dos 4 pilares da excelência?', options: ['Conhecimento do produto', 'Empatia', 'Acompanhamento pós-atendimento', 'Velocidade máxima a qualquer custo'], answer: 3 },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

export function getCourse(courseId) {
  return COURSES.find(c => c.id === courseId) || null;
}

export function getModule(courseId, moduleId) {
  const course = getCourse(courseId);
  return course?.modules.find(m => m.id === moduleId) || null;
}

/** Returns { pct, completed, total, status, started } */
export function courseProgress(course, progress) {
  const cp = progress?.[course.id] || {};
  let completed = 0, started = 0;
  course.modules.forEach(m => {
    const mp = cp[m.id];
    if (mp?.quizPassed) completed++;
    if (mp?.read || mp?.quizPassed) started++;
  });
  const total = course.modules.length;
  const pct   = Math.round((completed / total) * 100);
  let status  = 'Não iniciada';
  if (completed === total) status = 'Concluída';
  else if (started > 0)   status = 'Em curso';
  return { pct, completed, total, status, started };
}

/** Returns the first in-progress course, or null. */
export function getResumeCourse(progress) {
  for (const c of COURSES) {
    const p = courseProgress(c, progress);
    if (p.pct > 0 && p.pct < 100) return c;
  }
  return null;
}

/** Returns global progress summary across all courses. */
export function globalProgress(progress) {
  let totalMods = 0, doneMods = 0, completedCourses = 0, inProgressCourses = 0;
  COURSES.forEach(c => {
    totalMods += c.modules.length;
    const cp = progress[c.id] || {};
    c.modules.forEach(m => { if (cp[m.id]?.quizPassed) doneMods++; });
    const p = courseProgress(c, progress);
    if (p.pct === 100) completedCourses++;
    else if (p.pct > 0) inProgressCourses++;
  });
  return {
    pct: Math.round((doneMods / totalMods) * 100),
    doneMods, totalMods, completedCourses, inProgressCourses,
  };
}
