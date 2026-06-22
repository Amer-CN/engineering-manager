import { useCallback } from 'react'
import type { Member } from '@/types'
import { handleError } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { MemberFilters } from './useMembers.types'

interface UseMembersLoadersDeps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
}

export function useMembersLoaders(deps: UseMembersLoadersDeps, filters?: MemberFilters) {
  const { setLoading, setError, setMembers } = deps

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await (await getAPI()).getMembers()

      if (result.success && result.data) {
        // 应用筛选条件
        let filteredData = result.data as Member[]

        if (filters?.type) {
          filteredData = filteredData.filter(m => m.memberType === filters.type)
        }

        if (filters?.workerType) {
          filteredData = filteredData.filter(m => m.workerType === filters.workerType)
        }

        if (filters?.status) {
          filteredData = filteredData.filter(m => m.status === filters.status)
        }

        if (filters?.projectId) {
          filteredData = filteredData.filter(m => m.projectId === filters.projectId)
        }

        if (filters?.teamId) {
          filteredData = filteredData.filter(m => m.teamId === filters.teamId)
        }

        if (filters?.searchTerm) {
          const term = filters.searchTerm.toLowerCase()
          filteredData = filteredData.filter(m =>
            m.name.toLowerCase().includes(term) ||
            m.phone?.toLowerCase().includes(term) ||
            m.idCard?.includes(term)
          )
        }

        setMembers(filteredData)
      } else {
        setError(result.error || '加载人员列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [
    filters?.type,
    filters?.workerType,
    filters?.status,
    filters?.projectId,
    filters?.teamId,
    filters?.searchTerm,
    setLoading,
    setError,
    setMembers,
  ])

  return { loadMembers }
}