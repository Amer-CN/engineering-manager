/**
 * 结算 IPC 处理器（双写模式）
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, settlementQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 结算办理
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:settlements:getAll', (_, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    const data = settlementQueries.listSettlements(projectId)
    if (data) return { success: true, data }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.settlements) db.settlements = []
  let settlements = db.settlements
  if (projectId) {
    settlements = settlements.filter((s: any) => s.projectId === projectId)
  }
  const result = settlements.map((s: any) => {
    const project = db.projects.find((p: any) => p.id === s.projectId)
    const partner = db.partners.find((p: any) => p.id === s.partnerId)
    let status = s.status
    if (status === 'draft' || status === 'approved' || status === 'paid' || !status) status = 'pending'
    return { ...s, status, projectName: project?.name || '', partnerName: partner?.name || '' }
  })
  return { success: true, data: result.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:settlements:create', (_, settlement) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  try {
    const id = Date.now()
    const newSettlement = {
      ...settlement,
      id,
      status: settlement.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.settlements.push(newSettlement)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      settlementQueries.createSettlement(newSettlement)
    }

    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create settlement:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:settlements:update', (_, settlement) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  try {
    const index = db.settlements.findIndex((s: any) => s.id === settlement.id)
    if (index !== -1) {
      db.settlements[index] = { ...db.settlements[index], ...settlement, updatedAt: new Date().toISOString() }
      saveDatabase()

      // SQLite 双写
      if (useSqliteWrite()) {
        settlementQueries.updateSettlement(settlement.id, settlement)
      }
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update settlement:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:settlements:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  try {
    db.settlements = db.settlements.filter((s: any) => s.id !== id)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      settlementQueries.deleteSettlement(id)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete settlement:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:settlements:process', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  if (!db.invoices) db.invoices = []
  if (!db.paymentRecords) db.paymentRecords = []
  try {
    const index = db.settlements.findIndex((s: any) => s.id === id)
    if (index === -1) return { success: false, error: '结算单不存在' }

    const settlement = db.settlements[index]
    const settlementAmount = settlement.amount || 0
    const partnerId = settlement.partnerId

    const invoiceType = settlement.type === 'income' ? 'invoice_out' : 'invoice_in'

    const linkedInvoices = db.invoices.filter((inv: any) => {
      if (inv.type !== invoiceType) return false
      if (settlement.type === 'income') return inv.buyerId === partnerId
      return inv.sellerId === partnerId
    })
    const invoiceTotal = linkedInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)

    const linkedInvoiceIds = new Set(linkedInvoices.map((inv: any) => inv.id))
    let paidTotal = 0
    for (const r of db.paymentRecords) {
      if (r.invoiceDetails && Array.isArray(r.invoiceDetails)) {
        for (const d of r.invoiceDetails) {
          if (linkedInvoiceIds.has(d.invoiceId)) {
            paidTotal += d.paymentAmount || 0
          }
        }
      }
    }

    const fmt = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString()
    const warnings: string[] = []

    if (!partnerId) {
      warnings.push('未关联结算单位')
    } else {
      const diffPaid = settlementAmount - paidTotal
      const diffInvoice = settlementAmount - invoiceTotal
      if (Math.abs(diffPaid) > 0.01) {
        if (diffPaid > 0) warnings.push(`付款不足，差¥${fmt(diffPaid)}`)
        else warnings.push(`付款超出¥${fmt(-diffPaid)}`)
      }
      if (Math.abs(diffInvoice) > 0.01) {
        if (diffInvoice > 0) warnings.push(`发票不足，缺¥${fmt(diffInvoice)}`)
        else warnings.push(`发票超出¥${fmt(-diffInvoice)}`)
      }
    }

    const now = new Date().toISOString()
    const changes: Record<string, any> = {}
    if (warnings.length > 0) {
      db.settlements[index].status = 'completed'
      db.settlements[index].warnings = warnings
      db.settlements[index].completedAt = now
      changes.status = 'completed'
      changes.warnings = warnings
      changes.completedAt = now
    } else {
      db.settlements[index].status = 'archived'
      db.settlements[index].warnings = undefined
      db.settlements[index].archivedAt = now
      changes.status = 'archived'
      changes.warnings = undefined
      changes.archivedAt = now
    }
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      settlementQueries.updateSettlement(id, changes)
    }

    return { success: true, warnings: warnings.length > 0 ? warnings : undefined }
  } catch (error: any) {
    log.error('Failed to process settlement:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:settlements:unarchive', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.settlements) db.settlements = []
  try {
    const index = db.settlements.findIndex((s: any) => s.id === id)
    if (index !== -1) {
      db.settlements[index].status = 'completed'
      db.settlements[index].warnings = undefined
      saveDatabase()

      // SQLite 双写
      if (useSqliteWrite()) {
        settlementQueries.updateSettlement(id, { status: 'completed', warnings: undefined })
      }
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to unarchive settlement:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 合同模板
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:contractTemplates:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    const data = settlementQueries.listContractTemplates()
    if (data) return { success: true, data }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.contractTemplates) db.contractTemplates = []
  return { success: true, data: db.contractTemplates.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:contractTemplates:create', (_, template) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.contractTemplates) db.contractTemplates = []
  try {
    const id = Date.now()
    const newTemplate = {
      ...template,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.contractTemplates.push(newTemplate)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      settlementQueries.createContractTemplate(newTemplate)
    }

    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create template:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:contractTemplates:update', (_, template) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.contractTemplates) db.contractTemplates = []
  try {
    const index = db.contractTemplates.findIndex((t: any) => t.id === template.id)
    if (index !== -1) {
      db.contractTemplates[index] = { ...db.contractTemplates[index], ...template, updatedAt: new Date().toISOString() }
      saveDatabase()

      // SQLite 双写
      if (useSqliteWrite()) {
        settlementQueries.updateContractTemplate(template.id, template)
      }
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update template:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:contractTemplates:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.contractTemplates) db.contractTemplates = []
  try {
    db.contractTemplates = db.contractTemplates.filter((t: any) => t.id !== id)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      settlementQueries.deleteContractTemplate(id)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete template:', error)
    return { success: false, error: error.message }
  }
})
