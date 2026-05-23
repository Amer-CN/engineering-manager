import { create } from 'zustand'
import { ToastItem } from '@/components/ui/Toast/ToastProvider'

interface ToastStore {
  toasts: ToastItem[]
  showToast: (message: string, type?: ToastItem['type'], duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
  removeToast: (id: number) => void
}

let idCounter = 0

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  removeToast: (id: number) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },

  showToast: (message: string, type: ToastItem['type'] = 'info', duration: number = 3000) => {
    const id = ++idCounter
    set(state => ({
      toasts: [...state.toasts, { id, message, type }]
    }))
    setTimeout(() => {
      get().removeToast(id)
    }, duration)
  },

  success: (message: string) => get().showToast(message, 'success'),
  error: (message: string) => get().showToast(message, 'error', 5000),
  info: (message: string) => get().showToast(message, 'info'),
  warning: (message: string) => get().showToast(message, 'warning', 4000),
}))
