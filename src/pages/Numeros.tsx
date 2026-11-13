/*
 * Meus Números — lançamento e evolução dos indicadores do negócio.
 *
 * O brandbook pedia vendas, prospecção e crescimento na tela inicial. Para
 * existir gráfico, precisa existir número: é aqui que ela lança, uma vez por
 * mês, e é daqui que a Home e o Mapa leem.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { ApiError, Chart, collection, useAuth } from '@/lib/fab-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner';
import {
  byMonth,
  growth,
  METRIC_CATEGORY,
  METRICS,
  periodKey,
  periodLabel,
  valueOf,
  type MetricKey,
  type MetricRow,
} from '@/lib/numeros';

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

type Form = { period: string; revenue: string; new_clients: string; leads: string; followers: string; note: string };

const EMPTY: Form = { period: thisMonth(), revenue: '', new_clients: '', leads: '', followers: '', note: '' };

function toNumber(v: string): number | null {
  const clean = v.replace(/\./g, '').replace(',', '.').trim();
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

export default function Numeros() {
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focus, setFocus] = useState<MetricKey>('revenue');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const all = await collection<MetricRow>('journal_entry').list({
        filter: { owner_id: user.id, category: METRIC_CATEGORY },
        limit: 200,
      });
      setRows(all);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível carregar os seus números.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  const months = useMemo(() => byMonth(rows), [rows]);

  const points = useMemo(
    () =>
      months
        .map((r) => ({ label: periodLabel(r.entry_date), value: valueOf(r, focus) }))
        .filter((p): p is { label: string; value: number } => p.value !== null),
    [months, focus]
  );

  async function save() {
    if (!user?.id) return;
    const values = {
      revenue: toNumber(form.revenue),
      new_clients: toNumber(form.new_clients),
      leads: toNumber(form.leads),
      followers: toNumber(form.followers),
    };
    if (Object.values(values).every((v) => v === null)) {
      toast.error('Preencha ao menos um número.');
      return;
    }
    setSaving(true);
    try {
      /* Um registro por mês: lançar de novo o mesmo mês corrige, não duplica. */
      const existing = rows.find((r) => periodKey(r.entry_date) === form.period);
      const payload = {
        owner_id: user.id,
        category: METRIC_CATEGORY,
        title: `Indicadores de ${periodLabel(`${form.period}-01`)}`,
        entry_date: `${form.period}-01`,
        body: form.note.trim(),
        ...values,
      };
      if (existing) {
        await collection('journal_entry').update(existing.id, payload);
      } else {
        await collection('journal_entry').create(payload);
      }
      toast.success('Números salvos.');
      setOpen(false);
      setForm({ ...EMPTY, period: thisMonth() });
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const focused = METRICS.find((m) => m.key === focus) ?? METRICS[0];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-primary-text">Construir</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Os seus números</h1>
        <p className="max-w-prose text-muted-foreground">
          Uma marca sustentável se mede. Lance os seus números uma vez por mês e acompanhe a curva — é ela que mostra
          se o ativo está crescendo ou se você está só trabalhando mais.
        </p>
      </header>

      {/* Os quatro cartões, com a variação em relação ao mês anterior. */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => {
          const g = growth(rows, m.key);
          const active = m.key === focus;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setFocus(m.key)}
              aria-pressed={active}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted'
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{g ? m.format(g.last) : '—'}</p>
              {g?.delta !== null && g?.delta !== undefined && (
                <p
                  className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                    g.delta >= 0 ? 'text-primary-text' : 'text-muted-foreground'
                  }`}
                >
                  {g.delta >= 0 ? <TrendingUp className="size-3" aria-hidden /> : <TrendingDown className="size-3" aria-hidden />}
                  {g.delta > 0 ? '+' : ''}
                  {g.delta}% no mês
                </p>
              )}
            </button>
          );
        })}
      </section>

      {/* O gráfico do indicador escolhido. */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{focused.question}</h2>
          <p className="text-sm text-muted-foreground">{focused.label}, mês a mês.</p>
        </div>
        {points.length < 2 ? (
          <div className="rounded-2xl border border-dashed border-border p-6">
            <p className="text-sm text-muted-foreground">
              {points.length === 0
                ? 'A curva aparece depois do primeiro lançamento.'
                : 'Com dois meses lançados a curva começa a existir. Falta um.'}
            </p>
          </div>
        ) : (
          <Chart type="line" data={points} height={260} valueFormat={(n) => focused.format(n)} />
        )}
      </section>

      {/* Lançamento. */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Lançar um mês</h2>
          {!open && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden />
              Lançar números
            </Button>
          )}
        </div>

        {open && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="period">Mês de referência</Label>
                <Input
                  id="period"
                  type="month"
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                />
              </div>
              {METRICS.map((m) => (
                <div key={m.key} className="space-y-1.5">
                  <Label htmlFor={m.key}>{m.label}</Label>
                  <Input
                    id={m.key}
                    inputMode="decimal"
                    placeholder="0"
                    value={form[m.key]}
                    onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{m.hint}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">O que explica esse mês</Label>
              <Textarea
                id="note"
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Uma campanha, uma indicação, um mês parado. O número sozinho esquece o motivo."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Lançar um mês que já existe corrige o registro, não cria outro.
            </p>
          </div>
        )}

        {months.length === 0 ? (
          !open && (
            <EmptyState
              title="Nenhum número lançado ainda"
              description="Comece pelo mês passado. Dois meses já formam uma curva, e é a curva que conta a história."
              action={<Button onClick={() => setOpen(true)}>Lançar o primeiro mês</Button>}
            />
          )
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium">Mês</th>
                  {METRICS.map((m) => (
                    <th key={m.key} className="px-5 py-3 text-right font-medium">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">{periodLabel(r.entry_date)}</td>
                    {METRICS.map((m) => {
                      const v = valueOf(r, m.key);
                      return (
                        <td key={m.key} className="px-5 py-3 text-right tabular-nums">
                          {v === null ? '—' : m.format(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
