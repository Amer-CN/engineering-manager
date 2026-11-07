import React from 'react'
import type { Voucher } from '@/types/electron'
import { Drawer } from '../../ui/Drawer'
import { Button } from '../../ui/Button'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

interface VoucherDetailDrawerProps {
  /** 要查看的凭证；null 时抽屉不渲染（由列表控制） */
  voucher: Voucher | null
  onClose: () => void
}

function StatusBadge({ status }: { status: string }) {
  const posted = status === 'posted'
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs"
      style={posted
        ? { background: 'var(--success-soft)', color: 'var(--success)' }
        : { background: 'var(--panel-2)', color: 'var(--muted)' }}
    >
      {posted ? '已过账' : '草稿'}
    </span>
  )
}

/**
 * 凭证详情抽屉（T6d，只读）。
 *
 * 直接使用列表接口已返回的分录，不额外请求后端、不提供任何写操作；
 * 过账即终态，详情只用于核对借贷方向、科目与金额（过账前自查 / 过账后留档查看）。
 */
export const VoucherDetailDrawer: React.FC<VoucherDetailDrawerProps> = ({ voucher, onClose }) => {
  if (!voucher) return null

  const entries = voucher.entries ?? []
  const posted = voucher.status === 'posted'
  const debitTotal = entries.filter(e => e.dc === 1).reduce((sum, e) => sum + e.amount, 0)
  const creditTotal = entries.filter(e => e.dc === -1).reduce((sum, e) => sum + e.amount, 0)

  return (
    <Drawer
      open
      onClose={onClose}
      icon="FileText"
      width={560}
      title={`凭证详情 - ${voucher.voucherNo}`}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>关闭</Button>
        </div>
      }
    >
      <div className="px-6 py-4 space-y-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>凭证号</div>
            <div className="font-mono font-medium" style={{ color: 'var(--fg)' }}>{voucher.voucherNo}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>状态</div>
            <div className="mt-0.5"><StatusBadge status={voucher.status} /></div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>凭证日期</div>
            <div className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>{voucher.voucherDate}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>期间</div>
            <div className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>
              {voucher.period.slice(0, 4)}-{voucher.period.slice(4)}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>模板</div>
            <div className="font-mono" style={{ color: 'var(--fg-2)' }}>{voucher.templateCode}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>来源</div>
            <div style={{ color: 'var(--fg-2)' }}>
              {voucher.sourceType === 'invoice' ? '发票' : voucher.sourceType}
              <span className="font-mono tabular-nums"> #{voucher.sourceId}</span>
            </div>
          </div>
          {posted && (
            <>
              <div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>过账时间</div>
                <div className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>{voucher.postedAt ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>过账人</div>
                <div className="font-mono" style={{ color: 'var(--fg-2)' }}>{voucher.postedBy ?? '-'}</div>
              </div>
            </>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-sm rounded-lg"
            style={{ color: 'var(--muted)', border: '1px dashed var(--border)' }}>
            <Icon name="Info" size={20} />
            <span className="mt-2">该凭证暂无分录明细</span>
          </div>
        ) : (
          <>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
                    <th className="text-left px-3 py-2 font-medium w-10">#</th>
                    <th className="text-left px-3 py-2 font-medium w-12">方向</th>
                    <th className="text-left px-3 py-2 font-medium">科目</th>
                    <th className="text-left px-3 py-2 font-medium">摘要</th>
                    <th className="text-right px-3 py-2 font-medium">金额</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.lineNo} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="px-3 py-2 font-mono tabular-nums" style={{ color: 'var(--muted)' }}>
                        {entry.lineNo}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 text-micro rounded"
                          style={{
                            background: entry.dc === 1 ? 'var(--accent-soft)' : 'var(--panel-2)',
                            color: entry.dc === 1 ? 'var(--accent)' : 'var(--fg-2)',
                          }}
                        >
                          {entry.dc === 1 ? '借' : '贷'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono">{entry.accountCode}</span>
                        <span className="ml-2" style={{ color: 'var(--fg-2)' }}>{entry.accountName}</span>
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--fg-2)' }}>{entry.summary || '-'}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: 'var(--fg)' }}>
                        ¥{formatMoney(entry.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-6 text-sm">
              <span style={{ color: 'var(--muted)' }}>
                借方合计 <span className="font-mono tabular-nums" style={{ color: 'var(--fg)' }}>¥{formatMoney(debitTotal)}</span>
              </span>
              <span style={{ color: 'var(--muted)' }}>
                贷方合计 <span className="font-mono tabular-nums" style={{ color: 'var(--fg)' }}>¥{formatMoney(creditTotal)}</span>
              </span>
            </div>

            {debitTotal !== creditTotal && (
              <div className="text-sm" style={{ color: 'var(--danger)' }}>
                借贷不平衡，请检查分录（借方 ¥{formatMoney(debitTotal)} / 贷方 ¥{formatMoney(creditTotal)}）。
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <Icon name="Info" size={14} />
          <span>{posted ? '该凭证已过账，分录只读，不可修改或删除。' : '草稿凭证：确认借贷无误后可回到列表过账。'}</span>
        </div>
      </div>
    </Drawer>
  )
}