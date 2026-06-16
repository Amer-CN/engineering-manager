import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useSettlements() {
  return useQuery({
    queryKey: ['settlements'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getSettlements()
      if (!res.success) throw new Error(res.error || '获取结算失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
