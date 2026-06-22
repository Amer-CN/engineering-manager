import { useState, useCallback, useRef } from 'react'
import type { UploadedFile, UseFileUploadOptions, UseFileUploadReturn } from './useFileUpload.types'
import { generateId, getFileType, readFileAsBase64, validateFileType } from './useFileUpload.helpers'
export type { UploadedFile, UseFileUploadOptions, UseFileUploadReturn } from './useFileUpload.types'

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    accept = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeMB = 10,
    multiple = false,
    onToast,
    onSuccess,
    onError
  } = options

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<{ data: string; type: 'image' | 'pdf'; title: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    onToast?.(message, type)
  }, [onToast])

  const validateFile = useCallback((file: File): string | null => {
    return validateFileType(file, accept, maxSizeMB)
  }, [accept, maxSizeMB])

  const addFile = useCallback(async (file: File) => {
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      onError?.(error)
      return
    }

    setIsUploading(true)
    try {
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

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    showToast('文件已移除', 'info')
  }, [showToast])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  const openFileDialog = useCallback(() => {
    inputRef.current?.click()
  }, [])

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
