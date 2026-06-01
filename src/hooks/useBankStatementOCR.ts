import { useCallback } from 'react'
import { recognizeBankStatement, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface Transaction {
  date: string
  time: string
  amount: number
  balance: number
  type: string
  counterparty: string
  remark: string
}

interface BankStatementOCRData {
  transactions: Transaction[]
  accountNumber: string
  bankName: string
}

interface UseBankStatementOCRReturn {
  processBankStatementFile: (file: File) => Promise<BankStatementOCRData | null>
  validateFile: (file: File) => string | null
}

export function useBankStatementOCR(): UseBankStatementOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP/PDF 格式'
    }
    if (file.size > 10 * 1024 * 1024) {
      return '文件大小不能超过 10MB'
    }
    return null
  }, [])

  const processBankStatementFile = useCallback(async (file: File): Promise<BankStatementOCRData | null> => {
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      let base64: string

      if (file.type === 'application/pdf') {
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

      const result: OCRResult = await recognizeBankStatement(base64)

      if (!result.success || !result.bankStatement) {
        showToast(result.error || '银行单据识别失败', 'error')
        return null
      }

      const statement = result.bankStatement

      showToast(`银行单据识别成功，共 ${statement.transactions.length} 笔交易`, 'success')
      return {
        transactions: statement.transactions || [],
        accountNumber: statement.accountNumber || '',
        bankName: statement.bankName || ''
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateFile])

  return { processBankStatementFile, validateFile }
}
