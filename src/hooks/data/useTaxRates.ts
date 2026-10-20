import { useQuery } from '@tanstack/react-query'
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
