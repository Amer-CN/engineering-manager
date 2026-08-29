import type { Severity, GroupStatus } from "../api-types";
import { severityLabel, statusLabel } from "../utils";

/** 严重度色点：实心圆点，颜色随语义 */
export function SeverityDot({ severity }: { severity: Severity }) {
  const color =
    severity === "high"
      ? "var(--state-danger)"
      : severity === "medium"
        ? "var(--state-warn)"
        : "var(--state-ok)";
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

/** 严重度徽章：色点 + 大写中文标签，11px */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const color =
    severity === "high"
      ? "var(--state-danger)"
      : severity === "medium"
        ? "var(--state-warn)"
        : "var(--state-ok)";
  return (
    <span className="inline-flex items-center gap-1.5 label-text" style={{ color }}>
      <SeverityDot severity={severity} />
      {severityLabel(severity)}
    </span>
  );
}

/** 状态徽章：药丸式，待处理=墨色描边，已解决=ok 色描边 */
export function StatusBadge({ status }: { status: GroupStatus }) {
  const isResolved = status === "resolved";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 label-text"
      style={{
        borderColor: isResolved ? "var(--state-ok)" : "var(--border-strong)",
        color: isResolved ? "var(--state-ok)" : "var(--fg-2)",
      }}
    >
      {statusLabel(status)}
    </span>
  );
}
