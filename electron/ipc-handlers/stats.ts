/**
 * 统计 IPC 处理器 — SQLite 优先读取版
 *
 * 仪表盘统计接口，SQLite 优先聚合，JSON 回退。
 */
import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady } from '../database'
import { useSqliteRead, shouldFallbackToJson } from '../sqlite'
import { statsQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 统计接口
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:stats:getDashboard', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先读取
  if (useSqliteRead()) {
    try {
      const stats = statsQueries.getDashboard()
      if (stats) {
        // 补充 recentProjects 的完整字段（SQLite 查询只返回基本字段）
        const recentProjects = stats.recentProjects.map((p: any) => {
          const fullProject = db.projects.find((fp: any) => fp.id === p.id)
          return fullProject || p
        })
        return { success: true, data: { ...stats, recentProjects } }
      }
    } catch (err) {
      log.warn('[stats:getDashboard] SQLite read failed, falling back to JSON:', err)
    }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  try {
    const projectsCount = db.projects.length
    const membersCount = db.members.length
    const materialsCount = db.materials.length
    const totalExpenses = (db.costLedger || []).filter((e: any) => e.direction === 'expense').reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
    const resolveCategoryLabel = (code: string): string => {
      if (db.costLedgerCategories) {
        const cat = db.costLedgerCategories.find((c: any) => c.code === code && c.isEnabled !== false)
        if (cat) return cat.level1 || cat.label
      }
      return code
    }
    const expenseByCategory: Record<string, number> = {}
    for (const e of (db.costLedger || [])) {
      if (e.direction === 'expense') {
        const label = resolveCategoryLabel(e.category || '其他')
        expenseByCategory[label] = (expenseByCategory[label] || 0) + (e.amount || 0)
      }
    }
    const settlementsCount = db.settlements?.length || 0
    const invoicesCount = db.invoices?.length || 0
    const inventoryItemsCount = db.inventoryItems?.length || 0
    const inProgressProjects = db.projects.filter((p: any) => p.status === 'in_progress').length

    const recentProjects = [...db.projects]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    return {
      success: true,
      data: {
        projectsCount,
        membersCount,
        materialsCount,
        totalExpenses,
        expenseByCategory,
        settlementsCount,
        invoicesCount,
        inventoryItemsCount,
        inProgressProjects,
        recentProjects
      }
    }
  } catch (error: any) {
    log.error('Failed to get stats:', error)
    return { success: false, error: error.message }
  }
})
