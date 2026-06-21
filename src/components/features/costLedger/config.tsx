import type { CostLedgerEntry, CostLedgerCategory } from '@/types'
import {
  DIRECTION_CONFIG,
  CATEGORY_CONFIG,
  CATEGORY_HIERARCHY,
  type CategoryConfig,
  type CategoryHierarchyEntry,
} from './costLedgerColors'

export { DIRECTION_CONFIG, CATEGORY_CONFIG, CATEGORY_HIERARCHY }
export type { CategoryConfig, CategoryHierarchyEntry }

// ═══════════════════════════════════════════════════════════════════════════════
// 分类查找函数
// ═══════════════════════════════════════════════════════════════════════════════

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
// 快速查找索引（构建一次，O(1) 查表）
// ═══════════════════════════════════════════════════════════════════════════════

// 同时注册 snake_case 和 camelCase key，兼容 api-client.ts 的 convertKeysToCamelCase
const _hierarchyMap: Record<string, CategoryHierarchyEntry> = {}
for (const entry of CATEGORY_HIERARCHY) {
  _hierarchyMap[entry.code] = entry
  const camelKey = entry.code.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  if (camelKey !== entry.code) _hierarchyMap[camelKey] = entry
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

  // Merge custom codes into their respective groups — 按 name 去重避免重复组
  const seenNames = new Set<string>()
  const result: { name: string; color: string; codes: string[] }[] = []
  for (const g of groups) {
    if (seenNames.has(g.name)) continue
    seenNames.add(g.name)
    result.push({
      ...g,
      codes: [...g.codes, ...(customByGroup.get(g.name) || [])],
    })
  }

  // Add entirely custom groups (level1 not in builtin hierarchy)
  for (const [name, codes] of customByGroup) {
    if (!seenNames.has(name)) {
      seenNames.add(name)
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
