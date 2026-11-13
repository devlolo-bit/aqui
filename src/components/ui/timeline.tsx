import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Timeline — a vertical timeline (a history/activity). E.g.:
 * `<Timeline items={[{title:'Pedido criado', time:'10:20', icon:<Package/>}]} />`.
 */
function Timeline({
  items, className,
}: {
  items: { title: React.ReactNode; description?: React.ReactNode; time?: React.ReactNode; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <ol className={cn("relative space-y-6 border-l border-border pl-6", className)}>
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className="absolute top-0.5 -left-[31px] flex size-5 items-center justify-center rounded-full bg-accent text-primary ring-4 ring-background [&_svg]:size-3">
            {it.icon ?? <span className="size-1.5 rounded-full bg-primary" />}
          </span>
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-semibold text-foreground">{it.title}</div>
            {it.time && <time className="shrink-0 text-[11px] text-muted-foreground">{it.time}</time>}
          </div>
          {it.description && <p className="mt-0.5 text-[13px] text-muted-foreground">{it.description}</p>}
        </li>
      ))}
    </ol>
  );
}

export { Timeline };
