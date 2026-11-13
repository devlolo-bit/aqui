/*
 * TELA 0 — Diagnóstico e Evolução da Autonomia.
 *
 * Antes esta tela criava um registro vazio e listava datas: não havia
 * pergunta nenhuma, e o botão podia ser clicado quantas vezes se quisesse.
 * Agora ela aplica as 42 perguntas, uma dimensão por vez, salva cada resposta
 * no ato e respeita as janelas de acesso da página 55 do brandbook.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Lock } from 'lucide-react';
import { ApiError, collection, useAuth } from '@/lib/fab-client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { DIMENSIONS, type AnswerRow, type AssessmentRow } from '@/lib/mapa';
import {
  accessFor,
  CYCLE_NAME,
  OPEN_SECTIONS,
  progressOf,
  questionsOf,
  SCALE_LABELS,
  TOTAL_QUESTIONS,
  type Access,
  type Cycle,
} from '@/lib/diagnostico';

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function Diagnostico() {
  const { user, isLoading: authLoading } = useAuth();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<Access | null>(null);
  const [assessment, setAssessment] = useState<AssessmentRow | null>(null);
  const [rows, setRows] = useState<AnswerRow[]>([]);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const list = await collection<AssessmentRow>('assessment').list({
        filter: { owner_id: user.id },
        sort: 'created_at',
        limit: 100,
      });
      const state = accessFor(list);
      setAccess(state);

      const current = state.state === 'open' ? state.assessment : null;
      setAssessment(current);
      if (current) {
        const answers = await collection<AnswerRow>('assessment_answer').list({
          filter: { assessment: current.id },
          limit: 200,
        });
        setRows(answers);
        /* Retoma na primeira dimensão incompleta; com todas respondidas, abre
         * direto nas partes abertas. */
        const keys = new Set(answers.map((a) => String(a.question_key)));
        const idx = DIMENSIONS.findIndex((d) => questionsOf(d.key).some((q) => !keys.has(q.key)));
        setStep(idx >= 0 ? idx : DIMENSIONS.length);
      } else {
        setRows([]);
        setStep(0);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível carregar o diagnóstico.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  const byKey = useMemo(() => {
    const m = new Map<string, AnswerRow>();
    for (const r of rows) if (r.question_key) m.set(String(r.question_key), r);
    return m;
  }, [rows]);

  const progress = useMemo(() => progressOf(new Set(byKey.keys())), [byKey]);

  /* Trocar de dimensão sobe a tela.
   * Sem isso, quem respondeu as sete e tocou em Avançar continuava vendo o pé
   * da página: o conteúdo mudou, mas a tela não, e parece que o app travou. */
  function goToStep(next: number) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function start(cycle: Cycle, existing: AssessmentRow | null) {
    if (!user?.id) return;
    setBusy(true);
    try {
      if (existing) {
        /* Um diagnóstico liberado pela equipe vira "em andamento" ao começar. */
        if (existing.status === 'liberado') {
          await collection('assessment').update(existing.id, { status: 'em andamento' });
        }
        setAssessment({ ...existing, status: 'em andamento' });
      } else {
        const created = await collection<AssessmentRow>('assessment').create({
          owner_id: user.id,
          cycle,
          status: 'em andamento',
          created_at: new Date().toISOString(),
        });
        setAssessment(created);
      }
      setRows([]);
      setStep(0);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível iniciar o diagnóstico.');
    } finally {
      setBusy(false);
    }
  }

  async function answer(questionKey: string, dimension: string, score: number) {
    if (!assessment) return;
    const existing = byKey.get(questionKey);

    setRows((prev) =>
      existing
        ? prev.map((r) => (String(r.question_key) === questionKey ? { ...r, score } : r))
        : [...prev, { id: '', assessment: assessment.id, dimension, question_key: questionKey, score }]
    );

    try {
      if (existing && existing.id) {
        await collection('assessment_answer').update(existing.id, { score });
      } else {
        const created = await collection<AnswerRow>('assessment_answer').create({
          assessment: assessment.id,
          dimension,
          question_key: questionKey,
          score,
        });
        setRows((prev) =>
          prev.map((r) => (String(r.question_key) === questionKey && !r.id ? { ...r, id: created.id } : r))
        );
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Resposta não salva. Tente de novo.');
    }
  }

  /* As respostas abertas gravam em `text_answer`, sem nota e sem dimensão.
   * Salvam ao sair do campo, não a cada tecla: evita uma chamada por letra. */
  async function saveText(questionKey: string, value: string) {
    if (!assessment) return;
    const text = value.trim();
    const existing = byKey.get(questionKey);
    if (!existing && !text) return;
    if (existing && String(existing.text_answer ?? '') === text) return;

    setRows((prev) =>
      existing
        ? prev.map((r) => (String(r.question_key) === questionKey ? { ...r, text_answer: text } : r))
        : [...prev, { id: '', assessment: assessment.id, question_key: questionKey, text_answer: text }]
    );

    try {
      if (existing && existing.id) {
        await collection('assessment_answer').update(existing.id, { text_answer: text });
      } else {
        const created = await collection<AnswerRow>('assessment_answer').create({
          assessment: assessment.id,
          question_key: questionKey,
          text_answer: text,
        });
        setRows((prev) =>
          prev.map((r) => (String(r.question_key) === questionKey && !r.id ? { ...r, id: created.id } : r))
        );
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Resposta não salva. Tente de novo.');
    }
  }

  async function finish() {
    if (!assessment) return;
    setBusy(true);
    try {
      await collection('assessment').update(assessment.id, {
        status: 'concluído',
        completed_at: new Date().toISOString(),
      });
      toast.success('Diagnóstico concluído.');
      nav('/diagnostico/resultado');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível concluir.');
      setBusy(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  /* O carregamento falhou: sem saber a janela, não dá para abrir nem bloquear.
   * Melhor dizer isso do que mostrar um questionário que não vai salvar. */
  if (!access) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Não foi possível carregar o diagnóstico</h1>
        <p className="text-muted-foreground">Verifique a sua conexão e tente de novo.</p>
        <Button onClick={() => void load()}>Tentar de novo</Button>
      </div>
    );
  }

  /* Fora da janela: mostra o que já existe e quando a próxima abre, em vez de
   * um botão que não deveria estar ali. */
  if (access.state !== 'open') {
    const next = access.state === 'locked' ? access : null;
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-text">Diagnóstico da Autonomia</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">O seu próximo diagnóstico ainda não abriu</h1>
        </header>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <Lock className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="space-y-2">
              {next ? (
                <>
                  <p className="text-base font-medium">
                    {CYCLE_NAME[next.cycle]} abre em {formatDate(next.opensAt)}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    O intervalo existe de propósito: autonomia muda com o tempo, e medir de novo cedo demais só
                    registraria o mesmo retrato. Até lá, o seu Mapa continua aberto.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-medium">Você concluiu o seu primeiro ciclo anual.</p>
                  <p className="text-sm text-muted-foreground">
                    A equipe Âmitse pode liberar uma nova avaliação quando for o momento.
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => nav('/diagnostico/resultado')}>Ver o meu resultado</Button>
            <Button variant="outline" onClick={() => nav('/mapa')}>
              Abrir o Mapa
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const open = access;

  /* Janela aberta, diagnóstico ainda não começado. */
  if (!assessment) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-text">{CYCLE_NAME[open.cycle]}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Diagnóstico da Autonomia</h1>
        </header>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <p className="text-base">
            São {TOTAL_QUESTIONS} afirmações, divididas em {DIMENSIONS.length} dimensões. Você diz o quanto cada uma
            descreve a sua vida hoje.
          </p>
          <p className="text-base">
            No fim, três partes abertas para você contar a sua trajetória, onde quer chegar e o que trava hoje. São
            opcionais, e é a partir delas que a equipe Âmitse indica caminhos feitos para o seu caso.
          </p>
          <p className="text-sm text-muted-foreground">
            Leva cerca de vinte minutos. Cada resposta é salva na hora, então pode parar e voltar quando quiser. Não
            existe resposta certa: o que você responder aqui é o que monta o seu Mapa.
          </p>
          <Button onClick={() => void start(open.cycle, open.assessment)} disabled={busy}>
            {busy ? 'Abrindo...' : 'Começar'}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  /* Nove etapas: as seis dimensões com notas, e depois as três partes abertas,
   * onde ela conta a jornada. As abertas são opcionais — exigir nove textos
   * afastaria mais gente do que o direcionamento que eles rendem. */
  const TOTAL_STEPS = DIMENSIONS.length + OPEN_SECTIONS.length;
  const isOpenStep = step >= DIMENSIONS.length;
  const section = isOpenStep ? OPEN_SECTIONS[step - DIMENSIONS.length] : null;
  const dimension = isOpenStep ? null : DIMENSIONS[step];
  const questions = dimension ? questionsOf(dimension.key) : [];
  const stepDone = dimension ? questions.every((q) => byKey.has(q.key)) : true;
  const allDone = progress.answered === progress.total;
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-primary-text">{CYCLE_NAME[open.cycle]}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {dimension ? dimension.label : section?.title}
        </h1>
        <p className="text-muted-foreground">{dimension ? dimension.role : section?.intro}</p>
        <div className="space-y-2 pt-2">
          <Progress value={progress.percent} />
          <p className="text-xs tabular-nums text-muted-foreground">
            {progress.answered} de {progress.total} respondidas · etapa {step + 1} de {TOTAL_STEPS}
          </p>
        </div>
      </header>

      {dimension && (
        <ol className="space-y-6">
          {questions.map((q, i) => {
            const current = Number(byKey.get(q.key)?.score ?? 0);
            return (
              <li key={q.key} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-base">
                  <span className="mr-2 tabular-nums text-muted-foreground">{i + 1}.</span>
                  {q.text}
                </p>
                <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={q.text}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Button
                      key={v}
                      type="button"
                      size="sm"
                      variant={current === v ? 'default' : 'outline'}
                      aria-pressed={current === v}
                      className={cn('min-h-11 flex-1 flex-col gap-0 px-2 sm:flex-none sm:px-4')}
                      onClick={() => void answer(q.key, dimension.key, v)}
                    >
                      <span className="text-base tabular-nums">{v}</span>
                      <span className="text-[10px] font-normal opacity-80">{SCALE_LABELS[v]}</span>
                    </Button>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {section && (
        <div className="space-y-6">
          <p className="rounded-xl border border-border bg-primary/5 p-4 text-sm text-muted-foreground">
            Estas respostas não viram nota. Elas são lidas pela equipe Âmitse para te indicar caminhos, conteúdos e
            oportunidades. Escrever é opcional, mas é o que permite um direcionamento feito para você.
          </p>
          {section.questions.map((q) => (
            <div key={q.key} className="rounded-2xl border border-border bg-card p-5">
              <label htmlFor={q.key} className="text-base font-medium">
                {q.label}
              </label>
              <p className="mt-1 text-sm text-muted-foreground">{q.hint}</p>
              <Textarea
                id={q.key}
                rows={5}
                className="mt-3"
                defaultValue={String(byKey.get(q.key)?.text_answer ?? '')}
                placeholder="Escreva o quanto quiser."
                onBlur={(e) => void saveText(q.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => goToStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ArrowLeft className="size-4" aria-hidden />
          Voltar
        </Button>

        {isLast ? (
          <Button onClick={() => void finish()} disabled={!allDone || busy}>
            <Check className="size-4" aria-hidden />
            {busy ? 'Concluindo...' : 'Concluir diagnóstico'}
          </Button>
        ) : (
          <Button onClick={() => goToStep(Math.min(TOTAL_STEPS - 1, step + 1))} disabled={!stepDone}>
            Avançar
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      {isLast && !allDone && (
        <p className="text-sm text-muted-foreground">
          Faltam {progress.total - progress.answered} notas para concluir. Use o botão Voltar para encontrá-las.
        </p>
      )}
    </div>
  );
}
