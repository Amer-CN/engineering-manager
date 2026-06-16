import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useCostLedger(projectId?: number) {
  return useQuery({
    queryKey: ['costLedger', projectId],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getCostLedger(projectId)
      if (!res.success) throw new Error(res.error || '获取成本台账失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
