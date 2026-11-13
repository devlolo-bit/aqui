/*
 * O Diagnóstico da Autonomia — Tela 0.
 *
 * Quarenta e duas perguntas, sete por dimensão, na escala de 1 a 5.
 *
 * As perguntas falam com a usuária definida no brandbook: mulher que quer
 * empreender ou crescer profissionalmente e bancar as próprias escolhas. Por
 * isso são escritas no registro da construção, não do risco: perguntam o que
 * ela já sustenta, não o que lhe falta. Onde a pergunta natural seria negativa
 * ("sua receita depende de você estar presente?"), ela foi invertida, para que
 * a nota alta signifique sempre mais autonomia.
 *
 * As chaves são estáveis: uma resposta gravada não muda de dono se a ordem das
 * perguntas mudar depois.
 */

import { DIMENSIONS, SCALE_MAX, type DimensionKey, type AssessmentRow } from './mapa';

export type Question = {
  key: string;
  dimension: DimensionKey;
  text: string;
};

/* Os rótulos da escala. A usuária lê a palavra, não o número. */
export const SCALE_LABELS: Record<number, string> = {
  1: 'Nada',
  2: 'Pouco',
  3: 'Em parte',
  4: 'Bastante',
  5: 'Totalmente',
};

const TEXTS: Record<DimensionKey, string[]> = {
  energetica: [
    'A minha rotina respeita a minha energia e os meus limites.',
    'Termino a semana com energia para a minha própria vida, e não só para o trabalho.',
    'Consigo recusar um compromisso que vai me sobrecarregar.',
    'O meu descanso é parte do meu planejamento, e não o que sobra.',
    'Percebo o cansaço antes de ele virar esgotamento.',
    'A minha agenda comporta um imprevisto sem desmoronar.',
    'Separo o tempo de trabalho do tempo de cuidado com a casa e com outras pessoas.',
  ],
  emocional: [
    'Sustento as minhas decisões sem precisar da aprovação de outras pessoas.',
    'Reconheço o que sinto antes de reagir.',
    'Uma crítica ao meu trabalho não abala a minha confiança.',
    'Defendo o meu preço sem me desculpar.',
    'Lido com conflito sem ceder apenas para encerrar o assunto.',
    'Confio no meu próprio julgamento em decisões importantes.',
    'Peço ajuda quando preciso.',
  ],
  aspiracional: [
    'Tenho clareza sobre o futuro que quero construir.',
    'Sei dizer, em uma frase, onde quero estar daqui a três anos.',
    'As minhas escolhas do dia a dia caminham na direção desse futuro.',
    'Permito-me querer mais do que já tenho.',
    'Transformo vontade em plano com prazo.',
    'Reviso os meus objetivos quando o cenário muda.',
    'O que faço hoje tem a ver com o que me move.',
  ],
  profissional: [
    'Reconheço e comunico o valor do meu trabalho.',
    'Alguém de fora entenderia rápido o que eu faço e para quem.',
    'O meu trabalho se diferencia do que outras pessoas oferecem.',
    'Sei quais competências preciso desenvolver agora.',
    'A minha receita continua existindo quando eu não estou atendendo.',
    'Tenho processos registrados, que não dependem só da minha memória.',
    'Sou lembrada quando alguém precisa do que eu faço.',
  ],
  financeira: [
    'Gero, administro e faço crescer os meus próprios recursos.',
    'Sei quanto custa, de fato, entregar o meu trabalho.',
    'Separo o dinheiro do negócio do dinheiro pessoal.',
    'Planejo os próximos meses com alguma previsibilidade.',
    'Tenho reserva para atravessar um mês ruim.',
    'Os meus preços refletem o valor que eu entrego.',
    'Decido sobre o meu próprio dinheiro sem depender de outra pessoa.',
  ],
  relacional: [
    'Conto com uma rede que amplia as minhas oportunidades.',
    'Conheço pessoas que podem me indicar.',
    'Mantenho contato com quem já trabalhou comigo.',
    'Participo de espaços onde encontro outras mulheres da minha área.',
    'Peço e ofereço ajuda profissional com naturalidade.',
    'Tenho parcerias que geram negócio.',
    'Tenho com quem conversar antes de uma decisão difícil.',
  ],
};

