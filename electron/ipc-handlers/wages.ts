import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { getDaysInMonth, calculateActualWage, getPersonalDeduction, generateProjectWages } from './wage-calc'

// 获取工资列表

ipcMain.handle('db:wages:getAll', (_, projectId?: number, yearMonth?: string, memberId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  let records = db.wages
  if (projectId) {
    records = records.filter((w: any) => w.projectId === projectId)
  }
  if (yearMonth) {
    records = records.filter((w: any) => w.yearMonth === yearMonth)
  }
  if (memberId) {
    records = records.filter((w: any) => w.memberId === memberId)
  }
  const result = records.map((w: any) => {
    const member = db.members.find((m: any) => m.id === w.memberId)
    const project = db.projects.find((p: any) => p.id === w.projectId)
    const team = db.workerTeams.find((t: any) => t.id === member?.teamId)
    return {
      ...w,
      memberName: member?.name || '',
      memberType: member?.memberType || 'worker',
      projectName: project?.name || '',
      teamName: team?.name || ''
    }
  })
  return { success: true, data: result.sort((a: any, b: any) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )}
})

// 生成项目工资表（核心计算逻辑）

ipcMain.handle('db:wages:generateForProject', (_, projectId: number, yearMonth: string) => {
  try { return generateProjectWages(projectId, yearMonth) } catch (error: any) { log.error('Failed to generate project wages:', error); return { success: false, error: error.message } }
})

// 创建单条工资记录

ipcMain.handle('db:wages:create', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const id = Date.now()
    const newRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.wages.push(newRecord)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create wage:', error)
    return { success: false, error: error.message }
  }
})

// 更新工资记录（带重新计算）

ipcMain.handle('db:wages:update', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const index = db.wages.findIndex((w: any) => w.id === record.id)
    if (index !== -1) {
      const existing = db.wages[index]
      const member = db.members.find((m: any) => m.id === existing.memberId)
      if (member) {
        // 重新计算实发工资
        const actualWage = calculateActualWage(member, {
          yearMonth: record.yearMonth || existing.yearMonth,
          workDays: record.workDays ?? existing.workDays,
          daysOff: record.daysOff ?? existing.daysOff,
          isFullAttendance: record.isFullAttendance ?? existing.isFullAttendance
        }, record.bonus ?? existing.bonus, record.deduction ?? existing.deduction)

        db.wages[index] = {
          ...existing,
          ...record,
          actualWage,
          updatedAt: new Date().toISOString()
        }
      } else {
        db.wages[index] = { ...existing, ...record, updatedAt: new Date().toISOString() }
      }
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update wage:', error)
    return { success: false, error: error.message }
  }
})

// 批量保存工资（替换该项目+月份的所有工资记录）

ipcMain.handle('db:wages:batchSave', (_, records: any[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    if (records.length === 0) return { success: true }

    const { projectId, yearMonth } = records[0]
    // 删除旧的
    db.wages = db.wages.filter((w: any) => !(w.projectId === projectId && w.yearMonth === yearMonth))
    // 插入新的
    const now = new Date().toISOString()
    for (const record of records) {
      db.wages.push({ ...record, updatedAt: now })
    }
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to batch save wages:', error)
    return { success: false, error: error.message }
  }
})

// 删除工资记录

ipcMain.handle('db:wages:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    db.wages = db.wages.filter((w: any) => w.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete wage:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:wages:batchDelete', (_, ids: number[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const idSet = new Set(ids)
    db.wages = db.wages.filter((w: any) => !idSet.has(w.id))
    saveDatabase()
    return { success: true, data: { deleted: ids.length } }
  } catch (error: any) {
    log.error('Failed to batch delete wages:', error)
    return { success: false, error: error.message }
  }
})

// 工资统计

ipcMain.handle('db:wages:getStats', (_, yearMonth?: string, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    let records = db.wages
    if (yearMonth) {
      records = records.filter((w: any) => w.yearMonth === yearMonth)
    }
    if (projectId) {
      records = records.filter((w: any) => w.projectId === projectId)
    }

    const memberIds = [...new Set(records.map((w: any) => w.memberId))]
    const members = db.members.filter((m: any) => memberIds.includes(m.id))
    const memberMap = new Map(members.map((m: any) => [m.id, m]))

    let totalWage = 0
    let staffWage = 0
    let workerWage = 0
    const projectMap = new Map<number, { projectId: number; projectName: string; total: number }>()

    for (const record of records) {
      const member = memberMap.get(record.memberId)
      totalWage += record.actualWage || 0

      if (member?.memberType === 'staff') {
        staffWage += record.actualWage || 0
      } else {
        workerWage += record.actualWage || 0
      }

      // 项目分布
      if (!projectMap.has(record.projectId)) {
        const project = db.projects.find((p: any) => p.id === record.projectId)
        projectMap.set(record.projectId, {
          projectId: record.projectId,
          projectName: project?.name || '未知项目',
          total: 0
        })
      }
      projectMap.get(record.projectId)!.total += record.actualWage || 0
    }

    // 计算百分比
    const projectBreakdown = Array.from(projectMap.values()).map(p => ({
      ...p,
      total: Math.round(p.total * 100) / 100,
      percentage: totalWage > 0 ? Math.round((p.total / totalWage) * 10000) / 100 : 0
    }))

    return {
      success: true,
      data: {
        totalWage: Math.round(totalWage * 100) / 100,
        staffWage: Math.round(staffWage * 100) / 100,
        workerWage: Math.round(workerWage * 100) / 100,
        count: records.length,
        projectBreakdown
      }
    }
  } catch (error: any) {
    log.error('Failed to get wage stats:', error)
    return { success: false, error: error.message }
  }
})
