import { useEffect, useState, useCallback } from 'react';
import { BookOpen, PenLine, Play, Search, Route as RouteIcon, Trash2 } from 'lucide-react';
import { collection, ApiError, useAuth } from '@/lib/fab-client';
import type { Row } from '@/lib/fab-client';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Content = Row & { title?: string; category?: string; body?: string };
type Track = Row & { title?: string; description?: string };
type TrackModule = Row & { track?: string; title?: string; position?: number };
type TrackProgress = Row & {
  owner_id?: string;
  track?: string;
  last_module?: string;
  completed?: boolean;
};
type JournalEntry = Row & { title?: string; body?: string; category?: string; entry_date?: string };

const CATEGORIES = [
  'Autoliderança',
  'Desenvolvimento intelectual',
  'Mentalidade e comportamento',
  'Autocuidado',
  'Gestão da energia',
  'Disciplina e constância',
  'Formação de hábitos',
  'Construção de autoridade',
  'Autonomia pessoal e profissional',
  'Filosofias feministas',
  'História do empreendedorismo feminino',
  'Saberes ancestrais',
];

function TracksSection({ isLoggedIn, userId }: { isLoggedIn: boolean; userId?: string }) {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [modules, setModules] = useState<TrackModule[]>([]);
  const [progress, setProgress] = useState<TrackProgress[]>([]);
  const [busyModule, setBusyModule] = useState<string | null>(null);

  const reloadProgress = useCallback(async () => {
    if (!userId) return;
    const p = await collection<TrackProgress>('track_progress').list({
      filter: { owner_id: userId },
      limit: 200,
    });
    setProgress(p as TrackProgress[]);
  }, [userId]);

  const toggleModule = async (track: Track, mod: TrackModule, done: boolean) => {
    if (!userId) return;
    setBusyModule(mod.id);
    try {
      if (done) {
        const existing = progress.find((p) => p.track === track.id && p.last_module === mod.id);
        if (existing) await collection('track_progress').remove(existing.id);
      } else {
        await collection('track_progress').create({
          owner_id: userId,
          track: track.id,
          last_module: mod.id,
          completed: true,
        });
      }
      await reloadProgress();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível atualizar o módulo. Tente novamente.');
    } finally {
      setBusyModule(null);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setTracks([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [t, m, p] = await Promise.all([
          collection<Track>('track').list({ sort: 'title', limit: 50 }),
          collection<TrackModule>('track_module').list({ sort: 'position', limit: 200 }),
          collection<TrackProgress>('track_progress').list({
            filter: userId ? { owner_id: userId } : undefined,
            limit: 200,
          }),
        ]);
        if (!alive) return;
        setTracks(t as Track[]);
        setModules(m as TrackModule[]);
        setProgress(p as TrackProgress[]);
      } catch (e) {
        if (alive) {
          setTracks([]);
          toast.error(e instanceof ApiError ? e.message : 'Não foi possível carregar as trilhas.');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [isLoggedIn, userId]);

  if (!isLoggedIn) return null;
  if (tracks === null) return <Skeleton className="h-28 w-full" />;
  if (tracks.length === 0) {
    return (
      <EmptyState
        icon={<RouteIcon />}
        title="Nenhuma trilha publicada ainda"
        description="As trilhas de autoliderança aparecem aqui quando forem publicadas."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tracks.map((t) => {
        const mods = modules.filter((m) => m.track === t.id);
        const doneIds = progress.filter((p) => p.track === t.id).map((p) => p.last_module ?? '');
        const isModuleDone = (id: string) => doneIds.includes(id);
        const done = mods.filter((m) => isModuleDone(m.id)).length;
        const pct = mods.length === 0 ? 0 : Math.round((done / mods.length) * 100);
        return (
          <Card key={t.id} className="min-w-0">
            <CardContent className="space-y-3 py-5">
              <h3 className="text-base font-semibold text-foreground text-balance">{t.title}</h3>
              {t.description ? (
                <p className="text-sm text-muted-foreground line-clamp-2">{stripHtml(t.description)}</p>
              ) : null}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {done} de {mods.length} {mods.length === 1 ? 'módulo concluído' : 'módulos concluídos'}
                  </span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
                <div
                  className="h-2 w-full rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso em ${t.title}`}
                >
                  <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {mods.length > 0 ? (
                <ul className="divide-y divide-border">
                  {mods.map((m) => {
                    const isDone = isModuleDone(m.id);
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-3 py-2 min-w-0">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm text-foreground break-words">{m.title}</p>
                          <Badge variant={isDone ? 'secondary' : 'outline'}>{isDone ? 'Concluído' : 'Pendente'}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!userId || busyModule === m.id}
                          onClick={() => void toggleModule(t, m, isDone)}
                        >
                          {isDone ? 'Desmarcar' : 'Marcar como concluído'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function JournalSection({ isLoggedIn, userId }: { isLoggedIn: boolean; userId?: string }) {
  const [entries, setEntries] = useState<JournalEntry[] | null>(isLoggedIn ? null : []);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await collection<JournalEntry>('journal_entry').list({
        filter: userId ? { owner_id: userId } : undefined,
        sort: '-entry_date',
        limit: 100,
      });
      /* Os lançamentos de indicadores também moram em journal_entry, por
       * limitação da plataforma, mas não são registros do diário: ficam na
       * tela Meus números e sairiam deslocados aqui. */
      setEntries((rows as JournalEntry[]).filter((r) => String(r.category ?? '') !== 'indicadores'));
    } catch (e) {
      setEntries([]);
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível carregar o diário.');
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoggedIn) {
      setEntries([]);
      return;
    }
    void load();
  }, [isLoggedIn, load]);

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!title.trim() && !body.trim()) {
      setFormError('Escreva um título ou um registro.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await collection('journal_entry').create({
        owner_id: userId,
        title: title.trim(),
        body,
        entry_date: ymd(new Date()),
      });
      setTitle('');
      setBody('');
      toast.success('Registro salvo.');
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar o registro. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await collection('journal_entry').remove(id);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível excluir. Tente novamente.');
    }
  };

  if (!isLoggedIn) {
    return (
      <EmptyState icon={<PenLine />} title="Entre para usar o diário" description="Seus registros são privados." />
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="space-y-2">
          <label htmlFor="journal-title" className="text-sm font-medium">
            Título
          </label>
          <Input
            id="journal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sobre o que você está refletindo?"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="journal-body" className="text-sm font-medium">
            Registro
          </label>
          <textarea
            id="journal-body"
            className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escreva livremente. Este registro é privado."
          />
        </div>
        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar registro'}
        </Button>
      </form>

      {entries === null ? (
        <Skeleton className="h-24 w-full" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<PenLine />}
          title="Seu diário está vazio"
          description="Escreva seu primeiro registro acima."
        />
      ) : (
        <ul className="space-y-3">
          {entries.map((en) => (
            <li key={en.id} className="rounded-xl border border-border bg-card p-5 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs text-muted-foreground">{en.entry_date}</p>
                  <h3 className="font-semibold text-foreground break-words">{en.title || 'Sem título'}</h3>
                  {en.body ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
                      {stripHtml(en.body)}
                    </p>
                  ) : null}
                </div>
                <Button variant="ghost" size="icon" aria-label="Excluir registro" onClick={() => void remove(en.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Academia() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [items, setItems] = useState<Content[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const filter: Record<string, unknown> = {};
      if (query.trim()) filter.title = { contains: query.trim() };
      if (category) filter.category = category;
      const rows = await collection<Content>('content').list({ filter: filter as never, sort: 'title', limit: 50 });
      setItems(rows);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Não foi possível carregar os conteúdos. Tente novamente.';
      setError(msg);
      toast.error(msg);
    }
  }, [query, category]);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      setItems([]);
      return;
    }
    const t = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(t);
  }, [isLoggedIn, isLoading, load]);

  useEffect(() => {
    if (!isLoggedIn) setItems([]);
  }, [isLoggedIn]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-12">
      <PageHeader
        title="Academia"
        description="Biblioteca, trilhas e seu diário de autoliderança. Você escolhe o próximo passo."
      />

      <Tabs defaultValue="biblioteca">
        <TabsList>
          <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
          <TabsTrigger value="diario">Diário</TabsTrigger>
        </TabsList>

        <TabsContent value="biblioteca" className="space-y-8 pt-6">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Trilhas de autoliderança</h2>
            <TracksSection isLoggedIn={isLoggedIn} userId={user?.id} />
          </section>
          <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por título"
                aria-label="Buscar conteúdos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              aria-label="Filtrar por categoria"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground min-w-0"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas as categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {!isLoggedIn ? (
            <EmptyState
              icon={<BookOpen />}
              title="Entre para ver a biblioteca"
              description="Os conteúdos da Academia são exclusivos para integrantes."
            />
          ) : error ? (
            <Card>
              <CardContent className="py-6 space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" onClick={() => void load()}>
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : items === null ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title={query || category ? 'Nenhum conteúdo encontrado' : 'Nenhum conteúdo publicado ainda'}
              description={
                query || category
                  ? 'Tente outro termo ou limpe os filtros.'
                  : 'Os conteúdos aparecem aqui assim que a equipe os publicar.'
              }
              action={
                query || category ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery('');
                      setCategory('');
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((c) => (
                <Card key={c.id} className="min-w-0">
                  <CardContent className="space-y-3 py-5">
                    {c.category ? <Badge variant="secondary">{c.category}</Badge> : null}
                    <h3 className="text-base font-semibold text-foreground text-balance">{c.title}</h3>
                    {c.body ? <p className="text-sm text-muted-foreground line-clamp-2">{stripHtml(c.body)}</p> : null}
                    <Button variant="ghost" className="px-0 text-primary-text">
                      <Play className="size-4" /> Abrir conteúdo
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="diario" className="pt-6">
          <JournalSection isLoggedIn={isLoggedIn} userId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
