// React not needed with new JSX transform
import type { Project, WorkerTeam, WageRecord } from '@/types'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { EmptyState } from '../../ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { TABLE } from '@/constants/table'

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
  onChangeMonth: (month: string) => void
}

export default function WageTableTab({
  selectedProject, selectedMonth, workerTeams, wageRecords,
  attendancesCount, editingWages, selectedIds, toggleSelect, toggleAll,
  onGenerate, onSave, onBonusDeductionChange, onBatchDelete, loading, onChangeMonth,
}: WageTableTabProps) {
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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <input type="month" value={selectedMonth} onChange={e => onChangeMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          <div className="text-slate-500">
            工资记录: {wageRecords.length} 条
            {attendancesCount === 0 && (
              <span className="text-amber-600 ml-2">（提示：建议先生成考勤记录）</span>
            )}
          </div>
          {selectedIds.size > 0 && (
            <button onClick={onBatchDelete}
              className="btn btn-danger btn-sm">
              删除选中 ({selectedIds.size})
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onGenerate} disabled={loading}
            className="btn btn-primary btn-sm">
            生成工资表
          </button>
          {editingWages.size > 0 && (
            <button onClick={onSave} disabled={loading}
              className="btn btn-success btn-sm">
              保存修改 ({editingWages.size})
            </button>
          )}
        </div>
      </div>

      {wageRecords.length === 0 ? (
        <EmptyState icon="FileText" title="暂无工资记录" description="点击「生成工资表」根据考勤数据自动计算" />
      ) : (
        <HoverScrollbar className="h-full">
          <table className={TABLE.table + ' text-sm'}>
            <thead className={TABLE.headerRow + ' ' + TABLE.stickyHeader}>
              <tr>
                <th className={TABLE.headerCell + ' w-10'}>
                  <input type="checkbox"
                    checked={selectedIds.size === wageRecords.length && wageRecords.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className={TABLE.headerCell}>姓名</th>
                <th className={TABLE.headerCell}>班组</th>
                <th className={TABLE.headerCell}>出勤</th>
                <th className={TABLE.headerCell}>日薪</th>
                <th className={TABLE.headerCell}>奖金</th>
                <th className={TABLE.headerCell}>扣款</th>
                <th className={TABLE.headerCell}>实发工资</th>
              </tr>
            </thead>
            <tbody>
              {wageRecords.map(w => {
                const edit = editingWages.get(w.id)
                const bonus = edit?.bonus ?? w.bonus
                const deduction = edit?.deduction ?? w.deduction
                const previewWage = calcWage(w)
                const changed = edit && previewWage !== (w.actualWage ?? 0)

                return (
                  <tr key={w.id} className={TABLE.bodyRow}>
                    <td className={TABLE.bodyCell}>
                      <input type="checkbox" checked={selectedIds.has(w.id)}
                        onChange={() => toggleSelect(w.id)} className="rounded" />
                    </td>
                    <td className={TABLE.bodyCell + ' font-medium'}>{w.memberName || '-'}</td>
                    <td className={TABLE.bodyCell + ' text-slate-500'}>{w.teamName || '-'}</td>
                    <td className={TABLE.bodyCell}>{w.workDays ?? '-'} 天</td>
                    <td className={TABLE.bodyCell}>¥{w.dailyWage ?? '-'}/天</td>
                    <td className={TABLE.bodyCell}>
                      <Input type="number" min={0} step={0.01} value={bonus}
                        onChange={e => onBonusDeductionChange(w.id, 'bonus', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center" />
                    </td>
                    <td className={TABLE.bodyCell}>
                      <Input type="number" min={0} step={0.01} value={deduction}
                        onChange={e => onBonusDeductionChange(w.id, 'deduction', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center" />
                    </td>
                    <td className={TABLE.bodyCell + ` font-bold ${changed ? 'text-amber-600' : 'text-green-600'}`}>
                      ¥{previewWage.toFixed(2)}
                      {changed && <span className="text-xs text-amber-500 ml-1">*</span>}
                    </td>
                  </tr>
                )
              })}
              {/* 汇总行 */}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <td className={TABLE.bodyCell} colSpan={6}>合计</td>
                <td className={TABLE.bodyCell + ' text-green-600'}>
                  ¥{wageRecords.reduce((sum, w) => sum + calcWage(w), 0).toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </HoverScrollbar>
      )}
    </div>
  )
}
