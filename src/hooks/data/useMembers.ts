import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getMembers()
      if (!res.success) throw new Error(res.error || '获取成员失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
