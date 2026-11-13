import { Home, Map, GraduationCap, Sprout, Users, MoreHorizontal } from 'lucide-react';
import { AppShell } from '@/components/ui/app-shell';

export const NAV = [
  { to: '/jornada', label: 'Início', icon: Home },
  { to: '/mapa', label: 'Mapa', icon: Map },
  { to: '/academia', label: 'Academia', icon: GraduationCap },
  { to: '/marca', label: 'Marca', icon: Sprout },
  { to: '/comunidade', label: 'Comunidade', icon: Users },
  { to: '/mais', label: 'Mais', icon: MoreHorizontal },
];

export default function Layout() {
  return <AppShell nav={NAV} desktop="top" />;
}
