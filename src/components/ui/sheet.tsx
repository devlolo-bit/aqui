import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/fab-client';
import { t } from '@/lib/fab-i18n';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

const sideClasses = {
  // the right/left take 100% of the height (the "full height" exception → they may touch the top/bottom). The bottom/top are PARTIAL →
  // a height cap with breathing room (max-h-[calc(100dvh-2rem)]) so it does not overflow the screen; the inner scroll is the SheetContent's.
  right:
    'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
  left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
  bottom:
    'inset-x-0 bottom-0 h-auto max-h-[calc(100dvh-2rem)] border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
  top: 'inset-x-0 top-0 h-auto max-h-[calc(100dvh-2rem)] border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
};

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: keyof typeof sideClasses }) {
  const loc = useLocale();
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=closed]:animate-out" />
      <SheetPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col gap-4 overflow-y-auto scroll-pt-20 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out',
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-4 right-4 z-20 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15">
          <X className="size-4" />
          <span className="sr-only">{t(loc, 'ui.close')}</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

// The FIXED (sticky) header — it stays at the top while the sheet's body scrolls (before: it covers the top padding; see dialog.tsx).
function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
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
function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title className={cn('font-display text-base font-bold text-foreground', className)} {...props} />
  );
}
function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn('text-[13px] text-muted-foreground', className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
