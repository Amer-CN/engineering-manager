import React, { createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '../Icon'
import { useToastStore } from '@/store/toastStore'

export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface ToastContextValue {
  showToast: (message: string, type?: string, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    //  fallback 到 Zustand store
    return {
      showToast: (message: string, type?: string, duration?: number) => {
        useToastStore.getState().showToast(message, type as ToastItem['type'], duration)
      },
      success: (message: string) => useToastStore.getState().success(message),
      error: (message: string) => useToastStore.getState().error(message),
      info: (message: string) => useToastStore.getState().info(message),
      warning: (message: string) => useToastStore.getState().warning(message),
    }
  }
  return ctx
}

const iconMap: Record<string, string> = {
  success: 'CheckCircle',
  error: 'XCircle',
  info: 'Info',
  warning: 'AlertTriangle',
}

// S3 Stitch: 状态仅通过小型语义色图标表达，容器保持中性表面（不整块铺色、无彩色竖条）
const iconColorMap: Record<string, string> = {
  success: 'text-success-600',
  error: 'text-danger-500',
  info: 'text-[color:var(--accent)]',
  warning: 'text-warning-600',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // 从 Zustand store 读取 toasts
  const toasts = useToastStore(state => state.toasts)
  const removeToast = useToastStore(state => state.removeToast)

  return (
    <ToastContext.Provider value={{
      showToast: (message: string, type?: string, duration?: number) => {
        useToastStore.getState().showToast(message, type as ToastItem['type'], duration)
      },
      success: (message: string) => useToastStore.getState().success(message),
      error: (message: string) => useToastStore.getState().error(message),
      info: (message: string) => useToastStore.getState().info(message),
      warning: (message: string) => useToastStore.getState().warning(message),
    }}>
      {children}

      {/* Toast 容器（S3 Stitch: 右上角、中性表面、极柔和 ambient 阴影） */}
      <div className="fixed top-14 right-5 z-[9999] flex flex-col items-end gap-2 pointer-events-none" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast, _i) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: _i * 0.05 }}
              className="bg-[color:var(--card)] border border-[color:var(--border)] text-[color:var(--fg)] px-4 py-3 rounded-xl shadow-lift pointer-events-auto min-w-[240px] max-w-[360px]"
              role="alert"
              onClick={() => removeToast(toast.id)}
            >
              <div className="flex items-center gap-2.5">
                <Icon name={iconMap[toast.type]} size={18} className={`${iconColorMap[toast.type]} shrink-0`} />
                <span className="font-medium text-sm">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