export const QUESTIONS: Question[] = DIMENSIONS.flatMap((d) =>
  TEXTS[d.key].map((text, i) => ({
    key: `${d.key}_${i + 1}`,
    dimension: d.key,
    text,
  }))
);

export const TOTAL_QUESTIONS = QUESTIONS.length;

/* ------------------------------------------------------------------ *
 * As partes abertas
 *
 * A página 53 do brandbook previa quatro frentes no diagnóstico, e as notas de
 * 1 a 5 cobrem só a primeira. Identidade e Competências é inventário: o que ela
 * já sabe e já fez. Aspirações e Projetos é destino. Desafios e Oportunidades é
 * o que trava hoje.
 *
 * Nenhuma das três é pontuável, e tentar transformá-las em nota produziria
 * número sem sentido. Elas são texto, e é delas que a equipe Âmitse tira o
 * direcionamento e as sugestões de produto e serviço.
 *
 * Gravam no campo `text_answer` de `assessment_answer`, que já existia no banco
 * e estava sem uso.
 * ------------------------------------------------------------------ */

export type OpenSection = {
  key: string;
  title: string;
  intro: string;
  questions: { key: string; label: string; hint: string }[];
};

export const OPEN_SECTIONS: OpenSection[] = [
  {
    key: 'inventario',
    title: 'O que você já carrega',
    intro:
      'Antes de construir qualquer coisa, vale olhar o que já existe. Ninguém começa do zero: você chega aqui com conhecimento, prática e história.',
    questions: [
      {
        key: 'inventario_procuram',
        label: 'O que as pessoas te procuram para fazer?',
        hint: 'Mesmo que pareça simples demais, ou que você faça de graça hoje.',
      },
      {
        key: 'inventario_trajetoria',
        label: 'O que você já fez profissionalmente?',
        hint: 'Inclua o que parece não ter relação. Trajetória torta costuma guardar o diferencial.',
      },
      {
        key: 'inventario_formacao',
        label: 'Que formações, cursos ou vivências te formaram?',
        hint: 'Conta também o que você aprendeu fora da escola.',
      },
    ],
  },
  {
    key: 'aspiracoes',
    title: 'Onde você quer chegar',
    intro: 'Sem destino não há mapa. Pode escrever sem medir se é possível — a viabilidade a gente trabalha depois.',
    questions: [
      {
        key: 'aspiracoes_futuro',
        label: 'Como seria a sua vida daqui a três anos, se desse certo?',
        hint: 'Concreto: a rotina, o trabalho, o dinheiro, as pessoas.',
      },
      {
        key: 'aspiracoes_oferta',
        label: 'O que você gostaria de estar vendendo ou oferecendo?',
        hint: 'Mesmo que ainda não exista, ou que você ache que não dá conta.',
      },
      {
        key: 'aspiracoes_sucesso',
        label: 'O que seria dar certo, para você?',
        hint: 'Não para a sua família, nem para o mercado. Para você.',
      },
    ],
  },
  {
    key: 'desafios',
    title: 'O que trava hoje',
    intro: 'Esta é a parte que mais ajuda a equipe Âmitse a te direcionar. Quanto mais honesta, mais útil.',
    questions: [
      {
        key: 'desafios_trava',
        label: 'O que mais te impede de avançar hoje?',
        hint: 'Pode ser tempo, dinheiro, insegurança, falta de clareza, ou tudo junto.',
      },
      {
        key: 'desafios_tentou',
        label: 'O que você já tentou e não funcionou?',
        hint: 'Saber o que não deu certo evita te sugerir o mesmo caminho.',
      },
      {
        key: 'desafios_precisa',
        label: 'Do que você precisa agora e não tem?',
        hint: 'Conhecimento, estrutura, rede, uma decisão tomada.',
      },
    ],
  },
];

