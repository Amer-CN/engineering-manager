import { useCallback } from 'react'
import { recognizeGeneralReceipt, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface GeneralReceiptOCRData {
  text: string
  amount: number
  date: string
}

interface UseGeneralReceiptOCRReturn {
  processGeneralReceiptFile: (file: File) => Promise<GeneralReceiptOCRData | null>
  validateFile: (file: File) => string | null
}

export function useGeneralReceiptOCR(): UseGeneralReceiptOCRReturn {
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

  const processGeneralReceiptFile = useCallback(async (file: File): Promise<GeneralReceiptOCRData | null> => {
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

      const result: OCRResult = await recognizeGeneralReceipt(base64)

      if (!result.success || !result.generalReceipt) {
        showToast(result.error || '通用票据识别失败', 'error')
        return null
      }

      const receipt = result.generalReceipt

      showToast('通用票据识别成功', 'success')
      return {
        text: receipt.text || '',
        amount: receipt.amount || 0,
        date: receipt.date || ''
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateFile])

  return { processGeneralReceiptFile, validateFile }
}
