/*
 * TELA 7 — Prêmios e Reconhecimento, com os Benefícios como aba.
 *
 * Os Benefícios vieram da tela Mais, onde estavam soltos. São o pilar 5 do
 * Método, e ficam ao lado do reconhecimento porque os dois pertencem ao mesmo
 * estágio da jornada: Prosperar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gift, Medal, Trophy } from 'lucide-react';
import { ApiError, collection, useAuth } from '@/lib/fab-client';
import type { Row } from '@/lib/fab-client';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { allAwards, LEVEL_LABEL, MAX_POINTS, pointsOf, type Activity, type Level } from '@/lib/premios';
import { ALL_EXERCISES } from '@/lib/autolideranca';

type Benefit = Row & { name?: string; description?: string; category?: string };

const EMPTY_ACTIVITY: Activity = {
  actionsDone: 0,
  modulesDone: 0,
  tracksStarted: 0,
  brandFields: 0,
  exercisesDone: 0,
  enrollments: 0,
  assessmentsDone: 0,
};

const LEVEL_STYLE: Record<Level, string> = {
  nenhum: 'border-border bg-muted text-muted-foreground',
  bronze: 'border-amber-700/30 bg-amber-700/10 text-amber-800 dark:text-amber-300',
  prata: 'border-slate-400/40 bg-slate-400/10 text-slate-600 dark:text-slate-300',
  ouro: 'border-primary/30 bg-primary/10 text-primary-text',
};

export default function Premios() {
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity>(EMPTY_ACTIVITY);
  const [benefits, setBenefits] = useState<Benefit[] | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [actions, progress, brand, journal, enrollments, assessments, benefitRows] = await Promise.all([
        /* action herda a dona pelo plano (owner_via), não tem owner_id próprio. */
        collection<Row>('action').list({ limit: 300 }),
        collection<Row>('track_progress').list({ filter: { owner_id: user.id }, limit: 300 }),
        collection<Row>('brand_profile').list({ filter: { owner_id: user.id }, limit: 1 }),
        collection<Row>('journal_entry').list({ filter: { owner_id: user.id }, limit: 300 }),
        collection<Row>('class_enrollment').list({ filter: { owner_id: user.id }, limit: 100 }),
        collection<Row>('assessment').list({ filter: { owner_id: user.id }, limit: 100 }),
        collection<Benefit>('benefit').list({ limit: 100 }),
      ]);

      const brandRow = brand[0];
      const brandFields = brandRow
        ? ['name', 'segment', 'purpose', 'positioning'].filter((f) => String(brandRow[f] ?? '').trim()).length
        : 0;

      const exerciseTitles = new Set(ALL_EXERCISES.map((e) => e.title));
      const exercisesDone = journal.filter(
        (j) => exerciseTitles.has(String(j.title)) && String(j.body ?? '').trim()
      ).length;

      setActivity({
        actionsDone: actions.filter((a) => a.done === true).length,
        modulesDone: progress.filter((p) => p.completed === true).length,
        tracksStarted: new Set(progress.map((p) => String(p.track))).size,
        brandFields,
        exercisesDone,
        enrollments: enrollments.length,
        assessmentsDone: assessments.filter((a) => a.status === 'concluído' || !!a.completed_at).length,
      });
      setBenefits(benefitRows);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível carregar os seus prêmios.');
      setBenefits([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  const awards = useMemo(() => allAwards(activity), [activity]);
  const points = useMemo(() => pointsOf(awards), [awards]);

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-primary-text">Prosperar</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Prêmios e Benefícios</h1>
        <p className="max-w-prose text-muted-foreground">
          O reconhecimento aqui é da sua trajetória, não do seu tempo de uso. Cada medalha vem do que você construiu, e
          os critérios estão à vista.
        </p>
      </header>

      <Tabs defaultValue="premios">
        <TabsList>
          <TabsTrigger value="premios">
            <Trophy className="size-4" aria-hidden />
            Reconhecimento
          </TabsTrigger>
          <TabsTrigger value="beneficios">
            <Gift className="size-4" aria-hidden />
            Benefícios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="premios" className="space-y-6 pt-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Conquistas</p>
            <p className="mt-1 text-5xl font-semibold tabular-nums tracking-tight">
              {points}
              <span className="text-2xl text-muted-foreground"> / {MAX_POINTS}</span>
            </p>
            <div className="mt-3 max-w-sm">
              <Progress value={Math.round((points / MAX_POINTS) * 100)} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Um ponto por bronze, dois por prata, três por ouro. A contagem é sua: a Âmitse reconhece trajetória, não
              competição entre mulheres.
            </p>
          </div>

          <ul className="space-y-4">
            {awards.map((a) => (
              <li key={a.category.key} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-base font-semibold">{a.category.title}</h2>
                    <p className="text-sm text-muted-foreground">{a.category.description}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                      LEVEL_STYLE[a.level]
                    )}
                  >
                    <Medal className="size-3.5" aria-hidden />
                    {LEVEL_LABEL[a.level]}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-sm tabular-nums">
                    {a.value} {a.category.unit}
                  </p>
                  {a.next ? (
                    <p className="text-sm text-muted-foreground">
                      Faltam {a.remaining} para o {LEVEL_LABEL[a.next.level].toLowerCase()}: {a.next.description}.
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-primary-text">Nível máximo nesta categoria.</p>
                  )}
                </div>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {a.category.tiers.map((t) => (
                    <li
                      key={t.level}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs',
                        a.value >= t.threshold ? LEVEL_STYLE[t.level] : 'border-dashed border-border text-muted-foreground'
                      )}
                    >
                      {LEVEL_LABEL[t.level]} · {t.description}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="beneficios" className="space-y-4 pt-6">
          <p className="max-w-prose text-sm text-muted-foreground">
            Vantagens, descontos e condições especiais entre as integrantes e com parceiros da Âmitse. É a rede
            movimentando a própria economia.
          </p>
          {benefits === null || benefits.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="Nenhum benefício publicado ainda"
              description="Os benefícios aparecem aqui assim que forem aprovados pela administração."
            />
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {benefits.map((b) => (
                <li key={b.id} className="px-5 py-4">
                  <p className="font-medium">{b.name}</p>
                  {b.category && <p className="text-sm text-muted-foreground">{b.category}</p>}
                  {b.description && <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>}
                  {!b.category && !b.description && <Badge variant="outline" className="mt-1">Disponível</Badge>}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
