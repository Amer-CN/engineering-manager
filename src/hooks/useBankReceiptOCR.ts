import { useCallback } from 'react'
import { recognizeBankReceipt, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface BankReceiptOCRData {
  transactionDate: string
  transactionTime: string
  amount: number
  payerName: string
  payerAccount: string
  payeeName: string
  payeeAccount: string
  transactionNo: string
  bankName: string
  remarks: string
}

interface UseBankReceiptOCRReturn {
  processBankReceiptFile: (file: File) => Promise<BankReceiptOCRData | null>
  validateImageFile: (file: File) => string | null
}

export function useBankReceiptOCR(): UseBankReceiptOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const validateImageFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP/PDF 格式'
    }
    if (file.size > 10 * 1024 * 1024) {
      return '文件大小不能超过 10MB'
    }
    return null
  }, [])

  const processBankReceiptFile = useCallback(async (file: File): Promise<BankReceiptOCRData | null> => {
    const error = validateImageFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      let base64: string

      if (file.type === 'application/pdf') {
        // PDF 需要转图片
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString()

        showToast('正在解析 PDF...', 'info')
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const page = await pdf.getPage(1)
        const scale = 2.0
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise

        base64 = canvas.toDataURL('image/jpeg', 0.95)
      } else {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      const result: OCRResult = await recognizeBankReceipt(base64)

      if (!result.success || !result.bankReceipt) {
        showToast(result.error || '银行回单识别失败', 'error')
        return null
      }

      const receipt = result.bankReceipt

      showToast('银行回单识别成功', 'success')
      return {
        transactionDate: receipt.transactionDate || '',
        transactionTime: receipt.transactionTime || '',
        amount: receipt.amount || 0,
        payerName: receipt.payerName || '',
        payerAccount: receipt.payerAccount || '',
        payeeName: receipt.payeeName || '',
        payeeAccount: receipt.payeeAccount || '',
        transactionNo: receipt.transactionNo || '',
        bankName: receipt.bankName || '',
        remarks: receipt.remarks || ''
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateImageFile])

  return { processBankReceiptFile, validateImageFile }
}
