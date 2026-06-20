import { useMemo } from 'react'
import type { Invoice } from '../../../types/electron'

export interface DuplicateGroup {
  invoiceNo: string
  invoices: Invoice[]
}

/**
 * 检测发票列表中的重复项 (按 invoiceNo 分组, 仅返回 > 1 条的组)
 *
 * @param invoices - 发票列表
 * @returns 重复发票分组数组
 */
export function useDuplicateInvoices(invoices: Invoice[]): DuplicateGroup[] {
  return useMemo(() => {
    const invoiceNoMap = new Map<string, Invoice[]>()
    for (const inv of invoices) {
      if (!inv.invoiceNo) continue
      const existing = invoiceNoMap.get(inv.invoiceNo) || []
      existing.push(inv)
      invoiceNoMap.set(inv.invoiceNo, existing)
    }
    return Array.from(invoiceNoMap.entries())
      .filter(([_, invs]) => invs.length > 1)
      .map(([invoiceNo, invs]) => ({ invoiceNo, invoices: invs }))
  }, [invoices])
}
