import type { CostLedgerMatchRule } from '@/types'
import { getAPI } from '@/services/api-adapter'

export interface ParsedRow {
  date: string; voucherNo: string; summary: string; counterparty: string
  channel: string; incomeAmount: number; expenseAmount: number; notes: string
  rowNum: number; skip: boolean; skipReason?: string
  _rowIdx?: number; _matchedDir?: string; _matchedCode?: string; _originalCode?: string
}

export async function learnFromEdit(
  summary: string, counterparty: string, notes: string, categoryCode: string, direction: string
): Promise<number> {
  const api = await getAPI()
  if (!api?.getCostLedgerMatchRules || !api?.saveCostLedgerMatchRules) return 0
  const text = ((summary || '') + ' ' + (counterparty || '') + ' ' + (notes || '')).trim()
  if (!text) return 0
  const stopWords = ['的', '了', '在', '是', '有', '和', '与', '及', '或', ' ', '', null, undefined]
  const parts = text.split(/[：:：（）()／\/,，、\s]+|(?<=\D)(?=\d)|(?<=\d)(?=\D)/)
  const newRules: Map<string, CostLedgerMatchRule> = new Map()
  parts.forEach(p => {
  const kw = p.trim()
  if (kw.length < 2 || stopWords.includes(kw)) return
  if (/^\d+$/.test(kw) || /^[\d.]+$/.test(kw)) return
  const key = kw + '|' + categoryCode
  if (newRules.has(key)) {
  newRules.get(key)!.hitCount++
  } else {
  newRules.set(key, { keyword: kw, category: categoryCode, direction: direction as 'expense' | 'income', hitCount: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }
  })
  if (newRules.size === 0) return 0
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
  await api.saveCostLedgerMatchRules([...existingMap.values()])
  return newRules.size
}
