import * as React from 'react';
import { cn } from '@/lib/utils';

// It accepts an `icon={Users}` (the COMPONENT) OR an `icon={<Users/>}` (an element) — the AI passes both forms. WITHOUT this
// tolerance, an element passed as an `icon` would be used as a TYPE in the `<Icon/>` → React #130 ("Element type is
// invalid: got object"), bringing the screen down. It mirrors the empty-state/stat-card's renderIcon.
function renderIcon(icon: React.ReactNode | React.ElementType): React.ReactNode {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon; // it is already an <Icon/>
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as object))) {
    const Icon = icon as React.ElementType; // it received the COMPONENT → it renders it
    return <Icon className="size-5" />;
  }
  return icon as React.ReactNode;
}

/**
 * PageHeader — a screen's standard header: an optional icon + a title (in the title font), a subtitle and the actions on the right,
 * with the right divider and bottom spacing. E.g.:
 * `<PageHeader icon={Users} title="Clientes" subtitle="Gerencie sua base" actions={<Button>Novo</Button>} />`.
 * The `icon` accepts the COMPONENT (`Users`) or the ELEMENT (`<Users/>`). The `description` is an alias of the `subtitle`.
 */
function PageHeader({
  title,
  subtitle,
  description,
  actions,
  icon,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode | React.ElementType;
  className?: string;
}) {
  const sub = subtitle ?? description;
  return (
    <div className={cn('mb-5 flex items-start justify-between gap-4 border-b border-border pb-[18px]', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            {renderIcon(icon)}
          </span>
        )}
        <div className="min-w-0">
          {/* A ESCALA do título. `text-2xl` fixo deixava o cabeçalho da tela do mesmo tamanho de um título de card —
              e a hierarquia da página some quando o topo não é claramente o topo. Sobe com a viewport, como um h1
              deve subir. As páginas que escrevem o próprio h1 já usam `text-3xl sm:text-[2.5rem]`; esta peça ficava
              para trás e produzia telas com dois pesos diferentes no mesmo app. */}
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-[2.5rem]">{title}</h1>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * FormSection — it groups a form's fields with the right vertical rhythm (20px), with an optional section title/description.
 * Put several <Field>s inside. E.g.: `<FormSection title="Details">…<Field/>…</FormSection>`.
 */
function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-5', className)}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-sm font-bold text-foreground">{title}</h3>}
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className="space-y-5">{children}</div>
    </div>
  );
}

export { PageHeader, FormSection };
