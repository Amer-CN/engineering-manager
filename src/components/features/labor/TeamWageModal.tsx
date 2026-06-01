// TeamWageModal.tsx — 班组工资汇总弹窗

import { useState, useEffect } from 'react'
import { Icon } from '../../ui/Icon'
import { Spinner } from '../../ui/Loading/Loading'
import { Modal } from '../../ui/Modal/Modal'
import { getAPI } from '@/services/api-adapter'

interface TeamWageModalProps {
  show: boolean
  teamId: number
  teamName: string
  projectId: number
  projectName: string
  onClose: () => void
}

export function TeamWageModal({ show, teamId, teamName, projectId, projectName, onClose }: TeamWageModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    workerCount: number; teamTotal: number
    details: { workerName: string; months: number; workDays: number; dailyWage: number; totalWage: number }[]
  } | null>(null)

  useEffect(() => {
    if (!show) return
    setLoading(true)
    getAPI().then(api => api.getTeamWages(projectId, teamId))
      .then(r => { if (r.success && r.data) setData(r.data); else setData(null) })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [show, projectId, teamId])

  return (
    <Modal isOpen={show} onClose={onClose} title={teamName} size="xl">
      <p className="text-xs text-slate-400 mb-4">{projectName} · 工资汇总</p>

        {/* Body */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : !data || data.workerCount === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Icon name="BarChart3" size={36} className="mx-auto mb-3" />
            <p>暂无工资数据</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{data.workerCount}</div>
                <div className="text-xs text-amber-600 mt-1">班组人数</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">¥{data.teamTotal.toLocaleString()}</div>
                <div className="text-xs text-green-600 mt-1">累计工资</div>
              </div>
            </div>

            {/* Per-worker detail table */}
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-2">人员明细</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium text-slate-600">姓名</th>
                      <th className="px-3 py-2 font-medium text-slate-600 text-center">月数</th>
                      <th className="px-3 py-2 font-medium text-slate-600 text-center">出勤天</th>
                      <th className="px-3 py-2 font-medium text-slate-600 text-right">日薪</th>
                      <th className="px-3 py-2 font-medium text-slate-600 text-right">工资</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.details.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium text-slate-800">{d.workerName}</td>
                        <td className="px-3 py-2.5 text-center text-slate-500">{d.months}</td>
                        <td className="px-3 py-2.5 text-center text-slate-600">{d.workDays} 天</td>
                        <td className="px-3 py-2.5 text-right text-slate-500">¥{d.dailyWage}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-green-700">¥{d.totalWage.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
    </Modal>
  )
}
