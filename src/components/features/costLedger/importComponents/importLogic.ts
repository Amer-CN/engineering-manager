/**
 * 成本台账导入 — 导入执行逻辑
 * 从 CostLedgerImportModal.tsx 提取（2026-05-19 重构）
 */
import type { CostLedgerMatchRule } from '@/types'
import { logCreate } from '@/utils/audit'

interface ParsedRow {
  date: string; voucherNo: string; summary: string; counterparty: string
  channel: string; incomeAmount: number; expenseAmount: number; notes: string
  rowNum: number; skip: boolean
  _matchedDir?: string; _matchedCode?: string; _originalCode?: string
}

/** 构造批量导入的 entries */
export function buildImportEntries(rows: ParsedRow[]) {
  return rows.map(r => {
    const dir = (r as any)._matchedDir as 'expense' | 'income'
    const code = (r as any)._matchedCode as string
    const amount = dir === 'expense'
      ? (r.expenseAmount > 0 ? r.expenseAmount : r.incomeAmount)
      : (r.incomeAmount > 0 ? r.incomeAmount : r.expenseAmount)
    return {
      date: r.date,
      voucherNo: r.voucherNo,
      direction: dir,
      amount,
      category: code || 'other_business',
      summary: r.summary,
      counterparty: r.counterparty,
      channel: r.channel,
      notes: r.notes || '',
      attachments: [],
    }
  })
}

/** 从用户纠正中学习分类规则 */
export async function learnFromOverrides(
  parseAllRows: () => ParsedRow[],
): Promise<{ count: number; merged?: CostLedgerMatchRule[] }> {
  const api = window.electronAPI
  if (!api?.getCostLedgerMatchRules || !api?.saveCostLedgerMatchRules) return { count: 0 }

  const rows = parseAllRows()
  const changedRows = rows.filter(
    r => !r.skip && (r as any)._originalCode && (r as any)._originalCode !== (r as any)._matchedCode
  )
  if (changedRows.length === 0) return { count: 0 }

  const stopWords = ['的', '了', '在', '是', '有', '和', '与', '及', '或', ' ', '', null, undefined]
  const newRules: Map<string, CostLedgerMatchRule> = new Map()

  changedRows.forEach(r => {
    const code = (r as any)._matchedCode as string
    const dir = (r as any)._matchedDir as 'expense' | 'income'
    const text = r.summary + ' ' + r.notes + ' ' + r.counterparty
    const parts = text.split(/[：:：（）()／\/,，、\s]+|(?<=\D)(?=\d)|(?<=\d)(?=\D)/)
    parts.forEach(p => {
      const kw = p.trim()
      if (kw.length < 2 || stopWords.includes(kw)) return
      if (/^\d+$/.test(kw) || /^[\d.]+$/.test(kw)) return
      const key = kw + '|' + code
      if (newRules.has(key)) {
        newRules.get(key)!.hitCount++
      } else {
        newRules.set(key, { keyword: kw, category: code, direction: dir, hitCount: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      }
    })
  })

  if (newRules.size === 0) return { count: 0 }

  const existing = await api.getCostLedgerMatchRules()
  const existingRules: CostLedgerMatchRule[] = existing?.success ? existing.data || [] : []
  const existingMap = new Map(existingRules.map(r => [r.keyword + '|' + r.category, r]))

  for (const [key, rule] of newRules) {
    if (existingMap.has(key)) {
      existingMap.get(key)!.hitCount += rule.hitCount
      existingMap.get(key)!.updatedAt = new Date().toISOString()
    } else {
      existingMap.set(key, rule)
    }
  }

  const merged = [...existingMap.values()]
  const res = await api.saveCostLedgerMatchRules(merged)
  return res?.success ? { count: newRules.size, merged } : { count: 0 }
}

/** 执行批量导入 */
export async function executeBatchImport(
  projectId: number,
  entries: ReturnType<typeof buildImportEntries>,
  selectedBatch: number,
): Promise<{ success: boolean; count?: number; error?: string }> {
  const api = window.electronAPI
  if (!api) return { success: false, error: 'API not available' }

  try {
    const res = await api.batchCreateCostLedger(projectId, entries, selectedBatch)
    if (res?.success) {
      logCreate('costLedger', `${entries.length} 条台账导入`, projectId, {
        projectId, batchId: selectedBatch, count: entries.length,
      })
      return { success: true, count: res?.count ?? entries.length }
    }
    return { success: false, error: res?.error || '导入失败' }
  } catch (err: any) {
    return { success: false, error: `导入异常: ${err.message}` }
  }
}
