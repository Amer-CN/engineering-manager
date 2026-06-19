import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useInvoices(projectId?: number) {
  return useQuery({
    queryKey: ['invoices', projectId],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getInvoices(projectId)
      if (!res.success) throw new Error(res.error || '获取发票失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
