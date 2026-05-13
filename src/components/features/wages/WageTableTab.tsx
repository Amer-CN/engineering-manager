import React from 'react'
import type { Member, Project, WorkerTeam, WageRecord } from '@/types'
import { Icon } from '../../ui/Icon'

interface WageTableTabProps {
  selectedProject: Project | null
  selectedMonth: string
  members: Member[]
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

function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export default function WageTableTab({
  selectedProject, selectedMonth, members, workerTeams, wageRecords,
  attendancesCount, editingWages, selectedIds, toggleSelect, toggleAll,
  onGenerate, onSave, onBonusDeductionChange, onBatchDelete, loading,
}: WageTableTabProps) {
  if (!selectedProject) {
    return (
      <div className="p-4 text-center py-12 text-slate-400">
        <Icon name="FileText" size={48} className="mx-auto mb-4" />
        <p>请先选择项目和月份</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-slate-500">
            工资记录: {wageRecords.length} 条
            {attendancesCount === 0 && (
              <span className="text-amber-600 ml-2">（提示：建议先生成考勤记录）</span>
            )}
          </div>
          {selectedIds.size > 0 && (
            <button onClick={onBatchDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              删除选中 ({selectedIds.size})
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onGenerate} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            生成工资表
          </button>
          {editingWages.size > 0 && (
            <button onClick={onSave} disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
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
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox"
                    checked={selectedIds.size === wageRecords.length && wageRecords.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-3 py-3 font-medium text-slate-600">姓名</th>
                <th className="px-3 py-3 font-medium text-slate-600">类型</th>
                <th className="px-3 py-3 font-medium text-slate-600">班组</th>
                <th className="px-3 py-3 font-medium text-slate-600">出勤</th>
                <th className="px-3 py-3 font-medium text-slate-600">日薪/月薪</th>
                <th className="px-3 py-3 font-medium text-slate-600">奖金</th>
                <th className="px-3 py-3 font-medium text-slate-600">扣款</th>
                <th className="px-3 py-3 font-medium text-slate-600">实发工资</th>
                <th className="px-3 py-3 font-medium text-slate-600">状态</th>
              </tr>
            </thead>
            <tbody>
              {wageRecords.map(w => {
                const edit = editingWages.get(w.id)
                const bonus = edit?.bonus ?? w.bonus
                const deduction = edit?.deduction ?? w.deduction
                const member = members.find(m => m.id === w.memberId)
                let previewWage = w.actualWage
                if (edit) {
                  const dim = getDaysInMonth(selectedMonth)
                  if (member?.memberType === 'worker') {
                    previewWage = Math.round(((w.dailyWage || 0) * (w.workDays || 0) + bonus - deduction) * 100) / 100
                  } else {
                    const baseSalary = w.baseSalary || 0
                    const otherAllowances = w.otherAllowances || 0
                    let grossWage: number
                    if (w.isFullAttendance) { grossWage = baseSalary + otherAllowances }
                    else { grossWage = (baseSalary / dim) * (w.workDays || 0) + otherAllowances }
                    let personalDeduction = 0
                    if (!(w.companyCoversSocial ?? false)) {
                      personalDeduction += (w.socialSecurityPersonal || 0) + (w.housingFundPersonal || 0)
                    }
                    previewWage = Math.round((grossWage + bonus - personalDeduction - deduction) * 100) / 100
                  }
                }
                const changed = edit && previewWage !== w.actualWage

                return (
                  <tr key={w.id} className="border-t border-slate-100 table-row-hover">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selectedIds.has(w.id)}
                        onChange={() => toggleSelect(w.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-3 font-medium">{w.memberName || member?.name || '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        w.memberType === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {w.memberType === 'staff' ? '管理' : '工人'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{w.teamName || '-'}</td>
                    <td className="px-3 py-3">{w.workDays} 天</td>
                    <td className="px-3 py-3">
                      {w.memberType === 'worker' ? <span>¥{w.dailyWage}/天</span> : <span>¥{w.baseSalary}/月</span>}
                    </td>
                    <td className="px-3 py-3">
                      <input type="number" min={0} step={0.01} value={bonus}
                        onChange={e => onBonusDeductionChange(w.id, 'bonus', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center" />
                    </td>
                    <td className="px-3 py-3">
                      <input type="number" min={0} step={0.01} value={deduction}
                        onChange={e => onBonusDeductionChange(w.id, 'deduction', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-center" />
                    </td>
                    <td className={`px-3 py-3 font-bold ${changed ? 'text-orange-600' : 'text-green-600'}`}>
                      ¥{previewWage.toFixed(2)}
                      {changed && <span className="text-xs text-orange-500 ml-1">*</span>}
                    </td>
                    <td className="px-3 py-3">
                      {w.memberType === 'worker' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">日薪</span>
                      ) : w.isFullAttendance ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">全勤</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">缺勤</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {/* 汇总行 */}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <td className="px-3 py-3" colSpan={7}>合计</td>
                <td className="px-3 py-3 text-green-600">
                  ¥{wageRecords.reduce((sum, w) => {
                    const edit = editingWages.get(w.id)
                    const bonus = edit?.bonus ?? w.bonus
                    const deduction = edit?.deduction ?? w.deduction
                    const member = members.find(m => m.id === w.memberId)
                    let wage = w.actualWage
                    if (edit) {
                      const dim = getDaysInMonth(selectedMonth)
                      if (member?.memberType === 'worker') {
                        wage = Math.round(((w.dailyWage || 0) * (w.workDays || 0) + bonus - deduction) * 100) / 100
                      } else {
                        const baseSalary = w.baseSalary || 0
                        const otherAllowances = w.otherAllowances || 0
                        const grossWage = w.isFullAttendance ? baseSalary + otherAllowances : (baseSalary / dim) * (w.workDays || 0) + otherAllowances
                        let personalDeduction = 0
                        if (!(w.companyCoversSocial ?? false)) {
                          personalDeduction += (w.socialSecurityPersonal || 0) + (w.housingFundPersonal || 0)
                        }
                        wage = Math.round((grossWage + bonus - personalDeduction - deduction) * 100) / 100
                      }
                    }
                    return sum + wage
                  }, 0).toFixed(2)}
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
