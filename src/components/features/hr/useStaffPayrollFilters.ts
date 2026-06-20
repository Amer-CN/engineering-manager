import { useState, useMemo } from 'react'

export interface StaffPayrollFiltersApi {
  filterYear: string
  filterMonth: string
  filterMemberName: string
  filterDept: number | ''
  filterProject: string
  setFilterYear: (y: string) => void
  setFilterMonth: (m: string) => void
  setFilterMemberName: (n: string) => void
  setFilterDept: (d: number | '') => void
  setFilterProject: (p: string) => void
  yearOptions: string[]
  effectiveYearMonth: string
  filteredWages: any[]
  summaryTotals: { totalNet: number; totalPaid: number; totalDiff: number }
}

export function useStaffPayrollFilters(
  staff: any[],
  allWages: any[],
  now: Date = new Date()
): StaffPayrollFiltersApi {
  const [filterYear, setFilterYear] = useState<string>('全部')
  const [filterMonth, setFilterMonth] = useState<string>('全部')
  const [filterMemberName, setFilterMemberName] = useState('')
  const [filterDept, setFilterDept] = useState<number | ''>('')
  const [filterProject, setFilterProject] = useState<string>('全部')

  const yearOptions = useMemo(() => {
    const s = new Set<string>()
    for (const w of allWages) {
      if (w.yearMonth) s.add(w.yearMonth.slice(0, 4))
    }
    const y = now.getFullYear()
    if (s.size === 0) {
      for (let i = y - 9; i <= y; i++) s.add(String(i))
    }
    return Array.from(s).sort()
  }, [allWages, now])

  const effectiveYearMonth = filterYear !== '全部' && filterMonth !== '全部'
    ? `${filterYear}-${filterMonth}`
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const filteredWages = useMemo(() => {
    return allWages.filter((w: any) => {
      if (filterYear !== '全部' && w.yearMonth?.slice(0, 4) !== filterYear) return false
      if (filterMonth !== '全部' && w.yearMonth?.slice(5, 7) !== filterMonth) return false
      if (filterMemberName && !(w.memberName || '').includes(filterMemberName)) return false
      if (filterDept) {
        const s = staff.find((m: any) => m.id === w.memberId)
        if (s && s.departmentId !== filterDept) return false
      }
      if (filterProject !== '全部') {
        if (w.projectId != null && w.projectId !== Number(filterProject)) return false
      }
      return true
    })
  }, [allWages, filterYear, filterMonth, filterMemberName, filterDept, filterProject, staff])

  const summaryTotals = useMemo(() => {
    const totalNet = filteredWages.reduce((s, w) => s + ((w.netSalary || 0) - (w.deduction || 0)), 0)
    const totalPaid = filteredWages.reduce((s, w) => s + (Number(w.paidAmount) || 0), 0)
    return { totalNet, totalPaid, totalDiff: totalNet - totalPaid }
  }, [filteredWages])

  return {
    filterYear, filterMonth, filterMemberName, filterDept, filterProject,
    setFilterYear, setFilterMonth, setFilterMemberName, setFilterDept, setFilterProject,
    yearOptions, effectiveYearMonth, filteredWages, summaryTotals,
  }
}
