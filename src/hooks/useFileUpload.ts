import { useState, useCallback, useRef } from 'react'
import type { UploadedFile, UseFileUploadOptions, UseFileUploadReturn } from './useFileUpload.types'
export type { UploadedFile, UseFileUploadOptions, UseFileUploadReturn } from './useFileUpload.types'

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
  }, [validateFile, onSuccess, onError, multiple])

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

