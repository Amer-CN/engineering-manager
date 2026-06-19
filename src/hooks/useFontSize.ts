/**
 * 全局字号 hook
 *
 * 三档：small(14px) / medium(16px=默认) / large(18px)
 * 通过修改 :root 的 font-size 缩放所有 Tailwind rem 字号
 *
 * 模式与 useTheme 完全一致：useSyncExternalStore + 全局 store
 */
import { useCallback, useSyncExternalStore } from 'react'

export type FontSizeOption = 'small' | 'medium' | 'large'

const KEY = 'app-font-size'

function readSize(): FontSizeOption {
  if (typeof window === 'undefined') return 'medium'
  const stored = localStorage.getItem(KEY)
  if (stored === 'small' || stored === 'medium' || stored === 'large') return stored
  return 'medium'
}

let _size: FontSizeOption = readSize()
let _listeners: Set<() => void> = new Set()

function subscribe(listener: () => void) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}
function getSnapshot() { return _size }
function getServerSnapshot(): FontSizeOption { return 'medium' }

function setGlobalSize(s: FontSizeOption) {
  if (s === _size) return
  _size = s
  localStorage.setItem(KEY, s)
  document.documentElement.setAttribute('data-font-size', s)
  _listeners.forEach(fn => fn())
}

// 模块加载时同步设置
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-font-size', _size)
}

export function useFontSize() {
  const size = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setSize = useCallback((s: FontSizeOption) => setGlobalSize(s), [])
  return { size, setSize }
}
