import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useInvoiceOCR } from '@/hooks/useInvoiceOCR'
import type { InvoiceTaxRate } from '@/types/electron'
import { useToastStore } from '@/store/toastStore'
import { Icon } from '../../ui/Icon'

interface InvoiceOCRBlockProps {
  /** 已上传的发票文件 base64 字符串（空则不显示按钮） */
  fileUrl: string
  /** 文件类型：image 或 pdf */
  fileType: string
  /** OCR 识别成功后回调，父组件用返回值更新 formData */
  onResult: (fields: {
    invoiceNo?: string
    amount?: number
    priceAmount?: number
    taxAmount?: number
    taxRate?: InvoiceTaxRate
    sellerName?: string
    purchaserName?: string
    issueDate?: string
  }) => void
}

/**
 * 发票 OCR 识别块（v1.1.0 拆分自 InvoiceForm）
 * - 上传了发票文件后才显示「AI 识别」按钮
 * - 识别中显示加载动画
 * - 识别成功显示绿色提示面板
 * - 失败时通过 toast 提示
 */
export const InvoiceOCRBlock: React.FC<InvoiceOCRBlockProps> = ({
  fileUrl,
  fileType,
  onResult
}) => {
  const showToast = useToastStore(state => state.showToast)
  const { processInvoiceFile } = useInvoiceOCR()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  if (!fileUrl) return null

  const handleClick = async () => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const mime = fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'
      const name = fileType === 'pdf' ? 'invoice.pdf' : 'invoice.jpg'
      const file = new File([blob], name, { type: mime })

      const ocrResult = await processInvoiceFile(file)
      if (ocrResult) {
        // 回调到父组件
        onResult({
          invoiceNo: ocrResult.invoiceNo,
          amount: ocrResult.amount,
          priceAmount: ocrResult.priceAmount,
          taxAmount: ocrResult.taxAmount,
          taxRate: ocrResult.taxRate as InvoiceTaxRate | undefined,
          sellerName: ocrResult.sellerName,
          purchaserName: ocrResult.purchaserName,
          issueDate: ocrResult.issueDate
        })
        setResult('发票号、金额、税额、销售方/购买方、税率、开票日期已自动填入')
        showToast('发票识别成功，已自动填充', 'success')
      } else {
        showToast('识别未返回结果，请检查图片', 'error')
      }
    } catch (err: any) {
      showToast('识别失败: ' + (err.message || '未知错误'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 disabled:opacity-60"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            <span className="animate-pulse">AI 正在识别发票内容...</span>
          </>
        ) : (
          <>
            <Icon name="Sparkles" size={16} />
            AI 识别发票（自动填入）
          </>
        )}
      </button>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg"
          style={{ background: 'var(--success-soft)', border: '1px solid var(--success)' }}
        >
          <div className="flex items-start gap-2">
            <Icon name="CheckCircle" size={16} className="mt-0.5 flex-shrink-0 text-[color:var(--success)]" />
            <div className="text-sm" style={{ color: 'var(--success)' }}>
              <p className="font-medium mb-1">AI 已自动填入以下信息：</p>
              <p style={{ color: 'var(--success)' }}>{result}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default InvoiceOCRBlock