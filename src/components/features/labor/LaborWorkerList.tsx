// LaborWorkerList.tsx - 工人库Tab

import { useMask } from '@/contexts/MaskContext';
import React, { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import FilterBar from '../../ui/FilterBar'
import { maskIdCard, maskPhone, maskBankAccount } from "@/utils/mask";
import { Icon } from '../../ui/Icon'
import type { Member, WorkerTeam } from '../../../types/electron'
import { WorkerWageModal } from './WorkerWageModal'
import { getWorkerTypeLabel } from '../../../utils'

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
      render: (w) => <span className="font-medium text-slate-800">{w.name}</span>
    },
    {
      key: 'idCard', title: '身份证号', filterable: true,
      render: (w) => <span className="text-slate-500 font-mono text-xs">{masked ? maskIdCard(w.idCard) : w.idCard || '-'}</span>
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
        return <span className={`text-sm font-medium ${isOverage ? 'text-red-600' : 'text-slate-600'}`}>{age !== null ? age : '-'}</span>
      }
    },
    {
      key: 'gender', title: '性别', filterable: 'select',
      filterOptions: [{ label: '男', value: '男' }, { label: '女', value: '女' }],
      render: (w) => <span className="text-slate-600">{w.gender || '-'}</span>
    },
    {
      key: 'workerType', title: '工种', filterable: 'select',
      filterOptions: [
        { label: '土建', value: '土建' },
        { label: '焊工', value: '焊工' },
        { label: '安装工', value: '安装工' },
        { label: '后勤', value: '后勤' },
      ],
      render: (w) => <span className="text-slate-600">{w.workerType ? getWorkerTypeLabel(w.workerType as any) : '-'}</span>
    },
    {
      key: 'dailyWage', title: '日工资', align: 'right', sortable: true, filterable: true,
      sorter: (a, b) => ((a.dailyWage || 0) - (b.dailyWage || 0)),
      render: (w) => <span className="text-slate-700 font-medium">{w.dailyWage != null ? `¥${w.dailyWage}` : '-'}</span>
    },
    {
      key: 'bankAccount', title: '银行卡号', filterable: true,
      render: (w) => <span className="text-slate-500 font-mono text-xs">{masked ? maskBankAccount((w as any).bankAccount) : (w as any).bankAccount || '-'}</span>
    },
    {
      key: 'actions', title: '操作', align: 'right',
      render: (w) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEditWorker(w)}
            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
          >
            编辑
          </button>
          <button
            onClick={() => setWageModalWorker({ id: (w as any).workerId || w.id, name: w.name })}
            className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
          >
            工资
          </button>
          <button
            onClick={() => onDeleteWorker((w as any).workerId)}
            className="btn btn-danger btn-sm"
          >
            删除
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="flex flex-col max-h-[calc(100vh-200px)]">
      {/* 筛选器 */}
      <FilterBar className="shrink-0 mb-6">
        <span className="text-slate-600 font-medium">筛选：</span>
        <select
          value={filterProject || ''}
          onChange={e => {
            setFilterProject(e.target.value ? Number(e.target.value) : null)
            setFilterTeam(null)
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">全部项目</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterTeam || ''}
          onChange={e => setFilterTeam(e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          disabled={!filterProject}
        >
          <option value="">全部班组</option>
          {workerTeams.filter(t => !filterProject || t.projectId === filterProject).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button
          onClick={onAddWorker}
          className="ml-auto btn btn-warning flex items-center"
        >
          <Icon name="Plus" size={18} className="mr-1" />添加工人
        </button>
        <button
          onClick={onImportClick}
          className="btn btn-primary px-5 py-2 flex items-center"
        >
          <Icon name="Upload" size={18} className="mr-1" />导入Excel
        </button>
      </FilterBar>

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
        <div className="bg-white rounded-xl shadow-sm p-12 text-center flex-1 flex flex-col items-center justify-center">
          <div className="text-6xl mb-4"><Icon name="Construction" size={48} /></div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">暂无工人</h3>
          <p className="text-slate-500 mb-6">请先在班组管理中从工人库添加，或导入 Excel</p>
          <button
            onClick={onAddWorker}
            className="btn btn-warning"
          >
            添加工人
          </button>
        </div>
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
