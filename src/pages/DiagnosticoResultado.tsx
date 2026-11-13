/*
 * TELA 1 — Perfil de Autonomia.
 *
 * Transforma as respostas da Tela 0 em leitura: onde ela está forte, o que
 * precisa de atenção, e como isso mudou entre um ciclo e outro.
 *
 * Decisão de linguagem: as dimensões mais baixas se chamam "pontos de
 * desenvolvimento", nunca fraquezas. A usuária do brandbook vem construir,
 * não se defender.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { ApiError, collection, useAuth } from '@/lib/fab-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner';
import {
  computeScores,
  DIMENSIONS,
  prioritiesFrom,
  stageFor,
  STAGE_LABEL,
  type AnswerRow,
  type AssessmentRow,
  type Scores,
} from '@/lib/mapa';
import { CYCLE_NAME, type Cycle } from '@/lib/diagnostico';

type Cycles = { assessment: AssessmentRow; scores: Scores };

function completedAt(a: AssessmentRow): string {
  const raw = a.completed_at ?? a.created_at;
  return raw ? new Date(raw).toLocaleDateString('pt-BR') : '';
}

function cycleOf(a: AssessmentRow): Cycle {
  const c = Number(a.cycle);
  return ([0, 4, 8, 12] as number[]).includes(c) ? (c as Cycle) : 0;
}

export default function DiagnosticoResultado() {
  const { user, isLoading: authLoading } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Cycles[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const list = await collection<AssessmentRow>('assessment').list({
        filter: { owner_id: user.id },
        sort: 'created_at',
        limit: 100,
      });
      const done = list.filter((a) => a.status === 'concluído' || !!a.completed_at);

      const built: Cycles[] = [];
      for (const a of done) {
        const answers = await collection<AnswerRow>('assessment_answer').list({
          filter: { assessment: a.id },
          limit: 200,
        });
        built.push({ assessment: a, scores: computeScores(answers) });
      }
      setHistory(built);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível carregar o seu resultado.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <EmptyState
          title="O seu perfil aparece depois do diagnóstico"
          description="São 42 afirmações, cerca de quinze minutos. É o que revela onde você está e monta o seu Mapa."
          action={<Button onClick={() => nav('/diagnostico')}>Fazer o Diagnóstico</Button>}
        />
      </div>
    );
  }

  const current = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const stage = stageFor(current.scores.overall);
  const priorities = prioritiesFrom(current.scores);
  const strengths = [...DIMENSIONS]
    .filter((d) => current.scores.byDimension[d.key] > 0)
    .sort((a, b) => current.scores.byDimension[b.key] - current.scores.byDimension[a.key])
    .slice(0, 2);

  const overallDelta = previous ? current.scores.overall - previous.scores.overall : null;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-primary-text">
          {CYCLE_NAME[cycleOf(current.assessment)]} · {completedAt(current.assessment)}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">O seu Perfil de Autonomia</h1>
        <p className="text-muted-foreground">
          Este é o retrato de hoje. Ele não define o seu teto, define o seu ponto de partida.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Autonomia geral</p>
          <div className="mt-1 flex items-end gap-3">
            <p className="text-7xl font-semibold tabular-nums tracking-tight">{current.scores.overall}%</p>
            {overallDelta !== null && (
              <span
                className={`mb-3 inline-flex items-center gap-1 text-sm font-medium ${
                  overallDelta > 0 ? 'text-primary-text' : overallDelta < 0 ? 'text-muted-foreground' : 'text-muted-foreground'
                }`}
              >
                {overallDelta > 0 ? (
                  <TrendingUp className="size-4" aria-hidden />
                ) : overallDelta < 0 ? (
                  <TrendingDown className="size-4" aria-hidden />
                ) : (
                  <Minus className="size-4" aria-hidden />
                )}
                {overallDelta > 0 ? '+' : ''}
                {overallDelta} pontos desde o ciclo anterior
              </span>
            )}
          </div>
          <p className="mt-2 text-base font-medium">Estágio: {STAGE_LABEL[stage]}</p>
        </div>

        <div className="rounded-2xl border border-border bg-primary/5 p-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-text">Para onde ir agora</p>
          <p className="text-sm">
            O seu Mapa foi montado a partir destas respostas e já aponta as duas prioridades abaixo.
          </p>
          <Button size="sm" onClick={() => nav('/mapa')}>
            Abrir o Mapa
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">As seis dimensões</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DIMENSIONS.map((d) => {
            const value = current.scores.byDimension[d.key];
            const before = previous?.scores.byDimension[d.key];
            const delta = typeof before === 'number' && before > 0 ? value - before : null;
            return (
              <div key={d.key} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold">{d.label}</h3>
                  <span className="tabular-nums text-sm text-muted-foreground">{value}%</span>
                </div>
                <Progress value={value} />
                <p className="text-sm text-muted-foreground">{d.role}</p>
                {delta !== null && delta !== 0 && (
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {delta > 0 ? '+' : ''}
                    {delta} desde o ciclo anterior
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">As suas potencialidades</h2>
          <p className="text-sm text-muted-foreground">
            O que já está firme. É daqui que sai a sua vantagem, não do que falta.
          </p>
          <ul className="space-y-3 pt-1">
            {strengths.map((d) => (
              <li key={d.key}>
                <p className="text-sm font-medium">
                  {d.label} · {current.scores.byDimension[d.key]}%
                </p>
                <p className="text-sm text-muted-foreground">{d.role}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">Os seus pontos de desenvolvimento</h2>
          <p className="text-sm text-muted-foreground">
            As duas dimensões que mais abrem caminho se receberem atenção agora.
          </p>
          <ul className="space-y-3 pt-1">
            {priorities.map((d) => (
              <li key={d.key}>
                <p className="text-sm font-medium">
                  {d.label} · {current.scores.byDimension[d.key]}%
                </p>
                <p className="text-sm text-muted-foreground">{d.role}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {history.length > 1 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">A sua evolução</h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium">Ciclo</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 text-right font-medium">Autonomia geral</th>
                </tr>
              </thead>
              <tbody>
                {history.map(({ assessment, scores }) => (
                  <tr key={assessment.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      {CYCLE_NAME[cycleOf(assessment)]}
                      {assessment.id === current.assessment.id && (
                        <Badge variant="secondary" className="ml-2">
                          Atual
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{completedAt(assessment)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{scores.overall}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
