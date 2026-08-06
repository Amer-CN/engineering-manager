/**
 * 工人工资操作 Hook
 * 封装考勤/工资表/发放记录的所有 CRUD 操作
 */
import { useState, useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'
import { useConfirm } from '@/hooks/useConfirm'
import { usePermission } from '@/hooks/usePermission'
import type { Project, WorkerTeam, AttendanceRecord, WageRecord } from '@/types'

interface UseWageActionsOptions {
  selectedProject: Project | null
  selectedMonth: string
  workerTeams: WorkerTeam[]
  attendances: AttendanceRecord[]
  wages: WageRecord[]
  loadData: () => Promise<void>
}

export function useWageActions({
  selectedProject, selectedMonth, workerTeams, attendances, wages, loadData,
}: UseWageActionsOptions) {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const { can } = usePermission()

  // 选中状态
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<number>>(new Set())
  const [selectedWageTableIds, setSelectedWageTableIds] = useState<Set<number>>(new Set())
  const [selectedWageIds, setSelectedWageIds] = useState<Set<number>>(new Set())

  // 工资表编辑
  const [editingWages, setEditingWages] = useState<Map<number, { bonus: number; deduction: number }>>(new Map())

  // 发放编辑
  const [paymentEdits, setPaymentEdits] = useState<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>(new Map())

  // 银行回单
  const [receiptParsing, setReceiptParsing] = useState(false)
  const [receiptResult, setReceiptResult] = useState<{
    matched: number; failed: number; totalItems: number; date: string; receiptPath: string;
    totalAmount?: number; successAmount?: number; rawTextSnippet?: string
  } | null>(null)

  // ── 考勤操作 ──

  const handleGenerateAttendance = useCallback(async () => {
    // G2 B2: 生成考勤 → wages:create
    if (!can('wages:create')) { showToast('您没有生成考勤的权限', 'error'); return }
    if (!selectedProject) return
    try {
      const api = await getAPI()
      const pwRes = await api.getProjectWorkers(selectedProject.id)
      const pwIds = (pwRes.success && pwRes.data) ? pwRes.data.filter((pw: { id: number; status: string }) => pw.status === 'active').map((pw: { id: number }) => pw.id) : []
      if (pwIds.length === 0) { showToast('该项目没有活跃工人', 'warning'); return }
      const r = await api.generateDefaultAttendancesV2(selectedProject.id, selectedMonth, pwIds)
      if (r.success && r.data && r.data.count > 0) { showToast(`已为 ${r.data.count} 名工人生成考勤`, 'success'); await loadData() }
      else showToast('所有工人已有考勤记录', 'info')
    } catch (e: unknown) { showToast((e instanceof Error ? e.message : '生成考勤失败'), 'error') }
  }, [selectedProject, selectedMonth, loadData, showToast])

  const handleOpenAttendanceDetail = useCallback((_record: AttendanceRecord) => {
    // 由 PayrollPage 的子组件处理
  }, [])

  const handleDeleteAttendance = useCallback(async (record: AttendanceRecord) => {
    // G2 B2: 删除考勤 → wages:delete
    if (!can('wages:delete')) { showToast('您没有删除考勤的权限', 'error'); return }
    const ok = await confirm({ title: '确认删除', content: `确认删除 ${record.memberName || '该工人'} 的考勤？`, confirmVariant: 'danger' })
    if (!ok) return
    const r = await (await getAPI()).deleteAttendance(record.id)
    if (r.success) { showToast('已删除', 'success'); await loadData() }
    else showToast(r.error || '删除失败', 'error')
  }, [confirm, loadData, showToast])

  const handleBatchDeleteAttendance = useCallback(async () => {
    // G2 B2: 批量删除考勤 → wages:delete
    if (!can('wages:delete')) { showToast('您没有删除考勤的权限', 'error'); return }
    if (selectedAttendanceIds.size === 0) return
    const ok = await confirm({ title: '确认删除', content: `确认删除选中的 ${selectedAttendanceIds.size} 条考勤？`, confirmVariant: 'danger' })
    if (!ok) return
    const r = await (await getAPI()).batchDeleteAttendances(Array.from(selectedAttendanceIds))
    if (r.success) { showToast(`已删除 ${selectedAttendanceIds.size} 条`, 'success'); setSelectedAttendanceIds(new Set()); await loadData() }
    else showToast(r.error || '批量删除失败', 'error')
  }, [selectedAttendanceIds, confirm, loadData, showToast])

  const handleImportAttendance = useCallback(async (data: { projectWorkerId: number; workDays: number; workerName: string }[]) => {
    // G2 B2: 导入考勤 → wages:create
    if (!can('wages:create')) { showToast('您没有导入考勤的权限', 'error'); return }
    if (!selectedProject) return
    try {
      const r = await (await getAPI()).batchImportAttendances(selectedProject.id, selectedMonth, data)
      if (r.success) { showToast(`已导入 ${data.length} 条考勤`, 'success'); await loadData() }
      else showToast(r.error || '导入失败', 'error')
    } catch (e: unknown) { showToast((e instanceof Error ? e.message : '导入失败'), 'error') }
  }, [selectedProject, selectedMonth, loadData, showToast])

  // ── 工资表操作 ──

  const handleGenerateWages = useCallback(async () => {
    // G2 B2: 生成工资表 → wages:create
    if (!can('wages:create')) { showToast('您没有生成工资表的权限', 'error'); return }
    if (!selectedProject) return
    const r = await (await getAPI()).generateProjectWages(selectedProject.id, selectedMonth)
    if (r.success && r.data) { showToast(`已生成 ${r.newCount ?? 0} 条工资`, 'success'); setEditingWages(new Map()); await loadData() }
    else showToast(r.error || '生成工资表失败', 'error')
  }, [selectedProject, selectedMonth, loadData, showToast])

  const handleBonusDeductionChange = useCallback((recordId: number, field: 'bonus' | 'deduction', value: number) => {
    setEditingWages(prev => { const next = new Map(prev); const cur = next.get(recordId) || { bonus: 0, deduction: 0 }; next.set(recordId, { ...cur, [field]: value }); return next })
  }, [])

  const handleSaveWages = useCallback(async () => {
    // G2 B2: 保存工资表 → wages:update
    if (!can('wages:update')) { showToast('您没有保存工资表的权限', 'error'); return }
    if (editingWages.size === 0) { showToast('没有需要保存的修改', 'info'); return }
    const updated = wages.map(w => {
      const edit = editingWages.get(w.id)
      if (!edit) return w
      const actualWage = Math.round(((w.dailyWage || 0) * (w.workDays || 0) + edit.bonus - edit.deduction) * 100) / 100
      return { ...w, bonus: edit.bonus, deduction: edit.deduction, actualWage, updatedAt: new Date().toISOString() }
    })
    const r = await (await getAPI()).batchSaveWages(updated)
    if (r.success) { showToast('工资表已保存', 'success'); setEditingWages(new Map()); await loadData() }
    else showToast(r.error || '保存失败', 'error')
  }, [editingWages, wages, loadData, showToast])

  const handleBatchDeleteWages = useCallback(async () => {
    // G2 B2: 批量删除工资 → wages:delete
    if (!can('wages:delete')) { showToast('您没有删除工资的权限', 'error'); return }
    if (selectedWageTableIds.size === 0) return
    const ok = await confirm({ title: '确认删除', content: `确认删除选中的 ${selectedWageTableIds.size} 条工资？`, confirmVariant: 'danger' })
    if (!ok) return
    const r = await (await getAPI()).batchDeleteWages(Array.from(selectedWageTableIds))
    if (r.success) { showToast(`已删除 ${selectedWageTableIds.size} 条`, 'success'); setSelectedWageTableIds(new Set()); await loadData() }
    else showToast(r.error || '删除失败', 'error')
  }, [selectedWageTableIds, confirm, loadData, showToast])

  // ── 发放记录操作 ──

  const handlePaymentChange = useCallback((recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => {
    setPaymentEdits(prev => {
      const next = new Map(prev)
      const record = wages.find(w => w.id === recordId)
      const cur = next.get(recordId) || { paidAmount: record?.paidAmount != null ? String(record.paidAmount) : '', paidDate: record?.paidDate ?? '' }
      next.set(recordId, { ...cur, [field]: value })
      return next
    })
  }, [wages])

  const handleSavePayments = useCallback(async () => {
    // G2 B2: 保存发放 → wages:update
    if (!can('wages:update')) { showToast('您没有登记发放的权限', 'error'); return }
    if (paymentEdits.size === 0) { showToast('没有需要保存的修改', 'info'); return }
    let skippedEmpty = 0
    const updated = wages.map(w => {
      const edit = paymentEdits.get(w.id)
      if (!edit) return null
      const paidAmount = parseFloat(edit.paidAmount)
      if (!Number.isFinite(paidAmount)) { skippedEmpty++; return null }  // 空串/非法 → 跳过该行，不发 0
      // 只发付款四字段，不整行展开（batch-payment 端点只看这四列）
      return { id: w.id, paidAmount, paidDate: edit.paidDate, bankReceiptPath: edit.bankReceiptPath ?? w.bankReceiptPath }
    }).filter((x): x is { id: number; paidAmount: number; paidDate: string; bankReceiptPath: string | undefined } => x !== null)
    if (skippedEmpty > 0) showToast(`实发金额为空的行已跳过（${skippedEmpty} 条），如需清除请用「清除发放记录」`, 'warning')
    const r = await (await getAPI()).batchSavePayments(updated)
    if (r.success) { showToast('发放记录已保存', 'success'); setPaymentEdits(new Map()); await loadData() }
    else showToast(r.error || '保存失败', 'error')
  }, [paymentEdits, wages, loadData, showToast])

  const handleBatchDeletePayments = useCallback(async () => {
    // G2 B2: 清除发放 → wages:update
    if (!can('wages:update')) { showToast('您没有清除发放的权限', 'error'); return }
    if (selectedWageIds.size === 0) return
    const ok = await confirm({ title: '确认清除', content: `确认清除选中的 ${selectedWageIds.size} 条发放记录？`, confirmVariant: 'danger' })
    if (!ok) return
    const r = await (await getAPI()).batchClearPayments(Array.from(selectedWageIds))
    if (r.success) { showToast(`已清除 ${r.data?.cleared ?? selectedWageIds.size} 条`, 'success'); setSelectedWageIds(new Set()); setPaymentEdits(prev => { const next = new Map(prev); for (const id of selectedWageIds) next.delete(id); return next }); await loadData() }
    else showToast(r.error || '清除失败', 'error')
  }, [selectedWageIds, confirm, loadData, showToast])

  const handleBatchArchivePayments = useCallback(async () => {
    // G2 B2: 归档发放 → wages:update（顺带修复桥接断链：batchArchivePayments 无定义 → batchArchiveWages）
    if (!can('wages:update')) { showToast('您没有归档发放的权限', 'error'); return }
    const toArchive = selectedWageIds.size > 0 ? Array.from(selectedWageIds) : wages.filter(w => !w.paymentLocked).map(w => w.id)
    if (toArchive.length === 0) { showToast('没有可归档的记录', 'info'); return }
    const ok = await confirm({ title: '确认归档', content: `确认归档 ${toArchive.length} 条发放记录？归档后不可修改。`, confirmVariant: 'primary' })
    if (!ok) return
    const r = await (await getAPI()).batchArchiveWages(toArchive)
    if (r.success) { showToast(`已归档 ${r.data?.archived ?? toArchive.length} 条`, 'success'); setSelectedWageIds(new Set()); setPaymentEdits(new Map()); await loadData() }
    else showToast(r.error || '归档失败', 'error')
  }, [selectedWageIds, wages, confirm, loadData, showToast])

  const handleBankReceiptUpload = useCallback(async (pdfPath: string) => {
    setReceiptParsing(true); setReceiptResult(null)
    try {
      const result = await (await getAPI()).parseBankReceipt(pdfPath, selectedProject?.name || undefined)
      if (!result.success || !result.data) { showToast(result.error || '回单解析失败', 'error'); return }
      const { date, items, receiptPath } = result.data
      const newEdits = new Map(paymentEdits)
      let matched = 0, failed = 0
      for (const item of items) {
        if (!/(成功|Success)/i.test(item.status) || item.amount <= 0) { failed++; continue }
        const candidates = wages.filter(w => (w.memberName || '').includes(item.name) || item.name.includes(w.memberName || ''))
        const record = item.account ? candidates.find(w => w.bankAccount === item.account) : candidates[0]
        if (record) { newEdits.set(record.id, { paidAmount: String(item.amount), paidDate: date || '', bankReceiptPath: receiptPath }); matched++ }
        else { failed++ }
      }
      setPaymentEdits(newEdits)
      setReceiptResult({ matched, failed, totalItems: items.length, date, receiptPath, totalAmount: items.reduce((s: number, i: { amount: number }) => s + i.amount, 0), successAmount: items.filter((i: { status: string }) => /(成功|Success)/i.test(i.status)).reduce((s: number, i: { amount: number }) => s + i.amount, 0), rawTextSnippet: result.data.rawTextSnippet })
      showToast(`匹配 ${matched} 条，未匹配 ${failed} 条`, matched > 0 ? 'success' : 'warning')
    } catch (e: unknown) { showToast((e instanceof Error ? e.message : '回单解析失败'), 'error') }
    finally { setReceiptParsing(false) }
  }, [selectedProject, paymentEdits, wages, showToast])

  // ── 选中操作 ──

  const toggleAttendanceSelect = useCallback((id: number) => {
    setSelectedAttendanceIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }, [])
  const toggleAllAttendance = useCallback(() => {
    setSelectedAttendanceIds(prev => prev.size > 0 ? new Set() : new Set(attendances.map(a => a.id)))
  }, [attendances])

  const toggleWageTableSelect = useCallback((id: number) => {
    setSelectedWageTableIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }, [])
  const toggleAllWageTable = useCallback(() => {
    setSelectedWageTableIds(prev => prev.size > 0 ? new Set() : new Set(wages.map(w => w.id)))
  }, [wages])

  const toggleWageSelect = useCallback((id: number) => {
    setSelectedWageIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }, [])
  const toggleAllWage = useCallback(() => {
    setSelectedWageIds(prev => prev.size > 0 ? new Set() : new Set(wages.map(w => w.id)))
  }, [wages])

  return {
    // 考勤
    selectedAttendanceIds, toggleAttendanceSelect, toggleAllAttendance,
    handleGenerateAttendance, handleOpenAttendanceDetail, handleDeleteAttendance,
    handleBatchDeleteAttendance, handleImportAttendance,
    // 工资表
    editingWages, selectedWageTableIds, toggleWageTableSelect, toggleAllWageTable,
    handleGenerateWages, handleSaveWages, handleBonusDeductionChange, handleBatchDeleteWages,
    // 发放
    paymentEdits, selectedWageIds, toggleWageSelect, toggleAllWage,
    handlePaymentChange, handleSavePayments, handleBatchDeletePayments, handleBatchArchivePayments,
    handleBankReceiptUpload, receiptParsing, receiptResult,
    // ConfirmDialog
    ConfirmDialog,
  }
}
