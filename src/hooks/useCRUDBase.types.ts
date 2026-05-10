import type { Result, VoidResult } from '@/types'

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface CRUDAPI<T, CreateDTO = Partial<T>, UpdateDTO = T> {
  getAll: () => Promise<APIResponse<T[]>>
  create?: (data: CreateDTO) => Promise<APIResponse<{ id: number }>>
  update?: (data: UpdateDTO) => Promise<APIResponse<void>>
  delete?: (id: number) => Promise<APIResponse<void>>
}

export interface CRUDState<T> {
  data: T[]
  loading: boolean
  error: string | null
  selectedItem: T | null
}

export interface UseCRUDBaseOptions<T, CreateDTO, UpdateDTO> {
  api: CRUDAPI<T, CreateDTO, UpdateDTO>
  initialData?: T[]
  autoLoad?: boolean
  errorPrefix?: string
  onLoaded?: (data: T[]) => void
}

export interface UseCRUDBaseReturn<T, CreateDTO, UpdateDTO> {
  data: T[]
  loading: boolean
  error: string | null
  selectedItem: T | null
  loadData: () => Promise<T[]>
  create: (data: CreateDTO) => Promise<Result<{ id: number }>>
  update: (item: UpdateDTO) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  setSelectedItem: (item: T | null) => void
  clearError: () => void
  refresh: () => Promise<void>
  setData: (data: T[]) => void
  updateData: (updater: (prev: T[]) => T[]) => void
}
