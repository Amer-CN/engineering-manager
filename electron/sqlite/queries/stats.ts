/**
 * 仪表盘统计 SQLite 查询模块
 *
 * 聚合多个表的统计数据，用于仪表盘展示。
 * - 项目数 / 进行中项目数
 * - 人员数
 * - 材料数
 * - 成本台账支出汇总 + 按分类分组
 * - 结算数 / 发票数 / 库存数
 * - 最近5个项目
 */

import log from 'electron-log'
import { tryGetSqlite } from './helpers'

/** 仪表盘统计数据 */
export interface DashboardStats {
  projectsCount: number
  membersCount: number
  materialsCount: number
  totalExpenses: number
  expenseByCategory: Record<string, number>
  settlementsCount: number
  invoicesCount: number
  inventoryItemsCount: number
  inProgressProjects: number
  recentProjects: any[]
}

/** 获取仪表盘统计数据 */
export function getDashboard(): DashboardStats | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    // 1. 项目统计
    const projectStats = sqlite.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress
      FROM projects
    `).get() as { total: number; in_progress: number }

    // 2. 人员数
    const memberCount = (sqlite.prepare('SELECT COUNT(*) AS c FROM members').get() as { c: number }).c

    // 3. 材料数
    const materialCount = (sqlite.prepare('SELECT COUNT(*) AS c FROM materials').get() as { c: number }).c

    // 4. 成本台账支出汇总 + 按分类分组
    const totalExpense = (sqlite.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM cost_ledger WHERE direction = 'expense'"
    ).get() as { total: number }).total

    // 按分类汇总支出（需要关联 categories 表获取标签）
    const categoryRows = sqlite.prepare(`
      SELECT
        COALESCE(cl.category, '其他') AS category_code,
        COALESCE(c.level1, c.label, cl.category, '其他') AS category_label,
        SUM(cl.amount) AS total
      FROM cost_ledger cl
      LEFT JOIN cost_ledger_categories c ON c.code = cl.category AND c.is_enabled = 1
      WHERE cl.direction = 'expense'
      GROUP BY cl.category
    `).all() as { category_label: string; total: number }[]

    const expenseByCategory: Record<string, number> = {}
    for (const row of categoryRows) {
      expenseByCategory[row.category_label] = Math.round((row.total || 0) * 100) / 100
    }

    // 5. 结算数
    const settlementCount = (sqlite.prepare('SELECT COUNT(*) AS c FROM settlements').get() as { c: number }).c

    // 6. 发票数
    const invoiceCount = (sqlite.prepare('SELECT COUNT(*) AS c FROM invoices').get() as { c: number }).c

    // 7. 库存数
    const inventoryCount = (sqlite.prepare('SELECT COUNT(*) AS c FROM inventory_items').get() as { c: number }).c

    // 8. 最近5个项目
    const recentProjects = (sqlite.prepare(
      'SELECT * FROM projects ORDER BY created_at DESC LIMIT 5'
    ).all() as any[]).map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      createdAt: r.created_at,
      // 保留前端可能用到的字段
      startDate: r.start_date,
      endDate: r.end_date,
    }))

    return {
      projectsCount: projectStats.total || 0,
      membersCount: memberCount,
      materialsCount: materialCount,
      totalExpenses: Math.round((totalExpense || 0) * 100) / 100,
      expenseByCategory,
      settlementsCount: settlementCount,
      invoicesCount: invoiceCount,
      inventoryItemsCount: inventoryCount,
      inProgressProjects: projectStats.in_progress || 0,
      recentProjects,
    }
  } catch (err) {
    log.error('[SQLite] stats.getDashboard error:', err)
    return null
  }
}
