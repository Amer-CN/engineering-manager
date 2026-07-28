import type { Project, WorkerTeam, WageRecord } from '@/types'
import { EmptyState } from '../../ui/EmptyState'
import FilterBar from '../../ui/FilterBar'
import { Input } from '@/components/ui/Input'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '../../ui/Button'

interface WageTableTabProps {
  selectedProject: Project | null
  selectedMonth: string
  workerTeams: WorkerTeam[]
  wageRecords: WageRecord[]
  attendancesCount: number
  editingWages: Map<number, { bonus: number; deduction: number }>
  selectedIds: Set<number>
  toggleSelect: (id: number) => void
  toggleAll: () => void
  onGenerate: () => void
  onSave: () => void
  onBonusDeductionChange: (recordId: number, field: 'bonus' | 'deduction', value: number) => void
  onBatchDelete: () => void
  loading: boolean
}

export default function WageTableTab({
  selectedProject, selectedMonth, workerTeams, wageRecords,
  attendancesCount, editingWages, selectedIds, toggleSelect, toggleAll,
  onGenerate, onSave, onBonusDeductionChange, onBatchDelete, loading,}: WageTableTabProps) {
  if (!selectedProject) {
    return (
      <div className="p-4">
        <EmptyState icon="FileText" title="请先选择项目和月份" />
      </div>
    )
  }

  const calcWage = (w: WageRecord) => {
    const edit = editingWages.get(w.id)
    const bonus = edit?.bonus ?? w.bonus
    const deduction = edit?.deduction ?? w.deduction
    return Math.round(((w.dailyWage || 0) * (w.workDays || 0) + bonus - deduction) * 100) / 100
  }

  const columns: Column<WageRecord>[] = [
    {
      key: 'select',
      title: '',
      width: '40px',
      render: (item) => (
        <input type="checkbox" checked={selectedIds.has(item.id)}
          onChange={() => toggleSelect(item.id)} className="rounded" />
      )
    },
    {
      key: 'memberName',
      title: '姓名',
      sortable: true,
      filterable: true,
      sorter: (a, b) => (a.memberName || '').localeCompare(b.memberName || '', 'zh-CN'),
      render: (item) => (
        <span className="font-medium">{item.memberName || '-'}</span>
      )
    },
    {
      key: 'teamName',
      title: '班组',
      filterable: 'select',
      filterOptions: workerTeams
        .filter(t => t.projectId === selectedProject?.id)
        .map(t => ({ label: t.name, value: t.name })),
      filterAccessor: (item: any) => item.teamName || '',
      render: (item) => (
        <span className="text-[color:var(--muted)]">{item.teamName || '-'}</span>
      )
    },
    {
      key: 'workDays',
      title: '出勤',
      sortable: true,
      sorter: (a, b) => ((a.workDays || 0) - (b.workDays || 0)),
      render: (item) => (
        <span>{item.workDays ?? '-'} 天</span>
      )
    },
    {
      key: 'dailyWage',
      title: '日薪',
      render: (item) => (
        <span>¥{item.dailyWage ?? '-'}/天</span>
      )
    },
    {
      key: 'bonus',
      title: '奖金',
      render: (item) => {
        const edit = editingWages.get(item.id)
        const bonus = edit?.bonus ?? item.bonus
        return (
          <Input type="number" min={0} step={0.01} value={bonus}
            onChange={e => onBonusDeductionChange(item.id, 'bonus', parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 border border-[color:var(--border)] rounded text-center" />
        )
      }
    },
    {
      key: 'deduction',
      title: '扣款',
      render: (item) => {
        const edit = editingWages.get(item.id)
        const deduction = edit?.deduction ?? item.deduction
        return (
          <Input type="number" min={0} step={0.01} value={deduction}
            onChange={e => onBonusDeductionChange(item.id, 'deduction', parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 border border-[color:var(--border)] rounded text-center" />
        )
      }
    },
    {
      key: 'actualWage',
      title: '实发工资',
      sortable: true,
      sorter: (a, b) => (((editingWages.get(a.id) ? calcWage(a) : (a.actualWage || 0))) - ((editingWages.get(b.id) ? calcWage(b) : (b.actualWage || 0)))),
      render: (item) => {
        const edit = editingWages.get(item.id)
        const previewWage = calcWage(item)
        const changed = edit && previewWage !== (item.actualWage ?? 0)
        return (
          <span className={`font-bold ${changed ? 'text-warning-600' : 'text-success-600'}`}>
            ¥{previewWage.toFixed(2)}
            {changed && <span className="text-xs text-warning-500 ml-1">*</span>}
          </span>
        )
      }
    }
  ]

  const footer = (
    <div className="flex items-center px-4 py-2.5 text-sm font-bold">
      <span className="text-success-600">
        合计: ¥{wageRecords.reduce((sum, w) => sum + calcWage(w), 0).toFixed(2)}
      </span>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <FilterBar className="mb-6">
        <div className="flex items-center gap-3">
          <input type="checkbox"
            checked={selectedIds.size === wageRecords.length && wageRecords.length > 0}
            onChange={toggleAll} className="rounded" />
          <div className="text-[color:var(--muted)]">
            工资记录: {wageRecords.length} 条
            {attendancesCount === 0 && (
              <span className="text-warning-600 ml-2">（提示：建议先生成考勤记录）</span>
            )}
          </div>
          {selectedIds.size > 0 && (
            <Button onClick={onBatchDelete}
               variant="danger" size="sm">
              删除选中 ({selectedIds.size})
            </Button>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
          <Button onClick={onGenerate} disabled={loading}
             variant="primary" size="sm">
            生成工资表
          </Button>
          {editingWages.size > 0 && (
            <Button onClick={onSave} disabled={loading}
               variant="success" size="sm">
              保存修改 ({editingWages.size})
            </Button>
          )}
        </div>
      </FilterBar>

      <DataTable
        data={wageRecords}
        columns={columns}
        rowKey="id"
        pagination={false}
        useHoverScrollbar={true}
        scrollClassName="h-full"
        emptyText="暂无工资记录"
        emptyIcon="FileText"
        footer={footer}
      />
    </div>
  )
}
