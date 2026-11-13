import { useEffect, useState } from 'react';
import { z } from 'zod';
import { toast } from '@/components/ui/sonner';
import { collection, useAuth, ApiError, type Row } from '@/lib/fab-client';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup } from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type BrandForm = {
  name: string;
  segment: string;
  purpose: string;
  positioning: string;
};

const EMPTY: BrandForm = { name: '', segment: '', purpose: '', positioning: '' };

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da marca.').max(120, 'Use até 120 caracteres.'),
  segment: z.string().trim().min(2, 'Informe o segmento de atuação.').max(120, 'Use até 120 caracteres.'),
  purpose: z.string().trim().max(2000, 'Use até 2000 caracteres.'),
  positioning: z.string().trim().max(2000, 'Use até 2000 caracteres.'),
});

export default function Marca() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof BrandForm, string>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn || !user) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    collection<Row>('brand_profile')
      .list({ filter: { owner_id: user.id }, limit: 1 })
      .then((rows) => {
        if (!active) return;
        const first = rows[0];
        if (first) {
          setRecordId(first.id);
          setForm({
            name: String(first.name ?? ''),
            segment: String(first.segment ?? ''),
            purpose: String(first.purpose ?? ''),
            positioning: String(first.positioning ?? ''),
          });
        }
      })
      .catch((e) => {
        if (!active) return;
        setLoadError(e instanceof ApiError ? e.message : 'Não foi possível carregar sua marca. Tente novamente.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoggedIn, isLoading, user?.id]);

  const set = (key: keyof BrandForm) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof BrandForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof BrandForm;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    if (!user) return;
    setSaving(true);
    try {
      if (recordId) {
        await collection<Row>('brand_profile').update(recordId, parsed.data);
      } else {
        const created = await collection<Row>('brand_profile').create({ ...parsed.data, owner_id: user.id });
        setRecordId(created.id);
      }
      toast.success('Marca salva.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Algo deu errado. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const hasBrand = form.name.trim().length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 min-w-0">
      <PageHeader
        title="Minha marca"
        description="Nome, segmento, propósito e posicionamento. Você decide cada escolha."
      />
      {loading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : loadError ? (
        <div className="mt-8">
          <EmptyState
            title="Não foi possível carregar sua marca"
            description={loadError}
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tentar de novo
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem] min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>{hasBrand ? 'Estrutura da marca' : 'Comece pelo nome'}</CardTitle>
              <CardDescription>Preencha o que já sabe. Você pode voltar e ajustar quando quiser.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field label="Nome da marca" required error={errors.name}>
                  <Input
                    value={form.name}
                    onChange={(e) => set('name')(e.target.value)}
                    placeholder="Como sua marca se chama"
                    autoComplete="organization"
                  />
                </Field>
                <Field label="Segmento de atuação" required error={errors.segment}>
                  <Input
                    value={form.segment}
                    onChange={(e) => set('segment')(e.target.value)}
                    placeholder="Ex.: consultoria de carreira, moda, alimentação"
                  />
                </Field>
                <Field label="Propósito" error={errors.purpose} hint="Por que essa marca existe, em poucas frases.">
                  <Textarea rows={4} value={form.purpose} onChange={(e) => set('purpose')(e.target.value)} />
                </Field>
                <Field
                  label="Posicionamento"
                  error={errors.positioning}
                  hint="O que a marca oferece e para quem, na sua própria linguagem."
                >
                  <Textarea rows={4} value={form.positioning} onChange={(e) => set('positioning')(e.target.value)} />
                </Field>
              </FieldGroup>
              <div className="mt-6 flex justify-end">
                <LoadingButton loading={saving} onClick={save}>
                  Salvar marca
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Próximos passos</CardTitle>
              <CardDescription>Ferramentas de branding e negócios chegam nas próximas etapas.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Diagnóstico do negócio, laboratório de branding e planejamento financeiro ainda não estão disponíveis.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
