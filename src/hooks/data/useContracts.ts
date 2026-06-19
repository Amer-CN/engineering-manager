import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getContracts()
      if (!res.success) throw new Error(res.error || '获取合同失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
