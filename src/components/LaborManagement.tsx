// LaborManagement.tsx - 工人管理页面

import React, { useState, useEffect, useRef, Suspense } from 'react'
import type { Member, WorkerTeam, WorkerStatus } from '../types/electron'
import { useToastContext } from '../hooks/useToast'
import { processFileFields, FILE_CATEGORIES } from '../services/fileService'

import { MemberForm, WorkerFormData, defaultWorkerFormData, memberToWorkerForm } from './features/members'
import { useMemberOperations } from './features/members/useMemberOperations'
import { useTeamOps } from './features/members/useTeamOps'
import { useWorkerImport } from './features/members/useWorkerImport'

const WorkerSection = React.lazy(() => import('./features/members/WorkerSection'))
const WorkerImportModal = React.lazy(() => import('./features/members/WorkerImportModal').then(m => ({ default: m.WorkerImportModal })))
const WorkerPickerModal = React.lazy(() => import('./features/members/WorkerPickerModal').then(m => ({ default: m.WorkerPickerModal })))
const WageManagement = React.lazy(() => import('./WageManagement'))
const TeamWorkerModal = React.lazy(() => import('./features/members/TeamWorkerModal'))
const WorkerPoolForm = React.lazy(() => import('./features/members/WorkerPoolForm'))

interface LaborManagementProps {
  refresh?: () => void
}

