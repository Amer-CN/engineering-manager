/**
 * 统计 IPC 处理器
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady } from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// 统计接口
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:stats:getDashboard', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const projectsCount = db.projects.length
    const tasksCount = db.tasks.length
    const tasksCompleted = db.tasks.filter((t: any) => t.status === 'completed').length
    const membersCount = db.members.length
    const materialsCount = db.materials.length
    const totalExpenses = (db.costLedger || []).filter((e: any) => e.direction === 'expense').reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
    const expenseByCategory: Record<string, number> = {}
    for (const e of (db.costLedger || [])) {
      if (e.direction === 'expense') {
        expenseByCategory[e.category || '其他'] = (expenseByCategory[e.category || '其他'] || 0) + (e.amount || 0)
      }
    }
    const settlementsCount = db.settlements?.length || 0
    const invoicesCount = db.invoices?.length || 0
    const inventoryItemsCount = db.inventoryItems?.length || 0
    const inProgressProjects = db.projects.filter((p: any) => p.status === 'in_progress').length

    const recentProjects = [...db.projects]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    const recentTasks = [...db.tasks]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((task: any) => {
        const project = db.projects.find((p: any) => p.id === task.projectId)
        const member = db.members.find((m: any) => m.id === task.assigneeId)
        return {
          ...task,
          projectName: project?.name || '',
          assigneeName: member?.name || ''
        }
      })

    return {
      success: true,
      data: {
        projectsCount,
        tasksCount,
        tasksCompleted,
        taskCompletionRate: tasksCount > 0 ? Math.round((tasksCompleted / tasksCount) * 100) : 0,
        membersCount,
        materialsCount,
        totalExpenses,
        expenseByCategory,
        settlementsCount,
        invoicesCount,
        inventoryItemsCount,
        inProgressProjects,
        recentProjects,
        recentTasks
      }
    }
  } catch (error: any) {
    log.error('Failed to get stats:', error)
    return { success: false, error: error.message }
  }
})
