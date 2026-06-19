import { useState, useCallback } from 'react'

export interface ToastInfo {
  message: string
  type: 'success' | 'error' | 'info'
}

export function useToast(duration: number = 3000) {
  const [toast, setToast] = useState<ToastInfo | null>(null)

  const showToast = useCallback((message: string, type: ToastInfo['type'] = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }, [duration])

  return { toast, showToast }
}

export type { ToastItem } from '../components/ui/Toast/ToastProvider'
export { useToastContext, ToastProvider } from '../components/ui/Toast/ToastProvider'
