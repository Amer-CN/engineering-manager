import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useWorkers() {
  return useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getWorkers()
      if (!res.success) throw new Error(res.error || '获取工人失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
