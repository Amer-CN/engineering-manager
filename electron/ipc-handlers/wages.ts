import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { getDaysInMonth, calculateActualWage, generateProjectWages, parseBankReceipt } from './wage-calc'

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
    let memberName = ''; let memberType = 'worker'; let teamName = ''; let bankAccount = ''
    if (w.memberId) {
      const member = db.members.find((m: any) => m.id === w.memberId)
      memberName = member?.name || ''
      memberType = member?.memberType || 'worker'
      const team = db.workerTeams.find((t: any) => t.id === member?.teamId)
      teamName = team?.name || ''
    } else if (w.projectWorkerId && db.projectWorkers) {
      const pw = db.projectWorkers.find((p: any) => p.id === w.projectWorkerId)
      if (pw && db.workers) {
        const worker = db.workers.find((wk: any) => wk.id === pw.workerId)
        memberName = worker?.name || ''
        bankAccount = worker?.bankAccount || ''
        const team = db.workerTeams?.find((t: any) => t.id === pw.teamId)
        teamName = team?.name || ''
      }
    }
    const project = db.projects.find((p: any) => p.id === w.projectId)
    return { ...w, memberName, memberType, projectName: project?.name || '', teamName, bankAccount }
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
      const dailyWage = record.dailyWage ?? existing.dailyWage ?? 0
      const workDays = record.workDays ?? existing.workDays ?? 0
      const bonus = record.bonus ?? existing.bonus ?? 0
      const deduction = record.deduction ?? existing.deduction ?? 0
      const actualWage = calculateActualWage(dailyWage, workDays, bonus, deduction)

      db.wages[index] = { ...existing, ...record, actualWage, updatedAt: new Date().toISOString() }
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

// 批量清除工资发放记录（仅清空发放字段，不删除工资记录本身）
ipcMain.handle('db:wages:batchClearPayments', (_, ids: number[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const idSet = new Set(ids)
    let cleared = 0
    for (const w of db.wages) {
      if (idSet.has(w.id)) {
        w.paidAmount = 0
        w.paidDate = ''
        w.bankReceiptPath = undefined
        w.paymentLocked = false          // 清除发放记录时同时解除归档
        w.updatedAt = new Date().toISOString()
        cleared++
      }
    }
    saveDatabase()
    return { success: true, data: { cleared } }
  } catch (error: any) {
    log.error('Failed to batch clear payments:', error)
    return { success: false, error: error.message }
  }
})

// 批量归档工资发放记录（锁定实发金额和发放日期，禁止修改）
ipcMain.handle('db:wages:batchArchivePayments', (_, ids: number[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const idSet = new Set(ids)
    let archived = 0
    for (const w of db.wages) {
      if (idSet.has(w.id)) {
        w.paymentLocked = true
        w.updatedAt = new Date().toISOString()
        archived++
      }
    }
    saveDatabase()
    return { success: true, data: { archived } }
  } catch (error: any) {
    log.error('Failed to batch archive payments:', error)
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

    // 过滤无效记录：projectWorkerId 必须对应存在的 projectWorker
    if (db.projectWorkers) {
      const validPWIds = new Set(db.projectWorkers.map((pw: any) => pw.id))
      records = records.filter((w: any) => {
        if (w.projectWorkerId) return validPWIds.has(w.projectWorkerId)
        if (w.memberId) return db.members?.some((m: any) => m.id === w.memberId)
        return false
      })
    }

    let totalWage = 0
    const projectMap = new Map<number, { projectId: number; projectName: string; total: number }>()

    for (const record of records) {
      totalWage += record.actualWage || 0

      if (!projectMap.has(record.projectId)) {
        const project = db.projects?.find((p: any) => p.id === record.projectId)
        projectMap.set(record.projectId, {
          projectId: record.projectId,
          projectName: project?.name || '未知项目',
          total: 0
        })
      }
      projectMap.get(record.projectId)!.total += record.actualWage || 0
    }

    const projectBreakdown = Array.from(projectMap.values()).map(p => ({
      ...p,
      total: Math.round(p.total * 100) / 100,
      percentage: totalWage > 0 ? Math.round((p.total / totalWage) * 10000) / 100 : 0
    }))

    return {
      success: true,
      data: {
        totalWage: Math.round(totalWage * 100) / 100,
        count: records.length,
        projectBreakdown
      }
    }
  } catch (error: any) {
    log.error('Failed to get wage stats:', error)
    return { success: false, error: error.message }
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// 银行回单解析
// ══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:wages:parseBankReceipt', async (_, sourcePath: string, projectName?: string) => {
  try {
    return await parseBankReceipt(sourcePath, projectName)
  } catch (error: any) {
    log.error('Failed to parse bank receipt:', error)
    return { success: false, error: error.message }
  }
})
