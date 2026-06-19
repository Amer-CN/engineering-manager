import { useState, useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'
import { useBusinessLicenseOCR } from '@/hooks/useBusinessLicenseOCR'
import { inferTaxTypeFromCreditCode } from '../../../services/companyQuery'

export function usePartnerFormOCR(
  setFormData: React.Dispatch<React.SetStateAction<any>>
) {
  const showToast = useToastStore(state => state.showToast)
  const { processBusinessLicenseFile } = useBusinessLicenseOCR()
  const [businessLicenseLoading, setBusinessLicenseLoading] = useState(false)

  const processFile = useCallback((file: File, onData: (base64: string, fileType: string) => void) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) { showToast('只能上传 JPG、PNG、WebP 或 PDF 格式的文件', 'error'); return }
    if (file.size > 10 * 1024 * 1024) { showToast('文件大小不能超过 10MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (e) => onData(e.target?.result as string, file.type === 'application/pdf' ? 'pdf' : 'image')
    reader.readAsDataURL(file)
  }, [showToast])

  const handleBusinessLicenseOCR = useCallback(async (licenseFile: string) => {
    if (!licenseFile) { showToast('请先上传营业执照图片', 'error'); return }
    setBusinessLicenseLoading(true)
    try {
      const response = await fetch(licenseFile)
      const blob = await response.blob()
      const file = new File([blob], 'license.jpg', { type: 'image/jpeg' })
      const result = await processBusinessLicenseFile(file)
      if (result) {
        setFormData((prev: any) => ({
          ...prev,
          name: result.companyName || prev.name,
          creditCode: result.creditCode || prev.creditCode,
          address: result.address || prev.address,
          businessScope: result.businessScope || prev.businessScope,
        }))
        if (result.creditCode && result.creditCode.length === 18) {
          const inferredTaxType = inferTaxTypeFromCreditCode(result.creditCode)
          if (inferredTaxType) {
            setFormData((prev: any) => ({ ...prev, taxType: inferredTaxType }))
          }
        }
      }
    } finally {
      setBusinessLicenseLoading(false)
    }
  }, [processBusinessLicenseFile, setFormData, showToast])

  return { businessLicenseLoading, processFile, handleBusinessLicenseOCR }
}
