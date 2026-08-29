import { AlertOctagon, AlertTriangle, RotateCcw, Inbox } from "lucide-react";
import type { SummaryResponse } from "../api-types";
import { formatNum } from "../utils";

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}

function KpiCard({ label, value, icon, accent }: KpiCardProps) {
  return (
    <div
      className="rounded-lg border p-4 transition-colors"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="label-text" style={{ color: "var(--muted)" }}>
          {label}
        </span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div
        className="mono mt-3 text-[28px] font-bold leading-none"
        style={{ color: "var(--fg)", letterSpacing: "-0.03em" }}
      >
        {formatNum(value)}
      </div>
    </div>
  );
}

export function KpiCards({ summary }: { summary: SummaryResponse }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard
        label="待处理"
        value={summary.open}
        icon={<Inbox size={16} />}
        accent="var(--fg-2)"
      />
      <KpiCard
        label="高优先级"
        value={summary.high}
        icon={<AlertOctagon size={16} />}
        accent="var(--state-danger)"
      />
      <KpiCard
        label="回归"
        value={summary.regressed}
        icon={<RotateCcw size={16} />}
        accent="var(--state-warn)"
      />
      <KpiCard
        label="错误总数"
        value={summary.total}
        icon={<AlertTriangle size={16} />}
        accent="var(--fg-2)"
      />
    </div>
  );
}
