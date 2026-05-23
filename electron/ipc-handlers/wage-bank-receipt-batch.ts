/**
 * 银行回单批量解析 Handler
 *
 * 功能：
 * 1. 批量解析多个银行回单文件（PDF/图片）
 * 2. 智能匹配工人和工资记录
 * 3. 支持自动重试（最多3次）
 * 4. 返回匹配结果供确认界面使用
 */
import { ipcMain } from 'electron'
import log from 'electron-log'
import { parseBankReceipt } from './wage-bank-receipt'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteWrite } from '../sqlite'
import { wageQueries } from '../sqlite/queries'
import { stringSimilarity, matchWorkerName, matchWageRecord } from './wage-bank-receipt-match'
import type { BankReceiptItem, ParsedBankReceipt, BatchParseResult, BankReceiptMatch } from '@/types'

// ═══════════════════════════════════════════════════════════════
// 批量解析主函数
// ═══════════════════════════════════════════════════════════════

/**
 * 批量解析银行回单
 * @param filePaths 文件路径数组
 * @param projectId 项目ID（可选）
 * @param yearMonth 年月（可选，格式：YYYY-MM）
 */
async function batchParseBankReceipts(
  filePaths: string[],
  projectId?: number,
  yearMonth?: string
): Promise<{ success: boolean; data?: BatchParseResult; error?: string }> {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  const result: BatchParseResult = {
    successCount: 0,
    failCount: 0,
    results: [],
    matches: [],
    failedFiles: []
  }

  // 加载基础数据
  const workers = db.workers || []
  const projectWorkers = db.projectWorkers || []
  const wageRecords = db.wages || []

  // 过滤项目工人（如果指定了项目）
  const filteredProjectWorkers = projectId
    ? projectWorkers.filter((pw: any) => pw.projectId === projectId)
    : projectWorkers

  // 过滤工资记录（如果指定了项目）
  const filteredWageRecords = projectId
    ? wageRecords.filter((w: any) => w.projectId === projectId)
    : wageRecords

  // 逐个解析文件（带重试逻辑）
  for (const filePath of filePaths) {
    let parseResult: { success: boolean; data?: ParsedBankReceipt; error?: string } | null = null
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries && !parseResult?.success) {
      try {
        parseResult = await parseBankReceipt(filePath, undefined, yearMonth)
      } catch (error: any) {
        retryCount++
        if (retryCount >= maxRetries) {
          result.failCount++
          result.failedFiles.push({
            path: filePath,
            error: error.message || '解析失败（已达最大重试次数）'
          })
          log.error(`[batchParseBankReceipts] 解析失败: ${filePath}`, error)
        }
      }
    }

    if (!parseResult?.success || !parseResult.data) {
      continue
    }

    result.successCount++
    result.results.push(parseResult.data)

    // 解析成功，进行智能匹配
    const { date, items, receiptPath } = parseResult.data

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // 只处理成功的交易
      if (!/(成功|Success)/i.test(item.status) || item.amount <= 0) {
        result.matches.push({
          receiptIndex: result.results.length - 1,
          receiptPath,
          parsedName: item.name,
          parsedAmount: item.amount,
          parsedDate: date,
          matchedWorkerId: null,
          matchedWorkerName: null,
          matchedWageId: null,
          confidence: 0,
          status: 'unmatched',
          remark: '交易未成功或金额无效'
        })
        continue
      }

      // 匹配工人
      const workerMatch = matchWorkerName(item.name, workers, filteredProjectWorkers)

      // 检查是否已归档
      const isArchived = filteredWageRecords.some(w =>
        (w.memberId === workerMatch.workerId || w.projectWorkerId === workerMatch.workerId) &&
        w.paymentLocked
      )

      if (isArchived) {
        result.matches.push({
          receiptIndex: result.results.length - 1,
          receiptPath,
          parsedName: item.name,
          parsedAmount: item.amount,
          parsedDate: date,
          matchedWorkerId: workerMatch.workerId,
          matchedWorkerName: workerMatch.workerName,
          matchedWageId: null,
          confidence: workerMatch.confidence,
          status: 'archived',
          remark: '该工人工资记录已归档'
        })
        continue
      }

      // 匹配工资记录
      const wageMatch = matchWageRecord(
        workerMatch.workerId,
        item.amount,
        yearMonth,
        filteredWageRecords
      )

      const match: BankReceiptMatch = {
        receiptIndex: result.results.length - 1,
        receiptPath,
        parsedName: item.name,
        parsedAmount: item.amount,
        parsedDate: date,
        matchedWorkerId: workerMatch.workerId,
        matchedWorkerName: workerMatch.workerName,
        matchedWageId: wageMatch.wageId,
        confidence: Math.min(workerMatch.confidence, wageMatch.confidence),
        status: workerMatch.confidence >= 80 && wageMatch.confidence >= 80 ? 'matched' : 'ambiguous'
      }

      result.matches.push(match)
    }
  }

  return { success: true, data: result }
}

/**
 * 批量确认匹配结果并更新工资记录
 * @param matches 匹配结果列表（可能包含手动调整后的数据）
 */
async function batchConfirmMatches(
  matches: BankReceiptMatch[],
  yearMonth?: string
): Promise<{ success: boolean; data?: { updated: number }; error?: string }> {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []

  let updated = 0

  try {
    for (const match of matches) {
      if (!match.matchedWageId) continue

      // 更新工资记录
      const index = db.wages.findIndex((w: any) => w.id === match.matchedWageId)
      if (index === -1) continue

      // 系统使用 paidAmount > 0 来判断发放状态，无需单独的 paymentStatus 字段
      // 更新实发金额、发放日期、银行回单路径
      db.wages[index] = {
        ...db.wages[index],
        paidAmount: match.parsedAmount,
        paidDate: match.parsedDate || new Date().toISOString().slice(0, 10),
        bankReceiptPath: match.receiptPath,
        updatedAt: new Date().toISOString()
      }

      // SQLite 双写
      if (useSqliteWrite()) {
        wageQueries.updateWage(match.matchedWageId, {
          paidAmount: match.parsedAmount,
          paidDate: match.parsedDate || new Date().toISOString().slice(0, 10),
          bankReceiptPath: match.receiptPath
        })
      }

      updated++

      // 写入审计日志
      const auditLog = {
        id: Date.now() + updated,
        action: 'update',
        entity: 'wages',
        entityId: match.matchedWageId,
        details: `银行回单批量确认：工人 ${match.matchedWorkerName}，金额 ${match.parsedAmount}，日期 ${match.parsedDate}`,
        timestamp: new Date().toISOString()
      }
      if (!db.auditLogs) db.auditLogs = []
      db.auditLogs.push(auditLog)
    }

    saveDatabase()

    return { success: true, data: { updated } }
  } catch (error: any) {
    log.error('[batchConfirmMatches] 批量确认失败:', error)
    return { success: false, error: error.message }
  }
}

// ═══════════════════════════════════════════════════════════════
// IPC 通道注册
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('db:wages:batchParseBankReceipts', async (_, filePaths: string[], projectId?: number, yearMonth?: string) => {
  try {
    return await batchParseBankReceipts(filePaths, projectId, yearMonth)
  } catch (error: any) {
    log.error('[wages:batchParseBankReceipts] 批量解析失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:wages:batchConfirmMatches', async (_, matches: BankReceiptMatch[], yearMonth?: string) => {
  try {
    return await batchConfirmMatches(matches, yearMonth)
  } catch (error: any) {
    log.error('[wages:batchConfirmMatches] 批量确认失败:', error)
    return { success: false, error: error.message }
  }
})
