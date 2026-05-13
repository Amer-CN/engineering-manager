import { useState, useCallback } from 'react'
import { AuditAction, AuditLevel } from '../utils/audit'

export interface AuditLogFilters {
  startDate: string
  endDate: string
  filterAction: AuditAction | ''
  filterResource: string
  filterLevel: AuditLevel | ''
  keyword: string
  page: number
}

const INITIAL: AuditLogFilters = {
  startDate: '', endDate: '', filterAction: '', filterResource: '',
  filterLevel: '', keyword: '', page: 1,
}

export function useAuditLogFilters() {
  const [f, setF] = useState<AuditLogFilters>(INITIAL)

  const set = useCallback(<K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) => {
    setF(prev => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => setF(INITIAL), [])
  const setPage = useCallback((page: number) => setF(prev => ({ ...prev, page })), [])

  const filterParams = {
    startDate: f.startDate || undefined,
    endDate: f.endDate || undefined,
    action: f.filterAction || undefined,
    resource: f.filterResource || undefined,
    level: f.filterLevel || undefined,
    keyword: f.keyword || undefined,
  }

  return { ...f, set, reset, setPage, filterParams }
}
