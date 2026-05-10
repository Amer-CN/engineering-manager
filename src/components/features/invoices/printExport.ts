import type { Invoice, PaymentRecord } from '@/types'
import * as XLSX from 'xlsx'
import { formatMoney } from '@/utils/format'

function escapeHtml(s: string): string {
  if (!s) return ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// ═══════════════════════════════════════════════════════════
// 状态标签
// ═══════════════════════════════════════════════════════════

export function getStatusLabel(status: string, type?: string) {
  const isIn = type === 'invoice_in'
  const labels: Record<string, string> = {
    issued: isIn ? '已收票' : '已开具',
    partially_paid: isIn ? '部分付款' : '部分收款',
    received: isIn ? '已付清' : '已收齐',
    cancelled: '已作废', red_flushed: '已红冲',
  }
  return labels[status] || status
}

export function getKindLabel(kind: string) {
  const labels: Record<string, string> = {
    paper_regular: '纸质普票',
    paper_special: '纸质专票',
    electronic_regular: '电子普票',
    electronic_special: '电子专票',
  }
  return labels[kind] || '纸质普票'
}

// ═══════════════════════════════════════════════════════════
// 打印模板
// ═══════════════════════════════════════════════════════════

export function generateInvoicePrintContent(invoice: Invoice) {
  return `
    <div style="padding: 20px; font-family: 'SimSun', serif;">
      <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="font-size: 24pt; font-weight: bold;">${invoice.type === 'invoice_in' ? '收' : '开'}票证明</h1>
      </div>
      <div style="margin-bottom: 30px;">
        <p><strong>发票代码:</strong> ${invoice.invoiceCode || '-'}</p>
        <p><strong>发票号码:</strong> ${invoice.invoiceNo}</p>
        <p><strong>开票日期:</strong> ${invoice.issueDate}</p>
        <p><strong>票种:</strong> ${getKindLabel(invoice.invoiceKind)}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr><td style="border: 1px solid #333; padding: 10px; width: 50%;"><strong>销售方:</strong> ${invoice.sellerName || '-'}</td>
        <td style="border: 1px solid #333; padding: 10px;"><strong>购买方:</strong> ${invoice.buyerName || '-'}</td></tr>
        <tr><td style="border: 1px solid #333; padding: 10px;"><strong>项目:</strong> ${invoice.projectName || '-'}</td>
        <td style="border: 1px solid #333; padding: 10px;"><strong>税率:</strong> ${(invoice.taxRate * 100).toFixed(0)}%</td></tr>
        <tr><td style="border: 1px solid #333; padding: 10px;" colspan="2"><strong>发票名称:</strong> ${invoice.name}</td></tr>
        <tr><td style="border: 1px solid #333; padding: 10px;"><strong>不含税金额:</strong> ¥${formatMoney(invoice.priceAmount)}</td>
        <td style="border: 1px solid #333; padding: 10px;"><strong>税额:</strong> ¥${invoice.taxAmount.toLocaleString()}</td></tr>
        <tr><td colspan="2" style="border: 1px solid #333; padding: 10px; text-align: right;">
          <strong>价税合计:</strong> <span style="font-size: 18pt; font-weight: bold;">¥${invoice.amount.toLocaleString()}</span></td></tr>
      </table>
      <div style="margin-top: 60px; display: flex; justify-content: space-between;">
        <div style="text-align: center; width: 200px;"><p>经办人签字:</p><p style="margin-top: 40px;">___________</p><p style="margin-top: 10px;">年  月  日</p></div>
        <div style="text-align: center; width: 200px;"><p>审批人签字:</p><p style="margin-top: 40px;">___________</p><p style="margin-top: 10px;">年  月  日</p></div>
      </div>
    </div>`
}

export function generatePaymentPrintContent(record: PaymentRecord) {
  const typeLabel = record.type === 'invoice_out' ? '回款' : '付款'
  return `
    <div style="padding: 20px; font-family: 'SimSun', serif;">
      <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="font-size: 24pt; font-weight: bold;">${typeLabel}凭证</h1>
      </div>
      <div style="margin-bottom: 30px;">
        <p><strong>收款日期:</strong> ${record.recordDate}</p>
        <p><strong>收款类型:</strong> ${record.type === 'invoice_out' ? '回款（开票收款）' : '付款（收票付款）'}</p>
        <p><strong>收款金额:</strong> <span style="font-size: 18pt; font-weight: bold; color: #059669;">¥${formatMoney(record.amount)}</span></p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr><td style="border: 1px solid #333; padding: 10px; width: 50%;"><strong>关联单位:</strong> ${record.partnerName || '-'}</td>
        <td style="border: 1px solid #333; padding: 10px;"><strong>关联项目:</strong> ${record.projectName || '-'}</td></tr>
        <tr><td style="border: 1px solid #333; padding: 10px;" colspan="2"><strong>关联合同:</strong> ${record.contractName || '-'}</td></tr>
        ${(record as any).invoiceInfos && (record as any).invoiceInfos.length > 0 ? `
        <tr><td style="border: 1px solid #333; padding: 10px;" colspan="2"><strong>关联发票:</strong>
          <ul style="margin: 5px 0 0 20px; padding: 0;">
            ${(record as any).invoiceInfos.map((info: any) => `<li>No.${info.invoiceNo} - ${info.invoiceName} - 开票金额: ¥${formatMoney(info.invoiceAmount)}</li>`).join('')}
          </ul></td></tr>` : ''}
        <tr><td style="border: 1px solid #333; padding: 10px;" colspan="2"><strong>备注:</strong> ${record.remarks || '-'}</td></tr>
      </table>
      <div style="margin-top: 60px; display: flex; justify-content: space-between;">
        <div style="text-align: center; width: 200px;"><p>经办人签字:</p><p style="margin-top: 40px;">___________</p><p style="margin-top: 10px;">年  月  日</p></div>
        <div style="text-align: center; width: 200px;"><p>审批人签字:</p><p style="margin-top: 40px;">___________</p><p style="margin-top: 10px;">年  月  日</p></div>
      </div>
    </div>`
}

// ═══════════════════════════════════════════════════════════
// 打印/导出操作
// ═══════════════════════════════════════════════════════════

export function handlePrint(content: string) {
  const originalContent = document.body.innerHTML
  document.body.innerHTML = content
  window.print()
  document.body.innerHTML = originalContent
  window.location.reload()
}

export function printInvoiceList(invoiceList: Invoice[]) {
  const rows = invoiceList.map(inv => `
    <tr><td>${escapeHtml(inv.issueDate || '-')}</td><td>${inv.type === 'invoice_in' ? '收票' : '开票'}</td>
    <td>${getKindLabel(inv.invoiceKind)}</td><td>${escapeHtml(inv.name || '-')}</td>
    <td>${escapeHtml(inv.invoiceNo || '-')}</td><td>${(inv.taxRate * 100).toFixed(0)}%</td>
    <td>¥${formatMoney(inv.amount)}</td><td>¥${inv.taxAmount.toLocaleString()}</td>
    <td>${getStatusLabel(inv.status, inv.type)}</td></tr>`).join('')
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>发票列表</title>
    <style>body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; } h1 { text-align: center; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; } .footer { margin-top: 20px; text-align: right; font-size: 12px; color: #666; }
    @media print { body { padding: 0; } }</style></head><body><h1>发票列表</h1>
    <table><thead><tr><th>开票日期</th><th>类型</th><th>票种</th><th>发票名称</th><th>发票号码</th><th>税率</th><th>金额</th><th>税额</th><th>状态</th></tr></thead>
    <tbody>${rows}</tbody></table><div class="footer">共 ${invoiceList.length} 条记录 | 打印时间: ${new Date().toLocaleString()}</div></body></html>`
  handlePrint(content)
}

export function printPaymentList(paymentList: PaymentRecord[]) {
  const rows = paymentList.map(p => `
    <tr><td>${escapeHtml(p.recordDate || '-')}</td><td>${p.type === 'invoice_out' ? '回款' : '付款'}</td>
    <td>¥${formatMoney(p.amount)}</td><td>${escapeHtml(p.partnerName || '-')}</td>
    <td>${escapeHtml(p.projectName || '-')}</td><td>${escapeHtml(p.contractName || '-')}</td><td>${escapeHtml(p.remarks || '-')}</td></tr>`).join('')
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>收款记录列表</title>
    <style>body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; } h1 { text-align: center; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; } .footer { margin-top: 20px; text-align: right; font-size: 12px; color: #666; }
    @media print { body { padding: 0; } }</style></head><body><h1>收款记录列表</h1>
    <table><thead><tr><th>日期</th><th>类型</th><th>金额</th><th>单位</th><th>项目</th><th>合同</th><th>备注</th></tr></thead>
    <tbody>${rows}</tbody></table><div class="footer">共 ${paymentList.length} 条记录 | 打印时间: ${new Date().toLocaleString()}</div></body></html>`
  handlePrint(content)
}

export function exportInvoiceList(invoiceList: Invoice[]) {
  if (invoiceList.length === 0) { alert('没有可导出的数据'); return }
  try {
    const exportData = invoiceList.map((inv, index) => ({
      '序号': index + 1, '开票日期': inv.issueDate || '',
      '发票类型': inv.type === 'invoice_in' ? '收票' : '开票',
      '票种': getKindLabel(inv.invoiceKind),
      '发票名称': inv.name || '', '发票号码': inv.invoiceNo || '',
      '发票代码': inv.invoiceCode || '', '不含税金额': inv.priceAmount,
      '税率': `${(inv.taxRate * 100).toFixed(0)}%`, '税额': inv.taxAmount,
      '价税合计': inv.amount, '状态': getStatusLabel(inv.status, inv.type),
      '销售方': inv.sellerName || '', '购买方': inv.buyerName || '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    worksheet['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 20 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '发票列表')
    XLSX.writeFile(workbook, `发票列表_${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) { console.error('导出失败:', error); alert('导出失败，请重试') }
}

export function exportPaymentList(paymentList: PaymentRecord[]) {
  if (paymentList.length === 0) { alert('没有可导出的数据'); return }
  try {
    const exportData = paymentList.map((p, index) => ({
      '序号': index + 1, '日期': p.recordDate || '',
      '类型': p.type === 'invoice_out' ? '回款' : '付款',
      '金额': p.amount, '关联单位': p.partnerName || '',
      '关联项目': p.projectName || '', '关联合同': p.contractName || '',
      '备注': p.remarks || '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    worksheet['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '收款记录')
    XLSX.writeFile(workbook, `收款记录_${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) { console.error('导出失败:', error); alert('导出失败，请重试') }
}
