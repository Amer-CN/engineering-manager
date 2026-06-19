import { useCallback } from 'react'
import { recognizeBankCard, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface BankCardOCRData {
  cardNumber: string
  bankName: string
  cardType: string
  validDate: string
}

interface UseBankCardOCRReturn {
  processBankCardFile: (file: File) => Promise<BankCardOCRData | null>
  validateImageFile: (file: File) => string | null
}

export function useBankCardOCR(): UseBankCardOCRReturn {
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

  const processBankCardFile = useCallback(async (file: File): Promise<BankCardOCRData | null> => {
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

      const result: OCRResult = await recognizeBankCard(base64)

      if (!result.success || !result.bankCard) {
        showToast(result.error || '银行卡识别失败', 'error')
        return null
      }

      const card = result.bankCard

      showToast('银行卡识别成功', 'success')
      return {
        cardNumber: card.cardNumber || '',
        bankName: card.bankName || '',
        cardType: card.cardType || '',
        validDate: card.validDate || ''
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateImageFile])

  return { processBankCardFile, validateImageFile }
}
