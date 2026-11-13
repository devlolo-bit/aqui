/**
 * The sign-in screens' settings for THIS app. The platform wrote it at the first build from the app's plan, its
 * auth settings and its brand; from then on it belongs to the app and can be edited like any other file.
 *
 * Copy rules the screens follow: `tagline` and `features` are shown only when they are filled, and nothing is ever
 * invented to fill an empty slot. A testimonial, stats or member photos appear only when they are real.
 */
export type AuthLayout =
  | 'centered-card'
  | 'split-photo'
  | 'split-brand-story'
  | 'photo-glass'
  | 'editorial-type'
  | 'native-sheet'
  | 'brutalist-grid'
  | 'luxury-soft'
  | 'playful-rounded'
  | 'saas-showcase'
  | 'community-wall'
  | 'color-block';

export type AuthSkin = 'default' | 'soft' | 'brutal' | 'playful';

export type AuthConfig = {
  layout: AuthLayout;
  skin: AuthSkin;
  /** split layouts: which side the brand panel sits on (desktop). */
  panelSide: 'left' | 'right';
  /** where a signed-in person lands when they did not come from a protected page. */
  home: string;
  /** b2c apps put the social buttons first; b2b and internal apps put the email form first. */
  socialFirst: boolean;
  /** false: accounts are created by invitation only, so the signup screen explains that instead of a form. */
  signupOpen: boolean;
  minPassword: number;
  emailVerification: 'off' | 'optional' | 'required';
  /** the social providers the owner enabled (google, apple, microsoft, facebook, github, discord). */
  providers: string[];
  /** the brand's own words for the side panels. Empty strings and lists hide their slot. */
  brand: {
    tagline: string;
    features: string[];
    testimonial: { quote: string; author: string; role?: string } | null;
    stats: { value: string; label: string }[];
  };
};

export const AUTH: AuthConfig = /*@fab:auth-config*/ {
  layout: 'community-wall',
  skin: 'default',
  panelSide: 'right',
  home: '/',
  socialFirst: true,
  signupOpen: true,
  minPassword: 6,
  emailVerification: 'optional',
  providers: ['google'],
  brand: {
    tagline: 'Construa as condições para bancar suas próprias escolhas.',
    features: ['Mapa da autonomia personalizado', 'Trilhas de autoliderança', 'Comunidade exclusiva de mulheres'],
    testimonial: null,
    stats: [],
  },
}; /*@fab:end*/
