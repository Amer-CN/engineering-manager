import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'
import type { Member } from '../../types/electron'

const MEMBERS_KEY = ['members'] as const

export function useMembers() {
  return useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getMembers()
      if (!res.success) throw new Error(res.error || '获取成员失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

export function useCreateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (member: Partial<Member>) => {
      const api = await getAPI()
      const res = await api.createMember(member)
      if (!res.success) throw new Error(res.error || '创建成员失败')
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (member: Partial<Member>) => {
      const api = await getAPI()
      const res = await api.updateMember(member)
      if (!res.success) throw new Error(res.error || '更新成员失败')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const api = await getAPI()
      const res = await api.deleteMember(id)
      if (!res.success) throw new Error(res.error || '删除成员失败')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}
