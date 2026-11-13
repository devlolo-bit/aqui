/**
 * <Chart/> — the READY-MADE chart piece (dashboards). The types: 'line' | 'bar' | 'area' | 'donut'. Data-driven and SIMPLE
 * (the app passes the already computed numbers) — pure SVG, token-driven (it inherits the theme), light/dark, with a tooltip on
 * hover and empty/loading/error states. It is not a data model (it has no blueprint) — it renders whatever the app gives it.
 *
 * Uso: `<Chart type="line" title="Receita" data={[{label:'Seg', value:120}, …]} />`
 *      `<Chart type="donut" data={[{label:'Corte', value:46}, {label:'Barba', value:26}]} />`
 *      `<Chart type="line" series={[{name:'Receita', points:[…]}, {name:'Despesa', points:[…]}]} />` — several lines
 *      on ONE scale, with a legend (line/area only). Use it whenever the point is to COMPARE two quantities.
 * A platform component — the app USES the <Chart/>, it does not recreate it. Code-split by the fab-client.
 */
import { useCallback, useState } from "react";
import { useLocale } from "./fab-client";
import { t as i18n, type FabI18nKey } from "./fab-i18n";

export type ChartPoint = { label: string; value: number; color?: string };
export type ChartType = "line" | "bar" | "area" | "donut";
/** One named line of a line/area chart. Passing `series` instead of `data` draws several lines on ONE scale. */
export type ChartSeries = { name: string; points: ChartPoint[]; color?: string };

const PALETTE = ["var(--primary)", "var(--info)", "var(--warning)", "var(--success)", "var(--muted-foreground)"];

function Frame({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {title && <div className="mb-4 text-sm font-bold text-foreground">{title}</div>}
      {children}
    </div>
  );
}

