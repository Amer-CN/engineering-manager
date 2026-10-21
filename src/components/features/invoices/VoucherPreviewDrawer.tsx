import React, { useEffect, useState } from 'react'
import type { Invoice } from '@/types/electron'
import { Drawer } from '../../ui/Drawer'
import { Button } from '../../ui/Button'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'
import { useVoucherPreview } from '@/hooks/data/useVoucherPreview'
import { usePermission } from '@/hooks/usePermission'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'

interface VoucherPreviewDrawerProps {
  invoice: Invoice
  onClose: () => void
}

/** 发票 → 模板：开票走收入模板，收票走成本模板（与后端 066 种子一致）。 */
export function voucherTemplateCodeFor(invoiceType: string): string {
  return invoiceType === 'invoice_out' ? 'INV_REVENUE' : 'INV_COST'
}

/**
 * 凭证预览抽屉（T5b/T6a）。
 *
 * 预览只读：调用后端 POST generate-preview 计算分录，不落库、不生成凭证号；
 * T6a 增加「生成凭证草稿」：仅落 draft（不过账），成功后提示凭证号并关闭；
 * 失败（含同一发票已生成）原样展示服务端文案，不关闭、不伪造草稿。
 */
export const VoucherPreviewDrawer: React.FC<VoucherPreviewDrawerProps> = ({ invoice, onClose }) => {
  const { mutate, data, error, isPending } = useVoucherPreview()
  const { can } = usePermission()
  const showToast = useToastStore(state => state.showToast)
  const [saving, setSaving] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const code = voucherTemplateCodeFor(invoice.type)

  useEffect(() => {
    mutate({ code, invoiceId: invoice.id })
  }, [mutate, code, invoice.id])

  const handleCreateDraft = async () => {
    if (!data || saving) return
    setSaving(true)
    setDraftError(null)
    try {
      const api = await getAPI()
      const res = await api.createVoucherDraft(invoice.id, data.templateCode)
      if (!res.success || !res.data) throw new Error(res.error || '生成凭证草稿失败')
      showToast(`已生成凭证草稿 ${res.data.voucherNo}`, 'success')
      setSaving(false)
      onClose()
    } catch (err) {
      setDraftError((err as Error).message || '生成凭证草稿失败')
      setSaving(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      icon="FileText"
      title={`凭证预览 - ${invoice.invoiceNo || invoice.name || ''}`}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>关闭</Button>
          {can('vouchers:create') && data && (
            <Button type="button" variant="primary" loading={saving} onClick={handleCreateDraft}>
              生成凭证草稿
            </Button>
          )}
        </div>
      }
    >
      <div className="px-6 py-4 space-y-4">
        {isPending && (
          <div className="text-sm" style={{ color: 'var(--muted)' }}>正在计算凭证分录…</div>
        )}

        {!isPending && error && (
          <div className="text-sm" style={{ color: 'var(--danger)' }}>
            无法生成凭证预览：{(error as Error).message}
          </div>
        )}

        {!isPending && data && (
          <>
            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--muted)' }}>
              <span>模板：<span className="font-mono">{data.templateCode}</span></span>
              <span>借：<span className="font-mono tabular-nums">¥{formatMoney(data.totalDebit)}</span></span>
              <span>贷：<span className="font-mono tabular-nums">¥{formatMoney(data.totalCredit)}</span></span>
            </div>

            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
                    <th className="text-left px-3 py-2 font-medium">方向</th>
                    <th className="text-left px-3 py-2 font-medium">科目</th>
                    <th className="text-left px-3 py-2 font-medium">摘要</th>
                    <th className="text-right px-3 py-2 font-medium">金额</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map(line => (
                    <tr key={line.lineNo} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-micro rounded"
                          style={{
                            background: line.dc === 1 ? 'var(--accent-soft)' : 'var(--panel-2)',
                            color: line.dc === 1 ? 'var(--accent)' : 'var(--fg-2)'
                          }}
                        >
                          {line.dc === 1 ? '借' : '贷'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono">{line.accountCode}</span>
                        <span className="ml-2" style={{ color: 'var(--fg-2)' }}>{line.accountName}</span>
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--fg-2)' }}>{line.summary}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">¥{formatMoney(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {draftError && (
              <div className="text-sm" style={{ color: 'var(--danger)' }}>
                生成凭证草稿失败：{draftError}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
              <Icon name="Info" size={14} />
              <span>仅生成草稿，不会过账；金额口径以发票价税合计为准。</span>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}
