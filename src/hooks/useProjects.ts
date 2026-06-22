import { useState, useCallback, useEffect } from 'react'
import type { Project } from '@/types'
import type { ProjectFilters, CreateProjectDTO, UpdateProjectDTO, UseProjectsReturn } from './useProjects.types'
import { useProjectsLoaders } from './useProjectsLoaders'
import { useProjectsActions } from './useProjectsActions'

export type { ProjectFilters, CreateProjectDTO, UpdateProjectDTO, UseProjectsReturn }

export function useProjects(filters?: ProjectFilters): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const { loadProjects } = useProjectsLoaders({
    setLoading,
    setError,
    setProjects,
  }, filters)

  const { create, update, deleteProject } = useProjectsActions({
    setError,
    setProjects,
    loadProjects,
    selectedProject,
    setSelectedProject,
  })

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadProjects()
  }, [loadProjects])

  const setSelectedItem = useCallback((item: Project | null) => {
    setSelectedProject(item)
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    data: projects,
    loading,
    error,
    selectedItem: selectedProject,
    loadData: loadProjects,
    create,
    update,
    delete: deleteProject,
    setSelectedItem,
    clearError,
    refresh,
  }
}
