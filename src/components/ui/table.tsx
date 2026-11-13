import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// THE SCROLL, and why it is two changes and not one. This wrapper used to be a bare `overflow-x-auto`, which paints a
// native scrollbar across the table on every desktop that renders one. Worse, nothing forced the table wider than its
// container: with wrapping cells the columns just SQUEEZED, so on a 375px screen the scroll never engaged at all and
// every cell became a one-word-per-line strip. The prompt promised "they scroll" and the promise was false.
//
// `<ScrollBar orientation="horizontal">` is NOT decoration: Radix only sets `overflow-x: scroll` on the viewport when a
// horizontal scrollbar MOUNTS (`onScrollbarXEnabledChange`). Without it the axis is `hidden` and wide content is CLIPPED.
// Measured in a browser, not reasoned about.
//
// The `whitespace-nowrap` on the cells is the other half: it is what makes the table wider than the container, which is
// what gives the scroll something to do. Either change alone leaves the bug standing.
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <ScrollArea className="relative w-full">
      <table className={cn("w-full caption-bottom text-[13px]", className)} {...props} />
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-accent/50", className)} {...props} />;
}
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return <th className={cn("h-10 whitespace-nowrap px-3 text-left align-middle text-xs font-semibold text-muted-foreground", className)} {...props} />;
}
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("whitespace-nowrap px-3 py-2.5 align-middle", className)} {...props} />;
}
function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption className={cn("mt-3 text-xs text-muted-foreground", className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption };
