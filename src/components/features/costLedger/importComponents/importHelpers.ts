/**
 * 成本台账导入 — 工具函数
 *
 * 从 CostLedgerImportModal.tsx 提取（2026-05-19 重构）
 */

// ── 系统字段定义（与 CostLedgerImportModal 共用） ──
export interface ImportField { key: string; label: string; required?: boolean }

export const IMPORT_FIELDS: ImportField[] = [
  { key: 'date', label: '日期', required: true },
  { key: 'voucherNo', label: '凭证号' },
  { key: 'summary', label: '摘要' },
  { key: 'counterparty', label: '往来单位', required: true },
  { key: 'channel', label: '部门/渠道' },
  { key: 'incomeAmount', label: '收入金额' },
  { key: 'expenseAmount', label: '支出金额' },
  { key: 'notes', label: '备注' },
]

/** Excel 日期序列号 → YYYY-MM-DD */
export function serialToDate(serial: number): string {
  const utcDays = Math.floor(serial - 25569)
  const utcValue = utcDays * 86400
  const date = new Date(utcValue * 1000)
  if (isNaN(date.getTime())) return String(serial)
  return date.toISOString().slice(0, 10)
}

/** 解析各种日期格式 → YYYY-MM-DD */
export function parseDate(value: any): string {
  if (value == null || value === '') return ''
  // 数字：Excel 日期序列号
  if (typeof value === 'number') return serialToDate(value)
  const str = String(value).trim()
  // "2022.11.26" 或 "2022/11/26" 或 "2022-11-26" 或 "2025.4,10"（逗号容错）
  const m = str.match(/^(\d{4})[./,\-](\d{1,2})[./,\-](\d{1,2})$/)
  if (m) {
    const y = m[1], mo = m[2].padStart(2, '0'), d = m[3].padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return str
}

/** 解析数字 */
export function parseNumber(value: any): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return value
  const str = String(value).replace(/[,\s]/g, '')
  const n = parseFloat(str)
  return isNaN(n) ? 0 : n
}

/**
 * 从摘要 + 备注 + 往来单位 的关键词自动匹配系统分类 code
 * 优先使用学习规则，再按内置规则库匹配
 */
export function autoMatchCategory(
  summary: string,
  notes: string,
  counterparty: string,
  categories: { code: string; direction: 'expense' | 'income'; isEnabled: boolean }[],
  learnedRules?: { keyword: string; category: string; direction: string; hitCount: number }[],
): { code: string; direction: 'expense' | 'income' } | null {
  const text = (summary + ' ' + notes + ' ' + counterparty).replace(/\s/g, '')
  if (!text) return null

  // 先查学习规则（按关键词长度降序 → 命中次数降序），越具体越优先
  if (learnedRules && learnedRules.length > 0) {
    const sorted = [...learnedRules].sort(
      (a, b) => b.keyword.length - a.keyword.length || b.hitCount - a.hitCount
    )
    for (const rule of sorted) {
      if (text.includes(rule.keyword)) {
        const cat = categories.find(c => c.code === rule.category && c.direction === rule.direction)
        if (cat) return { code: rule.category, direction: rule.direction as 'expense' | 'income' }
      }
    }
  }

  // 关键词规则库（按优先级排列，越具体的越靠前）
  const rules: [RegExp, 'expense' | 'income', string][] = [
    // ── 收入类 ──
    [/投资款|入股/, 'income', 'shareholder_investment'],
    [/融资款/, 'income', 'financing'],
    [/项目回款/, 'income', 'advance_recovery'],
    [/垫资回收/, 'income', 'advance_recovery'],
    [/退款/, 'income', 'income_refund_ph'],
    // ── 居间/中介 ──
    [/居间/, 'expense', 'intermediary_fee'],
    [/中介/, 'expense', 'intermediary_fee'],
    // ── 工资/薪酬/社保 ──
    [/工资/, 'expense', 'manager_salary'],
    [/薪酬|薪水|社保/, 'expense', 'manager_salary'],
    // ── 劳务 ──
    [/劳务/, 'expense', 'labor'],
    [/民工/, 'expense', 'labor'],
    // ── 材料 ──
    [/材料/, 'expense', 'material'],
    [/矩管|型材|钢管|钢材|水泥|砂石|混凝土|砖|瓦/, 'expense', 'material'],
    // ── 机械 ──
    [/机械/, 'expense', 'equipment'],
    [/租赁/, 'expense', 'equipment'],
    // ── 分包 ──
    [/分包/, 'expense', 'subcontract'],
    // ── 临建/办公/集装箱 ──
    [/集装箱/, 'expense', 'temp_facility'],
    [/临建|临时设施/, 'expense', 'temp_facility'],
    [/办公桌|办公椅|办公用品|打印机/, 'expense', 'temp_facility'],
    [/家具/, 'expense', 'temp_facility'],
    // ── 差旅/交通 ──
    [/差旅/, 'expense', 'travel_misc'],
    [/交通/, 'expense', 'travel_misc'],
    [/住宿/, 'expense', 'travel_misc'],
    // ── 公关/招待 ──
    [/招待|宴请|公关/, 'expense', 'public_relations'],
    // ── 投标/保函 ──
    [/投标/, 'expense', 'bid_guarantee'],
    [/招投标/, 'expense', 'bid_guarantee'],
    // ── 咨询/检测 ──
    [/咨询/, 'expense', 'consult_testing'],
    [/检测/, 'expense', 'consult_testing'],
    [/设计费|设计/, 'expense', 'consult_testing'],
    // ── 资料/代理 ──
    [/资料/, 'expense', 'doc_agency'],
    [/代理/, 'expense', 'doc_agency'],
    // ── 资金成本 ──
    [/利息|资金成本|融资成本/, 'expense', 'capital_cost'],
    // ── 规费 ──
    [/规费/, 'expense', 'guarantee_fee'],
    // ── 发票成本 ──
    [/发票/, 'expense', 'irregular_invoice'],
    // ── 罚款 ──
    [/罚款/, 'expense', 'fine_other'],
    // ── 保险 ──
    [/工伤险|保险/, 'expense', 'travel_misc'],
    // ── 备用金/借款 ──
    [/备用金/, 'expense', 'other_business'],
    [/借款/, 'expense', 'other_business'],
    // ── 税金 ──
    [/税金|税费|附加税|税局|税务局|开票|完税|缴税|纳税/, 'expense', 'guarantee_fee'],
    // ── 报销 ──
    [/报销/, 'expense', 'travel_misc'],
    // ── 固定资产 ──
    [/固定资产/, 'expense', 'temp_facility'],
  ]

  for (const [regex, dir, code] of rules) {
    if (regex.test(text)) {
      const found = categories.find(c => c.code === code && c.direction === dir)
      if (found) return { code, direction: dir }
    }
  }

  return null
}
