import { useCallback, useSyncExternalStore } from 'react'

export type ThemeScheme = 'white' | 'graphite' | 'sandstone'

const KEY = 'app-theme'

function readScheme(): ThemeScheme {
  if (typeof window === 'undefined') return 'white'
  const stored = localStorage.getItem(KEY)
  if (stored === 'white' || stored === 'graphite' || stored === 'sandstone') return stored
  const old = localStorage.getItem('app-scheme')
  if (old === 'white' || old === 'graphite' || old === 'sandstone') return old
  return 'white'
}

// 全局 store — 所有 useTheme 实例共享同一份状态
let _scheme: ThemeScheme = readScheme()
let _listeners: Set<() => void> = new Set()

function subscribe(listener: () => void) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}
function getSnapshot() { return _scheme }
function getServerSnapshot(): ThemeScheme { return 'white' }

function setGlobalScheme(s: ThemeScheme) {
  if (s === _scheme) return
  _scheme = s
  localStorage.setItem(KEY, s)
  document.documentElement.setAttribute('data-theme', s)
  _listeners.forEach(fn => fn())
}

// 模块加载时同步设置（早于 React 渲染）
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', _scheme)
  localStorage.setItem(KEY, _scheme)
}

export function useTheme() {
  const scheme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setScheme = useCallback((s: ThemeScheme) => {
    setGlobalScheme(s)
  }, [])

  return { scheme, setScheme }
}
