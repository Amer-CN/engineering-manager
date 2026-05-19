import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '../Icon'

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
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
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
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastItem['type'] | string = 'info', duration: number = 3000) => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type: type as ToastItem['type'] }])
    setTimeout(() => removeToast(id), duration)
  }, [removeToast])

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const error = useCallback((message: string) => showToast(message, 'error', 5000), [showToast])
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast])
  const warning = useCallback((message: string) => showToast(message, 'warning', 4000), [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}

      {/* Toast 容器 */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast, i) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: i * 0.05 }}
              className={`${colorMap[toast.type]} text-white px-5 py-3 rounded-xl shadow-2xl pointer-events-auto`}
              role="alert"
            >
              <div className="flex items-center gap-2.5">
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
