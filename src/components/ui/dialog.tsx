import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/fab-client";
import { t } from "@/lib/fab-i18n";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn("fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)}
      {...props}
    />
  );
}

function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  const loc = useLocale();
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          // A COLUMN with a maximum height + breathing room (1rem top/bottom). The Header/Footer are FIXED regions (shrink-0); the body
          // (the DialogBody) is the ONLY area that scrolls. The `overflow-y-auto` here is only a safe FALLBACK: if the modal does NOT use a
          // <DialogBody>, tall content still scrolls (with a sticky header/footer) instead of overflowing/being clipped.
          "fixed top-1/2 left-1/2 z-50 flex flex-col w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto scroll-pt-20 rounded-2xl border bg-background p-6 shadow-[0_20px_50px_-18px_rgba(20,16,28,0.5)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 z-20 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15">
          <X className="size-4" />
          <span className="sr-only">{t(loc, "ui.close")}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// The FIXED header: a region that does NOT scroll (shrink-0). With a <DialogBody>, it is naturally fixed (outside the scroll area). The
// `sticky top-0`+bg is an inert FALLBACK: if the modal does not use a DialogBody and the whole DialogContent scrolls, the header sticks.
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("shrink-0 sticky top-0 z-10 flex flex-col gap-1.5 bg-background text-left", className)} {...props} />;
}
// The SCROLLABLE BODY: the ONLY area with scroll — the header/footer stay fixed OUTSIDE it. The `-mx-6 px-6` takes the scrollbar
// out to the modal's edge and keeps the content padded. Wrap the modal form's fields in here.
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("-mx-6 min-h-0 flex-1 overflow-y-auto px-6", className)} {...props} />;
}
// The FIXED footer: a region that does NOT scroll (shrink-0) — the buttons (Save/Cancel) always visible. `sticky bottom-0`+bg = the fallback.
//
// The `pt-4` + `border-t` (full-bleed through `-mx-6 px-6`) are NOT decoration: without them the buttons render flush against
// the last field of the form — the `gap-4` of the DialogContent is the only separation, and at that distance a primary button
// reads as part of the field above it. It is also the boundary the body needs when it scrolls UNDER this sticky region:
// with no line, the content just gets cut mid-pixel. AlertDialogFooter has had this treatment since it was written; this one
// was left behind, so every generated app with a form modal shipped with glued buttons.
//
// ⚠️ NO negative `-mb-6`/`pb-6` here (AlertDialogFooter has them and does NOT translate). This footer is a flex item of a
// `flex flex-col` container whose middle child (DialogBody) is the one that scrolls: a negative bottom margin shrinks the
// height the layout reserves for the footer, and the sticky region then OVERLAPS the last field instead of sitting below it.
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("shrink-0 sticky bottom-0 z-10 -mx-6 flex flex-col-reverse gap-2 border-t bg-background px-6 pt-4 sm:flex-row sm:justify-end", className)} {...props} />;
}
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("font-display text-base font-bold text-foreground", className)} {...props} />;
}
function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription };
