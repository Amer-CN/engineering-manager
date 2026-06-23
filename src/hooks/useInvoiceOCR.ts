import { useCallback } from 'react'
import { recognizeInvoice, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'
import * as pdfjsLib from 'pdfjs-dist'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.js',
  import.meta.url
).toString()

interface InvoiceOCRData {
  invoiceNo: string
  invoiceCode: string
  issueDate: string
  invoiceType: string   // 发票类型
  amount: number        // 价税合计
  priceAmount: number   // 不含税金额
  taxAmount: number     // 税额
  taxRate: number       // 税率
  sellerName: string
  purchaserName: string
  itemName: string      // 商品/服务名称
  remarks: string       // 备注
}

interface UseInvoiceOCRReturn {
  processInvoiceFile: (file: File) => Promise<InvoiceOCRData | null>
  validateFile: (file: File) => string | null
}

export function useInvoiceOCR(): UseInvoiceOCRReturn {
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

  // PDF 转图片（取第一页）
  const pdfToImage = useCallback(async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1) // 取第一页

    const scale = 2.0 // 提高分辨率
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')!
    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise

    // 转为 base64
    return canvas.toDataURL('image/jpeg', 0.95)
  }, [])

  const processInvoiceFile = useCallback(async (file: File): Promise<InvoiceOCRData | null> => {
    // 验证文件
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      let base64: string

      if (file.type === 'application/pdf') {
        // PDF 转图片
        showToast('正在解析 PDF...', 'info')
        base64 = await pdfToImage(file)
      } else {
        // 图片直接读取
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      // 调用 OCR 识别
      const result: OCRResult = await recognizeInvoice(base64)

      if (!result.success || !result.invoice) {
        const errorMsg = result.error || '发票识别失败'
        console.error('[发票OCR] 识别失败:', errorMsg)
        showToast(errorMsg, 'error')
        return null
      }

      const inv = result.invoice

      // 映射到表单数据
      const data: InvoiceOCRData = {
        invoiceNo: inv.invoiceNum || '',
        invoiceCode: inv.invoiceCode || '',
        issueDate: inv.invoiceDate || '',
        invoiceType: inv.invoiceType || '',
        amount: inv.totalAmount || 0,
        priceAmount: inv.amountWithoutTax || 0,
        taxAmount: inv.totalTax || 0,
        taxRate: inv.taxRate || 0,
        sellerName: inv.sellerName || '',
        purchaserName: inv.purchaserName || '',
        itemName: inv.itemName || '',
        remarks: inv.remarks || ''
      }

      showToast('发票识别成功', 'success')
      return data
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateFile, pdfToImage])

  return { processInvoiceFile, validateFile }
}
