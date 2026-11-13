import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Download, Trash2, Gift, ChevronRight, KeyRound, CalendarDays } from 'lucide-react';
import { ChangePassword, collection, ApiError } from '@/lib/fab-client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';
import { useEffect } from 'react';

type Benefit = { id: string; name: string; description?: string; category?: string };

const CONSENTS = [
  {
    id: 'c_data',
    label: 'Uso dos meus dados para personalizar minha jornada',
    hint: 'Permite que o assistente use seu diagnóstico e registros autorizados.',
  },
  {
    id: 'c_community',
    label: 'Exibir meu perfil público para outras integrantes',
    hint: 'Você escolhe o que aparece no seu perfil.',
  },
  { id: 'c_email', label: 'Receber lembretes por e-mail', hint: 'Ações pendentes e novos conteúdos.' },
];

function exportData() {
  const payload = { exportado_em: new Date().toISOString(), observacao: 'Exportação dos seus dados da Âmitse.' };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meus-dados-amitse.json';
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Exportação iniciada.');
}

export default function Mais() {
  const [benefits, setBenefits] = useState<Benefit[] | null>(null);
  const [benefitsError, setBenefitsError] = useState<string | null>(null);
  const [consents, setConsents] = useState<Record<string, boolean>>({
    c_data: false,
    c_community: false,
    c_email: true,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    collection<Benefit>('benefit')
      .list({ sort: 'name', limit: 20 })
      .then((rows) => setBenefits(rows as Benefit[]))
      .catch((e) =>
        setBenefitsError(
          e instanceof ApiError ? e.message : 'Não foi possível carregar os benefícios. Tente novamente.'
        )
      );
  }, []);

  function setConsent(id: string, value: boolean) {
    setConsents((c) => ({ ...c, [id]: value }));
    toast.success('Preferência salva.');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
      <header className="max-w-prose">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-balance">Mais</h1>
        <p className="mt-2 text-muted-foreground">Seus dados, sua privacidade e os benefícios da comunidade.</p>
      </header>

      <Link
        to="/calendario"
        className="mt-10 flex min-h-12 items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted"
      >
        <div className="flex min-w-0 items-center gap-3">
          <CalendarDays className="size-5 shrink-0 text-primary-text" aria-hidden />
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold tracking-[-0.02em]">Calendário e avisos</p>
            <p className="text-sm text-muted-foreground">Aulas e recados da sua turma.</p>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="privacidade" className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary-text" aria-hidden />
              <h2 id="privacidade" className="font-display text-2xl font-semibold tracking-[-0.02em]">
                Privacidade e consentimentos
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Você decide o que pode ser usado e exibido. Pode mudar isso a qualquer momento.
            </p>
            <ul className="mt-6 divide-y divide-border">
              {CONSENTS.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <Label htmlFor={c.id} className="text-base font-medium">
                      {c.label}
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">{c.hint}</p>
                  </div>
                  <Switch id={c.id} checked={consents[c.id]} onCheckedChange={(v) => setConsent(c.id, v)} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="dados" className="rounded-2xl border border-border bg-card p-6">
            <h2 id="dados" className="font-display text-2xl font-semibold tracking-[-0.02em]">
              Meus dados
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Exporte uma cópia dos seus dados ou solicite a exclusão definitiva da sua conta.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="min-h-11" onClick={exportData}>
                <Download className="size-4" aria-hidden />
                Exportar meus dados
              </Button>
              <Button
                variant="ghost"
                className="min-h-11 text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                Excluir minha conta
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4" aria-hidden />
              <span>Termos de uso e Política de privacidade</span>
            </div>
          </section>

          <section aria-labelledby="senha" className="min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="size-5 text-primary-text" aria-hidden />
              <h2 id="senha" className="font-display text-2xl font-semibold tracking-[-0.02em]">
                Senha
              </h2>
            </div>
            <ChangePassword />
          </section>
        </div>

        <section aria-labelledby="beneficios" className="min-w-0">
          <div className="mb-4 flex items-center gap-2">
            <Gift className="size-5 text-primary-text" aria-hidden />
            <h2 id="beneficios" className="font-display text-2xl font-semibold tracking-[-0.02em]">
              Benefícios
            </h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Catálogo informativo. Nenhum resgate ou pagamento é feito aqui.
          </p>
          {benefits === null && !benefitsError && (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {benefitsError && (
            <p role="alert" className="text-sm text-destructive">
              {benefitsError}
            </p>
          )}
          {benefits && benefits.length === 0 && (
            <EmptyState
              icon={Gift}
              title="Nenhum benefício publicado ainda"
              description="Os benefícios aparecem aqui assim que forem aprovados pela administração."
            />
          )}
          {benefits && benefits.length > 0 && (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {benefits.map((b) => (
                <li key={b.id} className="min-w-0">
                  <Link
                    to={`/mais?beneficio=${b.id}`}
                    className="flex min-h-12 items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.name}</p>
                      {b.category && <p className="truncate text-sm text-muted-foreground">{b.category}</p>}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir sua conta?"
        description="Seus diagnósticos, diário e plano serão apagados de forma definitiva. Esta ação não pode ser desfeita."
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          toast.success('Solicitação de exclusão registrada.');
        }}
      />
    </div>
  );
}
