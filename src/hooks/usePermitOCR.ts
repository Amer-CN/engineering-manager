import { useCallback } from 'react'
import { recognizePermit, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface PermitOCRData {
  companyCode: string
  companyName: string
  accountNumber: string
  bankName: string
  permitNumber: string
}

interface UsePermitOCRReturn {
  processPermitFile: (file: File) => Promise<PermitOCRData | null>
  validateImageFile: (file: File) => string | null
}

export function usePermitOCR(): UsePermitOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const validateImageFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP 格式的图片'
    }
    if (file.size > 5 * 1024 * 1024) {
      return '图片大小不能超过 5MB'
    }
    return null
  }, [])

  const processPermitFile = useCallback(async (file: File): Promise<PermitOCRData | null> => {
    const error = validateImageFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const result: OCRResult = await recognizePermit(base64)

      if (!result.success || !result.permit) {
        showToast(result.error || '开户许可证识别失败', 'error')
        return null
      }

      const permit = result.permit

      showToast('开户许可证识别成功', 'success')
      return {
        companyCode: permit.companyCode || '',
        companyName: permit.companyName || '',
        accountNumber: permit.accountNumber || '',
        bankName: permit.bankName || '',
        permitNumber: permit.permitNumber || ''
      }
    } catch (err: unknown) {
      showToast(`识别失败: ${err instanceof Error ? err.message : '未知错误'}`, 'error')
      return null
    }
  }, [showToast, validateImageFile])

  return { processPermitFile, validateImageFile }
}
