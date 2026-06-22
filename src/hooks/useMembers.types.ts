import type { Member, MemberType, WorkerType, WorkerStatus } from '@/types'
import type { Result, VoidResult } from '@/types'

// 成员筛选条件
export interface MemberFilters {
  type?: MemberType
  workerType?: WorkerType
  status?: WorkerStatus
  projectId?: number
  teamId?: number
  searchTerm?: string
}

// 创建成员 DTO
export type CreateMemberDTO = Partial<Omit<Member, 'id' | 'createdAt'>>

// 更新成员 DTO
export type UpdateMemberDTO = Partial<Omit<Member, 'createdAt'>>

// useMembers 返回类型
export interface UseMembersReturn {
  // 数据状态
  data: Member[]
  loading: boolean
  error: string | null
  selectedItem: Member | null

  // 操作方法
  loadData: () => Promise<void>
  create: (data: CreateMemberDTO) => Promise<Result<{ id: number }>>
  update: (member: Member) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>

  // 辅助方法
  setSelectedItem: (item: Member | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}