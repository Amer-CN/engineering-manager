import { useState, useCallback, useRef } from 'react'
import { useToastStore } from '@/store/toastStore'

export interface BankReceiptFilesApi {
  files: File[]
  error: string | null
  isDragOver: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  fileInputProps: { ref: React.RefObject<HTMLInputElement>; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }
  dropZoneProps: {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  }
  addFiles: (selectedFiles: FileList | File[]) => void
  removeFile: (index: number) => void
  clearFiles: () => void
}

const VALID_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf']

/**
 * 银行回单批量文件管理 hook
 * 负责: 文件选择/拖拽/去重/校验/移除/清空
 */
export function useBankReceiptFiles(): BankReceiptFilesApi {
  const showToast = useToastStore(state => state.showToast)
  const [files, setFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((selectedFiles: FileList | File[]) => {
    const validFiles = Array.from(selectedFiles).filter(file => {
      const ext = file.name.toLowerCase().split('.').pop()
      return VALID_EXTENSIONS.includes(ext || '')
    })

    if (validFiles.length === 0) {
      showToast('请选择 jpg、png 或 pdf 格式的文件', 'warning')
      return
    }

    setFiles(prev => [...prev, ...validFiles])
    setError(null)
  }, [showToast])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }, [addFiles])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
    setError(null)
  }, [])

  return {
    files,
    error,
    isDragOver,
    fileInputRef,
    fileInputProps: { ref: fileInputRef, onChange: handleFileInputChange },
    dropZoneProps: { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop },
    addFiles,
    removeFile,
    clearFiles,
  }
}
