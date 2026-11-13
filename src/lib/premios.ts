/*
 * TELA 7 — Prêmios e Reconhecimento.
 *
 * A página 78 do brandbook pede que os Prêmios sejam reconhecimento, e não
 * gamificação: reconhecer quem aprende, aplica e contribui, não quem consome
 * mais conteúdo. Por isso nenhuma medalha é dada por tempo de uso ou por
 * número de acessos.
 *
 * Tudo aqui é DERIVADO da atividade real, calculado na hora. Não existe
 * coleção de prêmios: uma medalha que precisa ser concedida pode ficar
 * desatualizada, e uma medalha calculada nunca mente.
 *
 * A página 76 pede critérios transparentes. Por isso cada nível diz
 * exatamente o que falta para o próximo.
 */

export type Level = 'nenhum' | 'bronze' | 'prata' | 'ouro';

export const LEVEL_LABEL: Record<Level, string> = {
  nenhum: 'Ainda não',
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
};

export type Activity = {
  /* Ações do plano concluídas. */
  actionsDone: number;
  /* Módulos de trilha concluídos. */
  modulesDone: number;
  /* Trilhas distintas iniciadas. */
  tracksStarted: number;
  /* Campos preenchidos do perfil de marca, de 0 a 4. */
  brandFields: number;
  /* Exercícios de autoliderança escritos. */
  exercisesDone: number;
  /* Turmas e encontros em que participa. */
  enrollments: number;
  /* Diagnósticos concluídos. */
  assessmentsDone: number;
};

export type Tier = { level: Exclude<Level, 'nenhum'>; threshold: number; description: string };

export type Category = {
  key: string;
  title: string;
  /* O que esta categoria reconhece, na voz da marca. */
  description: string;
  /* De onde sai o número. */
  unit: string;
  valueOf: (a: Activity) => number;
  tiers: [Tier, Tier, Tier];
};

export const CATEGORIES: Category[] = [
  {
    key: 'pessoal',
    title: 'Desenvolvimento Pessoal',
    description: 'Reconhece a dedicação às atividades de autoliderança e a evolução individual.',
    unit: 'exercícios de autoliderança escritos',
    valueOf: (a) => a.exercisesDone,
    tiers: [
      { level: 'bronze', threshold: 3, description: 'Três exercícios escritos' },
      { level: 'prata', threshold: 6, description: 'Seis exercícios escritos' },
      { level: 'ouro', threshold: 9, description: 'Os nove exercícios escritos' },
    ],
  },
  {
    key: 'intelectual',
    title: 'Desenvolvimento Intelectual',
    description: 'Reconhece a participação na Academia de Sabedorias e a conclusão de trilhas.',
    unit: 'módulos concluídos',
    valueOf: (a) => a.modulesDone,
    tiers: [
      { level: 'bronze', threshold: 1, description: 'Primeiro módulo concluído' },
      { level: 'prata', threshold: 5, description: 'Cinco módulos concluídos' },
      { level: 'ouro', threshold: 12, description: 'Doze módulos concluídos' },
    ],
  },
  {
    key: 'ativo',
    title: 'Construção do Ativo',
    description: 'Reconhece as etapas concluídas na construção da sua Marca Sustentável.',
    unit: 'campos do perfil de marca preenchidos',
    valueOf: (a) => a.brandFields,
    tiers: [
      { level: 'bronze', threshold: 1, description: 'Perfil de marca iniciado' },
      { level: 'prata', threshold: 3, description: 'Nome, segmento e propósito definidos' },
      { level: 'ouro', threshold: 4, description: 'Posicionamento definido' },
    ],
  },
  {
    key: 'comunidade',
    title: 'Participação na Comunidade',
    description: 'Reconhece a presença nos encontros e a colaboração com outras mulheres.',
    unit: 'turmas e encontros',
    valueOf: (a) => a.enrollments,
    tiers: [
      { level: 'bronze', threshold: 1, description: 'Primeira participação' },
      { level: 'prata', threshold: 3, description: 'Três participações' },
      { level: 'ouro', threshold: 6, description: 'Seis participações' },
    ],
  },
  {
    key: 'marcos',
    title: 'Conquistas e Marcos',
    description: 'Reconhece os marcos da sua jornada de autonomia.',
    unit: 'diagnósticos concluídos',
    valueOf: (a) => a.assessmentsDone,
    tiers: [
      { level: 'bronze', threshold: 1, description: 'Diagnóstico inicial concluído' },
      { level: 'prata', threshold: 2, description: 'Segundo ciclo concluído' },
      { level: 'ouro', threshold: 4, description: 'Ciclo anual completo' },
    ],
  },
];

export type Award = {
  category: Category;
  value: number;
  level: Level;
  /* O próximo degrau, ou null quando já está no ouro. */
  next: Tier | null;
  remaining: number;
};

export function awardFor(category: Category, activity: Activity): Award {
  const value = category.valueOf(activity);
  let level: Level = 'nenhum';
  for (const t of category.tiers) {
    if (value >= t.threshold) level = t.level;
  }
  const next = category.tiers.find((t) => value < t.threshold) ?? null;
  return {
    category,
    value,
    level,
    next,
    remaining: next ? next.threshold - value : 0,
  };
}

export function allAwards(activity: Activity): Award[] {
  return CATEGORIES.map((c) => awardFor(c, activity));
}

/* A pontuação total: três pontos por ouro, dois por prata, um por bronze.
 * Serve para a usuária ver o conjunto, não para ranquear mulheres entre si —
 * a Âmitse reconhece trajetória, não competição. */
export function pointsOf(awards: Award[]): number {
  const weight: Record<Level, number> = { nenhum: 0, bronze: 1, prata: 2, ouro: 3 };
  return awards.reduce((sum, a) => sum + weight[a.level], 0);
}

export const MAX_POINTS = CATEGORIES.length * 3;
