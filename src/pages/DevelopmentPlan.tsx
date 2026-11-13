import { useEffect, useState, useCallback } from 'react';
import { collection, ApiError, useAuth } from '@/lib/fab-client';
import type { Row } from '@/lib/fab-client';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';

type Plan = Row & { title?: string; priority?: string };
type Goal = Row & { development_plan?: string; title?: string; done?: boolean; due_date?: string };
type Action = Row & { development_plan?: string; goal?: string; title?: string; done?: boolean; due_date?: string };

export default function DevelopmentPlan() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [newPlan, setNewPlan] = useState('');
  const [newGoal, setNewGoal] = useState<Record<string, string>>({});
  const [newAction, setNewAction] = useState<Record<string, string>>({});

  /* Só development_plan tem owner_id. Metas e ações herdam a dona pelo plano
   * (owner_via), e a plataforma já aplica esse recorte no servidor. */
  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [p, g, a] = await Promise.all([
        collection<Plan>('development_plan').list({ filter: { owner_id: user.id }, sort: '-created_at', limit: 20 }),
        collection<Goal>('goal').list({ limit: 200 }),
        collection<Action>('action').list({ limit: 200 }),
      ]);
      setPlans(p as Plan[]);
      setGoals(g as Goal[]);
      setActions(a as Action[]);
    } catch (e) {
      setPlans([]);
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível carregar o plano. Tente novamente.');
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      setPlans([]);
      return;
    }
    void load();
  }, [isLoggedIn, isLoading, load]);

  const createPlan = async () => {
    if (!newPlan.trim()) return;
    try {
      /* owner_id na criação: sem ele o registro nasce sem dona e some das
       * telas que filtram, como a Home e o Mapa. */
      await collection('development_plan').create({ owner_id: user?.id, title: newPlan.trim(), priority: 'média' });
      setNewPlan('');
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível criar o plano.');
    }
  };

  const createGoal = async (planId: string) => {
    const title = (newGoal[planId] ?? '').trim();
    if (!title) return;
    try {
      await collection('goal').create({ development_plan: planId, title, done: false });
      setNewGoal((s) => ({ ...s, [planId]: '' }));
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível criar a meta.');
    }
  };

  const createAction = async (planId: string, goalId: string) => {
    const title = (newAction[goalId] ?? '').trim();
    if (!title) return;
    try {
      await collection('action').create({ development_plan: planId, goal: goalId, title, done: false });
      setNewAction((s) => ({ ...s, [goalId]: '' }));
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível criar a ação.');
    }
  };

  const toggle = async (model: 'goal' | 'action', id: string, done: boolean) => {
    try {
      await collection(model).update(id, { done: !done });
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível atualizar. Tente novamente.');
    }
  };

  const rename = async (model: 'development_plan' | 'goal' | 'action', id: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    try {
      await collection(model).update(id, { title: clean });
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente novamente.');
    }
  };

  if (isLoading || plans === null) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-balance">Plano de desenvolvimento</h1>
        <p className="text-muted-foreground">Transforme o diagnóstico em metas e ações concretas.</p>
      </header>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void createPlan();
        }}
      >
        <Input
          value={newPlan}
          onChange={(e) => setNewPlan(e.target.value)}
          placeholder="Novo plano, ex.: Autonomia financeira"
          aria-label="Título do novo plano"
        />
        <Button type="submit" className="min-h-11">
          Criar plano
        </Button>
      </form>

      {plans.length === 0 ? (
        <EmptyState title="Nenhum plano ainda" description="Crie um plano para começar a organizar suas metas." />
      ) : (
        plans.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-5 py-6">
              <PlanTitle initial={p.title ?? ''} onSave={(t) => rename('development_plan', p.id, t)} />

              {goals
                .filter((g) => g.development_plan === p.id)
                .map((g) => (
                  <div key={g.id} className="space-y-3 rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="size-5"
                        checked={!!g.done}
                        onChange={() => void toggle('goal', g.id, !!g.done)}
                        aria-label={`Concluir meta ${g.title}`}
                      />
                      <PlanTitle initial={g.title ?? ''} onSave={(t) => rename('goal', g.id, t)} />
                    </div>
                    <ul className="space-y-2 pl-8">
                      {actions
                        .filter((a) => a.goal === g.id)
                        .map((a) => (
                          <li key={a.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              className="size-4"
                              checked={!!a.done}
                              onChange={() => void toggle('action', a.id, !!a.done)}
                              aria-label={`Concluir ação ${a.title}`}
                            />
                            <PlanTitle initial={a.title ?? ''} onSave={(t) => rename('action', a.id, t)} />
                          </li>
                        ))}
                    </ul>
                    <form
                      className="flex flex-col gap-2 pl-8 sm:flex-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void createAction(p.id, g.id);
                      }}
                    >
                      <Input
                        value={newAction[g.id] ?? ''}
                        onChange={(e) => setNewAction((s) => ({ ...s, [g.id]: e.target.value }))}
                        placeholder="Nova ação"
                        aria-label="Nova ação"
                      />
                      <Button type="submit" variant="outline" className="min-h-11">
                        Adicionar ação
                      </Button>
                    </form>
                  </div>
                ))}

              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createGoal(p.id);
                }}
              >
                <Input
                  value={newGoal[p.id] ?? ''}
                  onChange={(e) => setNewGoal((s) => ({ ...s, [p.id]: e.target.value }))}
                  placeholder="Nova meta"
                  aria-label="Nova meta"
                />
                <Button type="submit" variant="outline" className="min-h-11">
                  Adicionar meta
                </Button>
              </form>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function PlanTitle({ initial, onSave }: { initial: string; onSave: (t: string) => void }) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  return (
    <Input
      className="border-transparent bg-transparent px-1 font-medium"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) onSave(value);
      }}
      aria-label="Editar título"
    />
  );
}
