import { useCallback } from 'react'
import type { WageRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'

interface UseWageTableOptions {
  selectedProject: { id: number } | null
  selectedMonth: string
  wageRecords: WageRecord[]
  editingWages: Map<number, { bonus: number; deduction: number }>
  setWageRecords: (v: WageRecord[] | ((prev: WageRecord[]) => WageRecord[])) => void
  setEditingWages: (v: Map<number, { bonus: number; deduction: number }> | ((prev: Map<number, { bonus: number; deduction: number }>) => Map<number, { bonus: number; deduction: number }>)) => void
  setLoading: (v: boolean) => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  loadAllRecords: () => Promise<void>
  loadStats: () => Promise<void>
}

export function useWageTable({
  selectedProject, selectedMonth, wageRecords, editingWages,
  setWageRecords, setEditingWages, setLoading,
  showToast, loadAllRecords, loadStats,
}: UseWageTableOptions) {
  const loadWages = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await (await getAPI()).getWages(selectedProject.id, selectedMonth)
      if (result.success && result.data) setWageRecords(result.data)
    } catch (error) { console.error('加载工资数据失败:', error) }
  }, [selectedProject, selectedMonth])

  const handleGenerateWages = async () => {
    if (!selectedProject) return
    setLoading(true)
    try {
      const result = await (await getAPI()).generateProjectWages(selectedProject.id, selectedMonth)
      if (result.success && result.data) { showToast(`已生成 ${result.data.length} 条工资记录`, 'success'); await loadWages(); await loadAllRecords(); setEditingWages(new Map()) }
      else showToast(result.error || '生成工资表失败', 'error')
    } catch (error: any) { showToast(error?.message || '生成工资表失败', 'error') }
    finally { setLoading(false) }
  }

  const handleWageBonusDeductionChange = (recordId: number, field: 'bonus' | 'deduction', value: number) => {
    setEditingWages(prev => { const next = new Map(prev); const current = next.get(recordId) || { bonus: 0, deduction: 0 }; next.set(recordId, { ...current, [field]: value }); return next })
  }

  const handleSaveWages = async () => {
    if (editingWages.size === 0) { showToast('没有需要保存的修改', 'info'); return }
    setLoading(true)
    try {
      const updated = wageRecords.map(w => {
        const edit = editingWages.get(w.id)
        if (!edit) return w
        const actualWage = Math.round(((w.dailyWage || 0) * (w.workDays || 0) + edit.bonus - edit.deduction) * 100) / 100
        return { ...w, bonus: edit.bonus, deduction: edit.deduction, actualWage, updatedAt: new Date().toISOString() }
      })
      const result = await (await getAPI()).batchSaveWages(updated)
      if (result.success) { showToast('工资表已保存', 'success'); setEditingWages(new Map()); await loadWages(); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: any) { showToast(error?.message || '保存失败', 'error') }
    finally { setLoading(false) }
  }

  return { loadWages, handleGenerateWages, handleWageBonusDeductionChange, handleSaveWages }
}
