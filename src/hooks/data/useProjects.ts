import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getProjects()
      if (!res.success) throw new Error(res.error || '获取项目失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
