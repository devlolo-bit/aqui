import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StatCard — a KPI card: a label + a big value + the change (a delta) + an icon. E.g.:
 * `<StatCard label="Revenue" value="R$ 12.4k" delta="+18%" trend="up" tone="success" icon={<DollarSign/>} />`.
 * Use it in a 2–4 col grid, giving each card a DIFFERENT `tone` — see the note on TONES below.
 */
// It accepts an `icon={<DollarSign/>}` (an element) OR an `icon={DollarSign}` (the COMPONENT) — the AI passes both forms; without
// this, a component becomes "Objects are not valid as a React child" and brings the screen down. It renders the component when it is one.
function renderIcon(icon: React.ReactNode | React.ElementType): React.ReactNode {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;                      // it is already an <Icon/>
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null && "$$typeof" in (icon as object))) {
    const Icon = icon as React.ElementType;                         // it received the COMPONENT → it renders it
    return <Icon />;
  }
  return icon as React.ReactNode;                                   // a string/number/etc
}

// a mini sparkline (an SVG polyline) from a list of numbers — the color by the trend. Optional; with no `spark` the
// card looks identical to the old one (backward compatible).
function Sparkline({ points, trend }: { points: number[]; trend?: "up" | "down" | "neutral" }) {
  if (!points || points.length < 2) return null;
  const w = 64, h = 24, min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const d = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(" ");
  const stroke = trend === "down" ? "var(--destructive)" : trend === "neutral" ? "var(--muted-foreground)" : "var(--success)";
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points={d} /></svg>;
}

// The metric's TONE. A whole dashboard in grey is what makes an app read as a wireframe next to a product: four
// identical KPIs never say THAT they are different quantities. Each tone yields two things — the icon's SOLID
// square (that is where the colour's weight comes from) and a large soft glow behind it, which is what gives depth
// without colouring the card's background (a coloured field behind a number hurts reading the number). With no
// `tone`, it falls back to neutral.
const TONES = {
  primary: { solid: "bg-primary text-primary-foreground", glow: "bg-primary/25" },
  success: { solid: "bg-success text-white", glow: "bg-success/25" },
  danger: { solid: "bg-destructive text-white", glow: "bg-destructive/25" },
  info: { solid: "bg-sky-500 text-white", glow: "bg-sky-500/25" },
  violet: { solid: "bg-violet-500 text-white", glow: "bg-violet-500/25" },
  amber: { solid: "bg-amber-500 text-white", glow: "bg-amber-500/25" },
  neutral: { solid: "bg-accent text-primary", glow: "bg-primary/10" },
} as const;
export type StatTone = keyof typeof TONES;

function StatCard({
  label, value, delta, trend, icon, spark, tone = "neutral", className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode | React.ElementType;
  spark?: number[];                // optional: a mini trend chart (matches design)
  tone?: StatTone;                 // the metric's colour — give a DIFFERENT one to each card in the row
  className?: string;
}) {
  const t = TONES[tone];
  return (
    // `overflow-hidden` because the glow bleeds past the card on purpose — that is what makes the colour read as
    // light rather than a sticker. The border is nearly invisible (the shadow is what separates the card from the
    // background); a hard 1px border plus a shadow is the 2010s admin-table look.
    <div className={cn("group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-shadow shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.12)] hover:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_20px_44px_-16px_rgba(16,24,40,0.18)]", className)}>
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span className="relative flex size-11 shrink-0 items-center justify-center">
            <span className={cn("absolute -right-3 -top-3 size-20 rounded-full opacity-60 blur-2xl", t.glow)} />
            <span className={cn("relative flex size-11 items-center justify-center rounded-xl shadow-sm [&_svg]:size-5", t.solid)}>
              {renderIcon(icon)}
            </span>
          </span>
        )}
      </div>
      <div className="mt-4 font-display text-[2rem] font-bold leading-none tracking-tight tabular-nums text-foreground">{value}</div>
      <div className="mt-3 flex items-center justify-between gap-2">
        {delta != null ? (
          <span className={cn("text-[13px] font-semibold",
            trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground")}>
            {delta}
          </span>
        ) : <span />}
        {spark && <Sparkline points={spark} trend={trend} />}
      </div>
    </div>
  );
}

export { StatCard, TONES as STAT_TONES };
