import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const PALETTE = ["var(--color-primary)", "#2a6fdb", "#0e9f6e", "#e0a92b", "#c0392b", "#db2777"];
const AXIS = { fontSize: 11, stroke: "var(--color-muted-foreground)" };

/**
 * Chart — a ready-made chart (it hides the recharts). `type`: line|bar|area|pie. `data` = an array of objects; `xKey` = the field of the
 * X axis (or the label on the pie); `series` = the value fields (one or more lines/bars). E.g.:
 * `<Chart type="bar" data={vendas} xKey="mes" series={["total"]} />`.
 */
function Chart({
  type = "line", data, xKey, series, height = 260, className,
}: {
  type?: "line" | "bar" | "area" | "pie";
  data: Record<string, unknown>[];
  xKey: string;
  series: string[];
  height?: number;
  className?: string;
}) {
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />;
  const axes = (<>
    <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} />
    <YAxis tick={AXIS} tickLine={false} axisLine={false} width={36} />
  </>);
  const tip = <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", fontSize: 12 }} />;

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === "pie" ? (
          <PieChart>
            {tip}
            <Pie data={data} dataKey={series[0]} nameKey={xKey} innerRadius={50} outerRadius={90} paddingAngle={2}>
              {data.map((row, i) => <Cell key={String(row[xKey] ?? i)} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
          </PieChart>
        ) : type === "bar" ? (
          <BarChart data={data}>{grid}{axes}{tip}
            {series.map((s, i) => <Bar key={s} dataKey={s} fill={PALETTE[i % PALETTE.length]} radius={[6, 6, 0, 0]} />)}
          </BarChart>
        ) : type === "area" ? (
          <AreaChart data={data}>{grid}{axes}{tip}
            {series.map((s, i) => <Area key={s} dataKey={s} stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.15} strokeWidth={2} />)}
          </AreaChart>
        ) : (
          <LineChart data={data}>{grid}{axes}{tip}
            {series.map((s, i) => <Line key={s} dataKey={s} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />)}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export { Chart };
