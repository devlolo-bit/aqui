/*
 * TELA 2 — Mapa da Autonomia.
 *
 * A página 78 do brandbook pede que o Mapa seja o centro inteligente da
 * plataforma, e não mais uma aba. Aqui isso é uma cadeia: o diagnóstico gera a
 * pontuação, as duas dimensões mais baixas viram prioridades, cada prioridade
 * aponta para o ambiente que a desenvolve, e a ação criada a partir dela é o
 * que a Home mostra como próximo passo.
 *
 * O questionário saiu daqui: ele é a Tela 0, em /diagnostico. Esta tela lê o
 * resultado e direciona.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Gift, Medal, Plus } from 'lucide-react';
import { ApiError, collection, useAuth } from '@/lib/fab-client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner';
import type { Row } from '@/lib/fab-client';
import {
  computeScores,
  DIMENSIONS,
  latestAssessment,
  prioritiesFrom,
  stageFor,
  STAGE_LABEL,
  type AnswerRow,
  type AssessmentRow,
  type Dimension,
  type DimensionKey,
  type Scores,
} from '@/lib/mapa';
import { allAwards, LEVEL_LABEL, type Activity } from '@/lib/premios';
import { ALL_EXERCISES } from '@/lib/autolideranca';

type Track = Row & {
  title?: string;
  description?: string;
  dimension?: string;
  essential?: boolean;
  position?: number;
};
type ContentRow = Row & {
  title?: string;
  category?: string;
  dimension?: string;
  essential?: boolean;
  position?: number;
};
type ActionRow = { id: string; title: string; done: boolean; dimension?: string; development_plan?: string };
type PlanRow = { id: string; title?: string; owner_id?: string; priority?: string };

/* O plano que o Mapa cria para pendurar as ações.
 * `action` não tem owner_id: o schema a liga à dona através do plano
 * (owner_via: development_plan). Uma ação sem plano ficaria sem dona. */
const MAPA_PLAN_TITLE = 'Meu Mapa da Autonomia';

/* Para onde cada dimensão leva, segundo o mapeamento da arquitetura.
 * Autoliderança ainda não tem tela própria: até a Fase 3, as três autonomias
 * internas são desenvolvidas pela Academia. */
const DESTINATION: Record<DimensionKey, { to: string; label: string; how: string }> = {
  energetica: { to: '/academia', label: 'Academia', how: 'Gestão da energia e construção de rotina.' },
  emocional: { to: '/academia', label: 'Academia', how: 'Autoliderança e segurança para decidir.' },
  aspiracional: { to: '/academia', label: 'Academia', how: 'Clareza de objetivos e projeto de futuro.' },
  profissional: { to: '/marca', label: 'Marca', how: 'Posicionamento, proposta de valor e autoridade.' },
  financeira: { to: '/marca', label: 'Marca', how: 'Precificação, custos e previsibilidade de receita.' },
  relacional: { to: '/comunidade', label: 'Comunidade', how: 'Rede, parcerias e indicações.' },
};

/* Sugestão de ação inicial por dimensão, para a usuária não começar do zero. */
const FIRST_ACTION: Record<DimensionKey, string> = {
  energetica: 'Bloquear na agenda um período semanal que não aceita compromisso',
  emocional: 'Escrever o preço do meu serviço e a frase que o sustenta',
  aspiracional: 'Escrever em uma frase onde quero estar daqui a três anos',
  profissional: 'Escrever em duas linhas o que eu faço e para quem',
  financeira: 'Levantar quanto custa entregar o meu serviço hoje',
  relacional: 'Retomar contato com três pessoas que já trabalharam comigo',
};

/* A ordem em que o material aparece: o essencial primeiro, depois o campo
 * Ordem, depois o título. É o que transforma uma biblioteca numa sequência
 * pronta para executar. */
function rank<T extends { essential?: boolean; position?: number; title?: string }>(a: T, b: T): number {
  if (!!b.essential !== !!a.essential) return b.essential ? 1 : -1;
  const pa = typeof a.position === 'number' ? a.position : 9999;
  const pb = typeof b.position === 'number' ? b.position : 9999;
  if (pa !== pb) return pa - pb;
  return String(a.title ?? '').localeCompare(String(b.title ?? ''));
}

/* Casa pelo campo `dimension`, que é o jeito exato.
 * Enquanto as trilhas e os conteúdos não estiverem etiquetados, cai no
 * casamento por palavra no título — pior, mas melhor do que lista vazia. */
function pickFor<T extends { id: string; dimension?: string; title?: string; essential?: boolean; position?: number }>(
  items: T[],
  d: Dimension,
  limit: number
): { items: T[]; tagged: boolean } {
  const tagged = items.filter((t) => String(t.dimension ?? '').trim() === d.key);
  if (tagged.length > 0) return { items: [...tagged].sort(rank).slice(0, limit), tagged: true };

  const needle = d.label.toLowerCase().replace('autonomia ', '');
  const loose = items.filter((t) => String(t.title ?? '').toLowerCase().includes(needle));
  return { items: loose.slice(0, limit), tagged: false };
}

