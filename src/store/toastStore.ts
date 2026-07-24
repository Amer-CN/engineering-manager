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
const timeoutIds = new Map<number, ReturnType<typeof setTimeout>>()

/**
 * 默认提示时长 — 读「通知与偏好 → 提示停留时长」偏好 (localStorage 同步读)。
 * 键与 appPrefs 一致 (app_pref_ + toast_duration)。合法区间 1000~10000ms, 否则回退 3000。
 */
function defaultToastDuration(): number {
  try {
    const v = localStorage.getItem('app_pref_toast_duration')
    const n = v ? parseInt(v, 10) : NaN
    if (!isNaN(n) && n >= 1000 && n <= 10000) return n
  } catch { /* 隐私模式忽略 */ }
  return 3000
}


export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  removeToast: (id: number) => {
    const tid = timeoutIds.get(id)
    if (tid) { clearTimeout(tid); timeoutIds.delete(id) }
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },

  showToast: (message: string, type: ToastItem['type'] = 'info', duration?: number) => {
    const id = ++idCounter
    const ms = duration ?? defaultToastDuration()
    set(state => ({
      toasts: [...state.toasts, { id, message, type }]
    }))
    const timeoutId = setTimeout(() => {
      get().removeToast(id)
    }, ms)
    timeoutIds.set(id, timeoutId)
  },

  success: (message: string) => get().showToast(message, 'success'),
  error: (message: string) => get().showToast(message, 'error', defaultToastDuration() + 2000),
  info: (message: string) => get().showToast(message, 'info'),
  warning: (message: string) => get().showToast(message, 'warning', defaultToastDuration() + 1000),
}))
