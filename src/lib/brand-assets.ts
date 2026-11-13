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
  /* Os mesmos valores de src/fab-theme.css. Antes havia aqui uma paleta
   * terracota que não era lida por nenhuma tela e contradizia o tema real. */
  colors: {
    primary: '#0125B9',
    accent: '#76FF01',
    base: '#ffffff',
    /* O azul do logo, mais saturado que o da interface. */
    logo: '#0000FF',
  },
  fonts: {
    display: 'Inter',
    body: 'IBM Plex Sans',
  },
  logo: '/brand/amitse-logo.svg',
  /* Logo oficial (PNG com fundo transparente, 3:1). */
  logoSrc: AMITSE_LOGO,
  forbiddenFont: 'Fraunces',
  images: {
    /* Fotografias geradas por IA com estética fotográfica realista. */
    style: 'fotográfica, realista, editorial premium, luz natural, contemporânea',
    /* O que as imagens DEVEM mostrar.
     * A lista de restrições abaixo trazia "mulheres como foco central", o que
     * fazia o gerador evitar justamente o que o moodboard pede. Era a causa das
     * paisagens genéricas no lugar das pessoas. */
    required: 'mulheres adultas como protagonistas, em posição e à vontade, diversas em idade e etnia',
    /* Restrições visuais obrigatórias da Âmitse®. */
    banned: [
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
