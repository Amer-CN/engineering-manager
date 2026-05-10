export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  dataUrl: string
  fileType: 'pdf' | 'image' | 'word' | 'excel'
}

export interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
}

export interface UseFileUploadOptions {
  accept?: string[]
  maxSizeMB?: number
  multiple?: boolean
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void
  onSuccess?: (file: UploadedFile) => void
  onError?: (error: string) => void
}

export interface UseFileUploadReturn {
  files: UploadedFile[]
  isDragging: boolean
  isUploading: boolean
  preview: { data: string; type: 'image' | 'pdf'; title: string } | null
  addFile: (file: File) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  openFileDialog: () => void
  setPreview: (preview: { data: string; type: 'image' | 'pdf'; title: string } | null) => void
  inputRef: React.RefObject<HTMLInputElement>
  dragHandlers: {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
  validateFile: (file: File) => string | null
}
