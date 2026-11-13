import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, Compass, Heart, Layers, Users } from 'lucide-react';
import { collection, useAuth } from '@/lib/fab-client';
import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  computeScores,
  DIMENSIONS,
  latestAssessment,
  stageFor,
  STAGE_LABEL,
  type AnswerRow,
  type AssessmentRow,
  type Scores,
  type StageKey,
} from '@/lib/mapa';
import { BRAND } from '@/lib/brand-assets';
import { pickReflection, type ReflectionAxis } from '@/lib/reflections';
import { growth, METRIC_CATEGORY, METRICS, type MetricRow } from '@/lib/numeros';
import { Graph } from '@/components/ui/graph';

const GREETING_BY_HOUR = (h: number) => (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

const STEPS: { key: StageKey; label: string; icon: typeof Compass }[] = [
  { key: 'DIAGNOSTICAR', label: STAGE_LABEL.DIAGNOSTICAR, icon: Compass },
  { key: 'DESENVOLVER', label: STAGE_LABEL.DESENVOLVER, icon: Layers },
  { key: 'CONSTRUIR', label: STAGE_LABEL.CONSTRUIR, icon: TrendingUp },
  { key: 'CONECTAR', label: STAGE_LABEL.CONECTAR, icon: Users },
  { key: 'PROSPERAR', label: STAGE_LABEL.PROSPERAR, icon: Heart },
];

type ActionItem = { id: string; title: string; due_date: string | null; done: boolean; done_date?: string | null };
type ProgressRow = { id: string; last_module?: string | null; created_at?: string | null };

/* A fotografia da Home acompanha a reflexão do dia.
 *
 * Como `pickReflection` sorteia a frase a cada entrada, e cada frase tem um
 * eixo, a imagem roda junto e fala do mesmo assunto — em vez de uma paisagem
 * genérica que serve para qualquer texto.
 *
 * Os seis `slot` estão escritos por extenso, um a um, de propósito: é assim
 * que o Studio encontra cada espaço para gerar a imagem. Um slot montado por
 * variável não apareceria na lista de lá.
 *
 * As fotos mostram mulheres como protagonistas, adultas e em posição, que é o
 * que o moodboard pede. Gere cada uma no Studio: Preview → trocar imagem. */
function HomeHero({ axis }: { axis: ReflectionAxis }) {
  switch (axis) {
    case 'financeira':
      return (
        <AppImage
          slot="home-hero-financeira"
          prompt="Editorial photo of a Brazilian woman in her forties at a bright contemporary desk, reviewing figures on paper with calm concentration, elegant blazer, natural daylight, shallow depth of field, no text in the image."
          alt="Mulher revendo os próprios números"
          className="h-[380px] w-full object-cover sm:h-[460px]"
          width={1400}
          height={760}
          priority
        />
      );
    case 'profissional':
      return (
        <AppImage
          slot="home-hero-profissional"
          prompt="Editorial photo of a confident Brazilian woman presenting her work to two colleagues in a bright modern studio, mid-gesture, warm natural light, sophisticated contemporary interior, no text in the image."
          alt="Mulher apresentando o próprio trabalho"
          className="h-[380px] w-full object-cover sm:h-[460px]"
          width={1400}
          height={760}
          priority
        />
      );
    case 'intelectual':
      return (
        <AppImage
          slot="home-hero-intelectual"
          prompt="Editorial photo of a Brazilian woman reading at a window seat with books and a notebook beside her, absorbed and composed, soft natural light, refined minimal interior, no text in the image."
          alt="Mulher estudando"
          className="h-[380px] w-full object-cover sm:h-[460px]"
          width={1400}
          height={760}
          priority
        />
      );
    case 'social':
      return (
        <AppImage
          slot="home-hero-social"
          prompt="Editorial photo of four Brazilian women of different ages and ethnicities talking and laughing around a table in an upscale restaurant, warm evening light, genuine connection, sophisticated setting, no text in the image."
          alt="Mulheres em conversa"
          className="h-[380px] w-full object-cover sm:h-[460px]"
          width={1400}
          height={760}
          priority
        />
      );
    case 'emocional':
      return (
        <AppImage src="https://cdn.fabapp.app/c968a120-f511-4f69-803b-8d9ddf3745b0/3a153e1a-86b2-4529-be12-37f0b2793189/553a4840-6fbb-48d4-9a06-b5c024d1ce5a/Gemini_Generated_Image_445vu5445vu5445v.png"
          slot="home-hero-emocional"
          prompt="Editorial portrait of a Brazilian woman in her thirties standing by a large window, self-possessed and serene, looking ahead, soft daylight, contemporary architecture in the background, no text in the image."
          alt="Mulher em um momento de serenidade"
          className="h-[380px] w-full object-cover sm:h-[460px]"
          width={1400}
          height={760}
          priority
        />
      );
    case 'pessoal':
    default:
      return (
        <AppImage
          slot="home-hero-pessoal"
          prompt="Editorial photo of a Brazilian woman walking with purpose through contemporary architecture, elegant and unhurried, natural daylight, clean sophisticated lines, no text in the image."
          alt="Mulher seguindo o próprio caminho"
          className="h-[380px] w-full object-cover sm:h-[460px]"
          width={1400}
          height={760}
          priority
        />
      );
  }
}

type AssetCount = { count: number; sources: string[] };

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
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [doneDates, setDoneDates] = useState<Record<string, string | null>>({});
  const [modules, setModules] = useState<{ id: string; date: string | null }[]>([]);
  const [assets, setAssets] = useState<{ id: string; source: string }[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [loading, setLoading] = useState(true);

  const firstName = (user.name ?? '').trim().split(' ')[0] || 'integrante';
  const greeting = GREETING_BY_HOUR(new Date().getHours());

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        /* `action` não tem campo owner_id: o schema a vincula à dona através do
         * plano de desenvolvimento (owner_via), e a plataforma já filtra por
         * isso no servidor. Filtrar aqui por owner_id não devolveria nada. */
        const [actionRows, assessRows, brandRows, progressRows, metricRows] = await Promise.all([
          collection<ActionItem>('action').list({ limit: 200 }),
          collection<AssessmentRow>('assessment').list({ filter: { owner_id: user.id } }),
          collection<{ id: string }>('brand_profile').list({ filter: { owner_id: user.id } }),
          collection<ProgressRow>('track_progress').list({ filter: { owner_id: user.id }, limit: 200 }),
          collection<MetricRow>('journal_entry').list({
            filter: { owner_id: user.id, category: METRIC_CATEGORY },
            limit: 100,
          }),
        ]);
        if (!alive) return;

        setActions(actionRows);
        setAssets(brandRows.map((b) => ({ id: String(b.id), source: 'brand' })));
        setModules(progressRows.map((p) => ({ id: String(p.id), date: p.created_at ?? null })));
        setMetrics(metricRows);

        /* Cada ação concluída é datada a partir do registro, sem duplicar. */
        const dates: Record<string, string | null> = {};
        for (const a of actionRows) dates[a.id] = a.done_date ?? null;
        setDoneDates(dates);

        /* A pontuação vem das respostas do diagnóstico mais recente, não da
         * lista de diagnósticos. */
        const current = latestAssessment(assessRows);
        setHasAssessment(!!current);
        if (current) {
          const answerRows = await collection<AnswerRow>('assessment_answer').list({
            filter: { assessment: current.id },
            limit: 200,
          });
          if (alive) setAnswers(answerRows);
        } else if (alive) {
          setAnswers([]);
        }
      } catch {
        if (alive) {
          setActions([]);
          setAssets([]);
          setModules([]);
          setMetrics([]);
          setAnswers([]);
          setHasAssessment(false);
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
    const s = computeScores(answers);
    return s.answered > 0 ? s : null;
  }, [answers]);

  const stage = useMemo(() => (scores ? stageFor(scores.overall) : null), [scores]);

  const currentStepIdx = useMemo(() => {
    if (!stage) return 0;
    const idx = STEPS.findIndex((s) => s.key === stage);
    return idx >= 0 ? idx : 0;
  }, [stage]);

  /* A consulta traz todas as ações da usuária, concluídas e pendentes, para que
   * esta busca encontre de fato a próxima. Antes a consulta filtrava done:true,
   * e procurar uma pendente dentro dela nunca devolvia nada. */
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
      {/* Sem cabeçalho próprio: o AppShell do Layout já traz logo e navegação.
       * Antes os dois apareciam empilhados em /jornada. */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Saudação. A vírgula vai depois do nome, como pede a página 82 do brandbook. */}
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{firstName},</h1>
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
            <HomeHero axis={axis.key} />
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
              {/* O rótulo legível, nunca a chave interna em caixa alta. */}
              <p className="mt-1 text-sm text-muted-foreground">
                {stage ? STAGE_LABEL[stage] : 'Ainda não iniciado'}
              </p>

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
              {/* Três estados reais, em vez de um texto fixo que afirmava à
               * recém-chegada que ela havia concluído o diagnóstico. */}
              {nextAction ? (
                <>
                  <p className="mt-1 text-sm text-foreground">{nextAction.title}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => nav('/plano')}>
                    Avançar no Mapa
                  </Button>
                </>
              ) : !hasAssessment ? (
                <>
                  <p className="mt-1 text-sm text-foreground">
                    Comece pelo Diagnóstico da Autonomia. São cerca de 15 minutos, e é ele que monta o seu Mapa.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => nav('/diagnostico')}>
                    Fazer o Diagnóstico
                  </Button>
                </>
              ) : !scores ? (
                <>
                  <p className="mt-1 text-sm text-foreground">
                    Seu diagnóstico está em andamento. Retome de onde parou para liberar o seu Mapa.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => nav('/diagnostico')}>
                    Retomar Diagnóstico
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-foreground">
                    Seu Mapa está pronto. Escolha a próxima prioridade para avançar.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => nav('/mapa')}>
                    Abrir o Mapa
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Os números do negócio, que a página 51 do brandbook pede na Home. */}
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight">Os seus números</h2>
            <Button variant="link" className="h-auto p-0" onClick={() => nav('/numeros')}>
              {metrics.length === 0 ? 'Lançar o primeiro mês' : 'Abrir Meus números'}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          {metrics.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Uma marca sustentável se mede. Lance faturamento, clientes e alcance uma vez por mês, e a curva do seu
              crescimento aparece aqui.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {METRICS.map((m) => {
                const g = growth(metrics, m.key);
                return (
                  <div key={m.key} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{g ? m.format(g.last) : '—'}</p>
                    {g?.delta !== null && g?.delta !== undefined && (
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {g.delta > 0 ? '+' : ''}
                        {g.delta}% no mês
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
          {/* As dimensões vêm de lib/mapa.ts, a mesma fonte que pontua o
           * diagnóstico. Antes esta tela declarava seis chaves próprias que não
           * existiam em lugar nenhum, e por isso nenhum card mostrava número. */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {DIMENSIONS.map((d) => {
              const value = scores?.byDimension[d.key] ?? 0;
              return (
                <div key={d.key} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">{d.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{d.role}</p>
                  {value > 0 ? (
                    <p className="mt-2 text-lg font-bold tabular-nums text-primary">{value}%</p>
                  ) : (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      {hasAssessment ? 'Sem resposta ainda' : 'O Diagnóstico revela'}
                    </p>
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
  const location = useLocation();
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
  /* Membro na raiz vai para /inicio, que é onde o Layout monta a navegação.
   * Sem isso, a Home da membro apareceria sem menu nenhum. */
  if (location.pathname === '/') {
    return <Navigate to="/inicio" replace />;
  }
  return <MemberHome user={user} />;
}

export { Home };
