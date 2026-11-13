import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

/**
 * Field — the standard wrapper of ONE form field. It is the OWNER of the spacing (label→control = 6px, the error/hint
 * text = 11px) so the layout is consistent by construction. Stack several <Field>s in a `space-y-5` container
 * (see the <FieldGroup>). Pass the control in as a child: `<Field label="Name"><Input .../></Field>`.
 *
 * The control automatically receives an `aria-invalid` when there is an `error` (it triggers the Input/Select's error state).
 */
function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
  ...rest
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
} & Record<string, unknown>) {
  const control =
    React.isValidElement(children) && error
      ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { 'aria-invalid': true })
      : children;
  // VISUAL EDITING: it forwards the <Field …> invocation's data-fab-loc/name to the DOM → a click selects the Field and lets you
  // edit the `label` prop in the inspector (otherwise it climbs to a container and the label's text becomes unreachable).
  const fab: Record<string, unknown> = {};
  if (rest['data-fab-loc']) fab['data-fab-loc'] = rest['data-fab-loc'];
  if (rest['data-fab-name']) fab['data-fab-name'] = rest['data-fab-name'];
  return (
    <div className={cn('space-y-1.5', className)} {...fab}>
      {label != null && label !== '' && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {control}
      {error ? (
        <p className="text-[11px] font-semibold text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** A container of stacked fields with the right vertical rhythm (20px). Use it around several <Field>s. */
function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('space-y-5', className)} {...props} />;
}

export { Field, FieldGroup };
