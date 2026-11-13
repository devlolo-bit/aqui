/*
 * As seis dimensões da autonomia — fonte única da verdade.
 *
 * Origem no brandbook: as três primeiras são as autonomias da página 32
 * (energética, emocional, aspiracional); profissional e financeira vinham
 * fundidas em "Vida Profissional e Financeira" na página 53 e foram separadas,
 * porque uma mulher pode ter clareza profissional sem gestão financeira e
 * vice-versa; relacional vem do pilar 4 do Método.
 *
 * Nada de dimensão declarada em outro arquivo: as telas importam daqui.
 */

export type DimensionKey =
  | 'energetica'
  | 'emocional'
  | 'aspiracional'
  | 'profissional'
  | 'financeira'
  | 'relacional';

export type Dimension = {
  key: DimensionKey;
  label: string;
  /* A frase que aparece no card da Home, sob o rótulo. */
  role: string;
  /* A pergunta-âncora da dimensão. Na Fase 2 cada dimensão ganha sete
   * perguntas; esta continua sendo a primeira delas. */
  question: string;
};

export const DIMENSIONS: Dimension[] = [
  {
    key: 'energetica',
    label: 'Autonomia Energética',
    role: 'Sua energia e sua rotina sustentam o resto.',
    question: 'Em que medida a sua rotina respeita a sua energia e os seus limites?',
  },
  {
    key: 'emocional',
    label: 'Autonomia Emocional',
    role: 'Decidir sem depender de validação externa.',
    question: 'Em que medida você sustenta as suas decisões sem precisar da aprovação de outras pessoas?',
  },
  {
    key: 'aspiracional',
    label: 'Autonomia Aspiracional',
    role: 'Clareza sobre o futuro que você quer construir.',
    question: 'Em que medida você tem clareza sobre o futuro que quer construir?',
  },
  {
    key: 'profissional',
    label: 'Autonomia Profissional',
    role: 'Sua atuação, suas competências, seu posicionamento.',
    question: 'Em que medida você reconhece e comunica o valor do seu trabalho?',
  },
  {
    key: 'financeira',
    label: 'Autonomia Financeira',
    role: 'Gerar, administrar e multiplicar os próprios recursos.',
    question: 'Em que medida você gera, administra e faz crescer os seus próprios recursos?',
  },
  {
    key: 'relacional',
    label: 'Conexões',
    role: 'Redes de apoio ampliam o que você alcança.',
    question: 'Em que medida você conta com uma rede que amplia as suas oportunidades?',
  },
];

/* Rótulos legíveis dos estágios. A interface nunca mostra a chave crua. */
export const STAGE_LABEL = {
  DIAGNOSTICAR: 'Diagnosticar',
  DESENVOLVER: 'Desenvolver',
  CONSTRUIR: 'Construir',
  CONECTAR: 'Conectar',
  PROSPERAR: 'Prosperar',
} as const;

export type StageKey = keyof typeof STAGE_LABEL;

/* A escala de resposta do diagnóstico: 1 a 5. */
export const SCALE_MAX = 5;

/* Sete perguntas por dimensão, 42 no total. */
export const QUESTIONS_PER_DIMENSION = 7;

export type Scores = {
  byDimension: Record<DimensionKey, number>;
  overall: number;
  answered: number;
};

/* Um registro de diagnóstico, da coleção `assessment`. */
export type AssessmentRow = {
  id: string;
  owner_id?: string;
  cycle?: number;
  status?: string;
  created_at?: string;
  completed_at?: string | null;
};

/* Uma resposta, da coleção `assessment_answer`.
 * `dimension` guarda a chave da dimensão; `score` vai de 1 a SCALE_MAX. */
export type AnswerRow = {
  id: string;
  assessment?: string;
  dimension?: string;
  question_key?: string;
  score?: number | string;
  /* As respostas abertas do diagnóstico. Não viram nota: é delas que a equipe
   * Âmitse tira o direcionamento. */
  text_answer?: string | null;
};

function emptyByDimension(): Record<DimensionKey, number> {
  return {
    energetica: 0,
    emocional: 0,
    aspiracional: 0,
    profissional: 0,
    financeira: 0,
    relacional: 0,
  };
}

const DIMENSION_KEYS = new Set<string>(DIMENSIONS.map((d) => d.key));

function isDimensionKey(value: unknown): value is DimensionKey {
  return typeof value === 'string' && DIMENSION_KEYS.has(value);
}

/* Pontuação a partir das respostas de um diagnóstico.
 *
 * Agrupa por dimensão e converte a média para percentual. Uma dimensão sem
 * resposta fica fora da média geral — zero por falta de dado não é zero de
 * autonomia, e misturar os dois faria a usuária parecer pior do que está. */
export function computeScores(answers: AnswerRow[] | null | undefined): Scores {
  const byDimension = emptyByDimension();
  if (!answers || answers.length === 0) return { byDimension, overall: 0, answered: 0 };

  const totals = new Map<DimensionKey, { sum: number; count: number }>();

  for (const a of answers) {
    const key = a.dimension;
    if (!isDimensionKey(key)) continue;
    const score = Number(a.score);
    if (!Number.isFinite(score) || score <= 0) continue;
    const acc = totals.get(key) ?? { sum: 0, count: 0 };
    acc.sum += score;
    acc.count += 1;
    totals.set(key, acc);
  }

  let answered = 0;
  let sum = 0;

  for (const d of DIMENSIONS) {
    const acc = totals.get(d.key);
    if (!acc || acc.count === 0) continue;
    const percent = Math.round((acc.sum / (acc.count * SCALE_MAX)) * 100);
    byDimension[d.key] = percent;
    answered += 1;
    sum += percent;
  }

  return {
    byDimension,
    overall: answered ? Math.round(sum / answered) : 0,
    answered,
  };
}

/* O diagnóstico mais recente, preferindo um concluído. */
export function latestAssessment(rows: AssessmentRow[] | null | undefined): AssessmentRow | null {
  if (!rows || rows.length === 0) return null;
  const when = (r: AssessmentRow) => r.completed_at ?? r.created_at ?? '';
  const done = rows.filter((r) => r.status === 'concluído' || !!r.completed_at);
  const pool = done.length > 0 ? done : rows;
  return pool.reduce((newest, r) => (when(r) > when(newest) ? r : newest));
}

export function stageFor(overall: number): StageKey {
  if (overall >= 80) return 'PROSPERAR';
  if (overall >= 60) return 'CONECTAR';
  if (overall >= 40) return 'CONSTRUIR';
  if (overall >= 20) return 'DESENVOLVER';
  return 'DIAGNOSTICAR';
}

/* As duas dimensões mais baixas viram as prioridades do Mapa.
 * Dimensões sem resposta ficam de fora: não dá para priorizar o que não foi medido. */
export function prioritiesFrom(scores: Scores): Dimension[] {
  return DIMENSIONS.filter((d) => scores.byDimension[d.key] > 0)
    .sort((a, b) => scores.byDimension[a.key] - scores.byDimension[b.key])
    .slice(0, 2);
}
