import type { ContractTemplate } from '../types/electron'
import { templateTypeConfig } from '../components/ContractTemplateFormModal'
import { templateMarkupToPrintHtml } from './templateMarkup'

export function printContractTemplate(
  template: ContractTemplate,
  description: string,
  generateForm: Record<string, string>
): void {
  const variables = template.variables || []
  let content = description || ''

  variables.forEach(v => {
    const value = generateForm[v.key] || v.defaultValue || ''
    content = content.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), value)
  })

  const printContent = `
<div style="padding: 40px; font-family: 'SimSun', serif; font-size: 12pt; line-height: 1.8;">
  <div style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 30px;">
    ${templateTypeConfig[template.type].label}
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

  const originalContent = document.body.innerHTML
  document.body.innerHTML = printContent
  window.print()
  document.body.innerHTML = originalContent
  window.location.reload()
}