const LaborManagement: React.FC<LaborManagementProps> = ({ refresh }) => {
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])
  const [loading, setLoading] = useState(true)

  const [showWorkerModal, setShowWorkerModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Member | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const [showWorkerPicker, setShowWorkerPicker] = useState(false)
  const [pickerProjectId, setPickerProjectId] = useState<number>(0)
  const [pickerExistingWorkerIds, setPickerExistingWorkerIds] = useState<Set<number>>(new Set())
  const [pickerDefaultTeamId, setPickerDefaultTeamId] = useState<number | undefined>(undefined)

  // TeamWorkerModal state
  const [showTeamWorkerModal, setShowTeamWorkerModal] = useState(false)
  const [teamWorkerTeamId, setTeamWorkerTeamId] = useState<number>(0)
  const [teamWorkerTeamName, setTeamWorkerTeamName] = useState('')
  const [teamWorkerProjectId, setTeamWorkerProjectId] = useState<number>(0)

  // WorkerPoolForm state
  const [showPoolForm, setShowPoolForm] = useState(false)
  const [editingPoolWorker, setEditingPoolWorker] = useState<any | null>(null)

  const [filterProject, setFilterProject] = useState<number | null>(null)
  const [filterTeam, setFilterTeam] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<WorkerStatus | 'all'>('all')

  const { showToast } = useToastContext()
  const originalMemberFileRef = useRef<Record<number, Record<string, string>>>({})
  const [workerFormData, setWorkerFormData] = useState<WorkerFormData>(defaultWorkerFormData)
  const [dragOverField, setDragOverField] = useState<string | null>(null)
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const existingIdCards = new Set(members.filter(m => m.memberType === 'worker' && m.idCard).map(m => m.idCard!))
  const { importState, progress, result, phase, error: importError, parseFile, switchSheet, setHeaderRow, setMapping, getConfidence, executeImport, saveCurrentMappingAsPreset, reset: resetImport } = useWorkerImport(workerTeams, existingIdCards)

  const resetWorkerForm = () => { setWorkerFormData(defaultWorkerFormData); setEditingWorker(null) }

  const processUploadFile = async (file: File, field: string, setFormData: React.Dispatch<React.SetStateAction<any>>) => {
    const reader = new FileReader()
    reader.onload = (e) => { setFormData(prev => ({ ...prev, [field]: e.target?.result as string, [`${field}Type`]: file.type === 'application/pdf' ? 'pdf' : 'image' })) }
    reader.readAsDataURL(file)
  }

  const handleBatchAddWorkers = async (entries: Partial<import('../types/electron').ProjectWorker>[]) => {
    try {
      const result = await window.electronAPI.batchCreateProjectWorkers(entries as any[])
      if (result.success) { showToast(`成功添加 ${entries.length} 名工人`, 'success'); loadData() }
      else { showToast(result.error || '添加失败', 'error') }
    } catch (err: any) { showToast(err.message || '添加失败', 'error') }
  }

  const handleUpdateProjectWorker = async (pwId: number, data: Record<string, any>) => {
    try {
      const result = await window.electronAPI.updateProjectWorker({ id: pwId, ...data } as any)
      if (result.success) { showToast('更新成功', 'success'); loadData() }
      else { showToast(result.error || '更新失败', 'error') }
    } catch (err: any) { showToast(err.message || '更新失败', 'error') }
  }

  const handleDeleteProjectWorker = async (pwId: number) => {
    try {
      const result = await window.electronAPI.deleteProjectWorker(pwId)
      if (result.success) { showToast('已移除', 'success'); loadData() }
      else { showToast(result.error || '移除失败', 'error') }
    } catch (err: any) { showToast(err.message || '移除失败', 'error') }
  }

  const handleTeamWorkerTransfer = async (pwId: number, toTeamId: number) => {
    try {
      const result = await window.electronAPI.updateProjectWorker({ id: pwId, teamId: toTeamId } as any)
      if (result.success) { showToast('调组成功', 'success'); loadData() }
      else { showToast(result.error || '调组失败', 'error') }
    } catch (err: any) { showToast(err.message || '调组失败', 'error') }
  }

  const handleTeamAddWorkers = (teamId: number, projectId: number) => {
    const existingIds = new Set(members.filter((w: any) => w.projectId === projectId).map((w: any) => w.workerId))
    setPickerProjectId(projectId)
    setPickerExistingWorkerIds(existingIds)
    setPickerDefaultTeamId(teamId)
    setShowWorkerPicker(true)
  }

  const handleSubmitPoolWorker = async (formData: import('./features/members/WorkerPoolForm').WorkerPoolFormData) => {
    const data = {
      name: formData.name, phone: formData.phone, idCard: formData.idCard,
      gender: formData.gender || undefined, ethnicity: formData.ethnicity || undefined,
      birthDate: formData.birthDate || undefined, address: formData.idCardAddress || undefined,
      bankAccount: formData.bankAccount || undefined, bankName: formData.bankName || undefined
    }
    try {
      if (editingPoolWorker) {
        const result = await window.electronAPI.updateWorker({ id: editingPoolWorker.workerId || editingPoolWorker.id, ...data } as any)
        if (result.success) { showToast('工人信息已更新', 'success'); loadData() }
        else { showToast(result.error || '更新失败', 'error'); return }
      } else {
        const result = await window.electronAPI.createWorker(data as any)
        if (result.success) { showToast('工人已添加', 'success'); loadData() }
        else { showToast(result.error || '添加失败', 'error'); return }
      }
      setShowPoolForm(false); setEditingPoolWorker(null)
    } catch (err: any) { showToast(err.message || '操作失败', 'error') }
  }

  const handleDeletePoolWorker = async (workerId: number) => {
    if (!confirm('确定删除该工人？将从所有项目中移除。')) return
    try {
      const result = await window.electronAPI.deleteWorker(workerId)
      if (result.success) { showToast('工人已删除', 'success'); loadData() }
      else { showToast(result.error || '删除失败', 'error') }
    } catch (err: any) { showToast(err.message || '删除失败', 'error') }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [projectsRes, teamsRes] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getWorkerTeams()
      ])
      const projectsData = projectsRes.success ? (projectsRes.data || []) : []
      const teamsData = teamsRes.success ? (teamsRes.data || []) : []

      // Load all projectWorkers across all projects
      const allWorkers: any[] = []
      for (const project of projectsData) {
        try {
          const pwRes = await window.electronAPI.getProjectWorkers(project.id)
          if (pwRes.success && pwRes.data) {
            for (const pw of pwRes.data) {
              allWorkers.push({
                id: pw.id,
                workerId: pw.workerId,
                name: pw.workerName,
                idCard: pw.workerIdCard,
                gender: pw.worker?.gender,
                phone: pw.worker?.phone,
                birthDate: pw.worker?.birthDate,
                ethnicity: pw.worker?.ethnicity,
                address: pw.worker?.address,
                bankAccount: pw.worker?.bankAccount,
                bankName: pw.worker?.bankName,
                memberType: 'worker' as const,
                teamId: pw.teamId,
                teamName: pw.teamName,
                projectId: pw.projectId,
                projectName: pw.projectName,
                dailyWage: pw.dailyWage,
                workerType: pw.workerType,
                entryDate: pw.entryDate,
                status: pw.status || 'active',
                createdAt: pw.createdAt,
              })
            }
          }
        } catch (_) { /* skip projects that fail to load */ }
      }

      // Enrich teams with projectName and leaderName
      const enrichedTeams = teamsData.map((t: WorkerTeam) => {
        const project = projectsData.find((p: any) => p.id === t.projectId)
        const leader = allWorkers.find((w: any) => w.workerId === t.leaderId || w.id === t.leaderId)
        return { ...t, projectName: project?.name, leaderName: leader?.name }
      })

      setMembers(allWorkers)
      setProjects(projectsData)
      setWorkerTeams(enrichedTeams)
    } catch (error) { console.error('加载数据失败:', error); showToast('加载数据失败', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [refresh])

  const { handleDeleteMember, handleFileModified, handleSubmitWorker, handleWorkerTransfer, handleWorkerLeave, handleWorkerReEntry } = useMemberOperations({
    editingStaff: null, editingWorker, projects, originalMemberFileRef, loadData,
    showToast: (msg: string, type: any) => showToast(msg, type),
    onSuccess: () => { setShowWorkerModal(false); resetWorkerForm() }
  })

  const { handleCreateTeam, handleUpdateTeam, handleDeleteTeam } = useTeamOps({ workerTeams, loadData, showToast: (msg: string, type: any) => showToast(msg, type) })

  const handleMemberClick = (member: Member) => { setSelectedMember(member); setShowDetailModal(true) }

  const handleEditWorker = (worker: Member) => {
    setEditingWorker(worker)
    const formData = memberToWorkerForm(worker)
    originalMemberFileRef.current[worker.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile', 'safetyTrainingFile', 'healthReportFile', 'specialCertificateFile']) {
      const val = (formData as any)[key]
      if (val && !val.startsWith('data:')) originalMemberFileRef.current[worker.id][key] = val
    }
    setShowWorkerModal(true)
  }

  const workerMembers = members.filter(m => m.memberType === 'worker')
  const filteredWorkers = workerMembers.filter((w: any) => {
    if (filterProject && w.projectId !== filterProject) return false
    if (filterTeam && w.teamId !== filterTeam) return false
    const status = w.status || 'active'
    if (filterStatus !== 'all' && status !== filterStatus) return false
    return true
  })

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" /></div>
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">工人管理</h1>
          <p className="text-slate-500 mt-1">管理农民工信息与班组</p>
        </div>
      </div>

      <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-orange-500" /></div>}>
        <WorkerSection
          members={filteredWorkers}
          projects={projects.map((p: any) => ({ id: p.id, name: p.name }))}
          workerTeams={workerTeams}
          loading={false}
          onRefresh={loadData}
          onAddWorker={() => { setEditingPoolWorker(null); setShowPoolForm(true) }}
          onEditWorker={(worker: any) => { setEditingPoolWorker(worker); setShowPoolForm(true) }}
          onDeleteWorker={handleDeletePoolWorker}
          onAddTeam={handleCreateTeam}
          onEditTeam={handleUpdateTeam}
          onDeleteTeam={handleDeleteTeam}
          onTransfer={(worker: any, toTeamId: number, toProjectId: number, transferDate: string, reason: string) => handleWorkerTransfer(worker, toTeamId, toProjectId, transferDate, reason, workerTeams)}
          onLeave={(worker: any, actualLeaveDate: string, remarks: string) => handleWorkerLeave(worker, actualLeaveDate, remarks)}
          onReEntry={handleWorkerReEntry as any}
          onImportClick={() => fileInputRef.current?.click()}
          onFileDrop={(file: File) => parseFile(file)}
          onAddFromPool={(projectId: number, existingIds: Set<number>) => {
            setPickerProjectId(projectId)
            setPickerExistingWorkerIds(existingIds)
            setPickerDefaultTeamId(undefined)
            setShowWorkerPicker(true)
          }}
          onManageWorkers={(teamId: number, teamName: string, projectId: number) => {
            setTeamWorkerTeamId(teamId)
            setTeamWorkerTeamName(teamName)
            setTeamWorkerProjectId(projectId)
            setShowTeamWorkerModal(true)
          }}
          onUpdateWorker={handleUpdateProjectWorker}
          onRemoveFromTeam={handleDeleteProjectWorker}
          wageContent={
            <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-orange-500" /></div>}>
              <WageManagement />
            </Suspense>
          }
        />
      </Suspense>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = '' }} />

      <Suspense fallback={null}>
        <WorkerImportModal show={phase !== 'idle' || !!importError} importState={importState} progress={progress} result={result}
          phase={phase} error={importError} workerTeams={workerTeams} onClose={resetImport}
          onSetHeaderRow={setHeaderRow} onSwitchSheet={switchSheet} onSetMapping={setMapping}
          onGetConfidence={getConfidence}
          onExecuteImport={() => executeImport(() => Promise.resolve({ success: true, data: { id: 0 } }), () => loadData())}
          onSavePreset={saveCurrentMappingAsPreset} />
      </Suspense>

      <Suspense fallback={null}>
        <WorkerPickerModal show={showWorkerPicker} projectId={pickerProjectId} workerTeams={workerTeams}
          existingWorkerIds={pickerExistingWorkerIds} defaultTeamId={pickerDefaultTeamId}
          onClose={() => { setShowWorkerPicker(false); setPickerDefaultTeamId(undefined) }}
          onConfirm={handleBatchAddWorkers} />
      </Suspense>

      <Suspense fallback={null}>
        <TeamWorkerModal show={showTeamWorkerModal} teamId={teamWorkerTeamId}
          teamName={teamWorkerTeamName} projectId={teamWorkerProjectId}
          members={members} workerTeams={workerTeams}
          onClose={() => setShowTeamWorkerModal(false)}
          onUpdateWorker={handleUpdateProjectWorker}
          onRemoveWorker={handleDeleteProjectWorker}
          onTransferWorker={handleTeamWorkerTransfer}
          onAddWorkers={handleTeamAddWorkers} />
      </Suspense>

      <Suspense fallback={null}>
        <WorkerPoolForm visible={showPoolForm} editing={editingPoolWorker}
          onClose={() => { setShowPoolForm(false); setEditingPoolWorker(null) }}
          onSubmit={handleSubmitPoolWorker} />
      </Suspense>

      {showWorkerModal && (
        <MemberForm type="worker" editingMember={editingWorker} projects={projects} workerTeams={workerTeams}
          visible={showWorkerModal} onClose={() => { setShowWorkerModal(false); resetWorkerForm() }}
          onSubmit={handleSubmitWorker} onFileModified={handleFileModified} />
      )}

      {showDetailModal && selectedMember && (
        <MemberForm type="worker" editingMember={selectedMember} projects={projects} workerTeams={workerTeams}
          visible={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedMember(null) }}
          onSubmit={handleSubmitWorker} onFileModified={handleFileModified} />
      )}
    </div>
  )
}

export default LaborManagement
