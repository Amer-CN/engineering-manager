import { memo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../api-types";

function ChartTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-floating"
      style={{ backgroundColor: "var(--panel)", borderColor: "var(--border)", color: "var(--fg)" }}
    >
      <div className="mono" style={{ color: "var(--fg-2)" }}>{p.d}</div>
      <div className="mono mt-0.5 font-semibold" style={{ color: "var(--fg)" }}>
        {p.n} 次上报
      </div>
    </div>
  );
}

export const TrendChart = memo(function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="label-text" style={{ color: "var(--muted)" }}>
          近 30 天上报趋势
        </span>
        <span className="mono text-xs" style={{ color: "var(--fg-2)" }}>
          合计 {data.reduce((s, p) => s + p.n, 0)} 次
        </span>
      </div>
      <div style={{ width: "100%", height: 120 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="ec-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="d"
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval={5}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border-strong)" }} />
            <Area
              type="monotone"
              dataKey="n"
              stroke="var(--accent)"
              strokeWidth={1.5}
              fill="url(#ec-trend-fill)"
              dot={false}
              activeDot={{ r: 3, fill: "var(--accent)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
