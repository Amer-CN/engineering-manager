import React, { useState, useEffect, useCallback } from 'react'
import { useStaffPayrollFilters } from './useStaffPayrollFilters'
import { EmptyState } from '../../ui/EmptyState'
import Spinner from '../../ui/Spinner'
import { useToastStore } from '@/store/toastStore'
import { computeAttendanceSummary } from '../../../constants/attendance'
import { getAPI } from '@/services/api-adapter'
import {
  filteredStaffForGenerate,
  getAttendanceForMember,
  isAttendanceReady,
  getEntryDate,
} from '../../../utils/staff-payroll-utils'
import { StaffPayrollTable } from './StaffPayrollTable'
import { Card } from '@/components/ui/Card'
import StaffPayrollToolbar from './StaffPayrollToolbar'

const StaffPayroll: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const [staff, setStaff] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [allWages, setAllWages] = useState<any[]>([])
  const [attendances, setAttendances] = useState<any[]>([])
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
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      const membersData = get(memRes)
      const staffOnly = membersData.filter(
        (m: any) => m.memberType === 'staff' || m.memberType === undefined
      )
      setStaff(staffOnly)
      const staffIds = new Set(staffOnly.map((m: any) => m.id))
      setAllWages(get(wageRes).filter((w: any) => staffIds.has(w.memberId)))
      setAttendances(get(attRes))
      setDepartments(get(deptRes))
      setProjects(get(projRes).filter((p: any) => p.status !== 'archived'))
    } catch (e) { console.error(e) }
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
          const record: any = {
            memberId: s.id, projectId: null, yearMonth: ym, baseSalary, subsidy,
            attendanceDays: attWorkDays, bonus: 0, deduction: 0, netSalary,
            paidAmount: null, paidDate: null,
          }
          const existing = allWages.find((w: any) => w.memberId === s.id && w.yearMonth === ym)
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
    } catch (e: any) { showToast(e?.message || '生成失败', 'error') }
    finally { setGenerating(false) }
  }

  const handleDeleteWage = async (wage: any) => {
    if (!confirm(`确认删除 ${wage.memberName || ''} ${wage.yearMonth} 的薪酬记录？此操作不可撤销。`)) return
    try {
      const result = await (await getAPI()).deleteWage(wage.id)
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
      const result = await (await getAPI()).batchDeleteWages(ids)
      if (result.success) {
        showToast(`已删除 ${ids.length} 条记录`, 'success')
        loadData()
      } else { showToast(result.error || '批量删除失败', 'error') }
    } catch (e: any) { showToast(e?.message || '删除失败', 'error') }
  }

  const handlePaidChange = async (wage: any, field: string, value: any) => {
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
