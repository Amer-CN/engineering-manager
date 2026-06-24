import React, { useState } from 'react'
import { OCRRecognitionFeedback } from '../../ui/OCRRecognitionFeedback'
import { useBusinessLicenseOCR } from '@/hooks/useBusinessLicenseOCR'
import { useToastStore } from '@/store/toastStore'
import { Icon } from '../../ui/Icon'

interface BusinessLicenseOCRBlockProps {
  /** 营业执照文件 base64 字符串（空则不显示按钮） */
  licenseFile: string
  /** 营业执照文件类型（image/pdf） */
  licenseFileType: string
  /** OCR 识别成功后回调，把识别到的字段回填到父组件 */
  onResult: (fields: {
    name?: string
    creditCode?: string
    registeredAddress?: string
    businessScope?: string
  }) => void
}

/**
 * 营业执照 OCR 识别块（v1.1.0 拆分自 PartnerForm）
 * - 上传了图片/PDF 后才显示「AI 识别」按钮
 * - 识别中显示加载动画
 * - 识别完成显示 OCR 反馈面板
 * - 失败显示错误提示
 */
export const BusinessLicenseOCRBlock: React.FC<BusinessLicenseOCRBlockProps> = ({
  licenseFile,
  licenseFileType,
  onResult
}) => {
  const showToast = useToastStore(state => state.showToast)
  const { processBusinessLicenseFile } = useBusinessLicenseOCR()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'recognizing' | 'success' | 'error'>('idle')
  const [fields, setFields] = useState<{ label: string; value: string }[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  if (!licenseFile) return null

  const handleClick = async () => {
    setLoading(true)
    setStatus('recognizing')
    setFields([])
    setErrorMessage('')
    try {
      const response = await fetch(licenseFile)
      const blob = await response.blob()
      const file = new File(
        [blob],
        licenseFileType === 'pdf' ? 'license.pdf' : 'license.jpg',
        { type: licenseFileType === 'pdf' ? 'application/pdf' : 'image/jpeg' }
      )
      const result = await processBusinessLicenseFile(file)
      if (result) {
        const newFields: { label: string; value: string }[] = []
        if (result.companyName) newFields.push({ label: '公司名称', value: result.companyName })
        if (result.creditCode) newFields.push({ label: '信用代码', value: result.creditCode })
        if (result.address) newFields.push({ label: '注册地址', value: result.address })
        if (result.businessScope) newFields.push({ label: '经营范围', value: result.businessScope })
        setFields(newFields)
        setStatus('success')
        // 回填到父组件
        onResult({
          name: result.companyName,
          creditCode: result.creditCode,
          registeredAddress: result.address,
          businessScope: result.businessScope
        })
        showToast('营业执照识别成功，已自动填充', 'success')
      } else {
        setErrorMessage('识别未返回结果，请检查图片是否清晰')
        setStatus('error')
        showToast('识别未返回结果，请检查图片', 'error')
      }
    } catch (err: any) {
      setErrorMessage(err.message || '未知错误')
      setStatus('error')
      showToast('识别失败: ' + (err.message || '未知错误'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 transition-all duration-300 ${
          loading
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0'
            : 'bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium'
        }`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span className="animate-pulse">AI 正在识别营业执照...</span>
          </>
        ) : (
          <>
            <Icon name="Sparkles" size={16} />
            AI 识别营业执照（自动填入公司信息）
          </>
        )}
      </button>
      <OCRRecognitionFeedback
        status={status}
        fields={fields}
        errorMessage={errorMessage}
        onDismiss={() => setStatus('idle')}
      />
    </>
  )
}

export default BusinessLicenseOCRBlock