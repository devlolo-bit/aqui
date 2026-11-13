/*
 * Identidade da Âmitse®: paleta e tipografia.
 * Os valores vivem aqui para que a mudança da marca seja feita em um lugar só.
 * Nada de hex solto nas telas: as telas usam os tokens (bg-primary, text-primary-text...).
 * As fontes são carregadas pelo tema da plataforma via --font-display / --font-sans;
 * aqui apenas referenciamos os nomes na variável para leitura do time.
 */
import { AMITSE_LOGO } from './amitse-logo-data';

export const BRAND = {
  name: 'Âmitse®',
  tagline: 'A Arquitetura da Autonomia da Mulher',
  colors: {
    primary: '#7a3b2e',
    accent: '#69FF01',
    base: '#f7f3ee',
  },
  fonts: {
    display: 'Sora',
    body: 'Inter',
  },
  logo: '/brand/amitse-logo.svg',
  /* Logo oficial (PNG com fundo transparente, 3:1). */
  logoSrc: AMITSE_LOGO,
  forbiddenFont: 'Fraunces',
  images: {
    /* Fotografias geradas por IA com estética fotográfica realista. */
    style: 'fotográfica, realista, editorial premium, luz natural, contemporânea',
    /* Restrições visuais obrigatórias da Âmitse®. */
    banned: [
      'mulheres como foco central',
      'ilustrações ou pinturas',
      'bebidas alcoólicas',
      'ultraprocessados ou frituras',
      'cigarro, vape ou tabaco',
      'ferro, metal pesado ou estética industrial',
      'armas, guerra ou violência',
      'ostentação ou excesso',
      'texto sobre a foto',
      'marcas de terceiros',
    ],
  },
} as const;
