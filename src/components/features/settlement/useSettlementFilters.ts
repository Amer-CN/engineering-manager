import { useState, useMemo } from 'react'
import type { Settlement, SettlementStatus, SettlementType } from '@/types'

export interface SettlementFiltersApi {
  filterType: SettlementType | ''
  filterStatus: SettlementStatus | ''
  setFilterType: (t: SettlementType | '') => void
  setFilterStatus: (s: SettlementStatus | '') => void
  filteredSettlements: Settlement[]
  stats: {
    total: number
    pending: number
    completed: number
    archived: number
    totalAmount: number
  }
}

export function useSettlementFilters(settlements: Settlement[]): SettlementFiltersApi {
  const [filterType, setFilterType] = useState<SettlementType | ''>('')
  const [filterStatus, setFilterStatus] = useState<SettlementStatus | ''>('')

  const filteredSettlements = useMemo(() => settlements.filter(s => {
    if (filterType && s.type !== filterType) return false
    if (filterStatus && s.status !== filterStatus) return false
    return true
  }), [settlements, filterType, filterStatus])

  const stats = useMemo(() => ({
    total: filteredSettlements.length,
    pending: filteredSettlements.filter(s => s.status === 'pending' || s.status === 'draft').length,
    completed: filteredSettlements.filter(s => s.status === 'completed').length,
    archived: filteredSettlements.filter(s => s.status === 'archived').length,
    totalAmount: filteredSettlements.reduce((sum, s) => sum + s.amount, 0),
  }), [filteredSettlements])

  return {
    filterType, filterStatus,
    setFilterType, setFilterStatus,
    filteredSettlements, stats,
  }
}
