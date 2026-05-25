// React not needed with new JSX transform
import type { Project, WorkerTeam, WageRecord } from '@/types'
import { Icon } from '../../ui/Icon'
import { Input } from '@/components/ui/Input'

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
      <div className="p-4 text-center py-12 text-slate-400">
        <Icon name="FileText" size={48} className="mx-auto mb-4" />
        <p>请先选择项目和月份</p>
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
        <div className="text-center py-12 text-slate-400">
          <Icon name="FileText" size={48} className="mx-auto mb-4" />
          <p>暂无工资记录</p>
          <p className="text-sm mt-1">点击"生成工资表"根据考勤数据自动计算</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox"
                    checked={selectedIds.size === wageRecords.length && wageRecords.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-3 py-3 font-medium text-slate-600">姓名</th>
                <th className="px-3 py-3 font-medium text-slate-600">班组</th>
                <th className="px-3 py-3 font-medium text-slate-600">出勤</th>
                <th className="px-3 py-3 font-medium text-slate-600">日薪</th>
                <th className="px-3 py-3 font-medium text-slate-600">奖金</th>
                <th className="px-3 py-3 font-medium text-slate-600">扣款</th>
                <th className="px-3 py-3 font-medium text-slate-600">实发工资</th>
              </tr>
            </thead>
            <tbody>
              {wageRecords.map(w => {
                const edit = editingWages.get(w.id)
                const bonus = edit?.bonus ?? w.bonus
                const deduction = edit?.deduction ?? w.deduction
                const previewWage = calcWage(w)
                const changed = edit && previewWage !== w.actualWage

                return (
                  <tr key={w.id} className="border-t border-slate-100 table-row-hover">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selectedIds.has(w.id)}
                        onChange={() => toggleSelect(w.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-3 font-medium">{w.memberName || '-'}</td>
                    <td className="px-3 py-3 text-slate-500">{w.teamName || '-'}</td>
                    <td className="px-3 py-3">{w.workDays} 天</td>
                    <td className="px-3 py-3">¥{w.dailyWage}/天</td>
                    <td className="px-3 py-3">
                      <Input type="number" min={0} step={0.01} value={bonus}
                        onChange={e => onBonusDeductionChange(w.id, 'bonus', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center" />
                    </td>
                    <td className="px-3 py-3">
                      <Input type="number" min={0} step={0.01} value={deduction}
                        onChange={e => onBonusDeductionChange(w.id, 'deduction', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center" />
                    </td>
                    <td className={`px-3 py-3 font-bold ${changed ? 'text-amber-600' : 'text-green-600'}`}>
                      ¥{previewWage.toFixed(2)}
                      {changed && <span className="text-xs text-amber-500 ml-1">*</span>}
                    </td>
                  </tr>
                )
              })}
              {/* 汇总行 */}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <td className="px-3 py-3" colSpan={6}>合计</td>
                <td className="px-3 py-3 text-green-600">
                  ¥{wageRecords.reduce((sum, w) => sum + calcWage(w), 0).toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
