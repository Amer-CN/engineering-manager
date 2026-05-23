/**
 * 全局工人信息库 IPC 处理器（双写模式）
 * projectWorkers 相关 handler 已拆分到 project-workers.ts
 */
import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, workerQueries } from '../sqlite/queries'
import { getAttendanceFirstDay, computeWorkerProjectStats } from './worker-utils'

// ════════════════════════════════════════════════════════════════════════════
// 全局工人 CRUD (db.workers)
// ════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:workers:getAll', (_, search?: string, workerType?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    const data = workerQueries.listWorkers(search, workerType)
    if (data) return { success: true, data }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.workers) db.workers = []
  let workers = db.workers
  if (search) {
    const kw = search.toLowerCase()
    workers = workers.filter((w: any) =>
      w.name.toLowerCase().includes(kw) ||
      w.idCard.toLowerCase().includes(kw) ||
      (w.phone && w.phone.includes(search))
    )
  }
  if (workerType) {
    const matchingIds = new Set(
      (db.projectWorkers || []).filter((pw: any) => pw.workerType === workerType).map((pw: any) => pw.workerId)
    )
    workers = workers.filter((w: any) => matchingIds.has(w.id))
  }

  const enriched = workers.map((w: any) => {
    const pws = (db.projectWorkers || []).filter((pw: any) => pw.workerId === w.id)
    const activeProjects = pws.filter((pw: any) => pw.status === 'active')
    return { ...w, projectCount: pws.length, activeProjectCount: activeProjects.length }
  })

  return { success: true, data: enriched.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:workers:create', (_, worker) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.workers) db.workers = []
  try {
    if (worker.idCard) {
      if (useSqliteRead()) {
        const exists = workerQueries.existsByIdCard(worker.idCard)
        if (exists === true) return { success: false, error: '身份证号重复' }
      } else {
        const exists = db.workers.find((w: any) => w.idCard.trim() === worker.idCard.trim())
        if (exists) return { success: false, error: '身份证号重复' }
      }
    }
    const id = Date.now()
    const newWorker = { ...worker, id, createdAt: new Date().toISOString() }
    db.workers.push(newWorker)
    saveDatabase()

    if (useSqliteWrite()) {
      workerQueries.createWorker(newWorker)
    }

    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create worker:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:workers:update', (_, worker) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.workers) db.workers = []
  try {
    const index = db.workers.findIndex((w: any) => w.id === worker.id)
    if (index !== -1) {
      db.workers[index] = { ...db.workers[index], ...worker }
      saveDatabase()

      if (useSqliteWrite()) {
        workerQueries.updateWorker(worker.id, worker)
      }

      return { success: true, data: db.workers[index] }
    }
    return { success: false, error: '工人不存在' }
  } catch (error: any) {
    log.error('Failed to update worker:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:workers:delete', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.projectWorkers) db.projectWorkers = []

    // 检查活跃用工
    let activePWs: any[] = []
    if (useSqliteRead()) {
      const count = workerQueries.countActiveProjectWorkers(id)
      if (count !== null && count > 0) {
        return { success: false, error: `该工人在 ${count} 个项目中仍有活跃用工记录，请先离场` }
      }
    } else {
      activePWs = db.projectWorkers.filter((pw: any) => pw.workerId === id && pw.status === 'active')
      if (activePWs.length > 0) {
        return { success: false, error: `该工人在 ${activePWs.length} 个项目中仍有活跃用工记录，请先离场` }
      }
    }

    // JSON 删除（级联删除 projectWorkers）
    db.projectWorkers = db.projectWorkers.filter((pw: any) => pw.workerId !== id)
    if (db.workers) db.workers = db.workers.filter((w: any) => w.id !== id)
    saveDatabase()

    // SQLite 双写（级联删除）
    if (useSqliteWrite()) {
      workerQueries.deleteWorker(id)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete worker:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:workers:getStats', (_, workerId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    try {
      const stats = workerQueries.getWorkerStats(workerId)
      if (stats) return { success: true, data: stats }
    } catch (err) {
      log.warn('[workers:getStats] SQLite read failed, falling back to JSON:', err)
    }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  try {
    const stats = computeWorkerProjectStats(workerId, db)
    return { success: true, data: stats }
  } catch (error: any) {
    log.error('Failed to get worker stats:', error)
    return { success: false, error: error.message }
  }
})
