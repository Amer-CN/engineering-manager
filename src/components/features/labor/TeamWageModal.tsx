// TeamWageModal.tsx — 班组工资汇总弹窗

import { useState, useEffect } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
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

interface WageDetailRow {
  workerName: string
  months: number
  workDays: number
  dailyWage: number
  totalWage: number
}

export function TeamWageModal({ show, teamId, teamName, projectId, projectName, onClose }: TeamWageModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    workerCount: number; teamTotal: number
    details: WageDetailRow[]
  } | null>(null)

  useEffect(() => {
    if (!show) return
    setLoading(true)
    setData(null)
    getAPI().then(api => api.getTeamWages(projectId, teamId))
      .then(r => {
        if (r.success && r.data && typeof r.data === 'object' && 'workerCount' in r.data) {
          setData(r.data as any)
        } else {
          setData(null)
        }
      })
      .catch(e => { console.error('[TeamWageModal]', e); setData(null) })
      .finally(() => setLoading(false))
  }, [show, projectId, teamId])

  const columns: Column<WageDetailRow>[] = [
    { key: 'workerName', title: '姓名', render: (item) => <span className="font-medium text-[color:var(--fg)]">{item.workerName}</span> },
    { key: 'months', title: '月数', align: 'center' },
    { key: 'workDays', title: '出勤天', align: 'center', render: (item) => <span>{item.workDays} 天</span> },
    { key: 'dailyWage', title: '日薪', align: 'right', render: (item) => <span className="font-mono tabular-nums">¥{item.dailyWage}</span> },
    { key: 'totalWage', title: '工资', align: 'right', render: (item) => <span className="font-medium font-mono tabular-nums text-success-700">¥{item.totalWage.toLocaleString()}</span> },
  ]

  return (
    <Modal isOpen={show} onClose={onClose} title={teamName} size="xl">
      <p className="text-xs text-[color:var(--muted)] mb-4">{projectName} · 工资汇总</p>

        {/* Body */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : !data || data.workerCount === 0 ? (
          <div className="text-center py-12 text-[color:var(--muted)]">
            <Icon name="BarChart3" size={36} className="mx-auto mb-3" />
            <p>暂无工资数据</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-warning-50 rounded-lg p-4 text-center">
                <div className="text-numeric-xl font-mono tabular-nums tracking-tight text-warning-700">{data.workerCount}</div>
                <div className="text-xs text-warning-600 mt-1">班组人数</div>
              </div>
              <div className="bg-success-50 rounded-lg p-4 text-center">
                <div className="text-numeric-xl font-mono tabular-nums tracking-tight text-success-700">¥{data.teamTotal.toLocaleString()}</div>
                <div className="text-xs text-success-600 mt-1">累计工资</div>
              </div>
            </div>

            {/* Per-worker detail table */}
            <div>
              <h4 className="text-sm font-medium text-[color:var(--fg-2)] mb-2">人员明细</h4>
              <DataTable
                data={data.details}
                columns={columns}
                rowKey="workerName"
                pagination={false}
                showContainer={true}
                stickyHeader={true}
                emptyText="暂无数据"
              />
            </div>
          </div>
        )}
    </Modal>
  )
}
