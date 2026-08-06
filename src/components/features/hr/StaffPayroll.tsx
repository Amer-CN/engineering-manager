import React, { useState, useEffect, useCallback } from 'react'
import { useStaffPayrollFilters } from './useStaffPayrollFilters'
import { EmptyState } from '../../ui/EmptyState'
import Spinner from '../../ui/Spinner'
import { useToastStore } from '@/store/toastStore'
import { computeAttendanceSummary } from '../../../constants/attendance'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from '@/hooks/usePermission'
import {
  filteredStaffForGenerate,
  getAttendanceForMember,
  isAttendanceReady,
  getEntryDate,
} from '../../../utils/staff-payroll-utils'
import { StaffPayrollTable } from './StaffPayrollTable'
import { Card } from '@/components/ui/Card'
import StaffPayrollToolbar from './StaffPayrollToolbar'
import type { Member, Department, Project, WageRecord, AttendanceRecord } from '@/types'

/** HR staff payroll extends WageRecord with staff-specific fields */
type StaffWageRecord = WageRecord & {
  baseSalary?: number
  subsidy?: number
  attendanceDays?: number
  netSalary?: number
}

const StaffPayroll: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const { can, canAny } = usePermission()
  const [staff, setStaff] = useState<Member[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [allWages, setAllWages] = useState<StaffWageRecord[]>([])
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [memRes, wageRes, attRes, deptRes, projRes] = await Promise.allSettled([
        api.getMembers(),
        api.getWages(undefined, undefined),
        api.getAttendances(undefined, undefined),
        api.getDepartments(),
        api.getProjects()
      ])
      const get = <T,>(r: PromiseSettledResult<{ success?: boolean; data?: unknown }>): T[] => (r.status === 'fulfilled' && r.value?.success ? (r.value.data as T[] || []) : [])
      const membersData = get<Member>(memRes)
      const staffOnly = membersData.filter(
        (m: Member) => m.memberType === 'staff' || m.memberType === undefined
      )
      setStaff(staffOnly)
      const staffIds = new Set(staffOnly.map((m: Member) => m.id))
      setAllWages(get<StaffWageRecord>(wageRes).filter((w: StaffWageRecord) => staffIds.has(w.memberId ?? 0)))
      setAttendances(get<AttendanceRecord>(attRes))
      setDepartments(get<Department>(deptRes))
      setProjects(get<Project>(projRes).filter((p: Project) => p.status !== 'archived'))
    } catch (e: unknown) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const f = useStaffPayrollFilters(staff, allWages)
  const {
    filterYear, filterMonth, filterMemberName, filterDept, filterProject,
    setFilterYear, setFilterMonth, setFilterMemberName, setFilterDept, setFilterProject,
    yearOptions, effectiveYearMonth, filteredWages, summaryTotals,
  } = f

  const generatePayroll = async () => {
    // G2 B2: 生成薪酬（create+update 混合）→ wages:create / wages:update
    if (!canAny(['wages:create', 'wages:update'])) { showToast('您没有生成薪酬的权限', 'error'); return }
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
          const effSalary = await (await getAPI()).getEffectiveSalary(s.id, ym)
          const baseSalary = (effSalary.success ? effSalary.data?.baseSalary : s.baseSalary) || 0
          const subsidy = (effSalary.success ? effSalary.data?.subsidy : 0) || 0
          const totalSalary = baseSalary + subsidy
          const isPartialMonth = entryDay > 1
          const netSalary = isPartialMonth
            ? Math.round(totalSalary * (attWorkDays / wd))
            : attDaysOff <= 4 ? totalSalary : Math.round(totalSalary * (attWorkDays / wd))
          const record: Record<string, unknown> = {
            memberId: s.id, projectId: null, yearMonth: ym, baseSalary, subsidy,
            attendanceDays: attWorkDays, bonus: 0, deduction: 0, netSalary,
            paidAmount: null, paidDate: null,
          }
          const existing = allWages.find((w) => (w.memberId ?? 0) === s.id && w.yearMonth === ym)
          const wageApi = await getAPI()
          if (existing) {
            await wageApi.updateWage({ ...existing, ...record, id: existing.id })
          } else {
            await wageApi.createWage(record)
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
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : '生成失败', 'error') }
    finally { setGenerating(false) }
  }

  const handleDeleteWage = async (wage: StaffWageRecord) => {
    // G2 B2: 删除薪酬 → wages:delete
    if (!can('wages:delete')) { showToast('您没有删除薪酬的权限', 'error'); return }
    if (!confirm(`确认删除 ${wage.memberName || ''} ${wage.yearMonth} 的薪酬记录？此操作不可撤销。`)) return
    try {
      const result = await (await getAPI()).deleteWage(wage.id)
      if (result.success) {
        showToast('薪酬记录已删除', 'success')
        loadData()
      } else {
        showToast(result.error || '删除失败', 'error')
      }
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : '删除失败', 'error') }
  }

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const staffMapLocal = new Map(staff.map((s: Member) => [s.id, s]))
      const getDeptNameLocal = (id?: number) => departments.find((d: Department) => d.id === id)?.name || '-'
      const rows = filteredWages.map((w: StaffWageRecord) => {
        const s = staffMapLocal.get(w.memberId ?? 0)
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
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : '导出失败', 'error') }
  }

  const handleDeleteAllMonth = async () => {
    // G2 B2: 删除整月薪酬 → wages:delete
    if (!can('wages:delete')) { showToast('您没有删除薪酬的权限', 'error'); return }
    if (filterYear === '全部' || filterMonth === '全部') {
      showToast('请选择具体的年份和月份', 'warning')
      return
    }
    if (!confirm(`确认删除 ${effectiveYearMonth} 所有薪酬记录？此操作不可撤销。`)) return
    try {
      const ids = filteredWages.map((w) => w.id)
      if (ids.length === 0) { showToast('没有可删除的记录', 'info'); return }
      const result = await (await getAPI()).batchDeleteWages(ids)
      if (result.success) {
        showToast(`已删除 ${ids.length} 条记录`, 'success')
        loadData()
      } else { showToast(result.error || '批量删除失败', 'error') }
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : '删除失败', 'error') }
  }

  const handlePaidChange = async (wage: StaffWageRecord, field: string, value: string | number | null) => {
    // G2 B2: 实发金额编辑 → wages:update
    if (!can('wages:update')) { showToast('您没有编辑薪酬的权限', 'error'); return }
    const updated = { ...wage, [field]: value }
    await (await getAPI()).updateWage(updated)
    loadData()
    showToast('已更新', 'success')
  }

  if (loading) {
    return <Spinner size="md" text="加载薪酬数据..." />
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <StaffPayrollToolbar
        filterYear={filterYear} filterMonth={filterMonth}
        filterMemberName={filterMemberName} filterDept={filterDept}
        filterProject={filterProject} yearOptions={yearOptions}
        effectiveYearMonth={effectiveYearMonth} filteredWages={filteredWages}
        staff={staff} departments={departments} projects={projects}
        attendances={attendances} generating={generating}
        setFilterYear={setFilterYear} setFilterMonth={setFilterMonth}
        setFilterMemberName={setFilterMemberName} setFilterDept={setFilterDept}
        setFilterProject={setFilterProject}
        onGenerate={generatePayroll} onDeleteAllMonth={handleDeleteAllMonth}
        onExportExcel={handleExportExcel}
      />
      {filteredWages.length === 0 ? (
        <Card bordered={false} className="flex-1 mt-4 flex items-center justify-center">
          {allWages.length === 0 ? (
            <EmptyState icon="Calculator" title="未生成薪酬"
              description="请选择具体年份和月份后点击「生成薪酬」开始计算" />
          ) : (
            <EmptyState icon="Banknote" title="暂无符合筛选条件的记录" description="请调整筛选条件" />
          )}
        </Card>
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
