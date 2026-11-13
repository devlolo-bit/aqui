/*
 * Repertório de reflexões feministas da tela inicial.
 * Todas as entradas são reflexões autorais inspiradas no pensamento da pensadora
 * indicada. Nenhuma delas é apresentada como citação literal.
 */
export type ReflectionAxis = 'pessoal' | 'financeira' | 'profissional' | 'intelectual' | 'social' | 'emocional';

export type Reflection = {
  id: string;
  text: string;
  author: string;
  region: string;
  axis: ReflectionAxis;
  kind: 'reflexao';
  source?: string;
};

export const AXES: { key: ReflectionAxis; label: string; question: string }[] = [
  {
    key: 'pessoal',
    label: 'Autonomia Pessoal',
    question: 'Quem está decidindo os rumos da sua vida?',
  },
  {
    key: 'financeira',
    label: 'Autonomia Financeira',
    question: 'Você possui recursos para bancar suas próprias escolhas?',
  },
  {
    key: 'profissional',
    label: 'Autonomia Profissional',
    question: 'Sua carreira amplia ou limita suas possibilidades de escolha?',
  },
  {
    key: 'intelectual',
    label: 'Autonomia Intelectual',
    question: 'Você possui liberdade para pensar, questionar e construir suas próprias convicções?',
  },
  {
    key: 'social',
    label: 'Autonomia Social',
    question: 'Você possui condições sociais e redes de apoio para exercer seus direitos e suas escolhas?',
  },
  {
    key: 'emocional',
    label: 'Autonomia Emocional',
    question: 'Você consegue fazer escolhas coerentes com seus valores e estabelecer limites nas suas relações?',
  },
];

