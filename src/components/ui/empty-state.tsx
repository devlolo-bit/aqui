import * as React from 'react';
import { cn } from '@/lib/utils';

// It accepts an `icon={<Inbox/>}` (an element) OR an `icon={Inbox}` (the COMPONENT) — the AI passes both forms; without this, a
// component becomes "Objects are not valid as a React child" and brings the screen down (the same case as the StatCard's).
function renderIcon(icon: React.ReactNode | React.ElementType): React.ReactNode {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as object))) {
    const Icon = icon as React.ElementType;
    return <Icon />;
  }
  return icon as React.ReactNode;
}

/**
 * EmptyState — the standard empty state (a list/table/screen with no data): an icon + a title + a description + an action. E.g.:
 * `<EmptyState icon={<Inbox/>} title="No orders" description="New orders show up here." action={<Button>Create</Button>} />`.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode | React.ElementType;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex size-[52px] items-center justify-center rounded-2xl bg-accent text-primary [&_svg]:size-6">
          {renderIcon(icon)}
        </div>
      )}
      <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { EmptyState };
