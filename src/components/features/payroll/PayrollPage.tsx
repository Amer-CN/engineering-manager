/**
 * 统一考勤薪酬页面 — 逐步构建
 * Step 2: 加入数据加载 hook + 筛选栏 + Tab 内容
 */
import React, { useState, useCallback, useMemo } from 'react'
import { Spinner } from '../../ui/Loading/Loading'
import { usePayrollData, type PayrollMode } from './usePayrollData'
import { useConfirm } from '@/hooks/useConfirm'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'

// worker 模式操作
import { useWageActions } from '../wages/useWageActions'
import { PayrollTable } from './PayrollTable'

interface PayrollPageProps {
  mode: PayrollMode
}

type TabId = 'attendance' | 'wages' | 'payments' | 'payroll'

export default function PayrollPage({ mode }: PayrollPageProps) {
  const data = usePayrollData({ mode })
  const { confirm, ConfirmDialog } = useConfirm()
  const showToast = useToastStore(state => state.showToast)
  const [activeTab, setActiveTab] = useState<TabId>(mode === 'staff' ? 'payroll' : 'attendance')
  const [filterYearMonth, setFilterYearMonth] = useState(() => new Date().toISOString().slice(0, 7))

  // worker 模式：选中的项目
  const selectedProject = useMemo(() => {
    if (mode !== 'worker' || data.filterProject === '全部') return null
    return data.projects.find((p: any) => p.id === Number(data.filterProject)) || null
  }, [mode, data.filterProject, data.projects])

  // worker 模式：项目相关数据
  const projectAttendances = useMemo(() => {
    if (!selectedProject) return []
    return data.attendances.filter((a: any) =>
      a.projectId === selectedProject.id && a.yearMonth?.startsWith(data.selectedMonth)
    )
  }, [selectedProject, data.attendances, data.selectedMonth])

  const projectWages = useMemo(() => {
    if (!selectedProject) return []
    return data.filteredWages.filter((w: any) => w.projectId === selectedProject.id)
  }, [selectedProject, data.filteredWages])

  // worker 操作 hook
  const wageActions = useWageActions({
    selectedProject, selectedMonth: data.selectedMonth,
    workerTeams: data.workerTeams, attendances: projectAttendances,
    wages: projectWages, loadData: data.loadData,
  })

  // staff: 生成薪酬
  const handleGeneratePayroll = useCallback(async () => {
    if (!data.selectedMonth) { showToast('请选择月份', 'warning'); return }
    const ok = await confirm({ title: '生成薪酬', content: `确定生成 ${data.selectedMonth} 的薪酬记录？`, confirmVariant: 'primary' })
    if (!ok) return
    data.setGenerating(true)
    try {
      const { filteredStaffForGenerate, isAttendanceReady, getAttendanceForMember, getEntryDate } = await import('../../../utils/staff-payroll-utils')
      const { computeAttendanceSummary } = await import('../../../constants/attendance')
      const ym = data.selectedMonth
      const [year, month] = ym.split('-').map(Number)
      const daysInMonth = new Date(year, month, 0).getDate()
      const candidates = filteredStaffForGenerate(data.people, data.filterDept, ym)
      let ok2 = 0, skip = 0, fail = 0
      for (const s of candidates) {
        if (!isAttendanceReady(s.id, ym, data.attendances)) { skip++; continue }
        try {
          const att = getAttendanceForMember(data.attendances, s.id, ym)
          const ed = getEntryDate(s)
          const entryDay = (() => { if (!ed) return 1; const [ey, em, ed2] = ed.split('-').map(Number); return (ey === year && em === month) ? ed2 : 1 })()
          const summary = computeAttendanceSummary(att?.dailyStatus, daysInMonth, entryDay)
          const effSalary = await (await getAPI()).getEffectiveSalary(s.id, ym)
          const baseSalary = (effSalary.success ? effSalary.data?.baseSalary : s.baseSalary) || 0
          const subsidy = (effSalary.success ? effSalary.data?.subsidy : 0) || 0
          const totalSalary = baseSalary + subsidy
          const isPartialMonth = entryDay > 1
          const netSalary = isPartialMonth
            ? Math.round(totalSalary * (summary.workDays / daysInMonth))
            : summary.daysOff <= 4 ? totalSalary : Math.round(totalSalary * (summary.workDays / daysInMonth))
          const record: any = { memberId: s.id, projectId: null, yearMonth: ym, baseSalary, subsidy, attendanceDays: summary.workDays, bonus: 0, deduction: 0, netSalary }
          const existing = data.wages.find((w: any) => w.memberId === s.id && w.yearMonth === ym)
          const api = await getAPI()
          if (existing) await api.updateWage({ ...existing, ...record, id: existing.id })
          else await api.createWage(record)
          ok2++
        } catch { fail++ }
      }
      await data.loadData()
      const parts = []
      if (ok2 > 0) parts.push(`${ok2} 条成功`)
      if (skip > 0) parts.push(`${skip} 人无考勤已跳过`)
      if (fail > 0) parts.push(`${fail} 条失败`)
      showToast(parts.join('，'), fail > 0 ? 'error' : 'success')
    } catch (e: any) { showToast(e?.message || '生成失败', 'error') }
    finally { data.setGenerating(false) }
  }, [data, confirm, showToast])

  // staff: 删除当月
  const handleDeleteMonth = useCallback(async () => {
    const monthWages = data.wages.filter((w: any) => w.yearMonth?.startsWith(data.selectedMonth))
    if (monthWages.length === 0) { showToast('当月无薪酬记录', 'warning'); return }
    const ok = await confirm({ title: '删除薪酬', content: `确定删除 ${data.selectedMonth} 的 ${monthWages.length} 条薪酬记录？`, confirmVariant: 'danger' })
    if (!ok) return
    const api = await getAPI()
    for (const w of monthWages) await api.deleteWage(w.id)
    await data.loadData()
    showToast('已删除', 'success')
  }, [data, confirm, showToast])

  // 发放记录的过滤数据
  const paymentFilteredWages = useMemo(() => {
    return data.wages.filter((w: any) => {
      if (filterYearMonth && w.yearMonth?.slice(0, 7) !== filterYearMonth) return false
      if (data.filterName && !(w.memberName || '').includes(data.filterName)) return false
      return true
    })
  }, [data.wages, filterYearMonth, data.filterName])

  const [selYear, selMonth] = data.selectedMonth.split('-')
  const daysInMonth = new Date(Number(selYear), Number(selMonth), 0).getDate()

  if (data.loading) {
    return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── 工具栏 ── */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-slate-200 bg-slate-50">

        {/* 月份选择器 */}
        {activeTab === 'payments' ? (
          <input type="month" value={filterYearMonth} onChange={e => setFilterYearMonth(e.target.value)}
            className="text-sm font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white" />
        ) : (
          <input type="month" value={data.selectedMonth} onChange={e => data.setSelectedMonth(e.target.value)}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white" />
        )}

        <div className="w-px h-5 bg-slate-200" />

        {/* 筛选 */}
        {mode === 'staff' && data.departments.length > 0 && (
          <select value={data.filterDept} onChange={e => data.setFilterDept(e.target.value ? Number(e.target.value) : '')}
            className="text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
            <option value="">全部部门</option>
            {data.departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        <select value={data.filterProject} onChange={e => data.setFilterProject(e.target.value)}
          className="text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
          <option value="全部">{mode === 'staff' ? '全部项目' : '选择项目...'}</option>
          {data.projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {mode === 'staff' && (
          <input type="text" value={data.filterName} onChange={e => data.setFilterName(e.target.value)}
            placeholder="搜索姓名..." className="text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white w-36" />
        )}

        {/* Tab pill 按钮 */}
        <div className="flex items-center gap-0.5 ml-auto rounded-lg p-0.5 bg-slate-100">
          {mode === 'staff' ? (
            <>
              <PillBtn active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')}>考勤</PillBtn>
              <PillBtn active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')}>薪酬</PillBtn>
            </>
          ) : (
            <>
              <PillBtn active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')}>考勤</PillBtn>
              <PillBtn active={activeTab === 'wages'} onClick={() => setActiveTab('wages')}>工资表</PillBtn>
              <PillBtn active={activeTab === 'payments'} onClick={() => setActiveTab('payments')}>发放</PillBtn>
            </>
          )}
        </div>

        {/* 操作按钮 */}
        {mode === 'staff' && (
          <div className="flex items-center gap-2 ml-2">
            <button onClick={handleGeneratePayroll} disabled={data.generating} className="btn btn-primary btn-sm">
              {data.generating ? '生成中...' : '生成薪酬'}
            </button>
            <button onClick={handleDeleteMonth} className="btn btn-danger btn-sm">删除本月</button>
          </div>
        )}
      </div>

      {/* ── 汇总条（staff） ── */}
      {mode === 'staff' && data.filteredWages.length > 0 && (
        <div className="shrink-0 flex items-center gap-6 px-5 py-2 text-sm border-b border-slate-200 bg-white">
          <span className="text-slate-400">{data.filteredWages.length} 人</span>
          <span><span className="text-slate-400">应发 </span><span className="font-mono tabular-nums font-medium">¥{data.summary.totalNet.toLocaleString()}</span></span>
          <span><span className="text-slate-400">实发 </span><span className="font-mono tabular-nums font-medium">¥{data.summary.totalPaid.toLocaleString()}</span></span>
          {data.summary.totalDiff !== 0 && (
            <span><span className="text-slate-400">差额 </span><span className={`font-mono tabular-nums font-medium ${data.summary.totalDiff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{data.summary.totalDiff > 0 ? '+' : ''}¥{data.summary.totalDiff.toLocaleString()}</span></span>
          )}
        </div>
      )}

      {/* ── 数据区 ── */}
      <PayrollTable
        mode={mode} activeTab={activeTab} data={data}
        selectedProject={selectedProject}
        projectAttendances={projectAttendances} projectWages={projectWages}
        daysInMonth={daysInMonth} wageActions={wageActions}
        paymentFilteredWages={paymentFilteredWages}
        filterYearMonth={filterYearMonth} setFilterYearMonth={setFilterYearMonth}
        confirm={confirm}
      />

      {ConfirmDialog}
    </div>
  )
}

function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${active ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
      {children}
    </button>
  )
}
