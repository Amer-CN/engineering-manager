/**
 * useFileUpload Hook
 * 
 * 通用文件上传 Hook - 提供统一的拖拽/粘贴/点击上传逻辑
 */

import { useState, useCallback, useRef, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 上传文件类型
 */
export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  dataUrl: string
  fileType: 'pdf' | 'image' | 'word' | 'excel'
}

/**
 * Toast 消息类型
 */
export interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
}

/**
 * useFileUpload 配置选项
 */
export interface UseFileUploadOptions {
  /** 允许的文件类型 */
  accept?: string[]
  /** 最大文件大小（MB） */
  maxSizeMB?: number
  /** 是否允许多文件 */
  multiple?: boolean
  /** Toast 回调 */
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void
  /** 上传成功回调 */
  onSuccess?: (file: UploadedFile) => void
  /** 上传错误回调 */
  onError?: (error: string) => void
}

/**
 * useFileUpload 返回类型
 */
export interface UseFileUploadReturn {
  // 文件状态
  files: UploadedFile[]
  isDragging: boolean
  isUploading: boolean
  
  // 预览状态
  preview: { data: string; type: 'image' | 'pdf'; title: string } | null
  
  // 操作方法
  addFile: (file: File) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  openFileDialog: () => void
  setPreview: (preview: { data: string; type: 'image' | 'pdf'; title: string } | null) => void
  
  // 文件输入 ref
  inputRef: React.RefObject<HTMLInputElement>
  
  // 拖拽事件处理
  dragHandlers: {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
  
  // 验证
  validateFile: (file: File) => string | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 生成唯一 ID
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

/**
 * 获取文件类型
 */
const getFileType = (file: File): 'pdf' | 'image' | 'word' | 'excel' => {
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.includes('word') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word'
  if (file.type.includes('excel') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'excel'
  return 'image'
}

/**
 * 读取文件为 base64
 */
const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 通用文件上传 Hook
 * 
 * @param options - 配置选项
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     files,
 *     isDragging,
 *     inputRef,
 *     dragHandlers,
 *     addFile,
 *     removeFile,
 *     validateFile
 *   } = useFileUpload({
 *     accept: ['image/jpeg', 'image/png', 'application/pdf'],
 *     maxSizeMB: 10,
 *     onSuccess: (file) => console.log('上传成功', file),
 *     onError: (error) => console.error('上传失败', error)
 *   })
 *   
 *   return (
 *     <div
 *       onDragOver={dragHandlers.onDragOver}
 *       onDragLeave={dragHandlers.onDragLeave}
 *       onDrop={(e) => {
 *         dragHandlers.onDrop(e)
 *         const file = e.dataTransfer.files[0]
 *         if (file) addFile(file)
 *       }}
 *     >
 *       <input ref={inputRef} type="file" onChange={(e) => {
 *         const file = e.target.files?.[0]
 *         if (file) addFile(file)
 *       }} />
 *     </div>
 *   )
 * }
 * ```
 */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    accept = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeMB = 10,
    multiple = false,
    onToast,
    onSuccess,
    onError
  } = options

  // ═══════════════════════════════════════════════════════════════════════════
  // 状态
  // ═══════════════════════════════════════════════════════════════════════════
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<{ data: string; type: 'image' | 'pdf'; title: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ═══════════════════════════════════════════════════════════════════════════
  // Toast 提示
  // ═══════════════════════════════════════════════════════════════════════════
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    onToast?.(message, type)
  }, [onToast])

  // ═══════════════════════════════════════════════════════════════════════════
  // 文件验证
  // ═══════════════════════════════════════════════════════════════════════════
  const validateFile = useCallback((file: File): string | null => {
    // 检查文件类型
    if (accept.length > 0 && !accept.includes(file.type)) {
      const acceptNames = accept.map(type => {
        if (type.includes('jpeg')) return 'JPG'
        if (type.includes('png')) return 'PNG'
        if (type.includes('webp')) return 'WebP'
        if (type.includes('pdf')) return 'PDF'
        if (type.includes('word')) return 'Word'
        if (type.includes('excel')) return 'Excel'
        return type
      })
      return `只能上传 ${acceptNames.join('、')} 格式的文件`
    }

    // 检查文件大小
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `文件大小不能超过 ${maxSizeMB}MB`
    }

    return null
  }, [accept, maxSizeMB])

  // ═══════════════════════════════════════════════════════════════════════════
  // 添加文件
  // ═══════════════════════════════════════════════════════════════════════════
  const addFile = useCallback(async (file: File) => {
    // 验证
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      onError?.(error)
      return
    }

    setIsUploading(true)
    try {
      // 读取文件
      const dataUrl = await readFileAsBase64(file)
      
      const uploadedFile: UploadedFile = {
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        fileType: getFileType(file)
      }

      setFiles(prev => {
        if (multiple) {
          return [...prev, uploadedFile]
        }
        return [uploadedFile]
      })

      showToast(`文件 ${file.name} 上传成功`, 'success')
      onSuccess?.(uploadedFile)
    } catch (err) {
      console.error('文件读取失败:', err)
      showToast('文件读取失败', 'error')
      onError?.('文件读取失败')
    } finally {
      setIsUploading(false)
    }
  }, [validateFile, showToast, onSuccess, onError, multiple])

  // ═══════════════════════════════════════════════════════════════════════════
  // 移除文件
  // ═══════════════════════════════════════════════════════════════════════════
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    showToast('文件已移除', 'info')
  }, [showToast])

  // ═══════════════════════════════════════════════════════════════════════════
  // 清空文件
  // ═══════════════════════════════════════════════════════════════════════════
  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // 打开文件对话框
  // ═══════════════════════════════════════════════════════════════════════════
  const openFileDialog = useCallback(() => {
    inputRef.current?.click()
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // 拖拽事件处理
  // ═══════════════════════════════════════════════════════════════════════════
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      if (multiple) {
        Array.from(droppedFiles).forEach(addFile)
      } else {
        addFile(droppedFiles[0])
      }
    }
  }, [addFile, multiple])

  // ═══════════════════════════════════════════════════════════════════════════
  // 返回
  // ═══════════════════════════════════════════════════════════════════════════
  return {
    files,
    isDragging,
    isUploading,
    preview,
    addFile,
    removeFile,
    clearFiles,
    openFileDialog,
    setPreview,
    inputRef,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    },
    validateFile
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导出类型
// ═══════════════════════════════════════════════════════════════════════════════

