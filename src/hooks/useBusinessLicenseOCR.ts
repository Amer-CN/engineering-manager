import { useCallback } from 'react'
import { recognizeBusinessLicense, initializeBuiltInConfig, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface BusinessLicenseOCRData {
  creditCode: string
  companyName: string
  legalPerson: string
  registeredCapital: string
  address: string
  businessScope: string
  establishDate: string
  expireDate: string
}

interface UseBusinessLicenseOCRReturn {
  processBusinessLicenseFile: (file: File) => Promise<BusinessLicenseOCRData | null>
  validateImageFile: (file: File) => string | null
}

export function useBusinessLicenseOCR(): UseBusinessLicenseOCRReturn {
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

  /** 将 PDF 第 N 页转为 base64 图片 */
  const pdfPageToBase64 = async (file: File, pageNum: number): Promise<string | null> => {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString()
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      if (pageNum > pdf.numPages) return null
      const page = await pdf.getPage(pageNum)
      const scale = 2.0
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport }).promise
      return canvas.toDataURL('image/jpeg', 0.95)
    } catch {
      return null
    }
  }

  /** 从单张图片识别营业执照 */
  const recognizeFromImage = async (base64: string): Promise<BusinessLicenseOCRData | null> => {
    const result: OCRResult = await recognizeBusinessLicense(base64)
    if (result.success && result.businessLicense) {
      const license = result.businessLicense
      return {
        creditCode: license.creditCode || '',
        companyName: license.companyName || '',
        legalPerson: license.legalPerson || '',
        registeredCapital: license.registeredCapital || '',
        address: license.address || '',
        businessScope: license.businessScope || '',
        establishDate: license.establishDate || '',
        expireDate: license.expireDate || ''
      }
    }
    return null
  }

  const processBusinessLicenseFile = useCallback(async (file: File): Promise<BusinessLicenseOCRData | null> => {
    const error = validateImageFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    // 确保 OCR 配置已加载
    await initializeBuiltInConfig()

    try {
      if (file.type === 'application/pdf') {
        // PDF：逐页识别，找到营业执照即返回
        showToast('正在解析 PDF...', 'info')
        const arrayBuffer = await file.arrayBuffer()
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const totalPages = pdf.numPages
        showToast(`PDF 共 ${totalPages} 页，正在逐页识别...`, 'info')

        for (let i = 1; i <= totalPages; i++) {
          const base64 = await pdfPageToBase64(file, i)
          if (!base64) continue
          const data = await recognizeFromImage(base64)
          if (data && (data.creditCode || data.companyName)) {
            showToast(`在第 ${i} 页识别到营业执照`, 'success')
            return data
          }
        }
        showToast('未在 PDF 中识别到营业执照信息', 'error')
        return null
      } else {
        // 图片：直接识别
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const data = await recognizeFromImage(base64)
        if (data) {
          showToast('营业执照识别成功', 'success')
          return data
        }
        showToast('营业执照识别失败', 'error')
        return null
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateImageFile])

  return { processBusinessLicenseFile, validateImageFile }
}
