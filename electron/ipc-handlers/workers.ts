/**
 * 全局工人信息库 + 项目用工关系 IPC 处理器
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// 全局工人 CRUD (db.workers)
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:workers:getAll', (_, search?: string, workerType?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
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
    // Filter via projectWorkers — workers who have at least one PW with this workerType
    const matchingIds = new Set(
      (db.projectWorkers || []).filter((pw: any) => pw.workerType === workerType).map((pw: any) => pw.workerId)
    )
    workers = workers.filter((w: any) => matchingIds.has(w.id))
  }

  // Attach project summary per worker
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
      const exists = db.workers.find((w: any) => w.idCard.trim() === worker.idCard.trim())
      if (exists) return { success: false, error: '身份证号重复' }
    }
    const id = Date.now()
    const newWorker = { ...worker, id, createdAt: new Date().toISOString() }
    db.workers.push(newWorker)
    saveDatabase()
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
    const activePWs = db.projectWorkers.filter((pw: any) => pw.workerId === id && pw.status === 'active')
    if (activePWs.length > 0) {
      return { success: false, error: `该工人在 ${activePWs.length} 个项目中仍有活跃用工记录，请先离场` }
    }
    db.projectWorkers = db.projectWorkers.filter((pw: any) => pw.workerId !== id)
    if (db.workers) db.workers = db.workers.filter((w: any) => w.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete worker:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:workers:getStats', (_, workerId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.projectWorkers) db.projectWorkers = []; if (!db.wages) db.wages = []
    const pws = db.projectWorkers.filter((pw: any) => pw.workerId === workerId)
    let totalEarnings = 0
    for (const pw of pws) {
      const wages = db.wages.filter((w: any) => w.projectWorkerId === pw.id || (w.memberId && !w.projectWorkerId))
      totalEarnings += wages.reduce((sum: number, w: any) => sum + (w.actualWage || 0), 0)
    }
    const projectBreakdown = pws.map((pw: any) => {
      const project = db.projects?.find((p: any) => p.id === pw.projectId)
      const wages = db.wages.filter((w: any) => w.projectWorkerId === pw.id)
      const total = wages.reduce((sum: number, w: any) => sum + (w.actualWage || 0), 0)
      return { projectId: pw.projectId, projectName: project?.name || '未知项目', total }
    })
    return { success: true, data: { projectCount: pws.length, totalEarnings, projectBreakdown } }
  } catch (error: any) {
    log.error('Failed to get worker stats:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 项目用工关系 CRUD (db.projectWorkers)
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:projectWorkers:getAll', (_, projectId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.projectWorkers) db.projectWorkers = []
  const pws = db.projectWorkers.filter((pw: any) => pw.projectId === projectId)
  const enriched = pws.map((pw: any) => {
    const worker = db.workers?.find((w: any) => w.id === pw.workerId)
    const team = db.workerTeams?.find((t: any) => t.id === pw.teamId)
    const project = db.projects?.find((p: any) => p.id === pw.projectId)
    return {
      ...pw,
      worker: worker || null,
      workerName: worker?.name || '',
      workerIdCard: worker?.idCard || '',
      teamName: team?.name || '',
      projectName: project?.name || ''
    }
  })
  return { success: true, data: enriched.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:projectWorkers:create', (_, pw) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.projectWorkers) db.projectWorkers = []
  try {
    if (pw.workerId && pw.projectId) {
      const exists = db.projectWorkers.find((p: any) =>
        p.workerId === pw.workerId && p.projectId === pw.projectId
      )
      if (exists) return { success: false, error: '该工人已在此项目中' }
    }
    const id = Date.now()
    const newPW = { ...pw, id, createdAt: new Date().toISOString() }
    db.projectWorkers.push(newPW)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create projectWorker:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projectWorkers:update', (_, pw) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.projectWorkers) db.projectWorkers = []
  try {
    const index = db.projectWorkers.findIndex((p: any) => p.id === pw.id)
    if (index !== -1) {
      db.projectWorkers[index] = { ...db.projectWorkers[index], ...pw }
      saveDatabase()
      return { success: true, data: db.projectWorkers[index] }
    }
    return { success: false, error: '用工记录不存在' }
  } catch (error: any) {
    log.error('Failed to update projectWorker:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projectWorkers:delete', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.projectWorkers) db.projectWorkers = []
  try {
    db.projectWorkers = db.projectWorkers.filter((pw: any) => pw.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete projectWorker:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projectWorkers:batchCreate', (_, entries: any[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.projectWorkers) db.projectWorkers = []
  try {
    const ids: number[] = []
    const now = new Date().toISOString()

    // All-or-nothing validation pass
    for (const entry of entries) {
      if (entry.workerId && entry.projectId) {
        const exists = db.projectWorkers.find((p: any) =>
          p.workerId === entry.workerId && p.projectId === entry.projectId
        )
        if (exists) {
          return { success: false, error: `工人已在项目中 (workerId=${entry.workerId})` }
        }
      }
    }

    for (const entry of entries) {
      const id = Date.now() + ids.length
      db.projectWorkers.push({ ...entry, id, createdAt: now })
      ids.push(id)
    }
    saveDatabase()
    return { success: true, data: { ids } }
  } catch (error: any) {
    log.error('Failed to batch create projectWorkers:', error)
    return { success: false, error: error.message }
  }
})
