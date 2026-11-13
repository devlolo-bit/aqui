import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type ActionLike = { id: string; done: boolean; date: string | null };
type ModuleLike = { id: string; date: string | null };
type AssetLike = { id: string; source: string };

type GraphProps = {
  actions: ActionLike[];
  modules: ModuleLike[];
  assets: AssetLike[];
};

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function lastNMonths(n: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/* Gráfico de barras com dados reais, sem duplicar conclusões.
 * Ações concluídas usam a data real de conclusão; módulos usam a data do
 * registro; ativos são contados uma única vez por origem. */
export function Graph({ actions, modules, assets }: GraphProps) {
  const months = useMemo(() => lastNMonths(6), []);

  const actionSeries = useMemo(() => {
    const seen = new Set<string>();
    const byMonth = new Map<string, number>();
    for (const a of actions) {
      if (!a.done || !a.date || seen.has(a.id)) continue;
      seen.add(a.id);
      const k = monthKey(a.date);
      byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
    }
    return months.map((m) => byMonth.get(m) ?? 0);
  }, [actions, months]);

  const moduleSeries = useMemo(() => {
    const seen = new Set<string>();
    const byMonth = new Map<string, number>();
    for (const m of modules) {
      if (!m.date || seen.has(m.id)) continue;
      seen.add(m.id);
      const k = monthKey(m.date);
      byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
    }
    return months.map((m) => byMonth.get(m) ?? 0);
  }, [modules, months]);

  const assetTotal = useMemo(() => {
    const seen = new Set<string>();
    for (const a of assets) {
      seen.add(a.source);
    }
    return seen.size;
  }, [assets]);

  const maxVal = Math.max(1, ...actionSeries, ...moduleSeries);

  const totalActions = actionSeries.reduce((a, b) => a + b, 0);
  const totalModules = moduleSeries.reduce((a, b) => a + b, 0);

  const isEmpty = totalActions === 0 && totalModules === 0 && assetTotal === 0;

  if (isEmpty) {
    return (
      <Card className="mt-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Cada construção começa com um primeiro passo. Suas conquistas aparecerão aqui à medida que você avançar.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 p-5">
      <p className="text-xs font-medium tracking-widest text-primary-text uppercase">Últimos 6 meses</p>
      <div className="mt-4 flex items-end gap-2" role="img" aria-label="Evolução de ações e módulos concluídos">
        {months.map((m, i) => {
          const aVal = actionSeries[i];
          const mVal = moduleSeries[i];
          const aH = (aVal / maxVal) * 100;
          const mH = (mVal / maxVal) * 100;
          return (
            <div key={m} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end gap-1">
                <div
                  className="flex-1 rounded-t bg-primary"
                  style={{ height: `${Math.max(aH, aVal > 0 ? 8 : 0)}%` }}
                  title={`Ações: ${aVal}`}
                />
                <div
                  className="flex-1 rounded-t bg-primary/40"
                  style={{ height: `${Math.max(mH, mVal > 0 ? 8 : 0)}%` }}
                  title={`Módulos: ${mVal}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{MONTH_LABELS[Number(m.slice(5, 7)) - 1]}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Ações concluídas</p>
          <p className="text-xl font-bold tabular-nums text-foreground">{totalActions}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Módulos concluídos</p>
          <p className="text-xl font-bold tabular-nums text-foreground">{totalModules}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ativos construídos</p>
          <p className="text-xl font-bold tabular-nums text-foreground">{assetTotal}</p>
        </div>
      </div>
    </Card>
  );
}

export function GraphSkeleton() {
  return <Skeleton className="mt-4 h-48 w-full" />;
}
