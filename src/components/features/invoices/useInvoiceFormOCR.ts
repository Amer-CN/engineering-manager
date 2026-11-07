import { useCallback, useState } from 'react'
import { Partner, Project, InvoiceMedium, InvoiceCategory } from '@/types/electron'
import { useToastStore } from '@/store/toastStore'
import { useInvoiceOCR } from '@/hooks/useInvoiceOCR'
import { taxRateOptions } from './constants'
import { deriveInvoiceKind } from './invoiceConfig'
import type { InvoiceFormData } from './InvoiceForm'

// 票种两维识别：含「电子」→ 电子，否则纸质；票种关键词 → 八类细分类。
function resolveOcrDimensions(invoiceType: string | null | undefined): {
  medium: InvoiceMedium
  category: InvoiceCategory | null
} {
  const text = (invoiceType ?? '').toLowerCase()
  const medium: InvoiceMedium = text.includes('电子') || text.includes('electronic') ? 'electronic' : 'paper'
  const matched: [string, InvoiceCategory][] = [
    ['专用', 'special'], ['special', 'special'],
    ['普通', 'regular'], ['regular', 'regular'], ['ordinary', 'regular'],
    ['旅客运输', 'passenger_transport'],
    ['通行费', 'toll'], ['过路费', 'toll'],
    ['火车', 'train'],
    ['飞机', 'plane'], ['航空', 'plane'],
    ['定额', 'quota'],
    ['卷式', 'roll'], ['卷票', 'roll'],
  ]
  const hit = matched.find(([keyword]) => text.includes(keyword))
  return { medium, category: hit ? hit[1] : null }
}

export function useInvoiceFormOCR(
  partners: Partner[],
  projects: Project[],
  setFormData: React.Dispatch<React.SetStateAction<InvoiceFormData>>
) {
  const showToast = useToastStore(state => state.showToast)
  const { processInvoiceFile } = useInvoiceOCR()
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState<string | null>(null)

  const handleOCRRecognition = useCallback(async (fileUrl: string, fileType: string) => {
    if (!fileUrl) { showToast('请先上传发票文件', 'error'); return }
    setOcrLoading(true)
    setOcrResult(null)
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const ft = fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'
      const fn = fileType === 'pdf' ? 'invoice.pdf' : 'invoice.jpg'
      const file = new File([blob], fn, { type: ft })
      const result = await processInvoiceFile(file)
      if (result) {
        const matchedSeller = partners.find(p => p.name === result.sellerName)
        const matchedBuyer = partners.find(p => p.name === result.purchaserName)
        const matchedTaxRate = taxRateOptions.find(opt => opt.value === result.taxRate)?.value
        const ocrDims = resolveOcrDimensions(result.invoiceType)
        let matchedProjectId: number | '' = ''
        if (result.remarks) {
          const mp = projects.find(p => result.remarks.includes(p.name))
          if (mp) matchedProjectId = mp.id
        }
        setFormData(prev => {
          const invoiceCategory = ocrDims.category ?? prev.invoiceCategory
          return {
            ...prev,
            invoiceMedium: ocrDims.medium,
            invoiceCategory,
            invoiceKind: deriveInvoiceKind(ocrDims.medium, invoiceCategory),
            invoiceNo: result.invoiceNo || prev.invoiceNo,
            invoiceCode: result.invoiceCode || prev.invoiceCode,
            taxCode: result.taxCode || prev.taxCode,
            verifyCode: result.verifyCode || prev.verifyCode,
            sellerTaxNo: result.sellerTaxNo || prev.sellerTaxNo,
            drawer: result.drawer || prev.drawer,
            payee: result.payee || prev.payee,
            reviewer: result.reviewer || prev.reviewer,
            issueDate: result.issueDate || prev.issueDate,
            name: result.itemName || prev.name,
            amount: result.amount || prev.amount,
            priceAmount: result.priceAmount || prev.priceAmount,
            taxAmount: result.taxAmount || prev.taxAmount,
            taxRate: matchedTaxRate !== undefined ? matchedTaxRate : prev.taxRate,
            sellerId: matchedSeller ? matchedSeller.id : prev.sellerId,
            buyerId: matchedBuyer ? matchedBuyer.id : prev.buyerId,
            projectId: matchedProjectId || prev.projectId,
            remarks: result.remarks || prev.remarks,
          }
        })
        const filledCount = [
          result.invoiceNo, result.invoiceCode, result.issueDate, result.invoiceType,
          result.itemName, result.remarks, result.sellerName, result.purchaserName,
          result.sellerTaxNo, result.purchaserTaxNo, result.verifyCode,
          result.drawer, result.payee, result.reviewer, result.taxCode,
          result.amount > 0, result.priceAmount > 0, result.taxAmount > 0, result.taxRate > 0,
        ].filter(Boolean).length
        const summary = [
          result.invoiceNo ? `发票号: ${result.invoiceNo}` : null,
          result.amount ? `金额: ¥${result.amount.toLocaleString()}` : null,
          result.itemName ? `项目: ${result.itemName}` : null,
          matchedSeller ? `销售方: ${matchedSeller.name}` : null,
          matchedBuyer ? `购买方: ${matchedBuyer.name}` : null,
        ].filter(Boolean).join(' | ')
        setOcrResult(summary)
        showToast(`🎉 AI 识别成功！已自动填入 ${filledCount} 个字段`, 'success')
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
    } finally {
      setOcrLoading(false)
    }
  }, [partners, projects, processInvoiceFile, setFormData, showToast])

  return { ocrLoading, ocrResult, handleOCRRecognition }
}