export const REFLECTIONS: Reflection[] = [
  // Brasil
  {
    id: 'lelia-gonzalez-1',
    text: 'Reconhecer a própria história é o primeiro gesto de autonomia de uma mulher.',
    author: 'Lélia Gonzalez',
    region: 'Brasil',
    axis: 'pessoal',
    kind: 'reflexao',
  },
  {
    id: 'sueli-carneiro-1',
    text: 'A construção de direitos começa quando uma mulher decide ocupar o espaço que já é seu.',
    author: 'Sueli Carneiro',
    region: 'Brasil',
    axis: 'social',
    kind: 'reflexao',
  },
  {
    id: 'heleieth-saffioti-1',
    text: 'Renda própria é mais que dinheiro: é o direito de escolher sem pedir licença.',
    author: 'Heleieth Saffioti',
    region: 'Brasil',
    axis: 'financeira',
    kind: 'reflexao',
  },
  {
    id: 'hildete-melo-1',
    text: 'O trabalho das mulheres produz valor, e começa a ser reconhecido quando passamos a contá-lo.',
    author: 'Hildete Pereira de Melo',
    region: 'Brasil',
    axis: 'profissional',
    kind: 'reflexao',
  },
  {
    id: 'djamila-ribeiro-1',
    text: 'Pensar por si mesma é um ato de coragem que amplia o poder de escolha de cada mulher.',
    author: 'Djamila Ribeiro',
    region: 'Brasil',
    axis: 'intelectual',
    kind: 'reflexao',
  },
  // Austrália
  {
    id: 'eva-cox-1',
    text: 'Uma sociedade que valoriza o cuidado oferece mais escolhas para quem o pratica.',
    author: 'Eva Cox',
    region: 'Austrália',
    axis: 'social',
    kind: 'reflexao',
  },
  {
    id: 'siobhan-austen-1',
    text: 'A desigualdade de gênero só muda quando a mulher acessa recursos e informação.',
    author: 'Siobhan Austen',
    region: 'Austrália',
    axis: 'financeira',
    kind: 'reflexao',
  },
  {
    id: 'anne-summers-1',
    text: 'Contar a história de uma mulher é devolver a ela o protagonismo da própria trajetória.',
    author: 'Anne Summers',
    region: 'Austrália',
    axis: 'pessoal',
    kind: 'reflexao',
  },
  {
    id: 'elizabeth-hill-1',
    text: 'Políticas que sustentam o cuidado devolvem tempo e escolha para quem cuida.',
    author: 'Elizabeth Hill',
    region: 'Austrália',
    axis: 'social',
    kind: 'reflexao',
  },
  // África
  {
    id: 'amina-mama-1',
    text: 'Desenvolvimento de verdade acontece quando a mulher dirige seu próprio percurso.',
    author: 'Amina Mama',
    region: 'Nigéria',
    axis: 'pessoal',
    kind: 'reflexao',
  },
  {
    id: 'oyeronke-oyewumi-1',
    text: 'Questionar as estruturas é abrir espaço para outras formas de pensar e viver.',
    author: 'Oyèrónkẹ́ Oyěwùmí',
    region: 'Nigéria',
    axis: 'intelectual',
    kind: 'reflexao',
  },
  {
    id: 'bisi-adeleye-fayemi-1',
    text: 'Liderança feminina cresce quando a mulher investe na própria formação e na de outras.',
    author: 'Bisi Adeleye-Fayemi',
    region: 'Nigéria',
    axis: 'profissional',
    kind: 'reflexao',
  },
  {
    id: 'dzodzi-tsikata-1',
    text: 'A autonomia econômica começa quando a mulher conhece e controla os próprios recursos.',
    author: 'Dzodzi Tsikata',
    region: 'Gana',
    axis: 'financeira',
    kind: 'reflexao',
  },
  {
    id: 'esther-ocloo-1',
    text: 'Empreender é o gesto de transformar conhecimento em sustento e em escolha.',
    author: 'Esther Ocloo',
    region: 'Gana',
    axis: 'profissional',
    kind: 'reflexao',
  },
  {
    id: 'sizaltina-cutaia-1',
    text: 'Educar uma mulher é ampliar o leque de escolhas de toda uma comunidade.',
    author: 'Sizaltina Cutaia',
    region: 'Angola',
    axis: 'intelectual',
    kind: 'reflexao',
  },
  {
    id: 'aurea-mouzinho-1',
    text: 'A transformação social acontece quando as mulheres se organizam em rede.',
    author: 'Âurea Mouzinho',
    region: 'Angola',
    axis: 'social',
    kind: 'reflexao',
  },
  // Europa
  {
    id: 'simone-de-beauvoir-1',
    text: 'Liberdade se constrói na escolha cotidiana de definir o próprio futuro.',
    author: 'Simone de Beauvoir',
    region: 'França',
    axis: 'pessoal',
    kind: 'reflexao',
  },
  {
    id: 'silvia-federici-1',
    text: 'Reconhecer o trabalho invisível é o primeiro passo para valorizar e remunerá-lo.',
    author: 'Silvia Federici',
    region: 'Itália',
    axis: 'financeira',
    kind: 'reflexao',
  },
  {
    id: 'diane-elson-1',
    text: 'Políticas públicas com perspectiva de gênero ampliam a autonomia econômica das mulheres.',
    author: 'Diane Elson',
    region: 'Reino Unido',
    axis: 'financeira',
    kind: 'reflexao',
  },
  {
    id: 'rosa-luxemburg-1',
    text: 'Pensar o mundo com as próprias palavras é um ato de coragem intelectual.',
    author: 'Rosa Luxemburg',
    region: 'Polônia',
    axis: 'intelectual',
    kind: 'reflexao',
  },
  {
    id: 'ingrid-robeyns-1',
    text: 'Autonomia se mede pelas capacidades reais que cada mulher tem de viver como escolhe.',
    author: 'Ingrid Robeyns',
    region: 'Holanda',
    axis: 'pessoal',
    kind: 'reflexao',
  },
  {
    id: 'christine-delphy-1',
    text: 'O trabalho doméstico produz valor e merece ser visto, contado e respeitado.',
    author: 'Christine Delphy',
    region: 'França',
    axis: 'profissional',
    kind: 'reflexao',
  },
  // Américas
  {
    id: 'angela-davis-1',
    text: 'Autonomia coletiva cresce quando mulheres decidem juntas os caminhos que querem seguir.',
    author: 'Angela Davis',
    region: 'Estados Unidos',
    axis: 'social',
    kind: 'reflexao',
  },
  {
    id: 'bell-hooks-1',
    text: 'Pensar de forma crítica é uma ferramenta de liberdade para quem escolhe o próprio caminho.',
    author: 'bell hooks',
    region: 'Estados Unidos',
    axis: 'intelectual',
    kind: 'reflexao',
  },
  {
    id: 'nancy-folbre-1',
    text: 'Cuidar também é trabalho, e reconhecê-lo abre espaço para escolhas mais livres.',
    author: 'Nancy Folbre',
    region: 'Estados Unidos',
    axis: 'social',
    kind: 'reflexao',
  },
  {
    id: 'kimberle-crenshaw-1',
    text: 'Cada mulher carrega experiências que merecem ser ouvidas como ponto de partida de decisão.',
    author: 'Kimberlé Crenshaw',
    region: 'Estados Unidos',
    axis: 'pessoal',
    kind: 'reflexao',
  },
  {
    id: 'marcela-lagarde-1',
    text: 'Autonomia é sustentar as próprias escolhas, com liberdade e responsabilidade.',
    author: 'Marcela Lagarde',
    region: 'México',
    axis: 'emocional',
    kind: 'reflexao',
  },
  {
    id: 'alicia-giron-1',
    text: 'Acesso a crédito e informação financeira muda o lugar da mulher na economia.',
    author: 'Alicia Girón',
    region: 'México',
    axis: 'financeira',
    kind: 'reflexao',
  },
  {
    id: 'julieta-paredes-1',
    text: 'A construção da própria trajetória se sustenta na rede de mulheres que caminha junto.',
    author: 'Julieta Paredes',
    region: 'Bolívia',
    axis: 'social',
    kind: 'reflexao',
  },
  {
    id: 'rita-segato-1',
    text: 'Estabelecer limites é um gesto de autonomia nas relações e um direito de cada mulher.',
    author: 'Rita Segato',
    region: 'Argentina',
    axis: 'emocional',
    kind: 'reflexao',
  },
];

const EMO_AXIS: ReflectionAxis[] = ['pessoal', 'emocional', 'intelectual', 'social'];

/* Escolhe a reflexão do dia, estável durante todo o dia.
 * O eixo priorizado segue o estágio da jornada; quando não há dados suficientes,
 * a rotação é equilibrada entre os seis eixos. */
export function pickReflection(
  stage: string | null,
  date: Date = new Date()
): { reflection: Reflection; axis: (typeof AXES)[number] } {
  const day = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const priorityAxis: ReflectionAxis | null =
    stage === 'DESENVOLVER'
      ? 'intelectual'
      : stage === 'CONSTRUIR'
        ? 'profissional'
        : stage === 'CONECTAR'
          ? 'social'
          : stage === 'PROSPERAR'
            ? 'financeira'
            : null;

  const pool = priorityAxis
    ? REFLECTIONS.filter((r) => r.axis === priorityAxis)
    : REFLECTIONS.filter((r) => EMO_AXIS.includes(r.axis));
  const list = pool.length > 0 ? pool : REFLECTIONS;
  const reflection = list[day % list.length];
  return {
    reflection,
    axis: AXES.find((a) => a.key === reflection.axis) ?? AXES[0],
  };
}
