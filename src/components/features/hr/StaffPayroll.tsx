import React, { useState, useEffect, useCallback } from 'react'
import { DropdownMenu } from '../../ui/DropdownMenu/DropdownMenu'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import { useToastStore } from '@/store/toastStore'
import { MONTHS } from '@/constants'
import { computeAttendanceSummary } from '../../../constants/attendance'
import {
  filteredStaffForGenerate,
  getAttendanceForMember,
  isAttendanceReady,
// @ts-ignore TS6133: computeWorkDays is declared but never read
  computeWorkDays,
  getEntryDate,
} from '../../../utils/staff-payroll-utils'
import { StaffPayrollTable } from './StaffPayrollTable'

const StaffPayroll: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const now = new Date()
  const [filterYear, setFilterYear] = useState<string>('全部')
  const [filterMonth, setFilterMonth] = useState<string>('全部')
  const [filterMemberName, setFilterMemberName] = useState('')
  const [staff, setStaff] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [filterDept, setFilterDept] = useState<number | ''>('')
  const [projects, setProjects] = useState<any[]>([])
  const [filterProject, setFilterProject] = useState<string>('全部')
  const [allWages, setAllWages] = useState<any[]>([])
  const [attendances, setAttendances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // ── 可选年份：从工资记录中提取 ──
  const yearOptions = React.useMemo(() => {
    const s = new Set<string>()
    for (const w of allWages) {
      if (w.yearMonth) s.add(w.yearMonth.slice(0, 4))
    }
    const y = now.getFullYear()
    // 兜底：近 10 年
    if (s.size === 0) {
      for (let i = y - 9; i <= y; i++) s.add(String(i))
    }
    return Array.from(s).sort()
  }, [allWages])

  // ── 当前生效的年月（用于生成动作） ──
  const effectiveYearMonth = filterYear !== '全部' && filterMonth !== '全部'
    ? `${filterYear}-${filterMonth}`
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

// @ts-ignore TS6133: workDays is declared but never read
  const workDays = new Date(
    Number(effectiveYearMonth.split('-')[0]),
    Number(effectiveYearMonth.split('-')[1]),
    0
  ).getDate()

  // ── 数据加载：全量 staff 工资 + 考勤 ──
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [memRes, wageRes, attRes, deptRes, projRes] = await Promise.all([
        window.electronAPI.getMembers(),
        window.electronAPI.getWages(undefined, undefined),  // 全量：不限月份
        window.electronAPI.getAttendances(undefined, undefined), // 全量考勤
        window.electronAPI.getDepartments(),
        window.electronAPI.getProjects()
      ])
      if (memRes.success) {
        setStaff((memRes.data || []).filter(
          (m: any) => m.memberType === 'staff' || m.memberType === undefined
        ))
      }
      if (wageRes.success) {
        // 只保留 staff 的工资记录（非 worker）
        const staffIds = new Set(
          (memRes.data || [])
            .filter((m: any) => m.memberType === 'staff' || m.memberType === undefined)
            .map((m: any) => m.id)
        )
        setAllWages((wageRes.data || []).filter((w: any) => staffIds.has(w.memberId)))
      }
      if (attRes.success) setAttendances(attRes.data || [])
      if (deptRes.success) setDepartments(deptRes.data || [])
      if (projRes.success) setProjects((projRes.data || []).filter((p: any) => p.status !== 'archived'))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── 客户端过滤 ──
  const filteredWages = React.useMemo(() => {
    return allWages.filter((w: any) => {
      if (filterYear !== '全部' && w.yearMonth?.slice(0, 4) !== filterYear) return false
      if (filterMonth !== '全部' && w.yearMonth?.slice(5, 7) !== filterMonth) return false
      if (filterMemberName && !(w.memberName || '').includes(filterMemberName)) return false
      if (filterDept) {
        const s = staff.find((m: any) => m.id === w.memberId)
        if (s && s.departmentId !== filterDept) return false
      }
      // 项目筛选：null（全公司）始终显示；有 projectId 的按实际项目匹配
      if (filterProject !== '全部') {
        if (w.projectId != null && w.projectId !== Number(filterProject)) return false
        // projectId == null 的视为全公司通用，在所有项目下都显示
      }
      return true
    })
  }, [allWages, filterYear, filterMonth, filterMemberName, filterDept, staff])

  // ── 汇总统计 ──
  const summaryTotals = React.useMemo(() => {
    const totalNet = filteredWages.reduce((s, w) => s + ((w.netSalary || 0) - (w.deduction || 0)), 0)
    const totalPaid = filteredWages.reduce((s, w) => s + (Number(w.paidAmount) || 0), 0)
    return { totalNet, totalPaid, totalDiff: totalNet - totalPaid }
  }, [filteredWages])

  // ── 生成薪酬的辅助函数 ──

  // ── 生成本月薪酬 ──
  const generatePayroll = async () => {
    if (filterYear === '全部' || filterMonth === '全部') {
      showToast('请选择具体的年份和月份', 'warning')
      return
    }
    const ym = effectiveYearMonth
    const wd = new Date(Number(ym.split('-')[0]), Number(ym.split('-')[1]), 0).getDate()
    setGenerating(true)
    let successCount = 0
    let skipCount = 0
    let failCount = 0
    try {
      const candidates = filteredStaffForGenerate(staff, filterDept, ym)
      for (const s of candidates) {
        if (!isAttendanceReady(s.id, ym, attendances)) { skipCount++; continue }
        try {
          const att = getAttendanceForMember(attendances, s.id, ym)
          const ed = getEntryDate(s)
          const entryDay = (() => {
            if (!ed) return 1
            const [ey, em, ed2] = ed.split('-').map(Number)
            const [cy, cm] = ym.split('-').map(Number)
            return (ey === cy && em === cm) ? ed2 : 1
          })()
          const summary = computeAttendanceSummary(att?.dailyStatus, wd, entryDay)
          const attWorkDays = summary.workDays
          const attDaysOff = summary.daysOff
          const effSalary = await window.electronAPI.getEffectiveSalary(s.id, ym)
          const baseSalary = (effSalary.success ? effSalary.data?.baseSalary : s.baseSalary) || 0
          const subsidy = (effSalary.success ? effSalary.data?.subsidy : 0) || 0
          const totalSalary = baseSalary + subsidy
          const isPartialMonth = entryDay > 1
          const netSalary = isPartialMonth
            ? Math.round(totalSalary * (attWorkDays / wd))
            : attDaysOff <= 4 ? totalSalary : Math.round(totalSalary * (attWorkDays / wd))
          const record: any = {
            memberId: s.id, projectId: null, yearMonth: ym, baseSalary, subsidy,
            attendanceDays: attWorkDays, bonus: 0, deduction: 0, netSalary,
            paidAmount: null, paidDate: null,
          }
          // upsert: 检查是否已有同人同月记录
          const existing = allWages.find((w: any) => w.memberId === s.id && w.yearMonth === ym)
          if (existing) {
            await window.electronAPI.updateWage({ ...existing, ...record, id: existing.id })
          } else {
            await window.electronAPI.createWage(record)
          }
          successCount++
        } catch { failCount++ }
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

  // ── 删除 ──
  const handleDeleteWage = async (wage: any) => {
    if (!confirm(`确认删除 ${wage.memberName || ''} ${wage.yearMonth} 的薪酬记录？此操作不可撤销。`)) return
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

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const staffMapLocal = new Map(staff.map((s: any) => [s.id, s]))
      const getDeptNameLocal = (id?: number) => departments.find((d: any) => d.id === id)?.name || '-'
      const rows = filteredWages.map((w: any) => {
        const s = staffMapLocal.get(w.memberId)
        return {
          '姓名': w.memberName || s?.name || '',
          '部门': getDeptNameLocal(s?.departmentId),
          '月份': w.yearMonth || '',
          '基本工资': w.baseSalary || 0,
          '出勤天数': w.attendanceDays || 0,
          '补助': w.subsidy || 0,
          '扣款': w.deduction || 0,
          '应发工资': (w.netSalary || 0) - (w.deduction || 0),
          '实发金额': w.paidAmount || 0,
          '发放日期': w.paidDate || '',
          '差额': (w.netSalary || 0) - (w.deduction || 0) - (w.paidAmount || 0),
        }
      })
      const wb = XLSX.utils.book_new()
      wb.SheetNames.push('薪酬汇总')
      wb.Sheets['薪酬汇总'] = XLSX.utils.json_to_sheet(rows)
      const label = filterYear !== '全部' && filterMonth !== '全部'
        ? `薪酬汇总_${filterYear}-${filterMonth}`
        : `薪酬汇总_全部`
      XLSX.writeFile(wb, `${label}.xlsx`)
      showToast('导出成功', 'success')
    } catch (e: any) { showToast(e?.message || '导出失败', 'error') }
  }

  const handleDeleteAllMonth = async () => {
    if (filterYear === '全部' || filterMonth === '全部') {
      showToast('请选择具体的年份和月份', 'warning')
      return
    }
    if (!confirm(`确认删除 ${effectiveYearMonth} 所有薪酬记录？此操作不可撤销。`)) return
    try {
      const ids = filteredWages.map((w: any) => w.id)
      if (ids.length === 0) { showToast('没有可删除的记录', 'info'); return }
      const result = await window.electronAPI.batchDeleteWages(ids)
      if (result.success) {
        showToast(`已删除 ${ids.length} 条记录`, 'success')
        loadData()
      } else { showToast(result.error || '批量删除失败', 'error') }
    } catch (e: any) { showToast(e?.message || '删除失败', 'error') }
  }

  const handlePaidChange = async (wage: any, field: string, value: any) => {
    const updated = { ...wage, [field]: value }
    await window.electronAPI.updateWage(updated)
    loadData()
    showToast('已更新', 'success')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 筛选工具栏 */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-3 flex items-center gap-4 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">年份</label>
          <select value={filterYear}
            onChange={e => { setFilterYear(e.target.value); setFilterMonth('全部') }}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="全部">全部</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">月份</label>
          <select value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
            {MONTHS.map(m => <option key={m} value={m}>{m === '全部' ? '全部' : `${m}月`}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">姓名</label>
          <input type="text" placeholder="搜索姓名..."
            value={filterMemberName}
            onChange={e => setFilterMemberName(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-36 focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">部门</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">全部</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">项目</label>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="全部">全部</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {filterYear !== '全部' && filterMonth !== '全部' && (() => {
          const candidates = filteredStaffForGenerate(staff, filterDept, effectiveYearMonth)
          const ready = candidates.filter(s => isAttendanceReady(s.id, effectiveYearMonth, attendances)).length
          return ready < candidates.length ? (
            <span className="text-xs text-amber-500">考勤{ready}/{candidates.length}</span>
          ) : null
        })()}
        <div className="flex-1" />
        <Button onClick={generatePayroll}
          disabled={generating || staff.length === 0 || filterYear === '全部' || filterMonth === '全部'}
          size="sm"
          title={filterYear === '全部' || filterMonth === '全部' ? '请先选择具体年份和月份' : undefined}>
          {generating ? '计算中...' : `生成${filterYear !== '全部' && filterMonth !== '全部' ? effectiveYearMonth : ''}`}
        </Button>
        {filteredWages.length > 0 && filterYear !== '全部' && filterMonth !== '全部' && (
          <Button onClick={handleDeleteAllMonth} size="sm" variant="danger">
            删除本月
          </Button>
        )}
        {filteredWages.length > 0 && (
          <DropdownMenu
            trigger={<button className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">更多 ▾</button>}
            items={[
              { key: 'export', label: '导出Excel', onClick: handleExportExcel },
              { key: 'print', label: '打印', onClick: () => window.print() },
            ]}
            align="end"
          />
        )}
      </div>

      {/* 内容区 */}
      {filteredWages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm flex-1 mt-4 flex items-center justify-center">
          {allWages.length === 0 ? (
            <EmptyState icon="Calculator" title="未生成薪酬"
              description="请选择具体年份和月份后点击「生成薪酬」开始计算" />
          ) : (
            <EmptyState icon="Banknote" title="暂无符合筛选条件的记录" description="请调整筛选条件" />
          )}
        </div>
      ) : (
        <StaffPayrollTable
          filteredWages={filteredWages}
          staff={staff}
          departments={departments}
          summaryTotals={summaryTotals}
          onDeleteWage={handleDeleteWage}
          onPaidChange={handlePaidChange}
        />
      )}
    </div>
  )
}

export default StaffPayroll
