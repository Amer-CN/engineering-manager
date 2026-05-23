// WorkerWageModal.tsx — 工人工资统计弹窗

import { useState, useEffect } from 'react'
import { Icon } from '../../ui/Icon'

interface WorkerWageModalProps {
  show: boolean
  workerId: number
  workerName: string
  onClose: () => void
}

export function WorkerWageModal({ show, workerId, workerName, onClose }: WorkerWageModalProps) {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<{
    projectCount: number; totalEarnings: number
    projectBreakdown: { projectId: number; projectName: string; total: number }[]
  } | null>(null)

  useEffect(() => {
    if (!show) return
    setLoading(true)
    window.electronAPI.getWorkerStats(workerId)
      .then(r => { if (r.success && r.data) setStats(r.data); else setStats(null) })
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [show, workerId])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{workerName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">工资统计</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l8 8M13 5l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : !stats ? (
          <div className="text-center py-12 text-slate-400">
            <Icon name="BarChart3" size={36} className="mx-auto mb-3" />
            <p>暂无工资数据</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{stats.projectCount}</div>
                <div className="text-xs text-amber-600 mt-1">参与项目</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">¥{stats.totalEarnings.toLocaleString()}</div>
                <div className="text-xs text-green-600 mt-1">累计领取</div>
              </div>
            </div>

            {/* Project breakdown */}
            {stats.projectBreakdown.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-600 mb-2">各项目明细</h4>
                <div className="space-y-2">
                  {stats.projectBreakdown.map(p => (
                    <div key={p.projectId} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">{p.projectName}</span>
                      <span className="text-sm font-medium text-slate-800">¥{p.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
