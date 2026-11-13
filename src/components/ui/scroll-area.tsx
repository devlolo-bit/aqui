import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

// The FIRST primitive kept byte-for-byte in shadcn's own shape (`data-slot` included) instead of forked. It is here
// because the platform had no way to express "this row scrolls sideways" other than `overflow-x-auto`, which paints a
// native scrollbar across the middle of a filter row on every desktop that renders one. That is not a taste call: it
// was reported from a published app, and the composition catalogue was PRESCRIBING the class that causes it.
//
// Radix hides the native scrollbar on the viewport and draws the thumb itself, so a bounded region scrolls with no
// bar at rest and a thin one while it is being used.
//
// `type="scroll"`, not Radix's default `hover`: with `hover` the 10px thumb appeared every time the pointer merely
// crossed the region, which on a chips row reads as the same native bar this component was brought in to remove.
// A row of chips or filters is `<ScrollRow>` now (fade + arrows); this one is for bounded vertical panels and lists.

function ScrollArea({ className, children, type = "scroll", ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" type={type} className={cn("relative", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/15"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({ className, orientation = "vertical", ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none select-none p-px transition-colors",
        orientation === "vertical" && "h-full w-2 border-l border-l-transparent",
        orientation === "horizontal" && "h-2 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
