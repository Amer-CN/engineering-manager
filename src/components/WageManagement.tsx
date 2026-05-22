/**
 * 工资管理模块 — 容器组件（v3.0 纯工人日薪制）
 * Dashboard 视图：工资统计看板
 * Cycle 视图：WageCycleDetail（考勤/工资表/发放记录 3 Tab）
 */

import { useState, useEffect, useCallback } from 'react'

import type { Project, WorkerTeam, AttendanceRecord, WageRecord, WageStats } from '@/types'
import { useToastContext } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import WageCycleDetail from './features/wages/WageCycleDetail'
import WageStatsTab from './features/wages/WageStatsTab'
import WageProjectList from './features/wages/WageProjectList'

type ViewMode = 'dashboard' | 'cycle'

export default function WageManagement() {
  const { showToast } = useToastContext()
  const { confirm, ConfirmDialog } = useConfirm()

  // ── 基础数据 ──
  const [projects, setProjects] = useState<Project[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])

  // ── UI 状态 ──
  const [view, setView] = useState<ViewMode>('dashboard')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)

  // ── 考勤数据 ──
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [attendanceDetailRecord, setAttendanceDetailRecord] = useState<AttendanceRecord | null>(null)

  // ── 工资表数据 ──
  const [wageRecords, setWageRecords] = useState<WageRecord[]>([])
  const [editingWages, setEditingWages] = useState<Map<number, { bonus: number; deduction: number }>>(new Map())

  // ── 工资发放编辑 ──
  const [paymentEdits, setPaymentEdits] = useState<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>(new Map())

  // ── 记录和统计 ──
  const [allWageRecords, setAllWageRecords] = useState<WageRecord[]>([])
  const [wageStats, setWageStats] = useState<WageStats | null>(null)
  const [filterMemberName, setFilterMemberName] = useState('')


  // ── 批量选中（三个Tab各自独立） ──
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<number>>(new Set())
  const [selectedWageTableIds, setSelectedWageTableIds] = useState<Set<number>>(new Set())
  const [selectedWageIds, setSelectedWageIds] = useState<Set<number>>(new Set())

  // ── 项目工人数据 ──
  const [projectWorkerList, setProjectWorkerList] = useState<{ pwId: number; name: string; teamName: string; idCard: string }[]>([])
  const [workerPwIds, setWorkerPwIds] = useState<number[]>([])

  // ══════════════════════════════════════════════════════
  // 数据加载
  // ══════════════════════════════════════════════════════

  const loadBaseData = useCallback(async () => {
    setLoading(true)
    try {
      const [projectsRes, teamsRes] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getWorkerTeams(),
      ])
      if (projectsRes.success && projectsRes.data) setProjects(projectsRes.data.filter((p: Project) => p.status !== 'archived'))
      if (teamsRes.success && teamsRes.data) setWorkerTeams(teamsRes.data)
    } catch (error) { console.error('加载基础数据失败:', error) }
    finally { setLoading(false) }
  }, [])

  const loadAttendances = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await window.electronAPI.getAttendances(selectedProject.id, selectedMonth)
      if (result.success && result.data) setAttendances(result.data)
    } catch (error) { console.error('加载考勤失败:', error) }
  }, [selectedProject, selectedMonth])

  const loadWages = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await window.electronAPI.getWages(selectedProject.id, selectedMonth)
      if (result.success && result.data) setWageRecords(result.data)
    } catch (error) { console.error('加载工资数据失败:', error) }
  }, [selectedProject, selectedMonth])

  const loadAllRecords = useCallback(async () => {
    try {
      const projectId = view === 'cycle' ? selectedProject?.id : undefined
      const result = await window.electronAPI.getWages(projectId, undefined)
      if (result.success && result.data) setAllWageRecords(result.data)
    } catch (error) { console.error('加载工资记录失败:', error) }
  }, [selectedProject, view])

  const loadStats = useCallback(async () => {
    try {
      const result = await window.electronAPI.getWageStats(selectedMonth)
      if (result.success && result.data) setWageStats(result.data)
    } catch (error) { console.error('加载统计数据失败:', error) }
  }, [selectedMonth])

  useEffect(() => { loadBaseData() }, [loadBaseData])
  useEffect(() => { loadAttendances() }, [loadAttendances])
  useEffect(() => { loadWages() }, [loadWages])
  useEffect(() => { loadAllRecords() }, [loadAllRecords])
  useEffect(() => { loadStats() }, [loadStats])

  // ══════════════════════════════════════════════════════
  // 加载项目下活跃工人
  // ══════════════════════════════════════════════════════

  const loadProjectWorkers = useCallback(async () => {
    if (!selectedProject) { setProjectWorkerList([]); setWorkerPwIds([]); return }
    const list: { pwId: number; name: string; teamName: string; idCard: string }[] = []
    const pwIds: number[] = []

    try {
      const [pwResult, workersResult] = await Promise.all([
        window.electronAPI.getProjectWorkers(selectedProject.id),
        window.electronAPI.getWorkers(),
      ])
      // Build workerId → idCard map
      const idCardMap = new Map<number, string>()
      if (workersResult.success && workersResult.data) {
        for (const w of workersResult.data) idCardMap.set(w.id, w.idCard || '')
      }
      if (pwResult.success && pwResult.data) {
        for (const pw of pwResult.data) {
          if (pw.status !== 'active') continue
          pwIds.push(pw.id)
          const teamName = workerTeams.find((t: WorkerTeam) => t.id === pw.teamId)?.name || '-'
          const idCard = idCardMap.get(pw.workerId) || ''
          list.push({ pwId: pw.id, name: pw.workerName || '', teamName, idCard })
        }
      }
    } catch (e) { console.error('获取项目工人失败:', e) }

    setProjectWorkerList(list)
    setWorkerPwIds(pwIds)
  }, [selectedProject, workerTeams])

  useEffect(() => { loadProjectWorkers() }, [loadProjectWorkers])

  // ══════════════════════════════════════════════════════
  // 考勤操作
  // ══════════════════════════════════════════════════════

  const handleGenerateAttendance = async () => {
    if (!selectedProject) return
    if (workerPwIds.length === 0) {
      showToast('该项目没有活跃工人，请先在项目详情页→人员管理中添加工人班组', 'warning'); return
    }
    setLoading(true)
    try {
      const r = await window.electronAPI.generateDefaultAttendancesV2(selectedProject.id, selectedMonth, workerPwIds)
      if (r.success && r.data && r.data.count > 0) { showToast(`已为 ${r.data.count} 名工人生成考勤记录`, 'success'); await loadAttendances() }
      else showToast('所有工人已有考勤记录', 'info')
    } catch (error: any) { showToast(error?.message || '生成考勤失败', 'error') }
    finally { setLoading(false) }
  }

  const handleDeleteAttendance = async (record: AttendanceRecord) => {
    const ok = await confirm({
      title: '确认删除',
      content: `确认删除 ${record.memberName || '该工人'} 的考勤记录吗？`,
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      const result = await window.electronAPI.deleteAttendance(record.id)
      if (result.success) { showToast('考勤记录已删除', 'success'); await loadAttendances() }
      else showToast(result.error || '删除失败', 'error')
    } catch (error: any) { showToast(error?.message || '删除失败', 'error') }
  }

  // ══════════════════════════════════════════════════════
  // 工资表操作
  // ══════════════════════════════════════════════════════

  const handleGenerateWages = async () => {
    if (!selectedProject) return
    setLoading(true)
    try {
      const result = await window.electronAPI.generateProjectWages(selectedProject.id, selectedMonth)
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
      const result = await window.electronAPI.batchSaveWages(updated)
      if (result.success) { showToast('工资表已保存', 'success'); setEditingWages(new Map()); await loadWages(); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: any) { showToast(error?.message || '保存失败', 'error') }
    finally { setLoading(false) }
  }

  // ══════════════════════════════════════════════════════
  // 批量删除
  // ══════════════════════════════════════════════════════

  const handleBatchDeleteAttendances = async () => {
    if (selectedAttendanceIds.size === 0) return
    const ok = await confirm({
      title: '确认删除',
      content: `确认删除选中的 ${selectedAttendanceIds.size} 条考勤记录吗？`,
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      const result = await window.electronAPI.batchDeleteAttendances(Array.from(selectedAttendanceIds))
      if (result.success) { showToast(`已删除 ${selectedAttendanceIds.size} 条考勤记录`, 'success'); setSelectedAttendanceIds(new Set()); await loadAttendances() }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (error: any) { showToast(error?.message || '批量删除失败', 'error') }
  }

  const handleBatchDeleteWageTable = async () => {
    if (selectedWageTableIds.size === 0) return
    const ok = await confirm({
      title: '确认删除',
      content: `确认删除选中的 ${selectedWageTableIds.size} 条工资记录吗？`,
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      const result = await window.electronAPI.batchDeleteWages(Array.from(selectedWageTableIds))
      if (result.success) { showToast(`已删除 ${selectedWageTableIds.size} 条工资记录`, 'success'); setSelectedWageTableIds(new Set()); await loadWages() }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (error: any) { showToast(error?.message || '批量删除失败', 'error') }
  }

  const handleBatchDeleteWages = async () => {
    if (selectedWageIds.size === 0) return
    const ok = await confirm({
      title: '确认清除',
      content: `确认清除选中的 ${selectedWageIds.size} 条发放记录吗？（不会删除工资记录本身）`,
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      const result = await window.electronAPI.batchClearPayments(Array.from(selectedWageIds))
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
    } catch (error: any) { showToast(error?.message || '清除失败', 'error') }
  }

  const handleBatchArchivePayments = async () => {
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
      const result = await window.electronAPI.batchArchivePayments(toArchive)
      if (result.success && result.data) {
        showToast(`已归档 ${result.data?.archived ?? toArchive.length} 条发放记录`, 'success')
        setSelectedWageIds(new Set())
        await loadAllRecords()
        setPaymentEdits(new Map())
      } else showToast(result.error || '归档失败', 'error')
    } catch (error: any) { showToast(error?.message || '归档失败', 'error') }
  }

  // ── 工资发放编辑 ──
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
      const result = await window.electronAPI.batchSaveWages(updated)
      if (result.success) { showToast('发放记录已保存', 'success'); setPaymentEdits(new Map()); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: any) { showToast(error?.message || '保存失败', 'error') }
    finally { setLoading(false) }
  }

  // ── 上传银行回单并自动填入 ──
  const [receiptParsing, setReceiptParsing] = useState(false)
  const [receiptResult, setReceiptResult] = useState<{
    matched: number; failed: number; totalItems: number; date: string; receiptPath: string;
    totalAmount?: number; successAmount?: number; rawTextSnippet?: string
  } | null>(null)

  const handleBankReceiptUpload = async (pdfPath: string) => {
    setReceiptParsing(true)
    setReceiptResult(null)
    try {
      const result = await window.electronAPI.parseBankReceipt(pdfPath, selectedProject?.name || undefined)
      if (!result.success || !result.data) {
        showToast(result.error || '回单解析失败', 'error')
        return
      }
      const { date, items, receiptPath } = result.data
      const newEdits = new Map(paymentEdits)
      let matched = 0
      let failed = 0

      for (const item of items) {
        // 只填入处理成功的记录，且金额>0
        if (!/(成功|Success)/i.test(item.status) || item.amount <= 0) {
          failed++
          continue
        }
        // 匹配：先用姓名模糊匹配，再用银行卡号精确确认
        const candidates = allWageRecords.filter(w =>
          (w.memberName || '').includes(item.name) || item.name.includes(w.memberName || '')
        )
        const record = item.account
          ? candidates.find(w => w.bankAccount === item.account)   // 账号精确匹配
          : candidates.length === 1 ? candidates[0]                 // 只有一人
          : candidates[0]                                           // 同名多人但有账号就上面匹配了，没账号时取第一个
        if (record) {
          newEdits.set(record.id, {
            paidAmount: String(item.amount),
            paidDate: date || newEdits.get(record.id)?.paidDate || '',
            bankReceiptPath: receiptPath,
          })
          matched++
        } else {
          failed++
        }
      }

      // DEBUG: log raw items for diagnosis; include rawTextSnippet when 0 items parsed
      const debugPayload: any = { items: items.slice(0, 3), totalItems: items.length, date, totalAmount: result.data.totalAmount, successAmount: result.data.successAmount }
      if (items.length === 0 && result.data.rawTextSnippet) {
        debugPayload.rawTextSnippet = result.data.rawTextSnippet
      }
      console.debug('[bankReceipt]', JSON.stringify(debugPayload))
      setPaymentEdits(newEdits)
      setReceiptResult({ matched, failed, totalItems: items.length, date, receiptPath, totalAmount: result.data.totalAmount, successAmount: result.data.successAmount, rawTextSnippet: result.data.rawTextSnippet })
      showToast(`匹配 ${matched} 条记录已填入${date ? '（' + date + '）' : ''}`, 'success')
    } catch (error: any) {
      showToast(error?.message || '回单解析失败', 'error')
    } finally {
      setReceiptParsing(false)
    }
  }

  // ══════════════════════════════════════════════════════
  // 选中切换
  // ══════════════════════════════════════════════════════

  const toggleAttendanceSelect = (id: number) => setSelectedAttendanceIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllAttendances = () => setSelectedAttendanceIds(prev => prev.size === attendances.length ? new Set() : new Set(attendances.map(a => a.id)))
  const toggleWageTableSelect = (id: number) => setSelectedWageTableIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllWageTable = () => setSelectedWageTableIds(prev => prev.size === wageRecords.length ? new Set() : new Set(wageRecords.map(w => w.id)))
  const toggleWageSelect = (id: number) => setSelectedWageIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllWages = () => {
    const filtered = allWageRecords.filter(w => !filterMemberName || (w.memberName || '').includes(filterMemberName))
    setSelectedWageIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(w => w.id)))
  }

  // ══════════════════════════════════════════════════════
  // Cycle 子页面：工资周期详情（考勤/工资表/发放记录）
  // ══════════════════════════════════════════════════════

  if (view === 'cycle' && selectedProject) {
    return (
      <WageCycleDetail
        selectedProject={selectedProject} selectedMonth={selectedMonth}
        workerTeams={workerTeams}
        attendances={attendances} attendancesCount={projectWorkerList.length}
        attendanceDetailRecord={attendanceDetailRecord}
        setAttendanceDetailRecord={setAttendanceDetailRecord}
        onGenerateAttendance={handleGenerateAttendance}
        onDeleteAttendance={handleDeleteAttendance}
        onBatchDeleteAttendances={handleBatchDeleteAttendances}
        selectedAttendanceIds={selectedAttendanceIds}
        toggleAttendanceSelect={toggleAttendanceSelect}
        toggleAllAttendances={toggleAllAttendances}
        wageRecords={wageRecords} editingWages={editingWages}
        onGenerateWages={handleGenerateWages} onSaveWages={handleSaveWages}
        onBonusDeductionChange={handleWageBonusDeductionChange}
        onBatchDeleteWageTable={handleBatchDeleteWageTable}
        selectedWageTableIds={selectedWageTableIds}
        toggleWageTableSelect={toggleWageTableSelect}
        toggleAllWageTable={toggleAllWageTable}
        allWageRecords={allWageRecords} paymentEdits={paymentEdits}
        onPaymentChange={handlePaymentChange} onSavePayments={handleSavePayments}
        onBankReceiptUpload={handleBankReceiptUpload}
        receiptParsing={receiptParsing} receiptResult={receiptResult}
        onBatchDeleteWages={handleBatchDeleteWages}
        onBatchArchivePayments={handleBatchArchivePayments}
        selectedWageIds={selectedWageIds}
        toggleWageSelect={toggleWageSelect} toggleAllWages={toggleAllWages}
        filterMemberName={filterMemberName} setFilterMemberName={setFilterMemberName}
        loading={loading}
        onChangeMonth={setSelectedMonth}
        onBack={() => { setView('dashboard'); setAttendanceDetailRecord(null); loadStats() }}
        projectWorkerList={projectWorkerList.map(p => ({ id: p.pwId, name: p.name, teamName: p.teamName, idCard: p.idCard }))}
        onImportAttendance={async (data) => {
          if (!selectedProject) return
          setLoading(true)
          try {
            const result = await window.electronAPI.batchImportAttendances(selectedProject.id, selectedMonth, data)
            if (result.success && result.data) {
              showToast(`导入成功！新增 ${result.data.created} 条，更新 ${result.data.updated} 条`, 'success')
              await loadAttendances()
            } else {
              showToast(result.error || '导入失败', 'error')
            }
          } catch (e: any) { showToast(e?.message || '导入失败', 'error') }
          finally { setLoading(false) }
        }}
      />
    )
  }

  // ══════════════════════════════════════════════════════
  // Dashboard 首页：工资统计看板
  // ══════════════════════════════════════════════════════

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setView('cycle')
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">工资管理</h1>
      </div>
      {/* 统计看板 */}
      <WageStatsTab wageStats={wageStats} selectedMonth={selectedMonth} />

      {/* 项目工资列表 */}
      <WageProjectList
        allWageRecords={allWageRecords}
        projects={projects}
        selectedMonth={selectedMonth}
        onProjectClick={handleProjectClick}
      />

      {/* 确认对话框 */}
      {ConfirmDialog}
    </div>
  )

}
