import React, { useState, useEffect, useCallback } from 'react'
import { Icon } from '../../ui/Icon'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import { useToastContext } from '../../../hooks/useToast'
import { computeAttendanceSummary } from '../../../constants/attendance'

const StaffPayroll: React.FC = () => {
  const { showToast } = useToastContext()
  const now = new Date()
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [staff, setStaff] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [filterDept, setFilterDept] = useState<number | ''>('')
  const [wages, setWages] = useState<any[]>([])
  const [attendances, setAttendances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const workDays = new Date(Number(yearMonth.split('-')[0]), Number(yearMonth.split('-')[1]), 0).getDate()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [memRes, wageRes, attRes, deptRes] = await Promise.all([
        window.electronAPI.getMembers(),
        window.electronAPI.getWages(undefined, yearMonth),
        window.electronAPI.getAttendances(undefined, yearMonth),
        window.electronAPI.getDepartments()
      ])
      if (memRes.success) setStaff((memRes.data || []).filter((m: any) => m.memberType === 'staff' || m.memberType === undefined))
      if (wageRes.success) setWages(wageRes.data || [])
      if (attRes.success) setAttendances(attRes.data || [])
      if (deptRes.success) setDepartments(deptRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [yearMonth])

  useEffect(() => { loadData() }, [loadData])

  const getAttendanceForMember = (memberId: number) =>
    attendances.find((a: any) => a.memberId === memberId && a.yearMonth === yearMonth)

  const isAttendanceReady = (memberId: number): boolean => {
    const att = getAttendanceForMember(memberId)
    if (!att) return false
    if (!att.dailyStatus || Object.keys(att.dailyStatus).length === 0) return false
    return true
  }

  // Entry date guard: only staff who joined on or before month end
  const monthEnd = (() => { const [y, m] = yearMonth.split('-').map(Number); const d = new Date(y, m, 0).getDate(); return `${yearMonth}-${String(d).padStart(2, '0')}` })()
  const getEntryDate = (s: any) => s.entryDate || (s.createdAt ? s.createdAt.split('T')[0] : null)
  const filteredStaff = staff.filter((s: any) => {
    if (filterDept && s.departmentId !== filterDept) return false
    const ed = getEntryDate(s)
    if (ed && ed > monthEnd) return false
    return true
  })
  const readyCount = filteredStaff.filter(s => isAttendanceReady(s.id)).length

  const generatePayroll = async () => {
    setGenerating(true)
    let successCount = 0
    let skipCount = 0
    let failCount = 0
    try {
      for (const s of filteredStaff) {
        if (!isAttendanceReady(s.id)) { skipCount++; continue }
        try {
          const att = getAttendanceForMember(s.id)
          // Compute applicable days based on entry date (mid-month joiners only count days after entry)
          const ed = getEntryDate(s)
          const entryDay = (() => {
            if (!ed) return 1
            const [ey, em, ed2] = ed.split('-').map(Number)
            const [cy, cm] = yearMonth.split('-').map(Number)
            return (ey === cy && em === cm) ? ed2 : 1
          })()
          const summary = computeAttendanceSummary(att?.dailyStatus, workDays, entryDay)
          const attWorkDays = summary.workDays
          const attDaysOff = summary.daysOff
          // Look up effective salary for this yearMonth
          const effSalary = await window.electronAPI.getEffectiveSalary(s.id, yearMonth)
          const baseSalary = (effSalary.success ? effSalary.data?.baseSalary : s.baseSalary) || 0
          const subsidy = (effSalary.success ? effSalary.data?.subsidy : 0) || 0
          const totalSalary = baseSalary + subsidy
          // 月中入职按全月天数比例算，不适用全勤免扣规则
          const isPartialMonth = entryDay > 1
          const netSalary = isPartialMonth
            ? Math.round(totalSalary * (attWorkDays / workDays))
            : attDaysOff <= 4 ? totalSalary : Math.round(totalSalary * (attWorkDays / workDays))
          const record: any = {
            memberId: s.id, projectId: null, yearMonth, baseSalary, subsidy,
            attendanceDays: attWorkDays, bonus: 0, deduction: 0, netSalary,
            paidAmount: 0, paidDate: '', createdAt: new Date().toISOString()
          }
          const existing = wages.find((w: any) => w.memberId === s.id && w.yearMonth === yearMonth)
          if (existing) {
            await window.electronAPI.updateWage({ ...existing, ...record, id: existing.id })
          } else {
            await window.electronAPI.createWage(record)
          }
          successCount++
        } catch {
          failCount++
        }
      }
      await loadData()
      const parts = []
      if (successCount > 0) parts.push(`${successCount} 条成功`)
      if (skipCount > 0) parts.push(`${skipCount} 人无考勤已跳过`)
      if (failCount > 0) parts.push(`${failCount} 条失败`)
      showToast(parts.join('，'), failCount > 0 ? 'error' : skipCount > 0 ? 'info' : 'success')
    } catch (e: any) { showToast(e?.message || '生成失败', 'error') }
    finally { setGenerating(false) }
  }

  const handleDeleteWage = async (wage: any) => {
    if (!confirm(`确认删除 ${wage.yearMonth} 的薪酬记录？此操作不可撤销。`)) return
    try {
      const result = await window.electronAPI.deleteWage(wage.id)
      if (result.success) {
        showToast('薪酬记录已删除', 'success')
        loadData()
      } else {
        showToast(result.error || '删除失败', 'error')
      }
    } catch (e: any) { showToast(e?.message || '删除失败', 'error') }
  }

  const handleDeleteAllMonth = async () => {
    if (!confirm(`确认删除 ${yearMonth} 所有薪酬记录？此操作不可撤销。`)) return
    try {
      const ids = wages.filter((w: any) => w.yearMonth === yearMonth).map((w: any) => w.id)
      if (ids.length === 0) { showToast('没有可删除的记录', 'info'); return }
      const result = await window.electronAPI.batchDeleteWages(ids)
      if (result.success) {
        showToast(`已删除 ${ids.length} 条记录`, 'success')
        loadData()
      } else {
        showToast(result.error || '批量删除失败', 'error')
      }
    } catch (e: any) { showToast(e?.message || '删除失败', 'error') }
  }

  const handlePaidChange = async (wage: any, field: string, value: any) => {
    const updated = { ...wage, [field]: value }
    await window.electronAPI.updateWage(updated)
    loadData()
    showToast('已更新', 'success')
  }

  const getWageForMember = (memberId: number) => wages.find((w: any) => w.memberId === memberId && w.yearMonth === yearMonth)

  const getDeptName = (id?: number) => departments.find((d: any) => d.id === id)?.name || '-'

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" /></div>
  }

  const hasWages = filteredStaff.some(s => getWageForMember(s.id))

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm px-5 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">月份</label>
          <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">部门</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">全部</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <span className="text-xs text-slate-400">本月工作日: {workDays} 天</span>
        <span className="text-xs text-slate-400">规则: 休假≤4天 = 全薪</span>
        <span className="text-xs text-slate-500">
          考勤就绪: {readyCount}/{filteredStaff.length}
          {readyCount < filteredStaff.length && <span className="text-amber-600 ml-1">（未打考勤者自动跳过）</span>}
        </span>
        <div className="flex-1" />
        {hasWages && (
          <Button onClick={handleDeleteAllMonth} size="sm" variant="danger">
            删除本月全部
          </Button>
        )}
        <Button onClick={generatePayroll} disabled={generating || filteredStaff.length === 0} size="sm">
          {generating ? '计算中...' : '生成本月薪酬'}
        </Button>
      </div>

      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-12">
          <EmptyState icon="Banknote" title="暂无符合条件的人员" description={staff.length === 0 ? '请先在人员档案中添加管理人员' : '请调整筛选条件'} />
        </div>
      ) : !hasWages ? (
        <div className="bg-white rounded-xl shadow-sm py-12">
          <EmptyState icon="Calculator" title="未生成薪酬"
            description={readyCount > 0 ? '点击「生成本月薪酬」开始计算' : '请先在考勤管理中标记本月出勤状态后再生成'} />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">部门</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">考勤状态</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">基本工资</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">出勤天数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">补助</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">扣款</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">应发工资</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">实发金额</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">发放日期</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">差额</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((s: any) => {
                const w = getWageForMember(s.id)
                const att = getAttendanceForMember(s.id)
                const ready = isAttendanceReady(s.id)
                if (!w) return null
                const diff = (w.netSalary || 0) - (w.deduction || 0) - (w.paidAmount || 0)
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{getDeptName(s.departmentId)}</td>
                    <td className="px-4 py-3 text-center">
                      {ready ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />全勤
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />无考勤
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{(w.baseSalary || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-center">{w.attendanceDays} / {workDays}</td>
                    <td className="px-4 py-3 text-sm text-amber-600 text-right">{w.subsidy > 0 ? `+${(w.subsidy || 0).toLocaleString()}` : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <input type="number" defaultValue={w.deduction || 0}
                        onBlur={e => handlePaidChange(w, 'deduction', Number(e.target.value))}
                        className="w-20 text-right px-2 py-1 border border-slate-200 rounded text-sm" />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right">{((w.netSalary || 0) - (w.deduction || 0)).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <input type="number" defaultValue={w.paidAmount || ''}
                        onBlur={e => handlePaidChange(w, 'paidAmount', Number(e.target.value))}
                        className="w-24 text-center px-2 py-1 border border-slate-200 rounded text-sm" placeholder="未发放" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="date" defaultValue={w.paidDate || ''}
                        onChange={e => handlePaidChange(w, 'paidDate', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-sm" />
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                      {diff === 0 ? '已结清' : diff.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDeleteWage(w)}
                        className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded" title="删除此记录">
                        <Icon name="Trash2" size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default StaffPayroll
