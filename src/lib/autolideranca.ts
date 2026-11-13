/*
 * TELA 4 — Amadurecimento da Autoliderança.
 *
 * A página 32 do brandbook define três autonomias internas: energética,
 * emocional e aspiracional. Esta tela é a única do app que trabalha o que
 * acontece dentro da usuária, e por isso não repete o formato da Academia:
 * lá ela lê, aqui ela escreve.
 *
 * Os exercícios gravam em `journal_entry`, que já existe, com a categoria da
 * autonomia. Nada de modelo novo.
 *
 * A página 78 pede que Academia e Autoliderança não se confundam. A separação
 * aqui é de verbo: a Academia amplia repertório, a Autoliderança desenvolve a
 * capacidade de conduzir a si mesma.
 */

import type { DimensionKey } from './mapa';

export type Exercise = {
  key: string;
  title: string;
  /* O convite, em uma frase. */
  prompt: string;
  /* O que ela ganha ao terminar — aparece depois de salvar. */
  outcome: string;
};

export type Autonomy = {
  key: Extract<DimensionKey, 'energetica' | 'emocional' | 'aspiracional'>;
  label: string;
  /* O valor gravado em journal_entry.category. É uma lista fechada no schema,
   * então tem de bater caractere a caractere: minúsculas e sem acento. */
  journalCategory: string;
  summary: string;
  /* As categorias de `content` que alimentam esta autonomia, quando a equipe
   * publicar material no Studio. */
  cmsCategories: string[];
  exercises: Exercise[];
};

export const AUTONOMIES: Autonomy[] = [
  {
    key: 'energetica',
    label: 'Autonomia Energética',
    journalCategory: 'autonomia energetica',
    summary:
      'Reconhecer, administrar e preservar a sua energia, estabelecendo limites e construindo uma rotina compatível com as suas prioridades.',
    cmsCategories: ['Gestão da energia', 'Autocuidado', 'Formação de hábitos', 'Disciplina e constância'],
    exercises: [
      {
        key: 'energetica_semana',
        title: 'Mapa da minha semana real',
        prompt:
          'Descreva a sua semana como ela é, não como você gostaria que fosse. Onde está o trabalho, o cuidado com outras pessoas, o deslocamento, o descanso. Escreva sem corrigir.',
        outcome: 'Você acabou de ver onde o seu tempo realmente vai. É daqui que sai qualquer mudança de rotina.',
      },
      {
        key: 'energetica_limites',
        title: 'O que eu aceito e o que eu recuso',
        prompt:
          'Liste três compromissos que você aceitou no último mês e não deveria ter aceitado. Ao lado de cada um, escreva a frase que você poderia ter dito.',
        outcome: 'Recusar fica mais fácil quando a frase já existe. Guarde essas três.',
      },
      {
        key: 'energetica_vazamento',
        title: 'Onde a minha energia vaza',
        prompt:
          'O que te deixa exausta sem entregar resultado? Pode ser uma pessoa, um tipo de cliente, uma tarefa, um horário do dia. Nomeie sem suavizar.',
        outcome: 'O que foi nomeado pode ser negociado. O que fica difuso só se repete.',
      },
    ],
  },
  {
    key: 'emocional',
    label: 'Autonomia Emocional',
    journalCategory: 'autonomia emocional',
    summary:
      'Desenvolver autoconhecimento, inteligência emocional e segurança para lidar com pressões, conflitos e decisões sem depender da validação de outras pessoas.',
    cmsCategories: ['Autoliderança', 'Mentalidade e comportamento', 'Autonomia pessoal e profissional'],
    exercises: [
      {
        key: 'emocional_preco',
        title: 'A frase que sustenta o meu preço',
        prompt:
          'Escreva o preço do seu serviço e, embaixo, o que a pessoa recebe por ele. Depois escreva, em uma frase, o que você responde quando alguém diz que está caro.',
        outcome: 'Preço defendido é preço explicado. Essa frase serve na próxima conversa.',
      },
      {
        key: 'emocional_adiadas',
        title: 'Decisões que adiei, e por quê',
        prompt:
          'Liste duas decisões que você vem adiando. Ao lado de cada uma, escreva o que exatamente você teme que aconteça se decidir.',
        outcome: 'O medo escrito costuma ser menor do que o medo guardado. Releia em uma semana.',
      },
      {
        key: 'emocional_conversa',
        title: 'Conversa difícil: o que eu quero de fato',
        prompt:
          'Pense numa conversa que você precisa ter. Escreva três coisas: o que você quer que mude, o que você está disposta a ceder, e o que não é negociável.',
        outcome: 'Entrar numa conversa sabendo o inegociável é o que evita ceder só para encerrar o assunto.',
      },
    ],
  },
  {
    key: 'aspiracional',
    label: 'Autonomia Aspiracional',
    journalCategory: 'autonomia aspiracional',
    summary:
      'Reconhecer as suas ambições, desenvolver clareza sobre o futuro que deseja construir e transformar aspiração em escolha concreta.',
    cmsCategories: ['Autonomia pessoal e profissional', 'Construção de autoridade', 'Desenvolvimento intelectual'],
    exercises: [
      {
        key: 'aspiracional_tres_anos',
        title: 'Onde quero estar em três anos',
        prompt:
          'Descreva um dia comum da sua vida daqui a três anos. Que horas você acorda, com o que trabalha, quanto ganha, com quem convive. Concreto, não inspirador.',
        outcome: 'Um futuro descrito em detalhe vira critério de decisão. Um futuro vago não serve para escolher nada.',
      },
      {
        key: 'aspiracional_move',
        title: 'O que me move, em uma frase',
        prompt:
          'Sem usar as palavras sucesso, liberdade ou propósito, escreva o que você quer que o seu trabalho mude no mundo ou na sua vida.',
        outcome: 'Essa frase é o começo da sua proposta de valor. Leve-a para a tela Marca.',
      },
      {
        key: 'aspiracional_de_quem',
        title: 'De quem é o sonho que eu estou seguindo',
        prompt:
          'Liste o que você quer alcançar. Ao lado de cada item, escreva quem te ensinou a querer isso. Marque os que continuam fazendo sentido.',
        outcome: 'Autonomia aspiracional começa aqui: separar o que você quer do que te ensinaram a querer.',
      },
    ],
  },
];

export const ALL_EXERCISES: Exercise[] = AUTONOMIES.flatMap((a) => a.exercises);

export const AUTOLIDERANCA_CATEGORIES: string[] = Array.from(
  new Set(AUTONOMIES.flatMap((a) => a.cmsCategories))
);

export function autonomyOf(exerciseKey: string): Autonomy | undefined {
  return AUTONOMIES.find((a) => a.exercises.some((e) => e.key === exerciseKey));
}
