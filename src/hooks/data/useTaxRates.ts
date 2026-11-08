import { useQuery, useMutation } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

/**
 * 税率主数据（P1 / T1）。
 *
 * 服务端真源：GET /api/tax-rates（063 迁移的 [tax_rates] + TaxEndpoints.cs）。
 * 数值集合与 constants.ts 的 taxRateOptions 一致（0/0.01/0.03/0.06/0.09/0.13）。
 *
 * 失败时 throw：调用点（InvoiceFormFields）据此回落 taxRateOptions 兜底，
 * 不允许把失败静默当成「没有税率」。
 */
export function useTaxRates() {
  return useQuery({
    queryKey: ['tax-rates'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getTaxRates()
      if (!res.success) throw new Error(res.error || '获取税率主数据失败')
      return res.data ?? []
    },
    staleTime: 30_000,
  })
}

/** 默认税率解析入参（GET query；undefined/null 维度由 api-client 自动过滤）。 */
export interface ResolveTaxRateParams {
  date?: string
  businessType?: string
  partnerTaxType?: string
  itemCategory?: string
}

/**
 * 默认税率解析（P1 / T1b）：GET /api/tax-rates/resolve。
 *
 * 用 useMutation 而非 useQuery —— 解析必须**只能由用户点击**触发，不缓存、不自动跑、
 * 不在依赖变化时重取（财税零容错：禁止任何静默改税率的路径）。
 * 失败时 throw：调用点据此提示「取默认税率失败」，不得静默当成功。
 */
export function useResolveTaxRate() {
  return useMutation({
    mutationFn: async (params: ResolveTaxRateParams) => {
      const api = await getAPI()
      const res = await api.resolveTaxRate(params)
      if (!res.success) throw new Error(res.error || '取默认税率失败')
      return res.data ?? { rateId: null, code: null, rate: null, matchedBy: 'none' as const }
    },
  })
}
