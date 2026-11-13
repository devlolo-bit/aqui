/*
 * O estágio Construir reúne a Marca (Tela 5) e os Números.
 *
 * Ficam juntos porque são as duas metades do mesmo ativo: a marca é o que ela
 * constrói, os números são a prova de que está crescendo. Separados, a marca
 * vira discurso e os números viram planilha.
 *
 * Cada aba mantém a sua rota, então um link direto abre a aba certa.
 */

import { useNavigate } from 'react-router-dom';
import { Sprout, TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Marca from '@/pages/Marca';
import Numeros from '@/pages/Numeros';

export type ConstruirTab = 'marca' | 'numeros';

const ROUTE: Record<ConstruirTab, string> = {
  marca: '/marca',
  numeros: '/numeros',
};

export default function Construir({ tab }: { tab: ConstruirTab }) {
  const nav = useNavigate();

  return (
    <div>
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <Tabs value={tab} onValueChange={(v) => nav(ROUTE[v as ConstruirTab])}>
          <TabsList>
            <TabsTrigger value="marca">
              <Sprout className="size-4" aria-hidden />
              Minha marca
            </TabsTrigger>
            <TabsTrigger value="numeros">
              <TrendingUp className="size-4" aria-hidden />
              Meus números
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === 'marca' ? <Marca /> : <Numeros />}
    </div>
  );
}
