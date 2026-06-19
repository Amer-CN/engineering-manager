import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function usePartners() {
  return useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getPartners()
      if (!res.success) throw new Error(res.error || '获取合作伙伴失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
