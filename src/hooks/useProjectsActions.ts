import { useCallback } from 'react'
import type { Project } from '@/types'
import { handleError, Result, VoidResult } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { CreateProjectDTO } from './useProjects.types'

interface UseProjectsActionsDeps {
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  loadProjects: () => Promise<void>
  selectedProject: Project | null
  setSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>
}

export function useProjectsActions(deps: UseProjectsActionsDeps) {
  const { setError, setProjects, loadProjects, selectedProject, setSelectedProject } = deps

  const create = useCallback(async (data: CreateProjectDTO): Promise<Result<{ id: number }>> => {
    setError(null)

    try {
      const result = await (await getAPI()).createProject(data as Project)

      if (result.success) {
        await loadProjects()
        return { success: true, data: { id: result.data?.id || 0 } }
      }

      const errorMsg = result.error || '创建项目失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadProjects, setError])

  const update = useCallback(async (project: Project): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).updateProject(project)

      if (result.success) {
        await loadProjects()
        if (selectedProject?.id === project.id) {
          setSelectedProject(project)
        }
        return { success: true }
      }

      const errorMsg = result.error || '更新项目失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadProjects, selectedProject, setSelectedProject, setError])

  const deleteProject = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).deleteProject(id)

      if (result.success) {
        setProjects(prev => prev.filter(p => p.id !== id))
        if (selectedProject?.id === id) {
          setSelectedProject(null)
        }
        return { success: true }
      }

      const errorMsg = result.error || '删除项目失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedProject, setProjects, setSelectedProject, setError])

  return { create, update, deleteProject }
}
