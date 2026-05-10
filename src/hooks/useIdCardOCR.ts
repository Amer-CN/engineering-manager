// useIdCardOCR Hook - 身份证 OCR 识别和文件处理
import { useState, useCallback, useEffect } from 'react'
import { recognizeIdCard, getOCRConfig, OCRProvider } from '@/services/ocr'

export interface Toast { message: string; type: 'success' | 'error' | 'info' }
export interface OCRResult { name?: string; idCard?: string; gender?: string; birthDate?: string; ethnicity?: string; address?: string }
export interface UseIdCardOCRReturn {
  // OCR 状态
  loading: boolean
  ocrMode: OCRProvider
  toast: Toast | null
  
  // 文件处理
  processIdCardFile: (file: File) => Promise<string | null>
  processUploadFile: (file: File) => Promise<{ base64: string; type: 'pdf' | 'image' } | null>
  
  // 验证
  validateImageFile: (file: File) => string | null
  validateFile: (file: File, maxSizeMB?: number) => string | null
  
  // 工具
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  readFileAsBase64: (file: File) => Promise<string>
  
  // 回调
  onOCRResult?: (result: OCRResult) => void
  onFileChange?: (field: string, base64: string) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 身份证 OCR Hook
 * 
 * @param options - 配置选项
 * @param options.onOCRResult - OCR 识别成功后的回调
 * @param options.onFileChange - 文件变化时的回调
 * 
 * @example
 * ```tsx
 * function MyForm() {
 *   const { processIdCardFile, processUploadFile, loading } = useIdCardOCR({
 *     onOCRResult: (result) => {
 *       setFormData(prev => ({ ...prev, ...result }))
 *     }
 *   })
 *   
 *   // 使用...
 * }
 * ```
 */
export function useIdCardOCR(options?: {
  onOCRResult?: (result: OCRResult) => void
  onFileChange?: (field: string, base64: string) => void
}): UseIdCardOCRReturn {
  const { onOCRResult, onFileChange } = options || {}
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 状态
  // ═══════════════════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(false)
  const [ocrMode, setOcrMode] = useState<OCRProvider>('offline')
  const [toast, setToast] = useState<Toast | null>(null)

  // ═══════════════════════════════════════════════════════════════════════════
  // 初始化
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const config = getOCRConfig()
    setOcrMode(config.provider)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // Toast 提示
  // ═══════════════════════════════════════════════════════════════════════════
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // 文件验证
  // ═══════════════════════════════════════════════════════════════════════════
  const validateImageFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return '只能上传 JPG、PNG 或 WebP 格式的图片'
    }
    if (file.size > 5 * 1024 * 1024) {
      return '图片大小不能超过 5MB'
    }
    return null
  }, [])

  const validateFile = useCallback((file: File, maxSizeMB: number = 10): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return '只能上传 JPG、PNG、WebP 或 PDF 格式的文件'
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `文件大小不能超过 ${maxSizeMB}MB`
    }
    return null
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // 文件读取
  // ═══════════════════════════════════════════════════════════════════════════
  const readFileAsBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // OCR 识别
  // ═══════════════════════════════════════════════════════════════════════════
  const processIdCardFile = useCallback(async (file: File): Promise<string | null> => {
    // 验证文件
    const error = validateImageFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    // 读取文件
    const base64 = await readFileAsBase64(file)
    
    // 通知文件变化
    onFileChange?.('idCardFront', base64)

    // 触发 OCR 识别
    setLoading(true)
    try {
      const result = await recognizeIdCard(base64)
      console.log('[OCR] 识别结果:', JSON.stringify(result, null, 2))

      if (result.success && result.idCard) {
        const { number, gender, birthDate, name, ethnicity, address } = result.idCard
        
        // 构建 OCR 结果
        const ocrResult: OCRResult = {
          name: name,
          idCard: number,
          gender: gender,
          birthDate: birthDate,
          ethnicity: ethnicity,
          address: address
        }
        
        // 回调
        onOCRResult?.(ocrResult)

        // 显示成功提示
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
        return base64 // 仍然返回 base64，即使 OCR 失败
      }
    } catch (error) {
      console.error('[OCR] 识别异常:', error)
      showToast('OCR识别服务暂不可用，请手动输入', 'error')
      return base64
    } finally {
      setLoading(false)
    }
  }, [validateImageFile, readFileAsBase64, onOCRResult, onFileChange, showToast, ocrMode])

  // ═══════════════════════════════════════════════════════════════════════════
  // 文件上传
  // ═══════════════════════════════════════════════════════════════════════════
  const processUploadFile = useCallback(async (file: File): Promise<{ base64: string; type: 'pdf' | 'image' } | null> => {
    // 验证文件
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      // 读取文件
      const base64 = await readFileAsBase64(file)
      const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'
      
      return { base64, type: fileType }
    } catch (error) {
      console.error('[Upload] 文件读取异常:', error)
      showToast('文件读取失败', 'error')
      return null
    }
  }, [validateFile, readFileAsBase64, showToast])

  // ═══════════════════════════════════════════════════════════════════════════
  // 返回
  // ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// 导出类型
// ═══════════════════════════════════════════════════════════════════════════════

