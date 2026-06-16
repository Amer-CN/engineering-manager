import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getTemplates()
      if (!res.success) throw new Error(res.error || '获取模板失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
