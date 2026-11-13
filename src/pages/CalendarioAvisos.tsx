import { useEffect, useState } from 'react';
import { CalendarDays, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { collection, ApiError, formatDate, formatDateTime, useAuth } from '@/lib/fab-client';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

type Enrollment = { id: string; class_group: string; end_date?: string | null };
type Session = {
  id: string;
  class_group: string;
  class_group__label?: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
};
type Notice = {
  id: string;
  class_group: string;
  class_group__label?: string;
  title: string;
  body?: string | null;
  published_at: string;
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CalendarioAvisos() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn || !user) {
      setSessions([]);
      setNotices([]);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const mine = (await collection<Enrollment>('class_enrollment').list({
          filter: { owner_id: user!.id, end_date: { null: true } },
          fields: ['class_group', 'end_date'],
          limit: 100,
        })) as Enrollment[];
        const groupIds = mine.filter((m) => !m.end_date).map((m) => m.class_group);
        if (groupIds.length === 0) {
          if (!cancelled) {
            setSessions([]);
            setNotices([]);
          }
          return;
        }
        const [s, n] = await Promise.all([
          collection<Session>('class_session').list({
            filter: {
              class_group: { in: groupIds },
              starts_at: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString() },
            },
            sort: 'starts_at',
            limit: 100,
          }),
          collection<Notice>('class_notice').list({
            filter: { class_group: { in: groupIds } },
            sort: '-published_at',
            limit: 50,
          }),
        ]);
        if (!cancelled) {
          setSessions(s as Session[]);
          setNotices(n as Notice[]);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Não foi possível carregar. Tente novamente.');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, isLoading, user]);

  const now = Date.now();
  const future = (sessions ?? []).filter((s) => new Date(s.starts_at).getTime() >= now);
  const past = (sessions ?? []).filter((s) => new Date(s.starts_at).getTime() < now).reverse();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
      <header className="max-w-prose">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-balance">
          Calendário e avisos
        </h1>
        <p className="mt-2 text-muted-foreground">
          Você escolhe o próximo passo. Aqui estão as datas e os recados da sua turma.
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-8 text-sm text-destructive">
          {error}
        </p>
      )}

      {!isLoading && !isLoggedIn ? (
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Entre para ver sua agenda</h2>
          <p className="mt-2 max-w-prose text-muted-foreground">
            As aulas e os avisos da sua turma aparecem depois que você entra.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="agenda" className="min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="size-5 text-primary-text" aria-hidden />
              <h2 id="agenda" className="font-display text-2xl font-semibold tracking-[-0.02em]">
                Agenda de aulas
              </h2>
            </div>

            {sessions === null && !error && (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}

            {sessions && sessions.length === 0 && (
              <EmptyState
                icon={CalendarDays}
                title="Nenhuma aula agendada"
                description="Quando sua turma tiver aulas marcadas, elas aparecem aqui."
              />
            )}

            {sessions && sessions.length > 0 && (
              <div className="space-y-6">
                {future.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">Próximas</h3>
                    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                      {future.map((s) => (
                        <SessionRow key={s.id} s={s} />
                      ))}
                    </ul>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">Realizadas</h3>
                    <ul className="divide-y divide-border rounded-2xl border border-border bg-card opacity-75">
                      {past.map((s) => (
                        <SessionRow key={s.id} s={s} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="mural" className="min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="size-5 text-primary-text" aria-hidden />
              <h2 id="mural" className="font-display text-2xl font-semibold tracking-[-0.02em]">
                Mural de avisos
              </h2>
            </div>

            {notices === null && !error && (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {notices && notices.length === 0 && (
              <EmptyState
                icon={Megaphone}
                title="Nenhum aviso por enquanto"
                description="Os recados da sua turma aparecem aqui."
              />
            )}

            {notices && notices.length > 0 && (
              <ul className="space-y-3">
                {notices.map((n) => (
                  <li key={n.id} className="rounded-2xl border border-border bg-card p-5">
                    <p className="text-xs text-muted-foreground">{formatDate(n.published_at)}</p>
                    <h3 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em]">{n.title}</h3>
                    {n.body && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function SessionRow({ s }: { s: Session }) {
  return (
    <li className="flex min-w-0 gap-4 px-5 py-4">
      <div className="w-20 shrink-0">
        <p className="text-sm font-medium tabular-nums">{formatDate(s.starts_at)}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {timeOf(s.starts_at)}
          {s.ends_at ? ` – ${timeOf(s.ends_at)}` : ''}
        </p>
      </div>
      <div className="min-w-0">
        <p className="font-medium">{s.title}</p>
        <p className="truncate text-sm text-muted-foreground">
          {s.class_group__label ?? 'Turma'}
          {s.location ? ` · ${s.location}` : ''}
        </p>
      </div>
    </li>
  );
}
