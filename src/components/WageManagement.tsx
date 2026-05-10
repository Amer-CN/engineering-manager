/**
 * 工资管理模块 — 容器组件
 * Dashboard 视图：工资统计看板
 * Cycle 视图：WageCycleDetail（考勤/工资表/发放记录 3 Tab）
 */

import React, { useState, useEffect, useCallback } from 'react'

import { FILE_CATEGORIES, uploadFile, readUploadedFile, deleteUploadedFile, readFileAsDataUrl } from '../services/fileService'
import type { Member, Project, WorkerTeam, AttendanceRecord, WageRecord, WageStats } from '@/types'
import { useToastContext } from '../hooks/useToast'
import WageCycleDetail from './features/wages/WageCycleDetail'
import WageStatsTab from './features/wages/WageStatsTab'
import WageProjectList from './features/wages/WageProjectList'

// keep getDaysInMonth for handleSaveWages
function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

type ViewMode = 'dashboard' | 'cycle'

export default function WageManagement() {
  const { showToast } = useToastContext()

  // ── 基础数据 ──
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
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
  const [paymentEdits, setPaymentEdits] = useState<Map<number, { paidAmount: number; paidDate: string }>>(new Map())

  // ── 记录和统计 ──
  const [allWageRecords, setAllWageRecords] = useState<WageRecord[]>([])
  const [wageStats, setWageStats] = useState<WageStats | null>(null)
  const [filterMemberName, setFilterMemberName] = useState('')
  const [uploadingFileId, setUploadingFileId] = useState<number | null>(null)

  // ── 批量选中（三个Tab各自独立） ──
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<number>>(new Set())
  const [selectedWageTableIds, setSelectedWageTableIds] = useState<Set<number>>(new Set())
  const [selectedWageIds, setSelectedWageIds] = useState<Set<number>>(new Set())

  // ══════════════════════════════════════════════════════
  // 数据加载
  // ══════════════════════════════════════════════════════

  const loadBaseData = useCallback(async () => {
    setLoading(true)
    try {
      const [projectsRes, membersRes, teamsRes] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getMembers(),
        window.electronAPI.getWorkerTeams(),
      ])
      if (projectsRes.success && projectsRes.data) setProjects(projectsRes.data.filter((p: Project) => p.status !== 'archived'))
      if (membersRes.success && membersRes.data) setMembers(membersRes.data)
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
      const result = await window.electronAPI.getWageStats()
      if (result.success && result.data) setWageStats(result.data)
    } catch (error) { console.error('加载统计数据失败:', error) }
  }, [])

  useEffect(() => { loadBaseData() }, [loadBaseData])
  useEffect(() => { loadAttendances() }, [loadAttendances])
  useEffect(() => { loadWages() }, [loadWages])
  useEffect(() => { loadAllRecords() }, [loadAllRecords])
  useEffect(() => { loadStats() }, [loadStats])

  // ══════════════════════════════════════════════════════
  // 项目成员
  // ══════════════════════════════════════════════════════

  const [projectMemberList, setProjectMemberList] = useState<{ member: Member; teamName: string }[]>([])

  const refreshProjectMembers = useCallback(async () => {
    if (!selectedProject) { setProjectMemberList([]); return }
    const result: { member: Member; teamName: string }[] = []

    try {
      const pmResult = await window.electronAPI.getProjectMembers(selectedProject.id)
      if (pmResult.success && pmResult.data) {
        for (const pm of pmResult.data) {
          const member = pm.member || members.find(m => m.id === pm.memberId)
          if (member) result.push({ member, teamName: '-' })
        }
      }
    } catch (e) { console.error('获取项目成员失败:', e) }

    for (const member of members) {
      if (member.memberType === 'worker' && member.teamId) {
        const team = workerTeams.find((t: WorkerTeam) => t.id === member.teamId)
        if (team && team.projectId === selectedProject.id) {
          if (!result.some(r => r.member.id === member.id)) result.push({ member, teamName: team.name || '-' })
        }
      }
    }

    if (selectedProject.projectManagerId) {
      if (!result.some(r => r.member.id === selectedProject.projectManagerId)) {
        const pmMember = members.find(m => m.id === selectedProject.projectManagerId)
        if (pmMember) result.push({ member: pmMember, teamName: '-' })
      }
    }

    setProjectMemberList(result)
  }, [selectedProject, members, workerTeams])

  useEffect(() => { refreshProjectMembers() }, [refreshProjectMembers])

  // ══════════════════════════════════════════════════════
  // 考勤操作
  // ══════════════════════════════════════════════════════

  const handleGenerateAttendance = async () => {
    if (!selectedProject) return
    if (projectMemberList.length === 0) {
      showToast('该项目没有成员，请先在项目详情页→人员管理中添加工人班组或管理人员', 'warning'); return
    }
    setLoading(true)
    try {
      const result = await window.electronAPI.generateDefaultAttendances(selectedProject.id, selectedMonth, projectMemberList.map(pm => pm.member.id))
      if (result.success && result.data) { showToast(`已为 ${result.data.count} 名成员生成考勤记录`, 'success'); await loadAttendances() }
      else showToast(result.error || '生成考勤失败', 'error')
    } catch (error: any) { showToast(error?.message || '生成考勤失败', 'error') }
    finally { setLoading(false) }
  }

  const handleDeleteAttendance = async (record: AttendanceRecord) => {
    if (!confirm(`确认删除 ${record.memberName || '该成员'} 的考勤记录吗？`)) return
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
      if (result.success && result.data) { showToast(`已生成 ${result.data.length} 条工资记录`, 'success'); await loadWages(); setEditingWages(new Map()) }
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
        const member = members.find(m => m.id === w.memberId)
        let actualWage = 0
        const daysInMonth = getDaysInMonth(selectedMonth)
        if (member?.memberType === 'worker') {
          actualWage = Math.round(((w.dailyWage || 0) * (w.workDays || 0) + edit.bonus - edit.deduction) * 100) / 100
        } else {
          const baseSalary = w.baseSalary || 0; const otherAllowances = w.otherAllowances || 0
          let grossWage: number
          if (w.isFullAttendance) grossWage = baseSalary + otherAllowances
          else grossWage = (baseSalary / daysInMonth) * (w.workDays || 0) + otherAllowances
          let personalDeduction = 0
          if (!(w.companyCoversSocial ?? false)) personalDeduction += (w.socialSecurityPersonal || 0) + (w.housingFundPersonal || 0)
          actualWage = Math.round((grossWage + edit.bonus - personalDeduction - edit.deduction) * 100) / 100
        }
        return { ...w, bonus: edit.bonus, deduction: edit.deduction, actualWage, updatedAt: new Date().toISOString() }
      })
      const result = await window.electronAPI.batchSaveWages(updated)
      if (result.success) { showToast('工资表已保存', 'success'); setEditingWages(new Map()); await loadWages(); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: any) { showToast(error?.message || '保存失败', 'error') }
    finally { setLoading(false) }
  }

  // ══════════════════════════════════════════════════════
  // 考勤附件操作
  // ══════════════════════════════════════════════════════

  const handleAttendanceFileUpload = async (record: AttendanceRecord, file: File) => {
    setUploadingFileId(record.id)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const storedName = await uploadFile(FILE_CATEGORIES.ATTENDANCE_FILE.category, FILE_CATEGORIES.ATTENDANCE_FILE.subCategory, dataUrl, file.name, selectedProject?.name)
      const result = await window.electronAPI.updateAttendance({ ...record, fileUrl: storedName, fileName: file.name })
      if (result.success) { showToast('考勤附件已上传', 'success'); await loadAttendances() }
      else showToast(result.error || '上传失败', 'error')
    } catch (error: any) { showToast(error?.message || '上传失败', 'error') }
    finally { setUploadingFileId(null) }
  }

  const handleDeleteAttendanceFile = async (record: AttendanceRecord) => {
    if (!record.fileUrl) return
    try {
      await deleteUploadedFile(FILE_CATEGORIES.ATTENDANCE_FILE.category, FILE_CATEGORIES.ATTENDANCE_FILE.subCategory, record.fileUrl, selectedProject?.name)
      const result = await window.electronAPI.updateAttendance({ ...record, fileUrl: '', fileName: '' })
      if (result.success) { showToast('附件已删除', 'success'); await loadAttendances() }
      else showToast(result.error || '删除失败', 'error')
    } catch (error: any) { showToast(error?.message || '删除失败', 'error') }
  }

  const handlePreviewAttendanceFile = async (record: AttendanceRecord) => {
    if (!record.fileUrl) return
    try {
      const dataUrl = await readUploadedFile(FILE_CATEGORIES.ATTENDANCE_FILE.category, FILE_CATEGORIES.ATTENDANCE_FILE.subCategory, record.fileUrl, selectedProject?.name)
      if (!dataUrl) { showToast('无法读取文件', 'error'); return }
      const isImage = record.fileName ? /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(record.fileName) : false
      if (isImage) {
        const win = window.open('', '_blank')
        if (win) { win.document.write(`<img src="${dataUrl}" style="max-width:100%;max-height:100vh;display:block;margin:auto;" />`); win.document.title = record.fileName || '预览' }
      } else {
        const a = document.createElement('a'); a.href = dataUrl; a.download = record.fileName || '考勤附件'; a.click()
      }
    } catch (error: any) { showToast('文件读取失败', 'error') }
  }

  // ══════════════════════════════════════════════════════
  // 批量删除
  // ══════════════════════════════════════════════════════

  const handleBatchDeleteAttendances = async () => {
    if (selectedAttendanceIds.size === 0) return
    if (!confirm(`确认删除选中的 ${selectedAttendanceIds.size} 条考勤记录吗？`)) return
    try {
      const result = await window.electronAPI.batchDeleteAttendances(Array.from(selectedAttendanceIds))
      if (result.success) { showToast(`已删除 ${selectedAttendanceIds.size} 条考勤记录`, 'success'); setSelectedAttendanceIds(new Set()); await loadAttendances() }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (error: any) { showToast(error?.message || '批量删除失败', 'error') }
  }

  const handleBatchDeleteWageTable = async () => {
    if (selectedWageTableIds.size === 0) return
    if (!confirm(`确认删除选中的 ${selectedWageTableIds.size} 条工资记录吗？`)) return
    try {
      const result = await window.electronAPI.batchDeleteWages(Array.from(selectedWageTableIds))
      if (result.success) { showToast(`已删除 ${selectedWageTableIds.size} 条工资记录`, 'success'); setSelectedWageTableIds(new Set()); await loadWages() }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (error: any) { showToast(error?.message || '批量删除失败', 'error') }
  }

  const handleBatchDeleteWages = async () => {
    if (selectedWageIds.size === 0) return
    if (!confirm(`确认删除选中的 ${selectedWageIds.size} 条工资记录吗？`)) return
    try {
      const result = await window.electronAPI.batchDeleteWages(Array.from(selectedWageIds))
      if (result.success) { showToast(`已删除 ${selectedWageIds.size} 条工资记录`, 'success'); setSelectedWageIds(new Set()); await loadAllRecords() }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (error: any) { showToast(error?.message || '批量删除失败', 'error') }
  }

  // ── 工资发放编辑 ──
  const handlePaymentChange = (recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => {
    setPaymentEdits(prev => {
      const next = new Map(prev)
      const record = allWageRecords.find(w => w.id === recordId)
      const current = next.get(recordId) || { paidAmount: record?.paidAmount ?? record?.actualWage ?? 0, paidDate: record?.paidDate ?? '' }
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
        return { ...w, paidAmount: edit.paidAmount, paidDate: edit.paidDate, updatedAt: new Date().toISOString() }
      })
      const result = await window.electronAPI.batchSaveWages(updated)
      if (result.success) { showToast('发放记录已保存', 'success'); setPaymentEdits(new Map()); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: any) { showToast(error?.message || '保存失败', 'error') }
    finally { setLoading(false) }
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
        members={members} workerTeams={workerTeams}
        attendances={attendances} attendancesCount={projectMemberList.length}
        attendanceDetailRecord={attendanceDetailRecord}
        setAttendanceDetailRecord={setAttendanceDetailRecord}
        onGenerateAttendance={handleGenerateAttendance}
        onDeleteAttendance={handleDeleteAttendance}
        uploadingFileId={uploadingFileId} setUploadingFileId={setUploadingFileId}
        onFileUpload={handleAttendanceFileUpload} onFileDelete={handleDeleteAttendanceFile}
        onFilePreview={handlePreviewAttendanceFile}
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
        onBatchDeleteWages={handleBatchDeleteWages}
        selectedWageIds={selectedWageIds}
        toggleWageSelect={toggleWageSelect} toggleAllWages={toggleAllWages}
        filterMemberName={filterMemberName} setFilterMemberName={setFilterMemberName}
        loading={loading}
        onBack={() => { setView('dashboard'); setAttendanceDetailRecord(null); loadStats() }}
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
      <WageStatsTab wageStats={wageStats} />

      {/* 项目工资列表 */}
      <WageProjectList
        allWageRecords={allWageRecords}
        projects={projects}
        selectedMonth={selectedMonth}
        onProjectClick={handleProjectClick}
      />
    </div>
  )

}
