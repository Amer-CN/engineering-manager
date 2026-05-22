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

const colorMap: Record<string, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-slate-700',
  warning: 'bg-amber-500',
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

      {/* Toast 容器 */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast, _i) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: _i * 0.05 }}
              className={`${colorMap[toast.type]} text-white px-5 py-3 rounded-xl shadow-2xl pointer-events-auto`}
              role="alert"
              onClick={() => removeToast(toast.id)}
            >
              <div className="flex items-center gap-2">
                <Icon name={iconMap[toast.type]} size={18} />
                <span className="font-medium text-sm">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
