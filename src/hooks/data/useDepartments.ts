import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getDepartments()
      if (!res.success) throw new Error(res.error || '获取部门失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
