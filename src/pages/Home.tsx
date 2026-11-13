import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  TrendingUp,
  Compass,
  Heart,
  Layers,
  LogOut,
  Map as MapIcon,
  MessageCircle,
  Users,
} from 'lucide-react';
import { collection, useAuth, type Row, type InvokeResult } from '@/lib/fab-client';
import { invokeLLM } from '@/lib/fab-client';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { computeScores, DIMENSIONS, stageFor } from '@/lib/mapa';
import { HOME_PHOTOS, pickHomePhoto, ROTATION_THEMES } from '@/lib/home-photos';
import { BRAND } from '@/lib/brand-assets';
import { pickReflection } from '@/lib/reflections';
import { Graph } from '@/components/ui/graph';

const GREETING_BY_HOUR = (h: number) => (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

const STEPS = [
  { key: 'DIAGNOSTICAR', label: 'Diagnosticar', icon: Compass },
  { key: 'DESENVOLVER', label: 'Desenvolver', icon: Layers },
  { key: 'CONSTRUIR', label: 'Construir', icon: TrendingUp },
  { key: 'CONECTAR', label: 'Conectar', icon: Users },
  { key: 'PROSPERAR', label: 'Prosperar', icon: Heart },
];

const QUESTIONS_PER_DIM = 3;

const DIMENSION_COPY: Record<DimensionKey, { label: string; role: string }> = {
  autolideranca: {
    label: 'Autoliderança',
    role: 'Autoliderança sustenta suas escolhas.',
  },
  marca: {
    label: 'Marca Sustentável',
    role: 'Sua marca transforma trajetória em ativo.',
  },
  prosperidade: {
    label: 'Prosperidade',
    role: 'Prosperidade nasce de escolhas conscientes.',
  },
  poder_escolha: {
    label: 'Poder de Escolha',
    role: 'Cada escolha amplia seu poder de decidir.',
  },
  desenvolvimento: {
    label: 'Desenvolvimento Profissional',
    role: 'Competências abrem novas possibilidades.',
  },
  conexoes: {
    label: 'Conexões',
    role: 'Redes de apoio sustentam a construção.',
  },
};

type ActionItem = { id: string; title: string; due_date: string | null; done: boolean };
type GoalItem = { id: string; title: string; due_date: string | null; done: boolean };
type PlanRow = { id: string; title: string; priority: string | null };

type AssetCount = { count: number; sources: string[] };

type Scores = ReturnType<typeof computeScores>;

type DimensionKey = 'autolideranca' | 'marca' | 'prosperidade' | 'poder_escolha' | 'desenvolvimento' | 'conexoes';

function formatDateShort(iso: string): string {
  const [y, m] = iso.split('-');
  return `${m}/${y}`;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/* Cada conclusão conta uma única vez, a partir da data real do registro.
 * Ações: data de conclusão (done_date). Módulos: data do registro do progresso.
 * Ativos: contagem única por origem. */
function computeAssetCounts(
  actions: ActionItem[],
  doneDates: Record<string, string | null>,
  modules: { id: string; date: string | null }[],
  assets: { id: string; source: string }[]
): AssetCount {
  const seen = new Set<string>();
  let count = 0;
  for (const a of actions) {
    const d = doneDates[a.id];
    if (a.done && d && !seen.has(`a:${a.id}`)) {
      seen.add(`a:${a.id}`);
      count++;
    }
  }
  for (const m of modules) {
    if (m.date && !seen.has(`m:${m.id}`)) {
      seen.add(`m:${m.id}`);
      count++;
    }
  }
  for (const s of assets) {
    if (!seen.has(`s:${s.source}`)) {
      seen.add(`s:${s.source}`);
      count++;
    }
  }
  return { count, sources: [...seen] };
}

function MemberHome({ user }: { user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const nav = useNavigate();
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [doneDates, setDoneDates] = useState<Record<string, string | null>>({});
  const [modules, setModules] = useState<{ id: string; date: string | null }[]>([]);
  const [assets, setAssets] = useState<{ id: string; source: string }[]>([]);
  const [assess, setAssess] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = (user.name ?? '').trim().split(' ')[0] || 'integrante';
  const greeting = GREETING_BY_HOUR(new Date().getHours());

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const [planRows, actionRows, assessRows, brandRows] = await Promise.all([
          collection<PlanRow>('development_plan').list({ filter: { owner_id: user.id } }),
          collection<ActionItem>('action').list({ filter: { done: true } }),
          collection('assessment').list({ filter: { owner_id: user.id } }),
          collection('brand_profile').list({ filter: { owner_id: user.id } }),
        ]);
        if (!alive) return;
        setPlans(planRows);
        setActions(actionRows);
        setAssess(assessRows);
        setAssets(brandRows.map((b: Row) => ({ id: String(b.id), source: 'brand' })));
        // Cada ação concluída é datada a partir do registro, sem duplicar.
        const dates: Record<string, string | null> = {};
        for (const a of actionRows) {
          dates[a.id] = (a as unknown as { done_date?: string | null }).done_date ?? null;
        }
        setDoneDates(dates);
      } catch {
        if (alive) {
          setPlans([]);
          setActions([]);
          setAssess([]);
          setAssets([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [user.id]);

  const scores: Scores | null = useMemo(() => {
    if (!assess || assess.length === 0) return null;
    return computeScores(assess);
  }, [assess]);

  const stage = useMemo(() => (scores ? stageFor(scores.overall) : null), [scores]);

  const currentStepIdx = useMemo(() => {
    if (!stage) return 0;
    const idx = STEPS.findIndex((s) => s.key === stage);
    return idx >= 0 ? idx : 0;
  }, [stage]);

  const nextAction = useMemo(() => actions.find((a) => !a.done) ?? null, [actions]);

  const assetCounts = useMemo(
    () => computeAssetCounts(actions, doneDates, modules, assets),
    [actions, doneDates, modules, assets]
  );

  const { reflection, axis } = useMemo(() => pickReflection(stage), [stage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-64 w-full" />
          <Skeleton className="mt-4 h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      {/* Cabeçalho */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-6 sm:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <img
            src={BRAND.logoSrc}
            alt="Âmitse® — A Arquiteta da Autonomia da Mulher"
            width={720}
            height={148}
            className="block h-auto w-[170px] shrink-0 sm:w-[210px] lg:w-[240px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/mais" aria-label="Mais opções">
              <span className="sr-only">Mais</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary-text text-xs font-semibold">
                {firstName.slice(0, 2).toUpperCase()}
              </span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => nav('/login')} aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Saudação */}
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{firstName}</h1>
        </div>

        {/* Reflexão rotativa */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium tracking-widest text-primary-text uppercase">{axis.label}</p>
          <p className="mt-2 text-lg leading-relaxed text-pretty">{reflection.text}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Reflexão inspirada no pensamento de {reflection.author} · {reflection.region}
          </p>
          <p className="mt-1 text-xs text-muted-foreground italic">{axis.question}</p>
        </section>

        {/* Hero visual + Mapa (70/30) */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[7fr_3fr]">
          {/* Fotografia ampliada */}
          <div className="relative overflow-hidden rounded-2xl bg-foreground">
            <AppImage
              slot="home-hero"
              prompt="editorial photo of a woman architect reviewing plans in warm natural light, autonomy and decision, sophisticated contemporary scene"
              alt="Mulher em decisão sobre o próprio caminho"
              className="h-[380px] w-full object-cover sm:h-[460px]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
            <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
              <h2 className="text-xl font-semibold text-white">
                {stage ? 'Sua autonomia está em construção.' : 'Comece a Arquitetar sua Autonomia.'}
              </h2>
              <p className="mt-1 text-sm text-white/85">
                {stage ? 'Continue avançando no seu ritmo.' : 'Você escolhe o próximo passo.'}
              </p>
              <Button size="sm" className="mt-3" onClick={() => nav(stage ? '/plano' : '/diagnostico')}>
                {stage ? 'Continuar jornada' : 'Iniciar o Mapa de Construção'}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mapa da Autonomia */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-medium tracking-widest text-primary-text uppercase">Onde estou</p>
              <p className="mt-2 text-5xl font-bold tabular-nums text-primary">
                {scores ? `${Math.round(scores.overall)}%` : '—'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stage ?? 'Ainda não iniciado'}</p>

              <ol className="mt-4 space-y-2">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const isDone = i < currentStepIdx;
                  const isCurrent = i === currentStepIdx && !!stage;
                  return (
                    <li key={s.key} className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full border text-xs',
                          isDone && 'border-primary bg-primary text-primary-foreground',
                          isCurrent && 'border-primary text-primary',
                          !isDone && !isCurrent && 'border-border text-muted-foreground'
                        )}
                      >
                        <Icon className="h-3 w-3" />
                      </span>
                      <span
                        className={cn(
                          'text-sm',
                          isCurrent && 'font-semibold text-primary-text',
                          isDone && 'text-foreground',
                          !isDone && !isCurrent && 'text-muted-foreground'
                        )}
                      >
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Próximo passo */}
            <div className="rounded-2xl border border-border bg-primary/5 p-4">
              <p className="text-xs font-medium tracking-widest text-primary-text uppercase">Próximo passo</p>
              {nextAction ? (
                <>
                  <p className="mt-1 text-sm text-foreground">{nextAction.title}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => nav('/plano')}>
                    Avançar no Mapa
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-foreground">
                    Você concluiu o Diagnóstico. Agora é hora de iniciar sua jornada de Desenvolvimento.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => nav('/plano')}>
                    Continuar Jornada
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Como estou evoluindo */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Como estou evoluindo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe suas conquistas e a construção da sua autonomia.
          </p>
          <p className="mt-2 text-sm tabular-nums text-foreground">{assetCounts.count} conquistas registradas</p>
          <Graph
            actions={actions.map((a) => ({ id: a.id, done: a.done, date: doneDates[a.id] ?? null }))}
            modules={modules}
            assets={assets}
          />
        </section>

        {/* O que já construí */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">O que já construí</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(DIMENSION_COPY).map(([key, { label, role }]) => {
              const hasData = scores && (scores.byDimension[key] ?? 0) > 0;
              return (
                <div key={key} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{role}</p>
                  {hasData ? (
                    <p className="mt-2 text-lg font-bold tabular-nums text-primary">
                      {Math.round(scores!.byDimension[key] ?? 0)}%
                    </p>
                  ) : (
                    <p className="mt-2 text-xs italic text-muted-foreground">Em desenvolvimento</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Para onde estou caminhando */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Para onde estou caminhando</h2>
          <div className="mt-3 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Sua evolução acontece no seu ritmo. Cada passo conta na construção da sua autonomia.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function VisitorHome() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-6 sm:px-6">
        <img
          src={BRAND.logoSrc}
          alt="Âmitse® — A Arquiteta da Autonomia da Mulher"
          width={720}
          height={148}
          className="block h-auto w-[170px] shrink-0 sm:w-[210px] lg:w-[240px]"
        />
        <Button variant="ghost" size="sm" asChild>
          <Link to="/login">Entrar</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-xs tracking-widest text-primary-text uppercase">Âmitse®</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">A Arquiteta da Autonomia da Mulher</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Mulher, seu maior poder é bancar suas próprias escolhas. Construa o ativo que exponencializa sua autonomia
          profissional e pessoal.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/signup">Criar conta</Link>
        </Button>
      </main>
    </div>
  );
}

export default function Home() {
  const { user, isLoggedIn, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
      </div>
    );
  }
  if (!isLoggedIn || !user) {
    return <VisitorHome />;
  }
  return <MemberHome user={user} />;
}

export { Home };
