import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// 方向配置
// ═══════════════════════════════════════════════════════════════════════════════

export const DIRECTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  expense: { label: '支出', color: 'text-red-600', bg: 'bg-red-50' },
  income:  { label: '收入', color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 费用分类配置（9 支出 + 3 收入）— 编译时常量，作为动态分类的兜底
// ═══════════════════════════════════════════════════════════════════════════════

export interface CategoryConfig {
  code: string
  label: string
  direction: 'expense' | 'income'
  color: string
}

export const CATEGORY_CONFIG: CategoryConfig[] = [
  // 支出分类
  { code: 'labor',             label: '人工',         direction: 'expense', color: '#f97316' },
  { code: 'material',          label: '材料',         direction: 'expense', color: '#3b82f6' },
  { code: 'equipment',         label: '机械',         direction: 'expense', color: '#8b5cf6' },
  { code: 'pre_project',       label: '前期费用',     direction: 'expense', color: '#6b7280' },
  { code: 'business_expense',  label: '业务费用',     direction: 'expense', color: '#ec4899' },
  { code: 'advance',           label: '垫资支出',     direction: 'expense', color: '#ef4444' },
  { code: 'salary',            label: '管理人员工资', direction: 'expense', color: '#14b8a6' },
  { code: 'tax',               label: '税金',         direction: 'expense', color: '#a855f7' },
  { code: 'other',             label: '其他',         direction: 'expense', color: '#9ca3af' },
  // 收入分类
  { code: 'shareholder_investment', label: '股东投资', direction: 'income', color: '#059669' },
  { code: 'financing',              label: '融资款',   direction: 'income', color: '#0891b2' },
  { code: 'advance_recovery',       label: '垫资回收', direction: 'income', color: '#2563eb' },
]

/**
 * 解析分类显示标签。
 * 优先从动态 categories（数据库）查找 → 回退到硬编码 CATEGORY_CONFIG → 最后回退到 code 本身。
 * 这样用户通过 CategoryManager 编辑内置分类名称后，列表会立即显示新名称。
 */
export function getCategoryLabel(code: string, dynamicCategories?: (CategoryConfig | CostLedgerCategory)[] | null): string {
  if (dynamicCategories && dynamicCategories.length > 0) {
    const found = dynamicCategories.find(c => c.code === code)
    if (found) return found.label
  }
  // 兜底：动态分类中找不到时，从硬编码常量查找
  return CATEGORY_CONFIG.find(c => c.code === code)?.label || code
}

/**
 * 解析分类颜色。
 * 优先级：动态 categories → 硬编码 CATEGORY_CONFIG → 默认灰色
 */
export function getCategoryColor(code: string, dynamicCategories?: (CategoryConfig | CostLedgerCategory)[] | null): string {
  if (dynamicCategories && dynamicCategories.length > 0) {
    const found = dynamicCategories.find(c => c.code === code)
    if (found) return found.color
  }
  return CATEGORY_CONFIG.find(c => c.code === code)?.color || '#9ca3af'
}

export function getCategoriesByDirection(direction: 'expense' | 'income', categories?: CategoryConfig[]): CategoryConfig[] {
  const list = categories || CATEGORY_CONFIG
  return list.filter(c => c.direction === direction)
}

/**
 * 检查分类 code 在动态分类列表中是否存在且启用。
 * 用于检测台账记录引用了已被删除或禁用的分类。
 */
export function isCategoryMissing(code: string, dynamicCategories?: (CategoryConfig | CostLedgerCategory)[] | null): boolean {
  if (!dynamicCategories || dynamicCategories.length === 0) return false
  return !dynamicCategories.some(c => c.code === code && (c as any).isEnabled !== false)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 分类层级映射（二级 → 一级）
// 成本台账条目存储二级分类 code，此映射定义归属关系。
// CostLedgerList 通过 getCategoryDisplayLabel 按当前显示层级解析标签。
// 收入分类与用户自定义分类不在此映射中，切换为一级时回退显示自身标签。
// ═══════════════════════════════════════════════════════════════════════════════

export interface CategoryHierarchyEntry {
  code: string        // 二级分类 code（对应条目的 category 字段）
  level1: string      // 一级分类名称
  level2: string      // 二级分类名称
  level1Color: string // 一级分类色值（同组二级分类共享）
}

export const CATEGORY_HIERARCHY: CategoryHierarchyEntry[] = [
  // 业务费
  { code: 'public_relations',  level1: '业务费', level2: '公关招待费',   level1Color: '#ec4899' },
  { code: 'intermediary_fee',  level1: '业务费', level2: '居间中介费',   level1Color: '#ec4899' },
  { code: 'other_business',    level1: '业务费', level2: '其他业务费',   level1Color: '#ec4899' },
  // 直接工程费
  { code: 'labor',             level1: '直接工程费', level2: '劳务费',     level1Color: '#f97316' },
  { code: 'material',          level1: '直接工程费', level2: '材料费',     level1Color: '#f97316' },
  { code: 'equipment',         level1: '直接工程费', level2: '机械费',     level1Color: '#f97316' },
  { code: 'subcontract',       level1: '直接工程费', level2: '专业分包款', level1Color: '#f97316' },
  // 现场管理费
  { code: 'temp_facility',     level1: '现场管理费', level2: '临建及办公费', level1Color: '#14b8a6' },
  { code: 'manager_salary',    level1: '现场管理费', level2: '管理人员薪酬', level1Color: '#14b8a6' },
  { code: 'travel_misc',       level1: '现场管理费', level2: '差旅及杂项',   level1Color: '#14b8a6' },
  // 对公服务及前期投入费
  { code: 'bid_guarantee',     level1: '对公服务及前期投入费', level2: '投标及保函费',   level1Color: '#6b7280' },
  { code: 'consult_testing',   level1: '对公服务及前期投入费', level2: '咨询检测费',     level1Color: '#6b7280' },
  { code: 'doc_agency',        level1: '对公服务及前期投入费', level2: '资料代理费',     level1Color: '#6b7280' },
  { code: 'other_public',      level1: '对公服务及前期投入费', level2: '其他对公服务费', level1Color: '#6b7280' },
  // 财务及其他费
  { code: 'capital_cost',      level1: '财务及其他费', level2: '资金成本',       level1Color: '#9ca3af' },
  { code: 'guarantee_fee',     level1: '财务及其他费', level2: '保函及规费',     level1Color: '#9ca3af' },
  { code: 'irregular_invoice', level1: '财务及其他费', level2: '非常规发票成本', level1Color: '#9ca3af' },
  { code: 'fine_other',        level1: '财务及其他费', level2: '罚款及其他',     level1Color: '#9ca3af' },
]

// 快速查找索引（构建一次，O(1) 查表）
const _hierarchyMap: Record<string, CategoryHierarchyEntry> = {}
for (const entry of CATEGORY_HIERARCHY) {
  _hierarchyMap[entry.code] = entry
}

/**
 * 根据当前显示层级获取分类标签。
 * @param code 条目存储的二级分类 code
 * @param level 'level2' 返回二级名；'level1' 返回一级名（不在映射中则回退自身标签）
 * @param dynamicCategories 用户自定义分类列表
 */
export function getCategoryDisplayLabel(
  code: string,
  level: 'level1' | 'level2',
  dynamicCategories?: (CategoryConfig | CostLedgerCategory)[] | null,
): string {
  if (level === 'level1') {
    return _hierarchyMap[code]?.level1 ?? getCategoryLabel(code, dynamicCategories)
  }
  return getCategoryLabel(code, dynamicCategories)
}

/**
 * 获取一级分类色值。code 不在映射中时，回退到 getCategoryColor。
 */
export function getLevel1Color(
  code: string,
  dynamicCategories?: (CategoryConfig | CostLedgerCategory)[] | null,
): string {
  return _hierarchyMap[code]?.level1Color ?? getCategoryColor(code, dynamicCategories)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 空条目模板（供表单使用）
// ═══════════════════════════════════════════════════════════════════════════════

export function emptyEntry(projectId: number): Omit<CostLedgerEntry, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    projectId,
    voucherNo: 0,
    date: new Date().toISOString().slice(0, 10),
    direction: 'expense',
    amount: 0,
    category: 'labor',
    summary: '',
    counterparty: '',
    channel: '',
    attachments: [],
  }
}
