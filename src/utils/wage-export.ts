/**
 * 工资明细导出 & 打印工具
 */
import type { WageRecord } from '@/types'
import { COLORS } from './wageExportColors'
import { useToastStore } from '@/store/toastStore'
import { escapeHtml } from './templateMarkup'
import { formatDate } from './date'

/** 导出工资明细为 Excel */
export async function exportWageDetailToExcel(records: WageRecord[]) {
  if (records.length === 0) return
  try {
    const XLSX = await import('xlsx')
    const data = records.map((r, i) => ({
      '序号': i + 1,
      '姓名': r.memberName || '',
      '班组': r.teamName || '',
      '项目': r.projectName || '',
      '月份': r.yearMonth,
      '出勤': r.workDays,
      '日薪': r.dailyWage,
      '应发': r.dailyWage * r.workDays,
      '实发金额': r.paidAmount || 0,
      '发放日期': r.paidDate || '',
      '差额': (r.dailyWage * r.workDays) - (Number(r.paidAmount) || 0),
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 6 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '工资明细')
    XLSX.writeFile(wb, `工资明细_${formatDate(new Date())}.xlsx`)
  } catch (e) {
    console.error('导出失败:', e)
    useToastStore.getState().showToast('导出失败，请重试', 'error')
  }
}

/** 打印工资明细 */
export function printWageDetail(records: WageRecord[], title: string) {
  if (records.length === 0) return
  const rows = records.map(r => {
    const actualWage = (r.dailyWage || 0) * (r.workDays || 0)
    const paid = Number(r.paidAmount) || 0
    const diff = actualWage - paid
    const diffStr = diff === 0 ? '已结清' : diff > 0 ? `欠 ${diff.toFixed(2)}` : `多 ${Math.abs(diff).toFixed(2)}`
    return `<tr>
      <td style="text-align:center">${escapeHtml(r.memberName || '-')}</td>
      <td style="text-align:center">${escapeHtml(r.teamName || '-')}</td>
      <td style="text-align:center">${escapeHtml(String(r.yearMonth))}</td>
      <td style="text-align:center">${escapeHtml(String(r.workDays))}</td>
      <td style="text-align:right">${escapeHtml(String(r.dailyWage))}</td>
      <td style="text-align:right">${escapeHtml(actualWage.toFixed(2))}</td>
      <td style="text-align:right">${escapeHtml(paid.toFixed(2))}</td>
      <td style="text-align:center">${escapeHtml(r.paidDate || '-')}</td>
      <td style="text-align:right;font-weight:600;color:${diff === 0 ? COLORS.settled : COLORS.pending}">${escapeHtml(diffStr)}</td>
    </tr>`
  }).join('')

  const totalWage = records.reduce((s, r) => s + (r.dailyWage || 0) * (r.workDays || 0), 0)
  const totalPaid = records.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0)
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>工资明细</title>
    <style>
      body{font-family:'Microsoft YaHei',sans-serif;padding:20px;color:${COLORS.textBody}}
      h1{text-align:center;margin-bottom:4px;font-size:18px}
      .sub{text-align:center;color:${COLORS.textSub};font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid ${COLORS.borderTable};padding:5px 6px}
      th{background:${COLORS.bgTableHeader};font-weight:600;white-space:nowrap}
      .footer{margin-top:12px;text-align:right;font-size:11px;color:${COLORS.textFooter}}
      .summary{margin-top:10px;display:flex;gap:24px;justify-content:flex-end;font-size:13px}
      .summary strong{font-family:monospace}
      @media print{body{padding:0}@page{size:landscape;margin:10mm}}
    </style></head><body>
    <h1>${escapeHtml(title)} — 工资明细</h1>
    <p class="sub">${escapeHtml(String(records.length))} 人 | ${escapeHtml(new Date().toLocaleDateString())}</p>
    <table><thead><tr>
      <th>姓名</th><th>班组</th><th>月份</th><th>出勤</th><th>日薪</th><th>应发</th><th>实发</th><th>发放日期</th><th>状态</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="summary">
      <span>应发总额: <strong>${escapeHtml(totalWage.toFixed(2))}</strong></span>
      <span>实发总额: <strong style="color:${COLORS.settled}">${escapeHtml(totalPaid.toFixed(2))}</strong></span>
      <span>未发: <strong style="color:${COLORS.pending}">${escapeHtml((totalWage - totalPaid).toFixed(2))}</strong></span>
    </div>
    <div class="footer">打印时间: ${escapeHtml(new Date().toLocaleString())}</div>
    </body></html>`
  const w = window.open('', '_blank', 'width=1024,height=768')
  if (!w) { window.print(); return }
  w.document.write(content)
  w.document.close()
  w.focus()
  w.print()
  w.close()
}
