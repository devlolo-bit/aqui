import * as React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

/**
 * Toaster — the notifications' host (already mounted by the platform inside the <FabProvider>, no need to add it).
 *
 * FROM A SCREEN OR COMPONENT, take `toast` from this module — the path is `@/components/ui/sonner` — and call
 * `toast.success('Salvo!')`, `toast.error('Falhou')` or `toast('Mensagem')`.
 *
 * ⚠️ INSIDE THIS FILE, `toast` comes from the `sonner` PACKAGE, on the import line above. This module must never
 * import from `@/components/ui/sonner`: that is its own path, and a module that re-exports a name it imported from
 * itself does not merely warn — rollup refuses to build the app at all ("cannot be exported … as it is a reexport
 * that references itself"), and no screen opens.
 *
 * This note used to spell the screens' import as a ready line of code. Editing this very file and needing `toast`
 * back in scope, the model copied that line here — 38 apps between 2026-08-10 and 08-15, every one of them dead on
 * arrival. Whatever else changes here, do not write an import of this module inside this module, not even as an
 * example: what a file shows, a model copies.
 */
function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      theme="light"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border border-border bg-card text-card-foreground shadow-lg text-[12.5px] font-medium',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
