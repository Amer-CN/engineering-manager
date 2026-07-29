import { describe, it, expect } from 'vitest'
import { buildContractPrintHtml } from '../../utils/printContractTemplate'
import type { ContractTemplate } from '../../types/electron'

function makeTemplate(overrides: Partial<ContractTemplate> = {}): ContractTemplate {
  return {
    id: 1,
    name: '测试模板',
    type: 'income',
    description: '',
    variables: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as ContractTemplate
}

describe('buildContractPrintHtml', () => {
  it('替换 {{变量}} 为表单值', () => {
    const tpl = makeTemplate({ variables: [{ key: '甲方名称', label: '甲方', defaultValue: '' }] })
    const html = buildContractPrintHtml(tpl, '甲方为{{甲方名称}}。', { 甲方名称: '某某公司' })
    expect(html).toContain('甲方为某某公司。')
    expect(html).not.toContain('{{甲方名称}}')
  })

  it('表单空值时回退 defaultValue', () => {
    const tpl = makeTemplate({ variables: [{ key: '金额', label: '金额', defaultValue: '壹万元' }] })
    const html = buildContractPrintHtml(tpl, '价款{{金额}}', {})
    expect(html).toContain('价款壹万元')
  })

  it('变量 key 含正则元字符 ( * ? 时不抛异常且正确替换（回归：原 new RegExp 实现会炸）', () => {
    const tpl = makeTemplate({ variables: [{ key: '金额(元)*?', label: '金额', defaultValue: '' }] })
    const html = buildContractPrintHtml(tpl, '共计{{金额(元)*?}}整', { '金额(元)*?': '伍佰' })
    expect(html).toContain('共计伍佰整')
    expect(html).not.toContain('{{')
  })

  it('同一变量多次出现全部替换', () => {
    const tpl = makeTemplate({ variables: [{ key: 'X', label: 'X', defaultValue: '' }] })
    const html = buildContractPrintHtml(tpl, '{{X}}与{{X}}', { X: '甲' })
    expect(html).toContain('甲与甲')
  })

  it('正文含 <script> 经转换器转义（防注入链路完整）', () => {
    const tpl = makeTemplate()
    const html = buildContractPrintHtml(tpl, '<script>alert(1)</script>', {})
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('未知 type 时页眉兜底为「合同」而非 TypeError（回归：后端旧数据 type 可能不在前端 5 键内）', () => {
    const tpl = makeTemplate({ type: 'contract' as never })
    const html = buildContractPrintHtml(tpl, '正文', {})
    expect(html).toContain('合同')
  })
})
