/**
 * 合同 IPC 处理器
 */

import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import log from 'electron-log'
import { db, dbReady, saveDatabase, getUploadsPath } from '../database'
import { saveFile, readFile, deleteFile } from '../file-service'

// ═══════════════════════════════════════════════════════════════════════════════
// 收入合同
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:incomeContracts:getAll', (_, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  let contracts = db.incomeContracts
  if (projectId) {
    contracts = contracts.filter((c: any) => c.projectId === projectId)
  }
  const result = contracts.map((c: any) => {
    const project = db.projects.find((p: any) => p.id === c.projectId)
    const partner = db.partners.find((p: any) => p.id === c.partnerId)
    // 计算已收金额
    const records = db.incomeRecords.filter((r: any) => r.contractId === c.id)
    const receivedAmount = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
    return {
      ...c,
      projectName: project?.name || '',
      partnerName: partner?.name || '',
      receivedAmount
    }
  })
  return { success: true, data: result.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:incomeContracts:create', (_, contract) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newContract = {
      ...contract,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.incomeContracts.push(newContract)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create income contract:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:incomeContracts:update', (_, contract) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.incomeContracts.findIndex((c: any) => c.id === contract.id)
    if (index !== -1) {
      db.incomeContracts[index] = { ...db.incomeContracts[index], ...contract, updatedAt: new Date().toISOString() }
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update income contract:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:incomeContracts:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.incomeContracts = db.incomeContracts.filter((c: any) => c.id !== id)
    db.incomeRecords = db.incomeRecords.filter((r: any) => r.contractId !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete income contract:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 收入记录
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:incomeRecords:getAll', (_, contractId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  return { success: true, data: db.incomeRecords.filter((r: any) => r.contractId === contractId) }
})

ipcMain.handle('db:incomeRecords:create', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newRecord = { ...record, id, createdAt: new Date().toISOString() }
    db.incomeRecords.push(newRecord)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create income record:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:incomeRecords:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.incomeRecords = db.incomeRecords.filter((r: any) => r.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete income record:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 支出合同
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:expenseContracts:getAll', (_, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  let contracts = db.expenseContracts
  if (projectId) {
    contracts = contracts.filter((c: any) => c.projectId === projectId)
  }
  const result = contracts.map((c: any) => {
    const project = db.projects.find((p: any) => p.id === c.projectId)
    const partner = db.partners.find((p: any) => p.id === c.partnerId)
    // 计算已付金额
    const records = db.expenseRecords.filter((r: any) => r.contractId === c.id)
    const paidAmount = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
    return {
      ...c,
      projectName: project?.name || '',
      partnerName: partner?.name || '',
      paidAmount
    }
  })
  return { success: true, data: result.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:expenseContracts:create', (_, contract) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newContract = {
      ...contract,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.expenseContracts.push(newContract)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create expense contract:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:expenseContracts:update', (_, contract) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.expenseContracts.findIndex((c: any) => c.id === contract.id)
    if (index !== -1) {
      db.expenseContracts[index] = { ...db.expenseContracts[index], ...contract, updatedAt: new Date().toISOString() }
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update expense contract:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:expenseContracts:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.expenseContracts = db.expenseContracts.filter((c: any) => c.id !== id)
    db.expenseRecords = db.expenseRecords.filter((r: any) => r.contractId !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete expense contract:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 支出记录
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:expenseRecords:getAll', (_, contractId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  return { success: true, data: db.expenseRecords.filter((r: any) => r.contractId === contractId) }
})

ipcMain.handle('db:expenseRecords:create', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newRecord = { ...record, id, createdAt: new Date().toISOString() }
    db.expenseRecords.push(newRecord)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create expense record:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:expenseRecords:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.expenseRecords = db.expenseRecords.filter((r: any) => r.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete expense record:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 合同附件文件存储
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:contracts:saveFile', async (_, options: { fileData: string; fileName: string; subCategory?: string; projectName?: string | null }) => {
  // 支持 income（收入合同）和 expense（支出合同）分目录存储
  const subCategory = options.subCategory === 'expense' ? 'expense' : 'income'
  return saveFile('contracts', subCategory, {
    fileData: options.fileData,
    fileName: options.fileName,
  }, options.projectName)
})

ipcMain.handle('db:contracts:readFile', async (_, fileName: string, subCategory?: string, projectName?: string | null) => {
  if (!fileName) return { success: false, error: '文件名为空' }
  // 按优先级尝试：指定子目录 → 另一子目录 → 旧路径兜底
  const subCats = subCategory ? [subCategory] : ['income', 'expense']
  for (const sub of subCats) {
    const result = readFile('contracts', sub, fileName, projectName)
    if (result.success) return result
  }
  // 旧路径兜底：contracts/ 根目录（英文旧路径）
  const legacyPath = path.join(getUploadsPath(), 'contracts', fileName)
  if (fs.existsSync(legacyPath)) {
    try {
      const buffer = fs.readFileSync(legacyPath)
      const ext = path.extname(fileName).toLowerCase()
      const mimeMap: Record<string, string> = {
        '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.webp': 'image/webp',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
      const mimeType = mimeMap[ext] || 'application/octet-stream'
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
      return { success: true, data: { dataUrl, mimeType } }
    } catch { /* ignore */ }
  }
  return { success: false, error: '文件不存在' }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 合同统计
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:contractStats:get', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.paymentRecords) db.paymentRecords = []
    const incomeTotal = db.incomeContracts.reduce((sum: number, c: any) => sum + (c.finalAmount ?? c.amount ?? 0), 0)
    const expenseTotal = db.expenseContracts.reduce((sum: number, c: any) => sum + (c.finalAmount ?? c.amount ?? 0), 0)
    const incomeReceived = db.paymentRecords
      .filter((r: any) => r.type === 'invoice_out')
      .reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
    const expensePaid = db.paymentRecords
      .filter((r: any) => r.type === 'invoice_in')
      .reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
    
    // 30天内到期的合同
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    const expiringContracts: any[] = []
    
    db.incomeContracts.forEach((c: any) => {
      if (!c.endDate) return
      const endDate = new Date(c.endDate)
      if (endDate >= now && endDate <= thirtyDaysLater) {
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        expiringContracts.push({
          id: c.id,
          type: 'income',
          name: c.name,
          contractNo: c.contractNo,
          amount: (c.finalAmount ?? c.amount ?? 0),
          endDate: c.endDate,
          daysLeft
        })
      }
    })
    
    db.expenseContracts.forEach((c: any) => {
      if (!c.endDate) return
      const endDate = new Date(c.endDate)
      if (endDate >= now && endDate <= thirtyDaysLater) {
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        expiringContracts.push({
          id: c.id,
          type: 'expense',
          name: c.name,
          contractNo: c.contractNo,
          amount: (c.finalAmount ?? c.amount ?? 0),
          endDate: c.endDate,
          daysLeft
        })
      }
    })
    
    // 按剩余天数排序
    expiringContracts.sort((a: any, b: any) => a.daysLeft - b.daysLeft)

    return {
      success: true,
      data: {
        incomeCount: db.incomeContracts.length,
        incomeTotal,
        incomeReceived,
        expenseCount: db.expenseContracts.length,
        expenseTotal,
        expensePaid,
        netIncome: incomeTotal - expenseTotal,
        netReceived: incomeReceived - expensePaid,
        expiringSoon: expiringContracts
      }
    }
  } catch (error: any) { log.error('Failed to get contract stats:', error); return { success: false, error: error.message } } })
