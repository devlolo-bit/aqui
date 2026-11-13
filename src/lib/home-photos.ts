/*
 * Banco de fotografias de paisagem, hoje SEM USO.
 *
 * A Home passou a usar AppImage com um slot por eixo de reflexão, e as imagens
 * são geradas no Studio mostrando mulheres como protagonistas. Este arquivo
 * ficou para trás e pode ser apagado.
 *
 * A regra que estava escrita aqui, "não usar retratos de mulheres como assunto
 * central", contradizia o moodboard da marca e foi o que produziu as paisagens
 * genéricas no lugar das pessoas. Não reaproveite esta lista sem rever isso.
 */
export type HomeTheme =
  | 'liberdade'
  | 'conquista'
  | 'celebracao'
  | 'autonomia'
  | 'prosperidade'
  | 'estudar'
  | 'trabalhar'
  | 'descansar'
  | 'celebrar'
  | 'viajar'
  | 'empreender';

export type HomePhoto = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  theme: HomeTheme;
  license: string;
  source: string;
  status: 'publicada' | 'rascunho';
};

export const HOME_PHOTOS: HomePhoto[] = [
  {
    id: 'liberdade-horizonte',
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    alt: 'Praia aberta ao entardecer, com o mar até o horizonte',
    width: 1200,
    height: 800,
    theme: 'liberdade',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
  {
    id: 'liberdade-estrada',
    src: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    alt: 'Estrada reta atravessando uma paisagem aberta',
    width: 1200,
    height: 800,
    theme: 'liberdade',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
  {
    id: 'conquista-montanha',
    src: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1200&q=80',
    alt: 'Pico de montanha iluminado pelo sol da manhã',
    width: 1200,
    height: 800,
    theme: 'conquista',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
  {
    id: 'celebracao-brinde',
    src: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
    alt: 'Taças de vinho sobre uma mesa posta para um encontro',
    width: 1200,
    height: 800,
    theme: 'celebracao',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
  {
    id: 'autonomia-chave',
    src: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=1200&q=80',
    alt: 'Chave sobre uma superfície de madeira clara',
    width: 1200,
    height: 800,
    theme: 'autonomia',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
  {
    id: 'prosperidade-arquitetura',
    src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    alt: 'Arquitetura contemporânea com linhas limpas e luz natural',
    width: 1200,
    height: 800,
    theme: 'prosperidade',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
  {
    id: 'estudar-livros',
    src: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=80',
    alt: 'Pilha de livros sobre uma mesa de estudo',
    width: 1200,
    height: 800,
    theme: 'estudar',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
  {
    id: 'trabalhar-planejamento',
    src: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1200&q=80',
    alt: 'Mesa de trabalho com cadernos, canetas e um plano desenhado',
    width: 1200,
    height: 800,
    theme: 'trabalhar',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
  {
    id: 'descansar-natureza',
    src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
    alt: 'Floresta serena com luz filtrada entre as árvores',
    width: 1200,
    height: 800,
    theme: 'descansar',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
  {
    id: 'viajar-destino',
    src: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
    alt: 'Lago cercado de montanhas em dia claro',
    width: 1200,
    height: 800,
    theme: 'viajar',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
  {
    id: 'empreender-projeto',
    src: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80',
    alt: 'Escritório luminoso com quadro de projetos ao fundo',
    width: 1200,
    height: 800,
    theme: 'empreender',
    license: 'Unsplash License (uso comercial permitido)',
    source: 'Unsplash',
    status: 'publicada',
  },
];

/* Temas da rotação diária quando não há próxima ação registrada. */
export const ROTATION_THEMES: HomeTheme[] = ['liberdade', 'conquista', 'celebracao', 'autonomia', 'prosperidade'];

/* Palavras da próxima ação que indicam um tema contextual. */
const ACTIVITY_KEYWORDS: { match: RegExp; theme: HomeTheme }[] = [
  { match: /estud|aprend|curso|leitura|trilha/i, theme: 'estudar' },
  { match: /trabalh|planej|projeto|reuni/i, theme: 'trabalhar' },
  { match: /descans|relax|dormir|pausa/i, theme: 'descansar' },
  { match: /celebr|comemor|brinde|encontro/i, theme: 'celebrar' },
  { match: /viaj|viagem|destino|passeio/i, theme: 'viajar' },
  { match: /empreend|neg[óo]cio|marca|vend/i, theme: 'empreender' },
];

export function themeForActivity(title?: string | null): HomeTheme | null {
  if (!title) return null;
  const hit = ACTIVITY_KEYWORDS.find((k) => k.match.test(title));
  return hit ? hit.theme : null;
}

/* Dia do ano no horário local, estável durante o dia inteiro. */
export function localDayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/* Escolhe a foto: tema da atividade se houver; senão rotação diária da marca. */
export function pickHomePhoto(activityTitle: string | null, date: Date = new Date()): HomePhoto {
  const published = HOME_PHOTOS.filter((p) => p.status === 'publicada');
  const day = localDayOfYear(date);
  const activityTheme = themeForActivity(activityTitle);
  if (activityTheme) {
    const byActivity = published.filter((p) => p.theme === activityTheme);
    if (byActivity.length > 0) return byActivity[day % byActivity.length];
  }
  const rotation = published.filter((p) => ROTATION_THEMES.includes(p.theme));
  const pool = rotation.length > 0 ? rotation : published;
  return pool[day % pool.length];
}
