import { OCRProvider } from '@/services/ocr'

export interface Toast { message: string; type: 'success' | 'error' | 'info' }

export interface OCRResult {
  name?: string
  idCard?: string
  gender?: string
  birthDate?: string
  ethnicity?: string
  address?: string
}

export interface UseIdCardOCRReturn {
  loading: boolean
  ocrMode: OCRProvider
  toast: Toast | null
  processIdCardFile: (file: File) => Promise<string | null>
  processUploadFile: (file: File) => Promise<{ base64: string; type: 'pdf' | 'image' } | null>
  validateImageFile: (file: File) => string | null
  validateFile: (file: File, maxSizeMB?: number) => string | null
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  readFileAsBase64: (file: File) => Promise<string>
  onOCRResult?: (result: OCRResult) => void
  onFileChange?: (field: string, base64: string) => void
}
