
interface PayrollSummaryBarProps {
  filteredWages: any[]
  summary: { totalNet: number; totalPaid: number; totalDiff: number }
}

export function PayrollSummaryBar({ filteredWages, summary }: PayrollSummaryBarProps) {
  if (filteredWages.length === 0) return null
  return (
    <div className="shrink-0 flex items-center gap-6 px-5 py-2 text-sm border-b border-[color:var(--border)] bg-[color:var(--card)]">
      <span className="text-[color:var(--muted)]">{filteredWages.length} 人</span>
      <span><span className="text-[color:var(--muted)]">应发 </span><span className="font-mono tabular-nums font-medium">¥{summary.totalNet.toLocaleString()}</span></span>
      <span><span className="text-[color:var(--muted)]">实发 </span><span className="font-mono tabular-nums font-medium">¥{summary.totalPaid.toLocaleString()}</span></span>
      {summary.totalDiff !== 0 && (
        <span><span className="text-[color:var(--muted)]">差额 </span><span className={`font-mono tabular-nums font-medium ${summary.totalDiff > 0 ? 'text-danger-500' : 'text-success-500'}`}>{summary.totalDiff > 0 ? '+' : ''}¥{summary.totalDiff.toLocaleString()}</span></span>
      )}
    </div>
  )
}

