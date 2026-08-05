import { useState, useCallback } from 'react'

import type { WageRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'

export interface UseWagePaymentsReturn {
  paymentEdits: Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>
  setPaymentEdits: React.Dispatch<React.SetStateAction<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>>
  handlePaymentChange: (recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => void
  handleSavePayments: () => Promise<void>
  handleBatchDeleteWages: () => Promise<void>
  handleBatchArchivePayments: () => Promise<void>
  selectedWageIds: Set<number>
  setSelectedWageIds: React.Dispatch<React.SetStateAction<Set<number>>>
  toggleWageSelect: (id: number) => void
  toggleAllWages: () => void
}

interface UseWagePaymentsOptions {
  allWageRecords: WageRecord[]
  selectedProject: { id: number } | null
  filterMemberName: string
  setLoading: (v: boolean) => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  confirm: (opts: { title: string; content: string; confirmVariant: 'primary' | 'danger' }) => Promise<boolean>
  loadAllRecords: () => Promise<void>
  loadStats: () => Promise<void>
}

export function useWagePayments({
  allWageRecords,
  filterMemberName,
  setLoading,
  showToast,
  confirm,
  loadAllRecords,
  loadStats,
}: UseWagePaymentsOptions) {
  const [paymentEdits, setPaymentEdits] = useState<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>(new Map())
  const [selectedWageIds, setSelectedWageIds] = useState<Set<number>>(new Set())

  const handlePaymentChange = useCallback((recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => {
    setPaymentEdits(prev => {
      const next = new Map(prev)
      const record = allWageRecords.find(w => w.id === recordId)
      const current = next.get(recordId) || { paidAmount: record?.paidAmount != null ? String(record.paidAmount) : '', paidDate: record?.paidDate ?? '', bankReceiptPath: record?.bankReceiptPath }
      next.set(recordId, { ...current, [field]: value })
      return next
    })
  }, [allWageRecords])

  const handleSavePayments = useCallback(async () => {
    if (paymentEdits.size === 0) { showToast('没有需要保存的修改', 'info'); return }
    setLoading(true)
    try {
      const updated = allWageRecords.map(w => {
        const edit = paymentEdits.get(w.id)
        if (!edit) return null
        // 只发付款四字段，不整行展开（batch-payment 端点只看这四列）
        return { id: w.id, paidAmount: parseFloat(edit.paidAmount) || 0, paidDate: edit.paidDate, bankReceiptPath: edit.bankReceiptPath ?? w.bankReceiptPath }
      }).filter((x): x is { id: number; paidAmount: number; paidDate: string; bankReceiptPath: string | undefined } => x !== null)
      const result = await (await getAPI()).batchSavePayments(updated)
      if (result.success) { showToast('发放记录已保存', 'success'); setPaymentEdits(new Map()); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '保存失败', 'error') }
    finally { setLoading(false) }
  }, [paymentEdits, allWageRecords, showToast, setLoading, loadAllRecords, loadStats])

  const handleBatchDeleteWages = useCallback(async () => {
    if (selectedWageIds.size === 0) return
    const ok = await confirm({
      title: '确认清除',
      content: `确认清除选中的 ${selectedWageIds.size} 条发放记录吗？（不会删除工资记录本身）`,
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchClearPayments(Array.from(selectedWageIds))
      if (result.success) {
        showToast(`已清除 ${result.data?.cleared ?? selectedWageIds.size} 条发放记录`, 'success')
        setSelectedWageIds(new Set())
        setPaymentEdits(prev => {
          const next = new Map(prev)
          for (const id of selectedWageIds) next.delete(id)
          return next
        })
        await loadAllRecords()
      } else showToast(result.error || '清除失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '清除失败', 'error') }
  }, [selectedWageIds, confirm, showToast, setSelectedWageIds, loadAllRecords])

  const handleBatchArchivePayments = useCallback(async () => {
    const toArchive = selectedWageIds.size > 0
      ? Array.from(selectedWageIds)
      : allWageRecords.filter(w => !w.paymentLocked).map(w => w.id)
    if (toArchive.length === 0) { showToast('没有可归档的记录', 'info'); return }
    const prompt = selectedWageIds.size > 0
      ? `确认归档选中的 ${selectedWageIds.size} 条发放记录吗？归档后实发金额与日期将不能修改。`
      : `确认归档该项目当前月份全部 ${toArchive.length} 条发放记录吗？`
    const ok = await confirm({
      title: '确认归档',
      content: prompt,
      confirmVariant: 'primary',
    })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchArchivePayments(toArchive)
      if (result.success && result.data) {
        showToast(`已归档 ${result.data?.archived ?? toArchive.length} 条发放记录`, 'success')
        setSelectedWageIds(new Set())
        await loadAllRecords()
        setPaymentEdits(new Map())
      } else showToast(result.error || '归档失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '归档失败', 'error') }
  }, [selectedWageIds, allWageRecords, confirm, showToast, setSelectedWageIds, loadAllRecords])

  const toggleWageSelect = useCallback((id: number) => setSelectedWageIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }), [])
  const toggleAllWages = useCallback(() => {
    const filtered = allWageRecords.filter(w => !filterMemberName || (w.memberName || '').includes(filterMemberName))
    setSelectedWageIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(w => w.id)))
  }, [allWageRecords, filterMemberName])

  return {
    paymentEdits, setPaymentEdits,
    handlePaymentChange, handleSavePayments,
    handleBatchDeleteWages, handleBatchArchivePayments,
    selectedWageIds, setSelectedWageIds,
    toggleWageSelect, toggleAllWages,
  }
}