export const OPEN_QUESTION_KEYS: string[] = OPEN_SECTIONS.flatMap((s) => s.questions.map((q) => q.key));

export function questionsOf(dimension: DimensionKey): Question[] {
  return QUESTIONS.filter((q) => q.dimension === dimension);
}

/* ------------------------------------------------------------------ *
 * As janelas de acesso
 *
 * A página 55 do brandbook: a tela fica bloqueada fora dos marcos, e só abre
 * nos meses 0, 4, 8 e 12, ou por liberação da equipe Âmitse.
 *
 * A linha de base é o primeiro diagnóstico da usuária, e não a data de criação
 * da conta: é o dado que existe de forma confiável no próprio registro. Quem
 * nunca fez nenhum tem o ciclo 0 aberto.
 * ------------------------------------------------------------------ */

export const CYCLES = [0, 4, 8, 12] as const;
export type Cycle = (typeof CYCLES)[number];

export const CYCLE_NAME: Record<Cycle, string> = {
  0: 'Diagnóstico Inicial',
  4: 'Primeiro Acompanhamento',
  8: 'Segundo Acompanhamento',
  12: 'Avaliação Anual',
};

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  /* 31 de janeiro + 1 mês não pode virar 3 de março. */
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function isCompleted(a: AssessmentRow): boolean {
  return a.status === 'concluído' || !!a.completed_at;
}

function cycleOf(a: AssessmentRow): Cycle {
  const c = Number(a.cycle);
  return (CYCLES as readonly number[]).includes(c) ? (c as Cycle) : 0;
}

export type Access =
  | { state: 'open'; cycle: Cycle; assessment: AssessmentRow | null; reason: 'marco' | 'liberação' }
  | { state: 'locked'; cycle: Cycle; opensAt: Date; lastCompleted: AssessmentRow | null }
  | { state: 'finished'; lastCompleted: AssessmentRow };

/* Qual ciclo está aberto agora, e o que fazer com ele. */
export function accessFor(assessments: AssessmentRow[], now: Date = new Date()): Access {
  const rows = [...assessments].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));

  if (rows.length === 0) {
    return { state: 'open', cycle: 0, assessment: null, reason: 'marco' };
  }

  /* Liberação administrativa vence qualquer data. */
  const released = rows.find((a) => a.status === 'liberado');
  if (released) {
    return { state: 'open', cycle: cycleOf(released), assessment: released, reason: 'liberação' };
  }

  /* Um diagnóstico em andamento sempre pode ser retomado: ele foi aberto
   * dentro de uma janela válida e ficar preso no meio seria pior do que o
   * bloqueio pretende evitar. */
  const inProgress = rows.find((a) => !isCompleted(a) && a.status !== 'liberado');
  if (inProgress) {
    return { state: 'open', cycle: cycleOf(inProgress), assessment: inProgress, reason: 'marco' };
  }

  const baseline = new Date(rows[0].created_at ?? now.toISOString());
  const completed = rows.filter(isCompleted);
  const doneCycles = new Set(completed.map(cycleOf));
  const lastCompleted = completed.length > 0 ? completed[completed.length - 1] : null;

  for (const cycle of CYCLES) {
    if (doneCycles.has(cycle)) continue;
    const opensAt = addMonths(baseline, cycle);
    if (opensAt <= now) {
      return { state: 'open', cycle, assessment: null, reason: 'marco' };
    }
    return { state: 'locked', cycle, opensAt, lastCompleted };
  }

  /* Os quatro ciclos do primeiro ano estão completos. */
  if (lastCompleted) return { state: 'finished', lastCompleted };
  return { state: 'locked', cycle: 0, opensAt: baseline, lastCompleted: null };
}

/* Quantas das 42 foram respondidas. */
export function progressOf(answeredKeys: Set<string>): { answered: number; total: number; percent: number } {
  const answered = QUESTIONS.filter((q) => answeredKeys.has(q.key)).length;
  return {
    answered,
    total: TOTAL_QUESTIONS,
    percent: Math.round((answered / TOTAL_QUESTIONS) * 100),
  };
}

export { SCALE_MAX };