export default function Mapa() {
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Scores | null>(null);
  const [assessment, setAssessment] = useState<AssessmentRow | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [benefits, setBenefits] = useState<{ id: string; name?: string; category?: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [assessRows, trackRows, contentRows, actionRows, planRows, progressRows, brandRows, journalRows, enrollRows, benefitRows] =
        await Promise.all([
        collection<AssessmentRow>('assessment').list({ filter: { owner_id: user.id }, limit: 100 }),
        collection<Track>('track').list({ limit: 200 }),
        collection<ContentRow>('content').list({ limit: 300 }),
        collection<ActionRow>('action').list({ limit: 200 }),
        collection<PlanRow>('development_plan').list({ filter: { owner_id: user.id }, limit: 20 }),
        collection<Row>('track_progress').list({ filter: { owner_id: user.id }, limit: 300 }),
        collection<Row>('brand_profile').list({ filter: { owner_id: user.id }, limit: 1 }),
        collection<Row>('journal_entry').list({ filter: { owner_id: user.id }, limit: 300 }),
        collection<Row>('class_enrollment').list({ filter: { owner_id: user.id }, limit: 100 }),
        collection<{ id: string; name?: string; category?: string }>('benefit').list({ limit: 20 }),
      ]);
      setTracks(trackRows);
      setContents(contentRows);
      setActions(actionRows);
      setPlan(planRows.find((p) => p.title === MAPA_PLAN_TITLE) ?? planRows[0] ?? null);
      setBenefits(benefitRows);

      const brandRow = brandRows[0];
      const exerciseTitles = new Set(ALL_EXERCISES.map((e) => e.title));
      setActivity({
        actionsDone: actionRows.filter((a) => a.done).length,
        modulesDone: progressRows.filter((pr) => pr.completed === true).length,
        tracksStarted: new Set(progressRows.map((pr) => String(pr.track))).size,
        brandFields: brandRow
          ? ['name', 'segment', 'purpose', 'positioning'].filter((f) => String(brandRow[f] ?? '').trim()).length
          : 0,
        exercisesDone: journalRows.filter(
          (j) => exerciseTitles.has(String(j.title)) && String(j.body ?? '').trim()
        ).length,
        enrollments: enrollRows.length,
        assessmentsDone: assessRows.filter((a) => a.status === 'concluído' || !!a.completed_at).length,
      });

      const current = latestAssessment(assessRows);
      setAssessment(current);
      if (current) {
        const answers = await collection<AnswerRow>('assessment_answer').list({
          filter: { assessment: current.id },
          limit: 200,
        });
        setScores(computeScores(answers));
      } else {
        setScores(null);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível carregar o seu Mapa.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    void load();
  }, [authLoading, isLoggedIn, load]);

  const priorities = useMemo(() => (scores ? prioritiesFrom(scores) : []), [scores]);

  async function addAction(d: Dimension) {
    if (!user?.id) return;
    const title = FIRST_ACTION[d.key];
    if (actions.some((a) => a.title === title && !a.done)) {
      toast.info('Essa ação já está no seu plano.');
      return;
    }
    setBusy(d.key);
    try {
      /* Garante o plano antes da ação: é ele que carrega a dona. */
      let target = plan;
      if (!target) {
        target = await collection<PlanRow>('development_plan').create({
          owner_id: user.id,
          title: MAPA_PLAN_TITLE,
          priority: 'alta',
        });
        setPlan(target);
      }
      const created = await collection<ActionRow>('action').create({
        development_plan: target.id,
        title,
        dimension: d.key,
        done: false,
      });
      setActions((prev) => [...prev, created]);
      toast.success('Ação adicionada ao seu plano.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível adicionar a ação.');
    } finally {
      setBusy(null);
    }
  }

  async function toggleAction(a: ActionRow) {
    const next = !a.done;
    setActions((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: next } : x)));
    try {
      await collection('action').update(a.id, {
        done: next,
        done_date: next ? new Date().toISOString() : null,
      });
    } catch (e) {
      setActions((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: a.done } : x)));
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível atualizar a ação.');
    }
  }

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  /* Sem diagnóstico concluído não há mapa: o Mapa é a leitura do diagnóstico,
   * não um plano genérico. */
  if (!scores || scores.answered === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">O seu Mapa</h1>
        <p className="mt-2 text-muted-foreground">Ele é montado a partir do seu diagnóstico.</p>
        <div className="mt-8">
          <EmptyState
            title={assessment ? 'O seu diagnóstico ainda não foi concluído' : 'Você ainda não fez o seu diagnóstico'}
            description="São 42 afirmações, cerca de quinze minutos. Cada resposta é salva na hora, e é delas que sai o direcionamento."
            action={
              <Button onClick={() => nav('/diagnostico')}>
                {assessment ? 'Retomar o Diagnóstico' : 'Fazer o Diagnóstico'}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const stage = stageFor(scores.overall);
  const open = actions.filter((a) => !a.done);
  const done = actions.filter((a) => a.done);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-primary-text">Mapa da Autonomia</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">O seu Mapa</h1>
        <p className="text-muted-foreground">
          Você está em {STAGE_LABEL[stage]}, com {scores.overall}% de autonomia geral. O caminho abaixo foi montado a
          partir das suas respostas.
        </p>
        <Button variant="link" className="h-auto p-0" onClick={() => nav('/diagnostico/resultado')}>
          Ver o perfil completo
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">As suas prioridades agora</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            As duas dimensões com mais espaço para crescer. Trabalhar nelas move o conjunto.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {priorities.map((d) => {
            const trackPick = pickFor(tracks, d, 2);
            const contentPick = pickFor(contents, d, 3);
            const dest = DESTINATION[d.key];
            return (
              <div key={d.key} className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold">{d.label}</h3>
                  <span className="tabular-nums text-sm text-muted-foreground">{scores.byDimension[d.key]}%</span>
                </div>
                <Progress value={scores.byDimension[d.key]} />
                <p className="text-sm text-muted-foreground">{dest.how}</p>

                {trackPick.items.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary-text">Comece por estas trilhas</p>
                    <ol className="space-y-1">
                      {trackPick.items.map((t, i) => (
                        <li key={t.id} className="text-sm">
                          <span className="mr-2 tabular-nums text-muted-foreground">{i + 1}.</span>
                          {t.title}
                          {t.essential && <span className="ml-2 text-xs text-primary-text">essencial</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {contentPick.items.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary-text">E por estes conteúdos</p>
                    <ol className="space-y-1">
                      {contentPick.items.map((c, i) => (
                        <li key={c.id} className="text-sm">
                          <span className="mr-2 tabular-nums text-muted-foreground">{i + 1}.</span>
                          {c.title}
                          {c.essential && <span className="ml-2 text-xs text-primary-text">essencial</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {trackPick.items.length === 0 && contentPick.items.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ainda não há trilha nem conteúdo marcado para esta dimensão. Marque o campo "Dimensão que
                    desenvolve" no Studio e eles aparecem aqui.
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => nav(dest.to)}>
                    Ir para {dest.label}
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === d.key} onClick={() => void addAction(d)}>
                    <Plus className="size-4" aria-hidden />
                    Criar primeira ação
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">O seu plano</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {open.length > 0
              ? 'A primeira ação pendente é a que aparece na sua tela inicial.'
              : 'Crie uma ação a partir de uma prioridade e ela aparece aqui e na sua tela inicial.'}
          </p>
        </div>

        {actions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6">
            <p className="text-sm text-muted-foreground">Nenhuma ação ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {[...open, ...done].map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-4">
                <Checkbox
                  checked={a.done}
                  onCheckedChange={() => void toggleAction(a)}
                  aria-label={`Marcar "${a.title}" como concluída`}
                />
                <span className={a.done ? 'text-sm text-muted-foreground line-through' : 'text-sm'}>{a.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* O reconhecimento mais perto de acontecer, e as vantagens da rede.
        * A página 78 pede que os Prêmios reconheçam quem aplica, então o Mapa
        * mostra o que está a um passo, não um placar. */}
      {activity && (
        <section className="grid gap-4 lg:grid-cols-2">
          {(() => {
            const next = allAwards(activity)
              .filter((a) => a.next !== null)
              .sort((x, y) => x.remaining - y.remaining)[0];
            return (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Medal className="size-5 text-primary-text" aria-hidden />
                  <h2 className="text-lg font-semibold">O reconhecimento mais perto</h2>
                </div>
                {next ? (
                  <>
                    <p className="text-sm">
                      <span className="font-medium">{next.category.title}</span> — faltam {next.remaining}{' '}
                      {next.category.unit} para o {LEVEL_LABEL[next.next!.level].toLowerCase()}.
                    </p>
                    <p className="text-sm text-muted-foreground">{next.next!.description}.</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Você está no nível máximo de todas as categorias. Nada mal.
                  </p>
                )}
                <Button size="sm" variant="outline" onClick={() => nav('/premios')}>
                  Ver todos os prêmios
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            );
          })()}

          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Gift className="size-5 text-primary-text" aria-hidden />
              <h2 className="text-lg font-semibold">Vantagens da rede</h2>
            </div>
            {benefits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Os benefícios das integrantes e dos parceiros aparecem aqui quando forem publicados.
              </p>
            ) : (
              <ul className="space-y-1">
                {benefits.slice(0, 3).map((b) => (
                  <li key={b.id} className="text-sm">
                    {b.name}
                    {b.category && <span className="text-muted-foreground"> · {b.category}</span>}
                  </li>
                ))}
              </ul>
            )}
            <Button size="sm" variant="outline" onClick={() => nav('/premios')}>
              Ver os benefícios
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Todas as dimensões</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.map((d) => (
            <div key={d.key} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{d.label}</p>
                <span className="tabular-nums text-sm text-muted-foreground">{scores.byDimension[d.key]}%</span>
              </div>
              <Progress value={scores.byDimension[d.key]} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
