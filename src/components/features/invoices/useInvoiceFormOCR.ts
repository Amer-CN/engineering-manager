import { useCallback, useState } from 'react'
import { Partner, Project, InvoiceKind } from '@/types/electron'
import { useToastStore } from '@/store/toastStore'
import { useInvoiceOCR } from '@/hooks/useInvoiceOCR'
import { taxRateOptions } from './constants'
import type { InvoiceFormData } from './InvoiceForm'

export function useInvoiceFormOCR(
  partners: Partner[],
  projects: Project[],
  setFormData: React.Dispatch<React.SetStateAction<InvoiceFormData>>
) {
  const showToast = useToastStore(state => state.showToast)
  const { processInvoiceFile } = useInvoiceOCR()
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState<string | null>(null)

  const handleOCRRecognition = useCallback(async (fileUrl: string, fileType: string, invoiceKind: InvoiceKind) => {
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
        let newKind: InvoiceKind = invoiceKind
        const typeStr = result.invoiceType.toLowerCase()
        if (typeStr.includes('专用') || typeStr.includes('special')) {
          newKind = typeStr.includes('电子') || typeStr.includes('electronic') ? 'electronic_special' : 'paper_special'
        } else if (typeStr.includes('普通') || typeStr.includes('regular') || typeStr.includes('ordinary')) {
          newKind = typeStr.includes('电子') || typeStr.includes('electronic') ? 'electronic_regular' : 'paper_regular'
        }
        let matchedProjectId: number | '' = ''
        if (result.remarks) {
          const mp = projects.find(p => result.remarks.includes(p.name))
          if (mp) matchedProjectId = mp.id
        }
        setFormData(prev => ({
          ...prev,
          invoiceKind: newKind,
          invoiceNo: result.invoiceNo || prev.invoiceNo,
          invoiceCode: result.invoiceCode || prev.invoiceCode,
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
        }))
        const summary = [
          result.invoiceNo ? `发票号: ${result.invoiceNo}` : null,
          result.amount ? `金额: ¥${result.amount.toLocaleString()}` : null,
          result.itemName ? `项目: ${result.itemName}` : null,
          matchedSeller ? `销售方: ${matchedSeller.name}` : null,
          matchedBuyer ? `购买方: ${matchedBuyer.name}` : null,
        ].filter(Boolean).join(' | ')
        setOcrResult(summary)
        showToast('🎉 AI 识别成功！已自动填入 12 个字段', 'success')
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
    } finally {
      setOcrLoading(false)
    }
  }, [partners, projects, processInvoiceFile, setFormData, showToast])

  return { ocrLoading, ocrResult, handleOCRRecognition }
}
