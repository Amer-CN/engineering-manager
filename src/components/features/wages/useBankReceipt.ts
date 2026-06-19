import { useState, useCallback } from 'react'
import type { WageRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'

interface UseBankReceiptOptions {
  allWageRecords: WageRecord[]
  selectedProject: { name?: string } | null
  paymentEdits: Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>
  setPaymentEdits: React.Dispatch<React.SetStateAction<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>>
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
}

export interface BankReceiptResult {
  matched: number
  failed: number
  totalItems: number
  date: string
  receiptPath: string
  totalAmount?: number
  successAmount?: number
  rawTextSnippet?: string
}

export function useBankReceipt({
  allWageRecords, selectedProject, paymentEdits, setPaymentEdits, showToast,
}: UseBankReceiptOptions) {
  const [receiptParsing, setReceiptParsing] = useState(false)
  const [receiptResult, setReceiptResult] = useState<BankReceiptResult | null>(null)

  const handleBankReceiptUpload = useCallback(async (pdfPath: string) => {
    setReceiptParsing(true)
    setReceiptResult(null)
    try {
      const result = await (await getAPI()).parseBankReceipt(pdfPath, selectedProject?.name || undefined)
      if (!result.success || !result.data) {
        showToast(result.error || '回单解析失败', 'error')
        return
      }
      const { date, items, receiptPath } = result.data
      const newEdits = new Map(paymentEdits)
      let matched = 0
      let failed = 0

      for (const item of items) {
        // 只填入处理成功的记录，且金额>0
        if (!/(成功|Success)/i.test(item.status) || item.amount <= 0) {
          failed++
          continue
        }
        // 匹配：先用姓名模糊匹配，再用银行卡号精确确认
        const candidates = allWageRecords.filter(w =>
          (w.memberName || '').includes(item.name) || item.name.includes(w.memberName || '')
        )
        const record = item.account
          ? candidates.find(w => w.bankAccount === item.account)   // 账号精确匹配
          : candidates.length === 1 ? candidates[0]                 // 只有一人
          : candidates[0]                                           // 同名多人但有账号就上面匹配了，没账号时取第一个
        if (record) {
          newEdits.set(record.id, {
            paidAmount: String(item.amount),
            paidDate: date || newEdits.get(record.id)?.paidDate || '',
            bankReceiptPath: receiptPath,
          })
          matched++
        } else {
          failed++
        }
      }

      // DEBUG: log raw items for diagnosis; include rawTextSnippet when 0 items parsed
      const debugPayload: any = { items: items.slice(0, 3), totalItems: items.length, date, totalAmount: result.data.totalAmount, successAmount: result.data.successAmount }
      if (items.length === 0 && result.data.rawTextSnippet) {
        debugPayload.rawTextSnippet = result.data.rawTextSnippet
      }
      console.debug('[bankReceipt]', JSON.stringify(debugPayload))
      setPaymentEdits(newEdits)
      setReceiptResult({ matched, failed, totalItems: items.length, date, receiptPath, totalAmount: result.data.totalAmount, successAmount: result.data.successAmount, rawTextSnippet: result.data.rawTextSnippet })
      showToast(`匹配 ${matched} 条记录已填入${date ? '（' + date + '）' : ''}`, 'success')
    } catch (error: any) {
      showToast(error?.message || '回单解析失败', 'error')
    } finally {
      setReceiptParsing(false)
    }
  }, [allWageRecords, selectedProject, paymentEdits, setPaymentEdits, showToast])

  return { receiptParsing, receiptResult, handleBankReceiptUpload }
}
