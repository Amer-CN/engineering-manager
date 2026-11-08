/**
 * 凭证打印 / 导出（T6e）。
 *
 * 纯函数 buildVoucherCsv / buildVoucherListPrintHtml 便于单测；下载与打印只做副作用。
 * 口径：金额=元（库内分，接口已转元）；CSV 带 UTF-8 BOM 与「非正式账簿」说明；
 * 不做记账凭证的正式套打（版式需求未定，避免伪正式凭证）。
 */
import type { Voucher } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { handlePrint } from './printExport'

export const VOUCHER_EXPORT_NOTE = '本文件为凭证列表导出（含草稿/已过账），非正式账簿，不可替代账套或申报表。'

function statusLabel(status: string): string {
  return status === 'posted' ? '已过账' : '草稿'
}

function periodLabel(period: string): string {
  return period.length === 6 ? `${period.slice(0, 4)}-${period.slice(4)}` : period
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 生成 CSV 文本（不含 BOM；首行为口径说明）。 */
export function buildVoucherCsv(vouchers: Voucher[]): string {
  const headers = [
    '凭证号', '凭证日期', '期间', '状态', '模板', '来源', '来源ID',
    '借方合计(元)', '贷方合计(元)', '分录行数', '过账时间', '过账人',
  ]
  const rows = vouchers.map(voucher => [
    voucher.voucherNo,
    voucher.voucherDate,
    periodLabel(voucher.period),
    statusLabel(voucher.status),
    voucher.templateCode,
    voucher.sourceType === 'invoice' ? '发票' : voucher.sourceType,
    String(voucher.sourceId),
    voucher.totalDebit.toFixed(2),
    voucher.totalCredit.toFixed(2),
    String(voucher.entries.length),
    voucher.postedAt ?? '',
    voucher.postedBy ?? '',
  ])
  return [[VOUCHER_EXPORT_NOTE], headers, ...rows]
    .map(row => row.map(csvCell).join(','))
    .join('\r\n')
}

/** 下载 CSV（UTF-8 BOM，Excel 可直接识别中文）。 */
export function exportVoucherCsv(vouchers: Voucher[], period?: string): void {
  const csv = buildVoucherCsv(vouchers)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `凭证列表-${period || '全部'}-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/** 生成凭证列表打印 HTML（纯函数，便于单测）。 */
export function buildVoucherListPrintHtml(vouchers: Voucher[], periodLabelText: string): string {
  const totalDebit = vouchers.reduce((sum, v) => sum + v.totalDebit, 0)
  const totalCredit = vouchers.reduce((sum, v) => sum + v.totalCredit, 0)
  const rows = vouchers.map(voucher => `
    <tr>
      <td>${escapeHtml(voucher.voucherNo)}</td>
      <td>${escapeHtml(voucher.voucherDate)}</td>
      <td>${escapeHtml(periodLabel(voucher.period))}</td>
      <td>${escapeHtml(statusLabel(voucher.status))}</td>
      <td>${escapeHtml(voucher.templateCode)}</td>
      <td style="text-align:right">${voucher.totalDebit.toFixed(2)}</td>
      <td style="text-align:right">${voucher.totalCredit.toFixed(2)}</td>
      <td>${escapeHtml(voucher.postedAt ?? '')}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>凭证列表</title>
    <style>
      body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
      h1 { text-align: center; margin-bottom: 8px; }
      .note { text-align: center; font-size: 11px; color: #666; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
      th { background: #f0f0f0; }
      tfoot td { font-weight: bold; }
      .footer { margin-top: 16px; text-align: right; font-size: 12px; color: #666; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>凭证列表</h1>
    <div class="note">期间：${escapeHtml(periodLabelText)} ｜ ${escapeHtml(VOUCHER_EXPORT_NOTE)}</div>
    <table>
      <thead><tr><th>凭证号</th><th>凭证日期</th><th>期间</th><th>状态</th><th>模板</th><th>借方合计(元)</th><th>贷方合计(元)</th><th>过账时间</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="5">合计（${vouchers.length} 张）</td>
        <td style="text-align:right">${formatMoney(totalDebit)}</td>
        <td style="text-align:right">${formatMoney(totalCredit)}</td>
        <td></td>
      </tr></tfoot>
    </table>
    <div class="footer">打印时间：${new Date().toLocaleString()}</div>
    </body></html>`
}

/** 打印凭证列表（复用发票打印的 handlePrint 流程）。 */
export function printVoucherList(vouchers: Voucher[], periodLabelText: string): void {
  handlePrint(buildVoucherListPrintHtml(vouchers, periodLabelText))
}