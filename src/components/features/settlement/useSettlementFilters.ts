import { useState, useMemo } from 'react'
import type { Settlement, SettlementStatus, SettlementType } from '@/types'

export interface SettlementFiltersApi {
  filterType: SettlementType | ''
  filterSubType: string
  filterStatus: SettlementStatus | ''
  setFilterType: (t: SettlementType | '') => void
  setFilterSubType: (t: string) => void
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
  // S19 Stitch: 6 细分类别页签筛选
  const [filterSubType, setFilterSubType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<SettlementStatus | ''>('')

  const filteredSettlements = useMemo(() => settlements.filter(s => {
    if (filterType && s.type !== filterType) return false
    if (filterSubType && (s.subType || '') !== filterSubType) return false
    if (filterStatus && s.status !== filterStatus) return false
    return true
  }), [settlements, filterType, filterSubType, filterStatus])

  const stats = useMemo(() => ({
    total: filteredSettlements.length,
    pending: filteredSettlements.filter(s => s.status === 'pending' || s.status === 'draft').length,
    completed: filteredSettlements.filter(s => s.status === 'completed').length,
    archived: filteredSettlements.filter(s => s.status === 'archived').length,
    totalAmount: filteredSettlements.reduce((sum, s) => sum + s.amount, 0),
  }), [filteredSettlements])

  return {
    filterType, filterSubType, filterStatus,
    setFilterType, setFilterSubType, setFilterStatus,
    filteredSettlements, stats,
  }
}
