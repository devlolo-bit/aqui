import { useEffect, useState, useCallback } from 'react';
import { collection, ApiError, useAuth } from '@/lib/fab-client';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Chart } from '@/lib/fab-client';
import { DIMENSIONS, computeScores, stageFor } from '@/lib/mapa';
import type { Row } from '@/lib/fab-client';

type Assessment = Row & { owner_id?: string; status?: string; created_at?: string };

export default function Mapa() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = (await collection<Assessment>('assessment').list({ sort: '-created_at', limit: 1 })) as Assessment[];
      const current = list.find((a) => a.status === 'em andamento') ?? list[0] ?? null;
      setAssessment(current);
      if (current) {
        const ans = (await collection<Row>('assessment_answer').list({
          filter: { assessment: current.id },
          limit: 200,
        })) as Row[];
        const map: Record<string, number> = {};
        ans.forEach((a) => {
          map[String(a.question_key)] = Number(a.score);
        });
        setAnswers(map);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível carregar seu mapa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isLoggedIn) return;
    void load();
  }, [isLoggedIn, isLoading, load]);

  const saveAnswer = async (question: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [question]: value }));
    if (!assessment) return;
    setSaving(true);
    try {
      await collection('assessment_answer').create({
        assessment: assessment.id,
        dimension: question,
        question_key: question,
        score: value,
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Resposta não salva. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const startAssessment = async () => {
    setSaving(true);
    try {
      const created = (await collection<Assessment>('assessment').create({
        owner_id: user?.id,
        status: 'em andamento',
        created_at: new Date().toISOString(),
      })) as Assessment;
      setAssessment(created);
      setAnswers({});
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível iniciar o diagnóstico. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (!assessment) return;
    setSaving(true);
    try {
      await collection('assessment').update(assessment.id, { status: 'concluído' });
      setAssessment({ ...assessment, status: 'concluído' });
      toast.success('Diagnóstico concluído.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível concluir. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const completed = assessment?.status === 'concluído';
  const scores = computeScores(answers);
  const stage = stageFor(scores.overall);

  if (!assessment) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-balance">Meu Mapa</h1>
        <p className="mt-2 text-muted-foreground">Um olhar integrado sobre a sua jornada.</p>
        <div className="mt-8">
          <EmptyState
            title="Você ainda não fez o seu diagnóstico"
            description="São cinco dimensões. Você pode pausar e retomar quando quiser, e cada resposta é salva."
            action={
              <Button onClick={startAssessment} disabled={saving}>
                Começar diagnóstico
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-primary-text">
          Mapa da Autonomia | Diagnosticar
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-balance">Meu Mapa</h1>
        <p className="text-muted-foreground">Você escolhe o próximo passo. Responda no seu ritmo.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
          <p className="text-sm text-muted-foreground">Estágio atual</p>
          <p className="text-7xl font-semibold tracking-[-0.02em] tabular-nums">{scores.overall}%</p>
          <p className="text-base font-medium">{stage}</p>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="secondary">{completed ? 'Concluído' : 'Em andamento'}</Badge>
            {assessment.created_at && (
              <span className="text-xs text-muted-foreground">
                Iniciado em {new Date(assessment.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">Próximo passo</h2>
          <p className="text-sm text-muted-foreground">
            {completed
              ? 'Revise seus pontos fortes e monte o seu plano.'
              : 'Responda as dimensões que ainda estão em branco.'}
          </p>
          {!completed && (
            <Button
              className="min-h-11 w-full sm:w-auto"
              onClick={finish}
              disabled={saving || scores.answered < DIMENSIONS.length}
            >
              Concluir diagnóstico
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-base font-semibold">Visão geral</h2>
          {scores.answered === 0 ? (
            <p className="text-sm text-muted-foreground">O gráfico aparece após as primeiras respostas.</p>
          ) : (
            <Chart
              type="bar"
              title="Visão geral"
              data={DIMENSIONS.map((d) => ({ label: d.label.slice(0, 4), value: scores.byDimension[d.key] }))}
            />
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-base font-semibold">Recomendações</h2>
          {scores.answered === 0 ? (
            <p className="text-sm text-muted-foreground">Responda as dimensões para receber recomendações.</p>
          ) : (
            <ul className="space-y-3">
              {[...DIMENSIONS]
                .filter((d) => answers[d.key] !== undefined)
                .sort((a, b) => scores.byDimension[a.key] - scores.byDimension[b.key])
                .slice(0, 2)
                .map((d) => (
                  <li key={d.key} className="space-y-1">
                    <p className="text-sm font-medium">
                      {d.label} ({scores.byDimension[d.key]}%)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {`Dedique atenção a ${d.label.toLowerCase()} e monte uma ação concreta no seu plano de desenvolvimento.`}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">Dimensões</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {DIMENSIONS.map((d) => (
            <div key={d.key} className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">{d.label}</h3>
                <span className="text-sm tabular-nums text-muted-foreground">{scores.byDimension[d.key]}%</span>
              </div>
              <Progress value={scores.byDimension[d.key]} />
              <fieldset className="space-y-3" disabled={completed}>
                <legend className="text-sm text-muted-foreground">{d.question}</legend>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Button
                      key={v}
                      type="button"
                      size="sm"
                      variant={answers[d.key] === v ? 'default' : 'outline'}
                      className="min-h-12 min-w-12 text-base"
                      aria-pressed={answers[d.key] === v}
                      onClick={() => saveAnswer(d.key, v)}
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </fieldset>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