export function Chart({ type, data, series, title, height = 200, loading, error, onRetry, valueFormat }:
  { type: ChartType; data?: ChartPoint[]; series?: ChartSeries[]; title?: string; height?: number; loading?: boolean; error?: boolean; onRetry?: () => void; valueFormat?: (n: number) => string }) {
  const loc = useLocale();
  const T = useCallback((k: FabI18nKey) => i18n(loc, k), [loc]);
  const [hover, setHover] = useState<number | null>(null);
  const fmt = valueFormat || ((n: number) => new Intl.NumberFormat(loc).format(n));
  const ok = (d: ChartPoint) => d && typeof d.value === "number" && !Number.isNaN(d.value);
  // `series` is the MULTI-LINE form and `data` the single one. "Income vs expenses" is the chart every finance
  // dashboard opens with, and with one series per <Chart/> it came out as two stacked boxes on different scales —
  // which is exactly the comparison the reader came to make, and the one thing separate scales cannot show.
  const lines: ChartSeries[] = (series || []).length
    ? (series as ChartSeries[]).map((s, i) => ({ name: s.name, color: s.color || PALETTE[i % PALETTE.length],
                                                 points: (s.points || []).filter(ok) }))
    : [{ name: "", color: "var(--primary)", points: (data || []).filter(ok) }];
  const pts = lines[0].points;                       // donut/bar stay single-series
  const every = lines.flatMap((s) => s.points);

  if (loading) return <Frame title={title}><div className="flex items-end gap-2.5" style={{ height }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex-1 animate-pulse rounded bg-muted" style={{ height: `${40 + (i % 3) * 25}%` }} />)}</div></Frame>;
  if (error) return (
    <Frame title={title}><div className="flex flex-col items-center justify-center gap-2 text-center" style={{ height }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" /></svg></div>
      <div className="text-[13px] font-bold text-foreground">{T("cx.loadError")}</div>
      {onRetry && <button onClick={onRetry} className="mt-1 rounded-lg border border-border px-4 py-1.5 text-xs font-bold text-primary">{T("cx.retry")}</button>}
    </div></Frame>
  );
  if (every.length === 0) return (
    <Frame title={title}><div className="flex flex-col items-center justify-center gap-2 text-center" style={{ height }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" /></svg></div>
      <div className="text-[13px] font-bold text-foreground">{T("cx.noData")}</div>
      <div className="text-xs text-muted-foreground">{T("cx.noDataSub")}</div>
    </div></Frame>
  );

  // ---- DONUT ----
  if (type === "donut") {
    const total = pts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
    let acc = 0;
    const stops = pts.map((p, i) => {
      const from = (acc / total) * 100; acc += Math.max(0, p.value); const to = (acc / total) * 100;
      return `${p.color || PALETTE[i % PALETTE.length]} ${from}% ${to}%`;
    }).join(",");
    return (
      <Frame title={title}>
        <div className="flex items-center gap-5">
          <div className="relative flex-none rounded-full" style={{ width: 120, height: 120, background: `conic-gradient(${stops})` }}>
            <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-card">
              <span className="font-display text-xl font-bold text-foreground">{fmt(total)}</span><span className="text-[9.5px] text-muted-foreground">{T("cx.total")}</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            {pts.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color || PALETTE[i % PALETTE.length] }} />
                <span className="flex-1 text-foreground/80">{p.label}</span>
                <span className="font-bold text-foreground">{Math.round((Math.max(0, p.value) / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </Frame>
    );
  }

  // ---- BAR ----
  if (type === "bar") {
    const max = Math.max(...pts.map((p) => p.value), 1);
    // THE AXIS AND THE GRID. The bars were drawn loose on white: you could see which one was tallest and nothing
    // else — no bar had a VALUE without hovering. The line/area chart in this very piece has had a grid and an axis
    // all along; the bar one was left behind, and it is precisely the type dashboards use. Four ticks are enough
    // (0, ⅓, ⅔, top) — more than that becomes graph paper and competes with the data.
    const ticks = [1, 2 / 3, 1 / 3, 0].map((f) => max * f);
    return (
      <Frame title={title}>
        <div className="flex" style={{ height, paddingBottom: 22 }}>
          <div className="mr-2 flex shrink-0 flex-col justify-between py-0 text-right text-[10px] tabular-nums text-muted-foreground">
            {ticks.map((t, i) => <span key={i} className="leading-none">{fmt(t)}</span>)}
          </div>
          <div className="relative flex flex-1 items-end gap-3">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {ticks.map((_, i) => (
                <div key={i} className="h-px w-full" style={{
                  background: i === ticks.length - 1 ? "var(--border)" : "transparent",
                  borderTop: i === ticks.length - 1 ? "none" : "1px dashed var(--border)",
                }} />
              ))}
            </div>
            {pts.map((p, i) => {
            // `ChartPoint.color` is part of the type and the donut has always honoured it; the BARS did not, and fell
            // back to "the tallest one is primary, the rest are accent". So an app that coloured its points — the way
            // you draw two series as alternating bars, e.g. revenue against expenses — got one flat colour scheme and
            // a chart that could not be read. A declared prop that silently does nothing is worse than no prop.
            const isMax = p.value === max;
            return (
              <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                className="relative flex h-full flex-1 flex-col items-center justify-end">
                {hover === i && <div className="absolute -top-1 z-10 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-[11px] font-bold text-background">{fmt(p.value)}</div>}
                <div className={`w-full rounded-t-lg ${p.color ? "" : isMax ? "bg-primary" : "bg-accent"}`}
                  style={{ height: `${Math.max(2, (p.value / max) * 100)}%`, background: p.color || undefined }} />
                <span className="absolute bottom-0 translate-y-full pt-1 text-[10px] text-muted-foreground">{p.label}</span>
              </div>
            );
            })}
          </div>
        </div>
      </Frame>
    );
  }

  // ---- LINE / AREA ----
  // padL is wide enough for the VALUE labels. Bars have carried an axis since 2026-08-14; the line kept three bare
  // gridlines, so the reader could see the shape and not the size — and on a money chart the size is the point.
  const W = 520, H = height, padL = 58, padB = 24, padT = 10, padR = 10;
  const cols = Math.max(...lines.map((s) => s.points.length), 1);
  const max = Math.max(...every.map((p) => p.value), 1), min = Math.min(...every.map((p) => p.value), 0);
  const span = max - min || 1;
  const x = (i: number) => padL + (i / Math.max(1, cols - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);
  const path = (s: ChartSeries) => s.points.map((p, i) => `${x(i)} ${y(p.value)}`).join(" L ");
  const first = lines[0];
  const areaPath = first.points.length
    ? `M ${x(0)} ${y(first.points[0].value)} L ${path(first)} L ${x(first.points.length - 1)} ${H - padB} L ${x(0)} ${H - padB} Z`
    : "";
  const ticks = [0, 0.5, 1];
  const labels = lines.reduce((a, s) => (s.points.length > a.length ? s.points : a), [] as ChartPoint[]);
  return (
    <Frame title={title}>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }} onMouseLeave={() => setHover(null)}>
          <defs><linearGradient id="fab-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
          {ticks.map((g, i) => {
            const gy = padT + g * (H - padT - padB);
            return (
              <g key={i}>
                <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="var(--border)" strokeWidth="1" strokeDasharray={i === 2 ? "0" : "3 4"} />
                <text x={padL - 6} y={gy + 3} fontSize="9.5" fill="var(--muted-foreground)" textAnchor="end">{fmt(max - g * span)}</text>
              </g>
            );
          })}
          {/* the area is filled only for a SINGLE series: two translucent fills overlapping produce a third colour
              that is not any datum, right where the lines cross — which is where the reading matters most */}
          {type === "area" && lines.length === 1 && areaPath && <path d={areaPath} fill="url(#fab-area)" />}
          {lines.map((s, si) => (
            <path key={si} d={`M ${path(s)}`} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {labels.map((_, i) => (
            <g key={i}>
              {hover === i && lines.map((s, si) => (s.points[i]
                ? <circle key={si} cx={x(i)} cy={y(s.points[i].value)} r="5" fill="var(--card)" stroke={s.color} strokeWidth="3" />
                : null))}
              <rect x={x(i) - (W - padL) / cols / 2} y={padT} width={(W - padL) / cols} height={H - padT - padB} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          ))}
          {labels.map((p, i) => (i % Math.ceil(labels.length / 6) === 0 ? <text key={i} x={x(i)} y={H - 6} fontSize="9.5" fill="var(--muted-foreground)" textAnchor="middle">{p.label}</text> : null))}
        </svg>
        {hover !== null && labels[hover] && (
          <div className="pointer-events-none absolute rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-bold text-background shadow-lg"
            style={{ left: `${(x(hover) / W) * 100}%`, top: 0, transform: "translateX(-50%)" }}>
            {labels[hover].label}
            {lines.map((s, si) => (s.points[hover]
              ? <span key={si} className="ml-1.5">{s.name ? `${s.name} ` : "· "}{fmt(s.points[hover].value)}</span>
              : null))}
          </div>
        )}
        {lines.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {lines.map((s, si) => (
              <span key={si} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}
