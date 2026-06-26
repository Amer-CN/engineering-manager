import { useCallback } from 'react'
import type { Project } from '@/types'
import { handleError } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { ProjectFilters } from './useProjects.types'

interface UseProjectsLoadersDeps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
}

export function useProjectsLoaders(deps: UseProjectsLoadersDeps, filters?: ProjectFilters) {
  const { setLoading, setError, setProjects } = deps

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await (await getAPI()).getProjects()

      if (result.success && result.data) {
        let filteredData: Project[] = result.data

        if (filters?.status) {
          filteredData = filteredData.filter(p => p.status === filters.status)
        }

        if (filters?.searchTerm) {
          const term = filters.searchTerm.toLowerCase()
          filteredData = filteredData.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term)
          )
        }

        if (filters?.managerId) {
          filteredData = filteredData.filter(p => p.projectManagerId === filters.managerId)
        }

        setProjects(filteredData)
      } else {
        setError(result.error || '加载项目列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [filters?.status, filters?.searchTerm, filters?.managerId, setLoading, setError, setProjects])

  return { loadProjects }
}
