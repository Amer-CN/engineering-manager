import { useState, useEffect, useCallback, useMemo } from 'react'
import type { CostLedgerCategory } from '@/types'

export function useCostLedgerCategories() {
  const [categories, setCategories] = useState<CostLedgerCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const api = (window as any).electronAPI
    if (!api?.getCostLedgerCategories) return
    setLoading(true)
    try {
      const res = await api.getCostLedgerCategories()
      if (res?.success) {
        setCategories(res.data || [])
        setError(null)
      } else {
        setError(res?.error || '加载失败')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const expenseCategories = useMemo(
    () => categories.filter(c => c.direction === 'expense'),
    [categories]
  )
  const incomeCategories = useMemo(
    () => categories.filter(c => c.direction === 'income'),
    [categories]
  )

  const getLabel = useCallback((code: string): string => {
    return categories.find(c => c.code === code)?.label || code
  }, [categories])

  const getColor = useCallback((code: string): string => {
    return categories.find(c => c.code === code)?.color || '#9ca3af'
  }, [categories])

  const getByDirection = useCallback((dir: 'expense' | 'income') => {
    return categories.filter(c => c.direction === dir)
  }, [categories])

  return {
    categories, loading, error, refresh: load,
    expenseCategories, incomeCategories,
    getLabel, getColor, getByDirection,
  }
}
