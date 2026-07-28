import React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { ToastInfo } from '../../../hooks/useToast'

interface ToastProps {
  toast: ToastInfo | null
}

const icons: Record<string, string> = {
  success: '✓',
  error: '✗',
  info: 'ℹ'
}

const bgColors: Record<string, string> = {
  success: 'bg-success-500',
  error: 'bg-danger-500',
  info: 'bg-[color:var(--accent)]'
}

const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={toast.message}
        initial={{ opacity: 0, y: -16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-xl ${bgColors[toast.type]} text-white`}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">{icons[toast.type]}</span>
          <span className="font-medium">{toast.message}</span>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default Toast
