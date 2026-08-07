import type { WageRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from './usePermission'
import type { PermissionCode } from '@/types/permissions'

// ═══════════════════════════════════════════════════════════════════════════
// J-2: handleSavePayments 核心（单一实现，可注入形式）
// 收敛自 useWageActions.ts:152 与 useWagePaymentOps.ts:66（逐字一致部分）：
// 权限守卫 / 空 edits 早退 / skippedEmpty / 载荷构造 / toast 文案。
// - refresh 必选：两侧各自语境注入（Payroll=loadData，Wage 管理=loadAllRecords+loadStats）
// - setLoading 可选：调用方没有就不传（Wage 管理侧传，Payroll 侧由调用方决定）
// - loading + try/catch 语义取 useWagePaymentOps 的更完整版本（Payroll 侧因此获得
//   loading 指示与异常兜底 toast，有意的小 UX 增强，零数据语义变化）
// ═══════════════════════════════════════════════════════════════════════════
export interface SavePaymentsCoreOptions {
  can: (permission: PermissionCode) => boolean
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  records: WageRecord[]
  paymentEdits: Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>
  setPaymentEdits: React.Dispatch<React.SetStateAction<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>>
  refresh: () => Promise<void>
  setLoading?: (b: boolean) => void
}

export async function savePaymentsCore(options: SavePaymentsCoreOptions): Promise<void> {
  const { can, showToast, records, paymentEdits, setPaymentEdits, refresh, setLoading } = options
  // G2 B2: 保存发放 → wages:update
  if (!can('wages:update')) { showToast('您没有登记发放的权限', 'error'); return }
  if (paymentEdits.size === 0) { showToast('没有需要保存的修改', 'info'); return }
  setLoading?.(true)
  try {
    let skippedEmpty = 0
    const updated = records.map(w => {
      const edit = paymentEdits.get(w.id)
      if (!edit) return null
      const paidAmount = parseFloat(edit.paidAmount)
      if (!Number.isFinite(paidAmount)) { skippedEmpty++; return null }  // 空串/非法 → 跳过该行，不发 0
      // 只发付款四字段，不整行展开（batch-payment 端点只看这四列）
      return { id: w.id, paidAmount, paidDate: edit.paidDate, bankReceiptPath: edit.bankReceiptPath ?? w.bankReceiptPath }
    }).filter((x): x is { id: number; paidAmount: number; paidDate: string; bankReceiptPath: string | undefined } => x !== null)
    if (skippedEmpty > 0) showToast(`实发金额为空的行已跳过（${skippedEmpty} 条），如需清除请用「清除发放记录」`, 'warning')
    const result = await (await getAPI()).batchSavePayments(updated)
    if (result.success) { showToast('发放记录已保存', 'success'); setPaymentEdits(new Map()); await refresh() }
    else showToast(result.error || '保存失败', 'error')
  } catch (error: unknown) { showToast(error instanceof Error ? error.message : '保存失败', 'error') }
  finally { setLoading?.(false) }
}

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
  const { can } = usePermission()

  const handleBatchDeleteWages = async () => {
    // G2 B2: 清除发放 → wages:update
    if (!can('wages:update')) { showToast('您没有清除发放的权限', 'error'); return }
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
    // G2 B2: 归档发放 → wages:update（顺带修复桥接断链：batchArchivePayments 无定义 → batchArchiveWages）
    if (!can('wages:update')) { showToast('您没有归档发放的权限', 'error'); return }
    const toArchive = selectedWageIds.size > 0 ? Array.from(selectedWageIds) : allWageRecords.filter(w => !w.paymentLocked).map(w => w.id)
    if (toArchive.length === 0) { showToast('没有可归档的记录', 'info'); return }
    const prompt = selectedWageIds.size > 0
      ? `确认归档选中的 ${selectedWageIds.size} 条发放记录吗？归档后实发金额与日期将不能修改。`
      : `确认归档该项目当前月份全部 ${toArchive.length} 条发放记录吗？`
    const ok = await confirm({ title: '确认归档', content: prompt, confirmVariant: 'primary' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchArchiveWages(toArchive)
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

  const handleSavePayments = () => savePaymentsCore({
    can, showToast,
    records: allWageRecords,
    paymentEdits, setPaymentEdits,
    // J-2: 刷新注入（Wage 管理页语境，维持现状：工资记录 + 统计）
    refresh: async () => { await loadAllRecords(); await loadStats() },
    setLoading,
  })

  return { handleBatchDeleteWages, handleBatchArchivePayments, handlePaymentChange, handleSavePayments }
}
