export const COLORS = {
  business:       '#ec4899',
  directProject:  '#f97316',
  siteMgmt:       '#14b8a6',
  publicService:  '#6b7280',
  finance:        '#9ca3af',
  investment:     '#059669',
  projectReturn:  '#2563eb',
  refund:         '#7c3aed',
  otherIncome:    '#0891b2',
} as const

export const DIRECTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  expense: { label: '支出', color: 'text-red-600', bg: 'bg-red-50' },
  income:  { label: '收入', color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

export interface CategoryConfig {
  code: string
  label: string
  direction: 'expense' | 'income'
  color: string
}

export const CATEGORY_CONFIG: CategoryConfig[] = [
  // 业务费
  { code: 'public_relations',  label: '公关招待费',   direction: 'expense', color: COLORS.business },
  { code: 'intermediary_fee',  label: '居间中介费',   direction: 'expense', color: COLORS.business },
  { code: 'other_business',    label: '其他业务费',   direction: 'expense', color: COLORS.business },
  // 直接工程费
  { code: 'labor',             label: '劳务费',       direction: 'expense', color: COLORS.directProject },
  { code: 'material',          label: '材料费',       direction: 'expense', color: COLORS.directProject },
  { code: 'equipment',         label: '机械费',       direction: 'expense', color: COLORS.directProject },
  { code: 'subcontract',       label: '专业分包款',   direction: 'expense', color: COLORS.directProject },
  // 现场管理费
  { code: 'temp_facility',     label: '临建及办公费', direction: 'expense', color: COLORS.siteMgmt },
  { code: 'manager_salary',    label: '管理人员薪酬', direction: 'expense', color: COLORS.siteMgmt },
  { code: 'travel_misc',       label: '差旅及杂项',   direction: 'expense', color: COLORS.siteMgmt },
  // 对公服务及前期投入费
  { code: 'bid_guarantee',     label: '投标及保函费',   direction: 'expense', color: COLORS.publicService },
  { code: 'consult_testing',   label: '咨询检测费',     direction: 'expense', color: COLORS.publicService },
  { code: 'doc_agency',        label: '资料代理费',     direction: 'expense', color: COLORS.publicService },
  { code: 'other_public',      label: '其他对公服务费', direction: 'expense', color: COLORS.publicService },
  // 财务及其他费
  { code: 'capital_cost',      label: '资金成本',       direction: 'expense', color: COLORS.finance },
  { code: 'guarantee_fee',     label: '保函及规费',     direction: 'expense', color: COLORS.finance },
  { code: 'irregular_invoice', label: '非常规发票成本', direction: 'expense', color: COLORS.finance },
  { code: 'fine_other',        label: '罚款及其他',     direction: 'expense', color: COLORS.finance },
  // 收入 — 投资款
  { code: 'shareholder_investment', label: '股东投资',     direction: 'income', color: COLORS.investment },
  { code: 'financing',              label: '融资款',       direction: 'income', color: COLORS.investment },
  { code: 'income_invest_ph',       label: '投资款-占位',  direction: 'income', color: COLORS.investment },
  // 收入 — 项目回款
  { code: 'advance_recovery',    label: '垫资回收',       direction: 'income', color: COLORS.projectReturn },
  { code: 'income_return_ph',    label: '项目回款-占位',  direction: 'income', color: COLORS.projectReturn },
  // 收入 — 退款
  { code: 'income_refund_ph',    label: '退款-占位',      direction: 'income', color: COLORS.refund },
  // 收入 — 其他收入
  { code: 'income_other_ph',     label: '其他收入-占位',  direction: 'income', color: COLORS.otherIncome },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 分类层级映射（二级 → 一级）
// 成本台账条目存储二级分类 code，此映射定义归属关系。
// CostLedgerList 通过 getCategoryDisplayLabel 按当前显示层级解析标签。
// 支出 5 组 + 收入 4 组，合计 9 个一级分组。
// ═══════════════════════════════════════════════════════════════════════════════

export interface CategoryHierarchyEntry {
  code: string
  level1: string
  level2: string
  level1Color: string
  direction: 'expense' | 'income'
}

export const CATEGORY_HIERARCHY: CategoryHierarchyEntry[] = [
  // ═══ 支出 ═══
  // 业务费
  { code: 'public_relations',  level1: '业务费', level2: '公关招待费',   level1Color: COLORS.business, direction: 'expense' },
  { code: 'intermediary_fee',  level1: '业务费', level2: '居间中介费',   level1Color: COLORS.business, direction: 'expense' },
  { code: 'other_business',    level1: '业务费', level2: '其他业务费',   level1Color: COLORS.business, direction: 'expense' },
  // 直接工程费
  { code: 'labor',             level1: '直接工程费', level2: '劳务费',     level1Color: COLORS.directProject, direction: 'expense' },
  { code: 'material',          level1: '直接工程费', level2: '材料费',     level1Color: COLORS.directProject, direction: 'expense' },
  { code: 'equipment',         level1: '直接工程费', level2: '机械费',     level1Color: COLORS.directProject, direction: 'expense' },
  { code: 'subcontract',       level1: '直接工程费', level2: '专业分包款', level1Color: COLORS.directProject, direction: 'expense' },
  // 现场管理费
  { code: 'temp_facility',     level1: '现场管理费', level2: '临建及办公费', level1Color: COLORS.siteMgmt, direction: 'expense' },
  { code: 'manager_salary',    level1: '现场管理费', level2: '管理人员薪酬', level1Color: COLORS.siteMgmt, direction: 'expense' },
  { code: 'travel_misc',       level1: '现场管理费', level2: '差旅及杂项',   level1Color: COLORS.siteMgmt, direction: 'expense' },
  // 对公服务及前期投入费
  { code: 'bid_guarantee',     level1: '对公服务及前期投入费', level2: '投标及保函费',   level1Color: COLORS.publicService, direction: 'expense' },
  { code: 'consult_testing',   level1: '对公服务及前期投入费', level2: '咨询检测费',     level1Color: COLORS.publicService, direction: 'expense' },
  { code: 'doc_agency',        level1: '对公服务及前期投入费', level2: '资料代理费',     level1Color: COLORS.publicService, direction: 'expense' },
  { code: 'other_public',      level1: '对公服务及前期投入费', level2: '其他对公服务费', level1Color: COLORS.publicService, direction: 'expense' },
  // 财务及其他费
  { code: 'capital_cost',      level1: '财务及其他费', level2: '资金成本',       level1Color: COLORS.finance, direction: 'expense' },
  { code: 'guarantee_fee',     level1: '财务及其他费', level2: '保函及规费',     level1Color: COLORS.finance, direction: 'expense' },
  { code: 'irregular_invoice', level1: '财务及其他费', level2: '非常规发票成本', level1Color: COLORS.finance, direction: 'expense' },
  { code: 'fine_other',        level1: '财务及其他费', level2: '罚款及其他',     level1Color: COLORS.finance, direction: 'expense' },
  // ═══ 收入 ═══
  // 投资款
  { code: 'shareholder_investment', level1: '投资款', level2: '股东投资', level1Color: COLORS.investment, direction: 'income' },
  { code: 'financing',              level1: '投资款', level2: '融资款',   level1Color: COLORS.investment, direction: 'income' },
  { code: 'income_invest_ph',       level1: '投资款', level2: '投资款-占位', level1Color: COLORS.investment, direction: 'income' },
  // 项目回款
  { code: 'advance_recovery',    level1: '项目回款', level2: '垫资回收',     level1Color: COLORS.projectReturn, direction: 'income' },
  { code: 'income_return_ph',    level1: '项目回款', level2: '项目回款-占位', level1Color: COLORS.projectReturn, direction: 'income' },
  // 退款
  { code: 'income_refund_ph',    level1: '退款',     level2: '退款-占位',     level1Color: COLORS.refund, direction: 'income' },
  // 其他收入
  { code: 'income_other_ph',     level1: '其他收入', level2: '其他收入-占位', level1Color: COLORS.otherIncome, direction: 'income' },
]
