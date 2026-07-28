// LaborWorkerList.tsx - 工人库Tab

import React, { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { useMaskedFn } from "@/hooks/useMaskedValue";
import { Icon } from '../../ui/Icon'
import type { Member, WorkerTeam } from '../../../types/electron'
import { WorkerWageModal } from './WorkerWageModal'
import { getWorkerTypeLabel } from '../../../utils'
import { Card } from '@/components/ui/Card'
import { Button } from '../../ui/Button'

interface LaborWorkerListProps {
  members: Member[]
  projects: any[]
  workerTeams: WorkerTeam[]
  onRefresh: () => void
  onAddWorker: () => void
  onEditWorker: (worker: any) => void
  onDeleteWorker: (workerId: number) => void
  onImportClick: () => void
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const LaborWorkerList: React.FC<LaborWorkerListProps> = ({
  members,
  projects,
  workerTeams,
  onRefresh,
  onAddWorker,
  onEditWorker,
  onDeleteWorker,
  onImportClick,
}) => {
  const masked = useMaskedFn()
  const [filterProject, setFilterProject] = useState<number | null>(null)
  const [filterTeam, setFilterTeam] = useState<number | null>(null)

  // 工资统计弹窗
  const [wageModalWorker, setWageModalWorker] = useState<{ id: number; name: string } | null>(null)

  // 综合筛选 — 仅保留项目和班组筛选（列筛选由 DataTable 内置 filterable 处理）
  const filteredWorkers = useMemo(() => members.filter(w => {
    if (filterProject && w.projectId !== filterProject) return false
    if (filterTeam && w.teamId !== filterTeam) return false
    return true
  }), [members, filterProject, filterTeam])

  // ── DataTable 列定义 ──
  const columns: Column<any>[] = [
    {
      key: 'name', title: '姓名', sortable: true, filterable: true,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'),
      render: (w) => <span className="font-medium text-[color:var(--fg)]">{w.name}</span>
    },
    {
      key: 'idCard', title: '身份证号', filterable: true,
      render: (w) => <span className="text-[color:var(--muted)] font-mono text-xs">{masked('idCard', w.idCard) || '-'}</span>
    },
    {
      key: 'age', title: '年龄', align: 'center', sortable: true,
      filterable: true,
      filterAccessor: (w: any) => w.birthDate ? String(calcAge(w.birthDate)) : '',
      sorter: (a, b) => {
        const ageA = a.birthDate ? calcAge(a.birthDate) : 0
        const ageB = b.birthDate ? calcAge(b.birthDate) : 0
        return ageA - ageB
      },
      render: (w) => {
        const age = w.birthDate ? calcAge(w.birthDate) : null
        const isOverage = age !== null && age > 60
        return <span className={`text-sm font-medium ${isOverage ? 'text-danger-600' : 'text-[color:var(--fg-2)]'}`}>{age !== null ? age : '-'}</span>
      }
    },
    {
      key: 'gender', title: '性别', filterable: 'select',
      filterOptions: [{ label: '男', value: '男' }, { label: '女', value: '女' }],
      render: (w) => <span className="text-[color:var(--fg-2)]">{w.gender || '-'}</span>
    },
    {
      key: 'workerType', title: '工种', filterable: 'select',
      filterOptions: [
        { label: '土建', value: '土建' },
        { label: '焊工', value: '焊工' },
        { label: '安装工', value: '安装工' },
        { label: '后勤', value: '后勤' },
      ],
      render: (w) => <span className="text-[color:var(--fg-2)]">{w.workerType ? getWorkerTypeLabel(w.workerType) : '-'}</span>
    },
    {
      key: 'dailyWage', title: '日工资', align: 'right', sortable: true, filterable: true,
      sorter: (a, b) => ((a.dailyWage || 0) - (b.dailyWage || 0)),
      render: (w) => <span className="text-[color:var(--fg-2)] font-medium">{w.dailyWage != null ? `¥${w.dailyWage}` : '-'}</span>
    },
    {
      key: 'bankAccount', title: '银行卡号', filterable: true,
      render: (w) => <span className="text-[color:var(--muted)] font-mono text-xs">{masked('bankAccount', (w as Member & { bankAccount?: string }).bankAccount) || '-'}</span>
    },
    {
      key: 'actions', title: '操作', align: 'right',
      render: (w) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEditWorker(w)}
            className="px-2 py-1 text-xs text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] rounded"
          >
            编辑
          </button>
          <button
            onClick={() => setWageModalWorker({ id: (w as Member & { workerId?: number }).workerId || w.id, name: w.name })}
            className="px-2 py-1 text-xs text-success-600 hover:bg-success-50 rounded"
          >
            工资
          </button>
          <Button
            onClick={() => onDeleteWorker((w as Member & { workerId?: number }).workerId ?? w.id)}
            
           variant="danger" size="sm">
            删除
          </Button>
        </div>
      )
    },
  ]

  // 按班组统计人数
  const teamCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    members.forEach(m => { if (m.teamId) counts[m.teamId] = (counts[m.teamId] || 0) + 1 })
    return counts
  }, [members])

  return (
    <div className="flex flex-col max-h-[calc(100vh-200px)]">
      {/* S24 Stitch: 班组 pill-tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => { setFilterTeam(null); setFilterProject(null) }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !filterTeam ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]' : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'
          }`}
        >
          全部班组 ({members.length})
        </button>
        {workerTeams.map(t => (
          <button
            key={t.id}
            onClick={() => { setFilterTeam(t.id); setFilterProject(t.projectId) }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterTeam === t.id ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]' : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'
            }`}
          >
            {t.name} ({teamCounts[t.id] || 0})
          </button>
        ))}
        <div className="flex-1" />
        <Button onClick={onImportClick} variant="secondary" className="flex items-center gap-1.5">
          <Icon name="Upload" size={16} />导入工人
        </Button>
        <Button onClick={onAddWorker} variant="primary" className="flex items-center gap-1.5">
          <Icon name="Plus" size={16} />新增
        </Button>
      </div>

      {/* 工人表格 */}
      {filteredWorkers.length > 0 ? (
        <div className="min-w-[900px]">
          <DataTable
            data={filteredWorkers}
            columns={columns}
            rowKey="id"
            useHoverScrollbar={true}
            scrollClassName="h-full"
            pagination={false}
          />
        </div>
      ) : (
        <Card bordered={false} className="p-12 text-center flex-1 flex flex-col items-center justify-center">
          <div className="text-6xl mb-4"><Icon name="Construction" size={48} /></div>
          <h3 className="text-lg font-medium text-[color:var(--fg)] mb-2">暂无工人</h3>
          <p className="text-[color:var(--muted)] mb-6">请先在班组管理中从工人库添加，或导入 Excel</p>
          <Button
            onClick={onAddWorker}
            
           variant="warning">
            添加工人
          </Button>
        </Card>
      )}

      {/* 工人工资统计弹窗 */}
      {wageModalWorker && (
        <WorkerWageModal
          show={!!wageModalWorker}
          workerId={wageModalWorker.id}
          workerName={wageModalWorker.name}
          onClose={() => setWageModalWorker(null)}
        />
      )}
    </div>
  )
}

export default LaborWorkerList
