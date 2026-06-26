import { useCallback } from 'react'
import type { Member, Project, WorkerTeam } from '../types/electron'
import { getAPI } from '../services/api-adapter'
import { useToastStore } from '../store/toastStore'

interface UseMembersLoadDataProps {
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  setWorkerTeams: React.Dispatch<React.SetStateAction<WorkerTeam[]>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export function useMembersLoadData({
  setMembers, setProjects, setWorkerTeams, setLoading,
}: UseMembersLoadDataProps) {
  const showToast = useToastStore(state => state.showToast)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const api = await getAPI()
      const [membersRes, projectsRes, teamsRes] = await Promise.allSettled([
        api.getMembers(),
        api.getProjects(),
        api.getWorkerTeams(),
      ])
      const get = <T,>(r: PromiseSettledResult<unknown>): T[] => {
        if (r.status !== 'fulfilled') return [];
        const val = r.value as { success?: boolean; data?: unknown };
        return (val?.success && Array.isArray(val.data) ? val.data : []) as T[];
      }
      const membersData = get<Member>(membersRes)
      const projectsData = get<Project>(projectsRes)
      const teamsData = get<WorkerTeam>(teamsRes)

      const membersWithRelations = membersData.map((m: Member) => {
        if (m.memberType === 'worker' && m.teamId) {
          const team = teamsData.find((t: WorkerTeam) => t.id === m.teamId)
          return { ...m, teamName: team?.name, projectId: team?.projectId, projectName: team?.projectName }
        }
        return m
      })
      setMembers(membersWithRelations)
      setProjects(projectsData)

      const teamsWithRelations = teamsData.map((t: WorkerTeam) => {
        const project = projectsData.find((p: Project) => p.id === t.projectId)
        const leader = membersData.find((m: Member) => m.id === t.leaderId)
        return { ...t, projectName: project?.name, leaderName: leader?.name }
      })
      setWorkerTeams(teamsWithRelations)
    } catch (error) {
      console.error('加载数据失败:', error)
      showToast('加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast, setMembers, setProjects, setWorkerTeams, setLoading])

  return { loadData }
}
