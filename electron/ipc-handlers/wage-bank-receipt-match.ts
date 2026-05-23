/**
 * 银行回单批量解析 - 匹配算法辅助函数
 *
 * 包含：
 * 1. 字符串相似度计算（编辑距离）
 * 2. 工人姓名模糊匹配
 * 3. 工资记录匹配
 */

import type { BankReceiptItem, BankReceiptMatch } from '@/types'

/**
 * 计算两个字符串的相似度（0-1）
 * 使用编辑距离算法
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  const len1 = s1.length
  const len2 = s2.length

  if (len1 === 0) return len2 === 0 ? 1 : 0
  if (len2 === 0) return 0

  const matrix: number[][] = []
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 删除
        matrix[i][j - 1] + 1,      // 插入
        matrix[i - 1][j - 1] + cost  // 替换
      )
    }
  }

  const maxLen = Math.max(len1, len2)
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen
}

/**
 * 模糊匹配工人姓名
 * 返回匹配度最高的工人ID和置信度
 */
export function matchWorkerName(
  parsedName: string,
  workers: any[],
  projectWorkers: any[]
): { workerId: number | null; workerName: string | null; confidence: number } {
  if (!parsedName || parsedName.trim() === '') {
    return { workerId: null, workerName: null, confidence: 0 }
  }

  let bestMatch: { workerId: number | null; workerName: string | null; confidence: number } = {
    workerId: null,
    workerName: null,
    confidence: 0
  }

  // 1. 精确匹配（优先级最高）
  for (const pw of projectWorkers) {
    if (pw.workerName === parsedName) {
      return { workerId: pw.workerId, workerName: pw.workerName, confidence: 100 }
    }
  }

  // 2. 包含匹配
  for (const pw of projectWorkers) {
    if (pw.workerName && (pw.workerName.includes(parsedName) || parsedName.includes(pw.workerName))) {
      const confidence = 90
      if (confidence > bestMatch.confidence) {
        bestMatch = { workerId: pw.workerId, workerName: pw.workerName, confidence }
      }
    }
  }

  // 3. 模糊匹配（相似度 > 0.6）
  for (const pw of projectWorkers) {
    if (!pw.workerName) continue
    const similarity = stringSimilarity(parsedName, pw.workerName)
    if (similarity > 0.6 && similarity * 100 > bestMatch.confidence) {
      bestMatch = {
        workerId: pw.workerId,
        workerName: pw.workerName,
        confidence: Math.round(similarity * 100)
      }
    }
  }

  return bestMatch
}

/**
 * 匹配工资记录
 * 根据工人ID和金额匹配对应的工资记录
 */
export function matchWageRecord(
  workerId: number | null,
  amount: number,
  yearMonth: string | undefined,
  wageRecords: any[]
): { wageId: number | null; confidence: number } {
  if (!workerId) return { wageId: null, confidence: 0 }

  // 过滤出该工人的工资记录
  let candidates = wageRecords.filter(w =>
    w.memberId === workerId || w.projectWorkerId === workerId
  )

  // 如果指定了月份，优先匹配该月份的记录
  if (yearMonth) {
    const monthCandidates = candidates.filter(w => w.yearMonth === yearMonth)
    if (monthCandidates.length > 0) {
      candidates = monthCandidates
    }
  }

  // 过滤掉已归档的记录
  candidates = candidates.filter(w => !w.paymentLocked)

  if (candidates.length === 0) return { wageId: null, confidence: 0 }

  // 精确金额匹配
  const exactMatch = candidates.find(w => Math.abs(w.actualWage - amount) < 0.01)
  if (exactMatch) {
    return { wageId: exactMatch.id, confidence: 100 }
  }

  // 金额相近匹配（误差 < 1%）
  const closeMatch = candidates.find(w => Math.abs(w.actualWage - amount) / w.actualWage < 0.01)
  if (closeMatch) {
    return { wageId: closeMatch.id, confidence: 80 }
  }

  // 返回第一条未发放的记录
  const unpaidRecord = candidates.find(w => !w.paidAmount || w.paidAmount === 0)
  if (unpaidRecord) {
    return { wageId: unpaidRecord.id, confidence: 50 }
  }

  // 返回第一条记录
  return { wageId: candidates[0].id, confidence: 30 }
}
