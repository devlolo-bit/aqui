/*
 * TELA 4 — Amadurecimento da Autoliderança.
 *
 * Nove exercícios nas três autonomias da página 32 do brandbook. Cada resposta
 * vira uma entrada em `journal_entry`, com a categoria da autonomia, e pode ser
 * reescrita depois: autoliderança é releitura, não formulário.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, PenLine } from 'lucide-react';
import { ApiError, collection, useAuth } from '@/lib/fab-client';
import type { Row } from '@/lib/fab-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { AUTONOMIES, ALL_EXERCISES, AUTOLIDERANCA_CATEGORIES, type Exercise } from '@/lib/autolideranca';

type JournalEntry = Row & { title?: string; body?: string; category?: string; entry_date?: string; owner_id?: string };
type Content = Row & { title?: string; category?: string; body?: string };

function ExerciseCard({
  exercise,
  entry,
  onSave,
}: {
  exercise: Exercise;
  entry: JournalEntry | undefined;
  onSave: (exercise: Exercise, body: string, existing: JournalEntry | undefined) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(entry?.body ?? '');
  const [saving, setSaving] = useState(false);
  const done = !!entry?.body?.trim();

  useEffect(() => {
    setDraft(entry?.body ?? '');
  }, [entry?.body]);

  async function save() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onSave(exercise, draft.trim(), entry);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{exercise.title}</h3>
            {done && (
              <Badge variant="secondary" className="shrink-0">
                <Check className="size-3" aria-hidden />
                Feito
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{exercise.prompt}</p>
        </div>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={7}
            placeholder="Escreva aqui. Ninguém além de você lê isto."
            aria-label={exercise.title}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void save()} disabled={saving || !draft.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {done && <p className="whitespace-pre-wrap text-sm text-muted-foreground line-clamp-4">{entry?.body}</p>}
          {done && <p className="text-sm font-medium text-primary-text">{exercise.outcome}</p>}
          <Button size="sm" variant={done ? 'outline' : 'default'} onClick={() => setOpen(true)}>
            <PenLine className="size-4" aria-hidden />
            {done ? 'Reescrever' : 'Fazer este exercício'}
          </Button>
        </div>
      )}
    </li>
  );
}

export default function Autolideranca() {
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [readings, setReadings] = useState<Content[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [journalRows, contentRows] = await Promise.all([
        collection<JournalEntry>('journal_entry').list({ filter: { owner_id: user.id }, limit: 200 }),
        collection<Content>('content').list({ limit: 200 }),
      ]);
      setEntries(journalRows);
      setReadings(contentRows.filter((c) => c.category && AUTOLIDERANCA_CATEGORIES.includes(String(c.category))));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível carregar os exercícios.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  /* As entradas são casadas pelo título do exercício: é o que permite
   * reescrever em vez de acumular uma entrada nova a cada tentativa. */
  const byExercise = useMemo(() => {
    const m = new Map<string, JournalEntry>();
    for (const e of ALL_EXERCISES) {
      const found = entries.find((j) => String(j.title) === e.title);
      if (found) m.set(e.key, found);
    }
    return m;
  }, [entries]);

  const doneCount = useMemo(
    () => ALL_EXERCISES.filter((e) => byExercise.get(e.key)?.body?.trim()).length,
    [byExercise]
  );

  async function saveExercise(exercise: Exercise, body: string, existing: JournalEntry | undefined) {
    if (!user?.id) return;
    const autonomy = AUTONOMIES.find((a) => a.exercises.some((x) => x.key === exercise.key));
    try {
      if (existing) {
        await collection('journal_entry').update(existing.id, { body });
        setEntries((prev) => prev.map((j) => (j.id === existing.id ? { ...j, body } : j)));
      } else {
        const created = await collection<JournalEntry>('journal_entry').create({
          owner_id: user.id,
          title: exercise.title,
          body,
          /* Valor exato da lista fechada do schema, em minúsculas e sem acento. */
          category: autonomy?.journalCategory ?? 'reflexão',
          entry_date: new Date().toISOString().slice(0, 10),
        });
        setEntries((prev) => [...prev, created]);
      }
      toast.success('Exercício salvo.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente de novo.');
      throw e;
    }
  }

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-primary-text">Autoliderança</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Conduzir a si mesma</h1>
        <p className="max-w-prose text-muted-foreground">
          Na Academia você amplia repertório. Aqui você trabalha o que sustenta as suas escolhas quando ninguém está
          olhando. São exercícios de escrita: o que você escreve fica só com você.
        </p>
        <div className="max-w-sm space-y-2 pt-2">
          <Progress value={Math.round((doneCount / ALL_EXERCISES.length) * 100)} />
          <p className="text-xs tabular-nums text-muted-foreground">
            {doneCount} de {ALL_EXERCISES.length} exercícios feitos
          </p>
        </div>
      </header>

      {AUTONOMIES.map((a) => (
        <section key={a.key} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{a.label}</h2>
            <p className="max-w-prose text-sm text-muted-foreground">{a.summary}</p>
          </div>
          <ul className="space-y-4">
            {a.exercises.map((e) => (
              <ExerciseCard key={e.key} exercise={e} entry={byExercise.get(e.key)} onSave={saveExercise} />
            ))}
          </ul>
        </section>
      ))}

      {readings.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Para aprofundar</h2>
            <p className="text-sm text-muted-foreground">Material publicado pela Âmitse sobre estes temas.</p>
          </div>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {readings.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-5 py-4">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  {c.category && <p className="truncate text-xs text-muted-foreground">{c.category}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-primary/5 p-6">
        <h2 className="text-base font-semibold">O que você escreveu aqui alimenta o resto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A frase que te move e o preço que você defende são o começo da sua proposta de valor.
        </p>
        <Button size="sm" variant="outline" className="mt-3" asChild>
          <Link to="/marca">Levar para a Marca</Link>
        </Button>
      </section>
    </div>
  );
}
