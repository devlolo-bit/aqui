import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stepper — numbered steps (an onboarding/checkout). The `current` = the current step's index (0-based). E.g.:
 * `<Stepper steps={[{label:'Dados'},{label:'Pagamento'}]} current={0} />`.
 */
function Stepper({
  steps, current, className,
}: {
  steps: { label: React.ReactNode; description?: React.ReactNode }[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center", className)}>
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li key={i} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
            <div className="flex items-center gap-2.5">
              <span className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                state === "done" && "bg-primary text-primary-foreground",
                state === "current" && "border-2 border-primary text-primary",
                state === "upcoming" && "border border-border text-muted-foreground",
              )}>
                {state === "done" ? <Check className="size-4" /> : i + 1}
              </span>
              <div className="hidden sm:block">
                <div className={cn("text-[13px] font-semibold", state === "upcoming" ? "text-muted-foreground" : "text-foreground")}>{s.label}</div>
                {s.description && <div className="text-[11px] text-muted-foreground">{s.description}</div>}
              </div>
            </div>
            {i < steps.length - 1 && <div className={cn("mx-3 h-px flex-1", i < current ? "bg-primary" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

export { Stepper };
