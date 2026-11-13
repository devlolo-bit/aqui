import { Home, Map, GraduationCap, Sprout, Users, MoreHorizontal } from 'lucide-react';
import { AppShell } from '@/components/ui/app-shell';

/* Seis itens, que é o limite confortável de uma barra no celular, e as nove
 * telas cabem dentro deles. Desenvolver abre na Academia e tem a Autoliderança
 * ao lado; os Prêmios ficam em Mais e são alcançáveis pela Home. */
export const NAV = [
  { to: '/inicio', label: 'Início', icon: Home },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/academia', label: 'Desenvolver', icon: GraduationCap },
  { to: '/marca', label: 'Marca', icon: Sprout },
  { to: '/comunidade', label: 'Comunidade', icon: Users },
  { to: '/mais', label: 'Mais', icon: MoreHorizontal },
];

export default function Layout() {
  return <AppShell nav={NAV} desktop="top" />;
}
