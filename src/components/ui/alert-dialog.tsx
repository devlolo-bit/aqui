import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/fab-client';
import { t } from '@/lib/fab-i18n';
import { buttonVariants } from '@/components/ui/button';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=closed]:animate-out" />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto scroll-pt-20 rounded-2xl border bg-background p-6 shadow-[0_20px_50px_-18px_rgba(20,16,28,0.5)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

// a FIXED (sticky) header/footer + a background extension (before/after) so the content does not bleed into the padding while scrolling (see dialog.tsx).
function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 -mx-6 -mt-6 flex flex-col gap-1.5 bg-background px-6 pt-6 pb-4 before:absolute before:inset-x-0 before:bottom-full before:h-6 before:bg-background',
        className
      )}
      {...props}
    />
  );
}
function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-col-reverse gap-2 bg-background px-6 pt-4 pb-6 after:absolute after:inset-x-0 after:top-full after:h-6 after:bg-background sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  );
}
function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn('font-display text-base font-bold text-foreground', className)}
      {...props}
    />
  );
}
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description className={cn('text-[13px] text-muted-foreground', className)} {...props} />;
}
function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />;
}
function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />;
}

/**
 * ConfirmDialog — a READY-MADE confirmation (use it on EVERY deletion/irreversible action). Controlled by `open`/`onOpenChange`.
 * The `destructive` turns the confirm button red. E.g.:
 * `<ConfirmDialog open={o} onOpenChange={setO} title="Delete?" description="This cannot be undone." destructive onConfirm={del} />`
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  destructive,
  onConfirm,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  const loc = useLocale();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText ?? t(loc, 'ui.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? buttonVariants({ variant: 'destructive' }) : undefined}
            onClick={onConfirm}
          >
            {confirmText ?? t(loc, 'ui.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  ConfirmDialog,
};
