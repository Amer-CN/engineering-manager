// useIdCardOCR Hook - 身份证 OCR 识别和文件处理
import { useState, useCallback, useEffect } from 'react'
import { recognizeIdCard, getOCRConfig, OCRProvider } from '@/services/ocr'
import { validateImageFile, validateFile, readFileAsBase64 } from './useIdCardOCR.helpers'

export type { Toast, OCRResult, UseIdCardOCRReturn } from './useIdCardOCR.types'
export { validateImageFile, validateFile, readFileAsBase64 } from './useIdCardOCR.helpers'

import type { OCRResult, UseIdCardOCRReturn } from './useIdCardOCR.types'

export function useIdCardOCR(options?: {
  onOCRResult?: (result: OCRResult) => void
  onFileChange?: (field: string, base64: string) => void
}): UseIdCardOCRReturn {
  const { onOCRResult, onFileChange } = options || {}

  const [loading, setLoading] = useState(false)
  const [ocrMode, setOcrMode] = useState<OCRProvider>('offline')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    const config = getOCRConfig()
    setOcrMode(config.provider)
  }, [])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const processIdCardFile = useCallback(async (file: File): Promise<string | null> => {
    const error = validateImageFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    const base64 = await readFileAsBase64(file)
    onFileChange?.('idCardFront', base64)

    setLoading(true)
    try {
      const result = await recognizeIdCard(base64)

      if (result.success && result.idCard) {
        const { number, gender, birthDate, name, ethnicity, address } = result.idCard
        const ocrResult: OCRResult = { name, idCard: number, gender, birthDate, ethnicity, address }
        onOCRResult?.(ocrResult)

        const filledFields: string[] = []
        if (name) filledFields.push('姓名')
        if (number) filledFields.push('身份证号')
        if (gender) filledFields.push('性别')
        if (birthDate) filledFields.push('出生日期')
        if (ethnicity) filledFields.push('民族')
        if (address) filledFields.push('地址')

        if (filledFields.length > 0) {
          showToast(`识别成功！已自动填充：${filledFields.join('、')}`, 'success')
        } else {
          showToast('身份证识别成功', 'success')
        }

        return base64
      } else {
        const errorMsg = result.error || `未能识别到身份证（${ocrMode === 'baidu' ? '百度OCR' : '离线OCR'}）`
        showToast(errorMsg, 'error')
        return base64
      }
    } catch (error) {
      console.error('[OCR] 识别异常:', error)
      showToast('OCR识别服务暂不可用，请手动输入', 'error')
      return base64
    } finally {
      setLoading(false)
    }
  }, [validateImageFile, readFileAsBase64, onOCRResult, onFileChange, showToast, ocrMode])

  const processUploadFile = useCallback(async (file: File): Promise<{ base64: string; type: 'pdf' | 'image' } | null> => {
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      const base64 = await readFileAsBase64(file)
      const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'
      return { base64, type: fileType }
    } catch (error) {
      console.error('[Upload] 文件读取异常:', error)
      showToast('文件读取失败', 'error')
      return null
    }
  }, [validateFile, readFileAsBase64, showToast])

  return {
    loading,
    ocrMode,
    toast,
    processIdCardFile,
    processUploadFile,
    validateImageFile,
    validateFile,
    showToast,
    readFileAsBase64,
    onOCRResult,
    onFileChange,
  }
}
