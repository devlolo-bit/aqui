import { Feed } from '@/lib/fab-client';
import { PageHeader } from '@/components/ui/page-header';

export default function Comunidade() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
      <PageHeader
        title="Comunidade"
        description="Conquistas, aprendizados e dúvidas entre integrantes. Você decide o que compartilhar e o que fica privado."
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 w-full">
          <Feed />
        </div>
        <aside className="hidden lg:block space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
            <h2 className="text-base font-semibold">Sobre a comunidade</h2>
            <p className="text-sm text-muted-foreground">
              Um espaço para trocar experiências entre integrantes. Respeite a privacidade de cada pessoa.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
