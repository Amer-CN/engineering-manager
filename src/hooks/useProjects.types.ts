import type { Project } from '@/types'

export interface ProjectFilters {
  status?: Project['status']
  searchTerm?: string
  managerId?: number
}

export type CreateProjectDTO = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>

export type UpdateProjectDTO = Partial<Omit<Project, 'createdAt'>>

export interface UseProjectsReturn {
  data: Project[]
  loading: boolean
  error: string | null
  selectedItem: Project | null

  loadData: () => Promise<void>
  create: (data: CreateProjectDTO) => Promise<import('@/types').Result<{ id: number }>>
  update: (project: Project) => Promise<import('@/types').VoidResult>
  delete: (id: number) => Promise<import('@/types').VoidResult>

  setSelectedItem: (item: Project | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}
