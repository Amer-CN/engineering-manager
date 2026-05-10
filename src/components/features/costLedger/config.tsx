import type { CostLedgerEntry } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// 方向配置
// ═══════════════════════════════════════════════════════════════════════════════

export const DIRECTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  expense: { label: '支出', color: 'text-red-600', bg: 'bg-red-50' },
  income:  { label: '收入', color: 'text-emerald-600', bg: 'bg-emerald-50' },
}

// ═══════════════════════════════════════════════════════════════════════════════
// 费用分类配置（9 支出 + 2 收入）
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

export function getCategoryLabel(code: string, categories?: CategoryConfig[]): string {
  const list = categories || CATEGORY_CONFIG
  return list.find(c => c.code === code)?.label || code
}

export function getCategoryColor(code: string, categories?: CategoryConfig[]): string {
  const list = categories || CATEGORY_CONFIG
  return list.find(c => c.code === code)?.color || '#9ca3af'
}

export function getCategoriesByDirection(direction: 'expense' | 'income', categories?: CategoryConfig[]): CategoryConfig[] {
  const list = categories || CATEGORY_CONFIG
  return list.filter(c => c.direction === direction)
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
