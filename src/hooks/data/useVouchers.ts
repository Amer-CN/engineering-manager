import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

/** 凭证列表（T6a/T6b）：period 可选（YYYYMM）；不传返回全部可见凭证。 */
export function useVouchers(period?: string) {
  return useQuery({
    queryKey: ['vouchers', period ?? 'all'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getVouchers(period)
      if (!res.success) throw new Error(res.error || '获取凭证失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

/** 过账（T6b）：draft → posted；失败时抛出后端 error（如「仅草稿凭证可过账」）。 */
export function usePostVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const api = await getAPI()
      const res = await api.postVoucher(id)
      if (!res.success) throw new Error(res.error || '过账失败')
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vouchers'] })
    },
  })
}

/** 删除凭证草稿（仅 draft；posted 由后端 400 拒绝）。 */
export function useDeleteVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const api = await getAPI()
      const res = await api.deleteVoucher(id)
      if (!res.success) throw new Error(res.error || '删除凭证失败')
      return id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vouchers'] })
    },
  })
}