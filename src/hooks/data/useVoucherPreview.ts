import { useMutation } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'
import type { VoucherPreview } from '@/types/electron'

/**
 * 凭证预览（T5b）。
 *
 * 服务端：POST /api/voucher-templates/{code}/generate-preview（只读计算，
 * 不落库、不生成凭证号、不过账）。失败时 throw，由调用点展示错误，
 * 不允许把失败静默当成「空凭证」。
 */
export function useVoucherPreview() {
  return useMutation({
    mutationFn: async ({ code, invoiceId }: { code: string; invoiceId: number }): Promise<VoucherPreview> => {
      const api = await getAPI()
      const res = await api.previewVoucher(code, invoiceId)
      if (!res.success || !res.data) throw new Error(res.error || '凭证预览失败')
      return res.data
    },
  })
}
