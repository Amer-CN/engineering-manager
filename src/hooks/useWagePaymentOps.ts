import type { WageRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'

export function useWagePaymentOps(deps: {
  allWageRecords: WageRecord[]
  paymentEdits: Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>
  setPaymentEdits: React.Dispatch<React.SetStateAction<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>>
  selectedWageIds: Set<number>
  setSelectedWageIds: React.Dispatch<React.SetStateAction<Set<number>>>
  setLoading: (b: boolean) => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  confirm: (opts: { title: string; content: string; confirmVariant: 'primary' | 'danger' }) => Promise<boolean>
  loadAllRecords: () => Promise<void>
  loadStats: () => Promise<void>
}) {
  const { allWageRecords, paymentEdits, setPaymentEdits, selectedWageIds, setSelectedWageIds, setLoading, showToast, confirm, loadAllRecords, loadStats } = deps

  const handleBatchDeleteWages = async () => {
    if (selectedWageIds.size === 0) return
    const ok = await confirm({ title: '确认清除', content: `确认清除选中的 ${selectedWageIds.size} 条发放记录吗？（不会删除工资记录本身）`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchClearPayments(Array.from(selectedWageIds))
      if (result.success) {
        showToast(`已清除 ${result.data?.cleared ?? selectedWageIds.size} 条发放记录`, 'success')
        setSelectedWageIds(new Set())
        setPaymentEdits(prev => { const next = new Map(prev); for (const id of selectedWageIds) next.delete(id); return next })
        await loadAllRecords()
      } else showToast(result.error || '清除失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '清除失败', 'error') }
  }

  const handleBatchArchivePayments = async () => {
    const toArchive = selectedWageIds.size > 0 ? Array.from(selectedWageIds) : allWageRecords.filter(w => !w.paymentLocked).map(w => w.id)
    if (toArchive.length === 0) { showToast('没有可归档的记录', 'info'); return }
    const prompt = selectedWageIds.size > 0
      ? `确认归档选中的 ${selectedWageIds.size} 条发放记录吗？归档后实发金额与日期将不能修改。`
      : `确认归档该项目当前月份全部 ${toArchive.length} 条发放记录吗？`
    const ok = await confirm({ title: '确认归档', content: prompt, confirmVariant: 'primary' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchArchivePayments(toArchive)
      if (result.success && result.data) {
        showToast(`已归档 ${result.data?.archived ?? toArchive.length} 条发放记录`, 'success')
        setSelectedWageIds(new Set()); await loadAllRecords(); setPaymentEdits(new Map())
      } else showToast(result.error || '归档失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '归档失败', 'error') }
  }

  const handlePaymentChange = (recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => {
    setPaymentEdits(prev => {
      const next = new Map(prev)
      const record = allWageRecords.find(w => w.id === recordId)
      const current = next.get(recordId) || { paidAmount: record?.paidAmount != null ? String(record.paidAmount) : '', paidDate: record?.paidDate ?? '', bankReceiptPath: record?.bankReceiptPath }
      next.set(recordId, { ...current, [field]: value })
      return next
    })
  }

  const handleSavePayments = async () => {
    if (paymentEdits.size === 0) { showToast('没有需要保存的修改', 'info'); return }
    setLoading(true)
    try {
      const updated = allWageRecords.map(w => {
        const edit = paymentEdits.get(w.id)
        if (!edit) return w
        return { ...w, paidAmount: parseFloat(edit.paidAmount) || 0, paidDate: edit.paidDate, bankReceiptPath: edit.bankReceiptPath ?? w.bankReceiptPath, updatedAt: new Date().toISOString() }
      })
      const result = await (await getAPI()).batchSaveWages(updated)
      if (result.success) { showToast('发放记录已保存', 'success'); setPaymentEdits(new Map()); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '保存失败', 'error') }
    finally { setLoading(false) }
  }

  return { handleBatchDeleteWages, handleBatchArchivePayments, handlePaymentChange, handleSavePayments }
}
