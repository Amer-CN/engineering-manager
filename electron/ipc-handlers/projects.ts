/**
 * 项目 IPC 处理器
 * 双写：SQLite（projects 表 + 级联删除 9 张关联表）
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, shouldFallbackToJson, projectQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 项目 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:projects:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = projectQueries.listProjects()
    if (data !== null) return { success: true, data }
  }
  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  const result = db.projects.map((p: any) => {
    const manager = p.projectManagerId ? db.members.find((m: any) => m.id === p.projectManagerId) : null
    return {
      ...p,
      projectManagerName: manager?.name || ''
    }
  })
  return { success: true, data: result.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:projects:create', (_, project) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newProject = {
      ...project,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.projects.push(newProject)
    saveDatabase()
    // SQLite 双写
    projectQueries.createProject(newProject)
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create project:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projects:update', (_, project) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.projects.findIndex((p: any) => p.id === project.id)
    if (index !== -1) {
      db.projects[index] = { ...db.projects[index], ...project, updatedAt: new Date().toISOString() }
      saveDatabase()
      // SQLite 双写
      projectQueries.updateProject(db.projects[index])
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update project:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projects:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.projects = db.projects.filter((p: any) => p.id !== id)
    // 级联删除关联数据
    if (db.costLedger) db.costLedger = db.costLedger.filter((e: any) => e.projectId !== id)
    if (db.settlements) db.settlements = db.settlements.filter((s: any) => s.projectId !== id)
    if (db.invoices) db.invoices = db.invoices.filter((inv: any) => inv.projectId !== id)
    if (db.incomeContracts) db.incomeContracts = db.incomeContracts.filter((c: any) => c.projectId !== id)
    if (db.expenseContracts) db.expenseContracts = db.expenseContracts.filter((c: any) => c.projectId !== id)
    if (db.agreementContracts) db.agreementContracts = db.agreementContracts.filter((c: any) => c.projectId !== id)
    if (db.wages) db.wages = db.wages.filter((w: any) => w.projectId !== id)
    if (db.attendances) db.attendances = db.attendances.filter((a: any) => a.projectId !== id)
    if (db.projectMembers) db.projectMembers = db.projectMembers.filter((m: any) => m.projectId !== id)
    saveDatabase()
    // SQLite 双写（含级联删除）
    projectQueries.deleteProject(id)
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete project:', error)
    return { success: false, error: error.message }
  }
})
