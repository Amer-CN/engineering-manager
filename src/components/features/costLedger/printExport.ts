import * as XLSX from 'xlsx'
import { formatMoney } from '@/utils/format'
import { DIRECTION_CONFIG, getCategoryDisplayLabel } from './config'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

function esc(s: string): string {
  if (!s) return ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function doPrint(content: string) {
  const w = window.open('', '_blank', 'width=1024,height=768')
  if (!w) { window.print(); return }
  w.document.write(content)
  w.document.close()
  w.focus()
  w.print()
  w.close()
}

// ═══════════════════════════════════════════════════════════
// 打印
// ═══════════════════════════════════════════════════════════

export function printCostLedgerList(
  entries: CostLedgerEntry[],
  categories: CostLedgerCategory[] | null | undefined,
  categoryLevel: 'level1' | 'level2',
  totals: { expense: number; income: number; count: number },
) {
  if (entries.length === 0) return
  const rows = entries.map(e => `
    <tr>
      <td style="text-align:center">${e.voucherNo || '-'}</td>
      <td>${e.date}</td>
      <td>${DIRECTION_CONFIG[e.direction]?.label || e.direction}</td>
      <td>${esc(getCategoryDisplayLabel(e.category, categoryLevel, categories))}</td>
      <td>${esc(e.counterparty)}</td>
      <td>${esc(e.channel || '-')}</td>
      <td style="text-align:right;color:${e.direction === 'expense' ? '#dc2626' : '#059669'}">${e.direction === 'expense' ? '-' : '+'}${formatMoney(e.amount)}</td>
      <td>${esc(e.summary || '-')}</td>
      <td>${esc(e.notes || '-')}</td>
    </tr>`).join('')

  const net = totals.income - totals.expense
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>成本台账</title>
    <style>
      body{font-family:'Microsoft YaHei',sans-serif;padding:20px;color:#333}
      h1{text-align:center;margin-bottom:8px;font-size:20px}
      .sub{text-align:center;color:#666;font-size:12px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #ccc;padding:6px 8px}
      th{background:#f1f5f9;font-weight:600;white-space:nowrap}
      .footer{margin-top:16px;text-align:right;font-size:12px;color:#666}
      .summary{margin-top:8px;display:flex;gap:24px;justify-content:flex-end;font-size:13px}
      .summary strong{font-family:monospace}
      @media print{body{padding:0}@page{size:landscape;margin:12mm}}
    </style></head><body>
    <h1>成本台账</h1>
    <p class="sub">${entries.length} 条记录 | ${new Date().toLocaleString()}</p>
    <table><thead><tr>
      <th>凭证号</th><th>日期</th><th>方向</th><th>分类</th><th>往来单位/个人</th><th>渠道</th><th>金额</th><th>摘要</th><th>备注</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="summary">
      <span>经营支出: <strong style="color:#dc2626">${formatMoney(totals.expense)}</strong></span>
      <span>资金收入: <strong style="color:#059669">${formatMoney(totals.income)}</strong></span>
      <span>净${net >= 0 ? '流入' : '流出'}: <strong style="color:${net >= 0 ? '#059669' : '#dc2626'}">${formatMoney(net)}</strong></span>
    </div>
    <div class="footer">打印时间: ${new Date().toLocaleString()}</div>
    </body></html>`
  doPrint(content)
}

// ═══════════════════════════════════════════════════════════
// 导出 Excel
// ═══════════════════════════════════════════════════════════

export function exportCostLedgerList(
  entries: CostLedgerEntry[],
  categories: CostLedgerCategory[] | null | undefined,
  categoryLevel: 'level1' | 'level2',
) {
  if (entries.length === 0) { alert('没有可导出的数据'); return }
  try {
    const data = entries.map((e, i) => ({
      '序号': i + 1,
      '凭证号': e.voucherNo || '',
      '日期': e.date,
      '方向': DIRECTION_CONFIG[e.direction]?.label || e.direction,
      '分类': getCategoryDisplayLabel(e.category, categoryLevel, categories),
      '往来单位/个人': e.counterparty,
      '渠道': e.channel || '',
      '金额': e.amount,
      '摘要': e.summary || '',
      '备注': e.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 6 }, { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 16 },
      { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 20 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '成本台账')
    XLSX.writeFile(wb, `成本台账_${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (e) { console.error('导出失败:', e); alert('导出失败，请重试') }
}
