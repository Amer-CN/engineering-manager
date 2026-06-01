import { useCallback } from 'react'
import { recognizeBusinessLicense, type OCRResult } from '../services/ocr'
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP 格式的图片'
    }
    if (file.size > 5 * 1024 * 1024) {
      return '图片大小不能超过 5MB'
    }
    return null
  }, [])

  const processBusinessLicenseFile = useCallback(async (file: File): Promise<BusinessLicenseOCRData | null> => {
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

      const result: OCRResult = await recognizeBusinessLicense(base64)

      if (!result.success || !result.businessLicense) {
        showToast(result.error || '营业执照识别失败', 'error')
        return null
      }

      const license = result.businessLicense

      showToast('营业执照识别成功', 'success')
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
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateImageFile])

  return { processBusinessLicenseFile, validateImageFile }
}
