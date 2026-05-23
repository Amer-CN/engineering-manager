/**
 * 合作单位 IPC 处理器
 * 双写：SQLite（partners、regions、supervisors 三张表）
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, shouldFallbackToJson, partnerQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 合作单位 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:partners:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = partnerQueries.listPartners()
    if (data !== null) return { success: true, data }
  }
  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  const partnersWithProjectNames = db.partners.map((p: any) => {
    const projectNames = p.projectIds && p.projectIds.length > 0
      ? db.projects
          .filter((proj: any) => p.projectIds.includes(proj.id))
          .map((proj: any) => proj.name)
          .join(', ')
      : ''
    return { ...p, projectNames }
  })
  return { success: true, data: partnersWithProjectNames.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:partners:create', (_, partner) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newPartner = {
      ...partner,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.partners.push(newPartner)
    saveDatabase()
    // SQLite 双写
    partnerQueries.createPartner(newPartner)
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create partner:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:partners:update', (_, partner) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.partners.findIndex((p: any) => p.id === partner.id)
    if (index !== -1) {
      db.partners[index] = { ...db.partners[index], ...partner, updatedAt: new Date().toISOString() }
      saveDatabase()
      // SQLite 双写
      partnerQueries.updatePartner(db.partners[index])
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update partner:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:partners:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.partners = db.partners.filter((p: any) => p.id !== id)
    saveDatabase()
    // SQLite 双写
    partnerQueries.deletePartner(id)
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete partner:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:partners:getByProject', (_, projectId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = partnerQueries.listPartnersByProject(projectId)
    if (data !== null) return { success: true, data }
  }
  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.partners) db.partners = []
  const data = db.partners.filter((p: any) => p.projectIds && p.projectIds.includes(projectId))
  return { success: true, data }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 地区 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:regions:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = partnerQueries.listRegions()
    if (data !== null) return { success: true, data }
  }
  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  return { success: true, data: db.regions.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:regions:create', (_, region) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // 检查是否已存在相同地区
    const exists = db.regions.find((r: any) => 
      r.province === region.province && r.city === region.city && r.district === region.district
    )
    if (exists) {
      return { success: false, error: '该地区已存在' }
    }
    const id = Date.now()
    const newRegion = { ...region, id, createdAt: new Date().toISOString() }
    db.regions.push(newRegion)
    saveDatabase()
    // SQLite 双写
    partnerQueries.createRegion(newRegion)
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create region:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:regions:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // 检查是否被监管单位引用
    const usedBy = db.supervisors.filter((s: any) => s.regionId === id)
    if (usedBy.length > 0) {
      return { success: false, error: '该地区已被监管单位引用，无法删除' }
    }
    db.regions = db.regions.filter((r: any) => r.id !== id)
    saveDatabase()
    // SQLite 双写
    partnerQueries.deleteRegion(id)
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete region:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 监管单位 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:supervisors:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = partnerQueries.listSupervisors()
    if (data !== null) return { success: true, data }
  }
  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  const supervisors = db.supervisors.map((s: any) => {
    const region = db.regions.find((r: any) => r.id === s.regionId)
    const projectNames = (s.projectIds || []).map((pid: number) => {
      const project = db.projects.find((p: any) => p.id === pid)
      return project?.name || ''
    }).filter(Boolean).join(', ')
    return {
      ...s,
      regionName: region ? `${region.province}-${region.city}-${region.district}` : '',
      projectNames
    }
  })
  return { success: true, data: supervisors.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:supervisors:create', (_, supervisor) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newSupervisor = {
      ...supervisor,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.supervisors.push(newSupervisor)
    saveDatabase()
    // SQLite 双写
    partnerQueries.createSupervisor(newSupervisor)
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create supervisor:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:supervisors:update', (_, supervisor) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.supervisors.findIndex((s: any) => s.id === supervisor.id)
    if (index !== -1) {
      db.supervisors[index] = { ...db.supervisors[index], ...supervisor, updatedAt: new Date().toISOString() }
      saveDatabase()
      // SQLite 双写
      partnerQueries.updateSupervisor(db.supervisors[index])
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update supervisor:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:supervisors:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.supervisors = db.supervisors.filter((s: any) => s.id !== id)
    saveDatabase()
    // SQLite 双写
    partnerQueries.deleteSupervisor(id)
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete supervisor:', error)
    return { success: false, error: error.message }
  }
})
