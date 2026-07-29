import type { ContractTemplate } from '../types/electron'
import { templateTypeConfig } from '../components/ContractTemplateFormModal'
import { templateMarkupToPrintHtml } from './templateMarkup'

/** 组装打印 HTML（纯函数，供单测）：变量替换 → 轻量标记转 HTML → 页眉/签章区拼装 */
export function buildContractPrintHtml(
  template: ContractTemplate,
  description: string,
  generateForm: Record<string, string>
): string {
  const variables = template.variables || []
  let content = description || ''

  variables.forEach(v => {
    const value = generateForm[v.key] || v.defaultValue || ''
    // split/join 做字面量全替换：变量 key 含正则元字符（如 ( * ?）时 new RegExp 会抛异常或误匹配
    content = content.split(`{{${v.key}}}`).join(value)
  })

  return `
<div style="padding: 40px; font-family: 'SimSun', serif; font-size: 12pt; line-height: 1.8;">
  <div style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 30px;">
    ${templateTypeConfig[template.type]?.label ?? '合同'}
  </div>
  ${templateMarkupToPrintHtml(content)}
  <div style="margin-top: 60px; display: flex; justify-content: space-between;">
    <div style="text-align: center; width: 30%;">
      <p>甲方（签章）:</p>
      <p style="margin-top: 40px;">___________</p>
      <p style="margin-top: 10px;">年 月 日</p>
    </div>
    <div style="text-align: center; width: 30%;">
      <p>乙方（签章）:</p>
      <p style="margin-top: 40px;">___________</p>
      <p style="margin-top: 10px;">年 月 日</p>
    </div>
  </div>
</div>
  `
}

export function printContractTemplate(
  template: ContractTemplate,
  description: string,
  generateForm: Record<string, string>
): void {
  const printContent = buildContractPrintHtml(template, description, generateForm)

  // 隐藏 iframe 打印：不再整页替换 body.innerHTML + reload（会丢 React 状态与未保存数据）
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) { iframe.remove(); return }
  doc.open()
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>合同模板打印</title></head><body>${printContent}</body></html>`)
  doc.close()

  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  // print() 在 WebView2/Chromium 为阻塞式对话框，返回后延迟移除保证渲染进程取完内容
  setTimeout(() => iframe.remove(), 1000)
}
