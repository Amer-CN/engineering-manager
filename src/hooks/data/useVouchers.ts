import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'
import type { OpeningBalanceRow } from '@/types/electron'

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

/** 凭证期间汇总（T6f）：张数/草稿/已过账/借贷合计（元）+ 是否平衡。 */
export function useVoucherSummary(period?: string) {
  return useQuery({
    queryKey: ['vouchers', 'summary', period ?? 'all'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getVoucherSummary(period)
      if (!res.success) throw new Error(res.error || '获取凭证汇总失败')
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

/** 期初余额（T7b）：period 为 null 时不查询。 */
export function useOpeningBalances(period: string | null) {
  return useQuery({
    queryKey: ['opening-balances', period],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getOpeningBalances(period!)
      if (!res.success) throw new Error(res.error || '获取期初余额失败')
      return res.data
    },
    enabled: !!period,
    staleTime: 30_000,
  })
}

/** 保存期初余额（整期替换；借贷不平衡会由后端 400）。 */
export function useSaveOpeningBalances() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ period, rows }: { period: string; rows: OpeningBalanceRow[] }) => {
      const api = await getAPI()
      const res = await api.saveOpeningBalances(period, rows)
      if (!res.success) throw new Error(res.error || '保存期初余额失败')
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['opening-balances'] })
    },
  })
}

/** 反过账（T7a）：posted → draft，原因必填；成功后失效缓存。 */
export function useUnpostVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const api = await getAPI()
      const res = await api.unpostVoucher(id, reason)
      if (!res.success) throw new Error(res.error || '反过账失败')
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