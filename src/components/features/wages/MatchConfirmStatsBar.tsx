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
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">总计</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">已匹配</p>
          <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">待确认</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.ambiguous}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">未匹配</p>
          <p className="text-2xl font-bold text-red-600">{stats.unmatched}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">已归档</p>
          <p className="text-2xl font-bold text-slate-600">{stats.archived}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-600">
          高置信度匹配（≥80%）：<span className="font-bold text-green-600">{stats.highConfidence}</span> 条
        </div>
        <div className="space-x-4">
          <button
            onClick={onBatchConfirm}
            disabled={confirming || stats.highConfidence === 0}
            className={`
              px-6 py-2 text-sm font-medium text-white rounded-md
              ${stats.highConfidence === 0 || confirming
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
              }
            `}
          >
            {confirming ? '确认中...' : `一键确认高置信度（${stats.highConfidence}）`}
          </button>
          <button
            onClick={onConfirmAll}
            disabled={confirming}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-slate-400"
          >
            {confirming ? '确认中...' : '确认所有已匹配'}
          </button>
        </div>
      </div>
    </>
  )
}
