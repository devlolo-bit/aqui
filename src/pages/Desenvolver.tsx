/*
 * O estágio Desenvolver reúne a Academia (Tela 3) e a Autoliderança (Tela 4).
 *
 * Elas ficam juntas porque pertencem ao mesmo momento da jornada, e separadas
 * em abas porque a página 78 do brandbook pede exatamente isso: a Academia
 * amplia o repertório intelectual, a Autoliderança desenvolve a capacidade de
 * conduzir a si mesma. São complementares e têm finalidades diferentes.
 *
 * Cada aba mantém a sua própria rota, então um link direto para /academia ou
 * /autolideranca continua funcionando e abre a aba certa.
 */

import { useNavigate } from 'react-router-dom';
import { GraduationCap, Sprout } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Academia from '@/pages/Academia';
import Autolideranca from '@/pages/Autolideranca';

export type DesenvolverTab = 'academia' | 'autolideranca';

const ROUTE: Record<DesenvolverTab, string> = {
  academia: '/academia',
  autolideranca: '/autolideranca',
};

export default function Desenvolver({ tab }: { tab: DesenvolverTab }) {
  const nav = useNavigate();

  return (
    <div>
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <Tabs value={tab} onValueChange={(v) => nav(ROUTE[v as DesenvolverTab])}>
          <TabsList>
            <TabsTrigger value="academia">
              <GraduationCap className="size-4" aria-hidden />
              Academia
            </TabsTrigger>
            <TabsTrigger value="autolideranca">
              <Sprout className="size-4" aria-hidden />
              Autoliderança
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === 'academia' ? <Academia /> : <Autolideranca />}
    </div>
  );
}
