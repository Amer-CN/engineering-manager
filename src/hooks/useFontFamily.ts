/**
 * 全局 UI 字体
 *
 * 固定使用思源黑体，无需切换
 */
import { useSyncExternalStore, useCallback } from 'react'

const HANS_STACK = "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif"

let _listeners: Set<() => void> = new Set()
function subscribe(listener: () => void) { _listeners.add(listener); return () => { _listeners.delete(listener) } }
function getSnapshot() { return 'hans' as const }
function getServerSnapshot() { return 'hans' as const }

if (typeof document !== 'undefined') {
  document.documentElement.style.fontFamily = HANS_STACK
  if (document.body) document.body.style.fontFamily = HANS_STACK
}

export function useFontFamily() {
  const font = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setFont = useCallback(() => {}, [])
  return { font, setFont }
}
