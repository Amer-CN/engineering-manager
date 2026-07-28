interface MatchStats {
  total: number
  matched: number
  unmatched: number
  ambiguous: number
  archived: number
  highConfidence: number
}

interface MatchConfirmStatsBarProps {
  stats: MatchStats
  confirming: boolean
  onBatchConfirm: () => void
  onConfirmAll: () => void
}

export function MatchConfirmStatsBar({
  stats,
  confirming,
  onBatchConfirm,
  onConfirmAll,
}: MatchConfirmStatsBarProps) {
  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-[color:var(--card)] rounded-lg border border-[color:var(--border)] p-4">
          <p className="text-sm text-[color:var(--fg-2)]">总计</p>
          <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">{stats.total}</p>
        </div>
        <div className="bg-[color:var(--card)] rounded-lg border border-[color:var(--border)] p-4">
          <p className="text-sm text-[color:var(--fg-2)]">已匹配</p>
          <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-success-600">{stats.matched}</p>
        </div>
        <div className="bg-[color:var(--card)] rounded-lg border border-[color:var(--border)] p-4">
          <p className="text-sm text-[color:var(--fg-2)]">待确认</p>
          <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-warning-600">{stats.ambiguous}</p>
        </div>
        <div className="bg-[color:var(--card)] rounded-lg border border-[color:var(--border)] p-4">
          <p className="text-sm text-[color:var(--fg-2)]">未匹配</p>
          <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-danger-600">{stats.unmatched}</p>
        </div>
        <div className="bg-[color:var(--card)] rounded-lg border border-[color:var(--border)] p-4">
          <p className="text-sm text-[color:var(--fg-2)]">已归档</p>
          <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg-2)]">{stats.archived}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-[color:var(--fg-2)]">
          高置信度匹配（≥80%）：<span className="font-bold text-success-600">{stats.highConfidence}</span> 条
        </div>
        <div className="space-x-4">
          <button
            onClick={onBatchConfirm}
            disabled={confirming || stats.highConfidence === 0}
            className={`
              px-6 py-2 text-sm font-medium text-white rounded-md
              ${stats.highConfidence === 0 || confirming
                ? 'bg-[color:var(--muted)] cursor-not-allowed'
                : 'bg-success-600 hover:bg-success-700'
              }
            `}
          >
            {confirming ? '确认中...' : `一键确认高置信度（${stats.highConfidence}）`}
          </button>
          <button
            onClick={onConfirmAll}
            disabled={confirming}
            className="px-6 py-2 text-sm font-medium text-[color:var(--on-accent)] bg-[color:var(--accent)] rounded-md hover:opacity-90 disabled:bg-[color:var(--muted)]"
          >
            {confirming ? '确认中...' : '确认所有已匹配'}
          </button>
        </div>
      </div>
    </>
  )
}
