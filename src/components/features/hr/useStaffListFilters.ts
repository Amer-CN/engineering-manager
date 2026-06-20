import { useState, useMemo, useCallback } from 'react'

export interface StaffListFiltersApi {
  filterDept: number | ''
  filterStatus: string
  setFilterDept: (d: number | '') => void
  setFilterStatus: (s: string) => void
  filtered: any[]
  getDeptName: (id?: number) => string
}

export function useStaffListFilters(members: any[], departments: any[]): StaffListFiltersApi {
  const [filterDept, setFilterDept] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const filtered = useMemo(() => members.filter((m: any) => {
    if (filterDept && m.departmentId !== filterDept) return false
    if (filterStatus && m.status !== filterStatus) return false
    return true
  }), [members, filterDept, filterStatus])

  const getDeptName = useCallback((id?: number) =>
    departments.find((d: any) => d.id === id)?.name || '-',
    [departments])

  return {
    filterDept, filterStatus,
    setFilterDept, setFilterStatus,
    filtered, getDeptName,
  }
}
