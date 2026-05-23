import { useState, useEffect, useCallback } from 'react'
import type { Member, WorkerTeam } from '../../../../types/electron'
import { useToastStore } from '@/store/toastStore'

interface UseLaborDataOptions {
  refresh?: () => void
}

interface UseLaborDataReturn {
  members: Member[]
  projects: any[]
  workerTeams: WorkerTeam[]
  loading: boolean
  loadData: (silent?: boolean) => Promise<void>
}

/**
 * 工人管理数据加载 Hook
 * 负责加载工人、项目、班组数据
 */
export function useLaborData({ refresh }: UseLaborDataOptions = {}): UseLaborDataReturn {
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])
  const [loading, setLoading] = useState(true)
  const showToast = useToastStore(state => state.showToast)

  const loadData = useCallback(async (silent?: boolean) => {
    try {
      if (!silent) setLoading(true)
      const [projectsRes, teamsRes, globalWorkersRes] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getWorkerTeams(),
        window.electronAPI.getWorkers()
      ])

      const projectsData = projectsRes.success ? (projectsRes.data || []) : []
      const teamsData = teamsRes.success ? (teamsRes.data || []) : []
      const globalWorkers = globalWorkersRes.success ? (globalWorkersRes.data || []) : []

      // Load all projectWorkers across all projects
      const allWorkers: any[] = []
      const assignedWorkerIds = new Set<number>()

      for (const project of projectsData) {
        try {
          const pwRes = await window.electronAPI.getProjectWorkers(project.id)
          if (pwRes.success && pwRes.data) {
            for (const pw of pwRes.data) {
              assignedWorkerIds.add(pw.workerId)
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
                bankLineNo: pw.worker?.bankLineNo,
                memberType: 'worker' as const,
                teamId: pw.teamId,
                teamName: pw.teamName,
                projectId: pw.projectId,
                projectName: pw.projectName,
                dailyWage: pw.dailyWage || pw.worker?.dailyWage || 0,
                workerType: pw.worker?.workerType || pw.workerType,
                entryDate: pw.entryDate,
                status: pw.status || 'active',
                createdAt: pw.createdAt,
              })
            }
          }
        } catch (_) { /* skip projects that fail to load */ }
      }

      // Add global pool workers not yet assigned to any project
      for (const w of globalWorkers) {
        if (!assignedWorkerIds.has(w.id)) {
          allWorkers.push({
            id: w.id,
            workerId: w.id,
            name: w.name,
            idCard: w.idCard,
            gender: w.gender,
            phone: w.phone,
            birthDate: w.birthDate,
            ethnicity: w.ethnicity,
            address: w.address,
            bankAccount: w.bankAccount,
            bankName: w.bankName,
            bankLineNo: w.bankLineNo,
            memberType: 'worker' as const,
            teamId: undefined,
            teamName: undefined,
            projectId: undefined,
            projectName: undefined,
            dailyWage: w.dailyWage,
            workerType: w.workerType,
            entryDate: undefined,
            status: 'active' as const,
            createdAt: w.createdAt,
          })
        }
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
    } catch (error) {
      console.error('加载数据失败:', error)
      showToast('加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadData()
  }, [loadData, refresh])

  return { members, projects, workerTeams, loading, loadData }
}
