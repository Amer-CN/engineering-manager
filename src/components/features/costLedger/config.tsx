import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// 方向配置
// ═══════════════════════════════════════════════════════════════════════════════

export const DIRECTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  expense: { label: '支出', color: 'text-red-600', bg: 'bg-red-50' },
  income:  { label: '收入', color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 费用分类配置（18 支出 + 3 收入，5 个一级分组）— 编译时常量，作为动态分类的兜底
// ═══════════════════════════════════════════════════════════════════════════════

export interface CategoryConfig {
  code: string
  label: string
  direction: 'expense' | 'income'
  color: string
}

export const CATEGORY_CONFIG: CategoryConfig[] = [
  // 业务费
  { code: 'public_relations',  label: '公关招待费',   direction: 'expense', color: '#ec4899' },
  { code: 'intermediary_fee',  label: '居间中介费',   direction: 'expense', color: '#ec4899' },
  { code: 'other_business',    label: '其他业务费',   direction: 'expense', color: '#ec4899' },
  // 直接工程费
  { code: 'labor',             label: '劳务费',       direction: 'expense', color: '#f97316' },
  { code: 'material',          label: '材料费',       direction: 'expense', color: '#f97316' },
  { code: 'equipment',         label: '机械费',       direction: 'expense', color: '#f97316' },
  { code: 'subcontract',       label: '专业分包款',   direction: 'expense', color: '#f97316' },
  // 现场管理费
  { code: 'temp_facility',     label: '临建及办公费', direction: 'expense', color: '#14b8a6' },
  { code: 'manager_salary',    label: '管理人员薪酬', direction: 'expense', color: '#14b8a6' },
  { code: 'travel_misc',       label: '差旅及杂项',   direction: 'expense', color: '#14b8a6' },
  // 对公服务及前期投入费
  { code: 'bid_guarantee',     label: '投标及保函费',   direction: 'expense', color: '#6b7280' },
  { code: 'consult_testing',   label: '咨询检测费',     direction: 'expense', color: '#6b7280' },
  { code: 'doc_agency',        label: '资料代理费',     direction: 'expense', color: '#6b7280' },
  { code: 'other_public',      label: '其他对公服务费', direction: 'expense', color: '#6b7280' },
  // 财务及其他费
  { code: 'capital_cost',      label: '资金成本',       direction: 'expense', color: '#9ca3af' },
  { code: 'guarantee_fee',     label: '保函及规费',     direction: 'expense', color: '#9ca3af' },
  { code: 'irregular_invoice', label: '非常规发票成本', direction: 'expense', color: '#9ca3af' },
  { code: 'fine_other',        label: '罚款及其他',     direction: 'expense', color: '#9ca3af' },
  // 收入 — 投资款
  { code: 'shareholder_investment', label: '股东投资',     direction: 'income', color: '#059669' },
  { code: 'financing',              label: '融资款',       direction: 'income', color: '#059669' },
  { code: 'income_invest_ph',       label: '投资款-占位',  direction: 'income', color: '#059669' },
  // 收入 — 项目回款
  { code: 'advance_recovery',    label: '垫资回收',       direction: 'income', color: '#2563eb' },
  { code: 'income_return_ph',    label: '项目回款-占位',  direction: 'income', color: '#2563eb' },
  // 收入 — 退款
  { code: 'income_refund_ph',    label: '退款-占位',      direction: 'income', color: '#7c3aed' },
  // 收入 — 其他收入
  { code: 'income_other_ph',     label: '其他收入-占位',  direction: 'income', color: '#0891b2' },
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
// 支出 5 组 + 收入 4 组，合计 9 个一级分组。
// ═══════════════════════════════════════════════════════════════════════════════

export interface CategoryHierarchyEntry {
  code: string        // 二级分类 code（对应条目的 category 字段）
  level1: string      // 一级分类名称
  level2: string      // 二级分类名称
  level1Color: string // 一级分类色值（同组二级分类共享）
  direction: 'expense' | 'income'
}

export const CATEGORY_HIERARCHY: CategoryHierarchyEntry[] = [
  // ═══ 支出 ═══
  // 业务费
  { code: 'public_relations',  level1: '业务费', level2: '公关招待费',   level1Color: '#ec4899', direction: 'expense' },
  { code: 'intermediary_fee',  level1: '业务费', level2: '居间中介费',   level1Color: '#ec4899', direction: 'expense' },
  { code: 'other_business',    level1: '业务费', level2: '其他业务费',   level1Color: '#ec4899', direction: 'expense' },
  // 直接工程费
  { code: 'labor',             level1: '直接工程费', level2: '劳务费',     level1Color: '#f97316', direction: 'expense' },
  { code: 'material',          level1: '直接工程费', level2: '材料费',     level1Color: '#f97316', direction: 'expense' },
  { code: 'equipment',         level1: '直接工程费', level2: '机械费',     level1Color: '#f97316', direction: 'expense' },
  { code: 'subcontract',       level1: '直接工程费', level2: '专业分包款', level1Color: '#f97316', direction: 'expense' },
  // 现场管理费
  { code: 'temp_facility',     level1: '现场管理费', level2: '临建及办公费', level1Color: '#14b8a6', direction: 'expense' },
  { code: 'manager_salary',    level1: '现场管理费', level2: '管理人员薪酬', level1Color: '#14b8a6', direction: 'expense' },
  { code: 'travel_misc',       level1: '现场管理费', level2: '差旅及杂项',   level1Color: '#14b8a6', direction: 'expense' },
  // 对公服务及前期投入费
  { code: 'bid_guarantee',     level1: '对公服务及前期投入费', level2: '投标及保函费',   level1Color: '#6b7280', direction: 'expense' },
  { code: 'consult_testing',   level1: '对公服务及前期投入费', level2: '咨询检测费',     level1Color: '#6b7280', direction: 'expense' },
  { code: 'doc_agency',        level1: '对公服务及前期投入费', level2: '资料代理费',     level1Color: '#6b7280', direction: 'expense' },
  { code: 'other_public',      level1: '对公服务及前期投入费', level2: '其他对公服务费', level1Color: '#6b7280', direction: 'expense' },
  // 财务及其他费
  { code: 'capital_cost',      level1: '财务及其他费', level2: '资金成本',       level1Color: '#9ca3af', direction: 'expense' },
  { code: 'guarantee_fee',     level1: '财务及其他费', level2: '保函及规费',     level1Color: '#9ca3af', direction: 'expense' },
  { code: 'irregular_invoice', level1: '财务及其他费', level2: '非常规发票成本', level1Color: '#9ca3af', direction: 'expense' },
  { code: 'fine_other',        level1: '财务及其他费', level2: '罚款及其他',     level1Color: '#9ca3af', direction: 'expense' },
  // ═══ 收入 ═══
  // 投资款
  { code: 'shareholder_investment', level1: '投资款', level2: '股东投资', level1Color: '#059669', direction: 'income' },
  { code: 'financing',              level1: '投资款', level2: '融资款',   level1Color: '#059669', direction: 'income' },
  { code: 'income_invest_ph',       level1: '投资款', level2: '投资款-占位', level1Color: '#059669', direction: 'income' },
  // 项目回款
  { code: 'advance_recovery',    level1: '项目回款', level2: '垫资回收',     level1Color: '#2563eb', direction: 'income' },
  { code: 'income_return_ph',    level1: '项目回款', level2: '项目回款-占位', level1Color: '#2563eb', direction: 'income' },
  // 退款
  { code: 'income_refund_ph',    level1: '退款',     level2: '退款-占位',     level1Color: '#7c3aed', direction: 'income' },
  // 其他收入
  { code: 'income_other_ph',     level1: '其他收入', level2: '其他收入-占位', level1Color: '#0891b2', direction: 'income' },
]

// 快速查找索引（构建一次，O(1) 查表）
const _hierarchyMap: Record<string, CategoryHierarchyEntry> = {}
for (const entry of CATEGORY_HIERARCHY) {
  _hierarchyMap[entry.code] = entry
}

/** 从 CATEGORY_HIERARCHY 提取一级分类列表（去重，保持定义顺序）。可指定方向过滤。 */
export function getLevel1Groups(direction?: 'expense' | 'income'): { name: string; color: string; codes: string[] }[] {
  const seen = new Map<string, { color: string; codes: string[] }>()
  for (const entry of CATEGORY_HIERARCHY) {
    if (direction && entry.direction !== direction) continue
    if (!seen.has(entry.level1)) {
      seen.set(entry.level1, { color: entry.level1Color, codes: [] })
    }
    seen.get(entry.level1)!.codes.push(entry.code)
  }
  return Array.from(seen.entries()).map(([name, info]) => ({ name, ...info }))
}

/** 内置层级分组名称（按方向） */
export const HIERARCHY_GROUP_NAMES: Record<string, string[]> = {
  expense: ['业务费', '直接工程费', '现场管理费', '对公服务及前期投入费', '财务及其他费'],
  income: ['投资款', '项目回款', '退款', '其他收入'],
}

/**
 * 合并动态分类到层级分组中。
 * 返回 level1 分组列表，包含内置 codes + 归属于该组的自定义分类 codes。
 * 不在任何内置组中的自定义分类归入「自定义」组。
 */
export function getLevel1GroupsMerged(
  dynamicCategories?: (CategoryConfig | CostLedgerCategory)[] | null,
  direction?: 'expense' | 'income',
): { name: string; color: string; codes: string[] }[] {
  const groups = getLevel1Groups(direction)
  const groupNames = new Set(groups.map(g => g.name))
  const customByGroup = new Map<string, string[]>()
  const orphans: string[] = []

  if (dynamicCategories && dynamicCategories.length > 0) {
    for (const c of dynamicCategories) {
      if ((c as any).isEnabled === false) continue
      if (direction && c.direction !== direction) continue
      // 内置分类已经在 groups 的 codes 中，跳过
      const isBuiltin = (c as any).isBuiltin
      if (isBuiltin) continue
      const l1 = (c as any).level1 as string | undefined
      if (l1 && groupNames.has(l1)) {
        if (!customByGroup.has(l1)) customByGroup.set(l1, [])
        customByGroup.get(l1)!.push(c.code)
      } else if (l1) {
        if (!customByGroup.has(l1)) customByGroup.set(l1, [])
        customByGroup.get(l1)!.push(c.code)
      } else {
        orphans.push(c.code)
      }
    }
  }

  // Merge custom codes into their respective groups
  const result = groups.map(g => ({
    ...g,
    codes: [...g.codes, ...(customByGroup.get(g.name) || [])],
  }))

  // Add entirely custom groups (level1 not in builtin hierarchy)
  for (const [name, codes] of customByGroup) {
    if (!groupNames.has(name)) {
      result.push({ name, color: '#6366f1', codes })
    }
  }

  // Add orphan group (custom categories without level1)
  if (orphans.length > 0) {
    result.push({ name: '(自定义)', color: '#6366f1', codes: orphans })
  }

  return result
}

/** 获取指定一级分类下的二级分类 code 列表 */
export function getLevel2Codes(level1Name: string): string[] {
  return CATEGORY_HIERARCHY.filter(e => e.level1 === level1Name).map(e => e.code)
}

/**
 * 查找 code 所属的一级分类名。
 * 优先查动态 categories 的 level1 字段（支持用户编辑一级名称），再回退编译时 CATEGORY_HIERARCHY。
 */
export function getLevel1ForCode(code: string, dynamicCategories?: (CategoryConfig | CostLedgerCategory)[] | null): string | null {
  if (dynamicCategories && dynamicCategories.length > 0) {
    const cat = dynamicCategories.find(c => c.code === code) as any
    if (cat?.level1) return cat.level1
  }
  return _hierarchyMap[code]?.level1 ?? null
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
    return getLevel1ForCode(code, dynamicCategories) ?? getCategoryLabel(code, dynamicCategories)
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
  const fromHierarchy = _hierarchyMap[code]?.level1Color
  if (fromHierarchy) return fromHierarchy
  // Check dynamic categories for level1 color
  if (dynamicCategories && dynamicCategories.length > 0) {
    const cat = dynamicCategories.find(c => c.code === code) as any
    if (cat?.level1) {
      // Try to find the group color from hierarchy or use the category's own color
      const groupColor = _hierarchyMap[cat.code]?.level1Color
      return groupColor ?? cat.color ?? '#9ca3af'
    }
  }
  return getCategoryColor(code, dynamicCategories)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 空条目模板（供表单使用）
// ═══════════════════════════════════════════════════════════════════════════════

export function emptyEntry(projectId: number): Omit<CostLedgerEntry, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    projectId,
    voucherNo: '',
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
