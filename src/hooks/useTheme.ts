import { useCallback, useSyncExternalStore } from 'react'

export type ThemeScheme = 'white' | 'graphite' | 'sandstone'

const KEY = 'app-theme'

// 中性主题改版：旧默认 white 视为“未显式选择”，一次性重置到新默认 净白(sandstone)；
// 用户主动选过的 graphite/sandstone 保留。首次运行后由 MIGRATION_KEY 记住，不再重复。
const MIGRATION_KEY = 'theme-neutral-default-v2'
if (typeof window !== 'undefined' && !localStorage.getItem(MIGRATION_KEY)) {
  localStorage.setItem(MIGRATION_KEY, '1')
  const prev = localStorage.getItem(KEY)
  if (!prev || prev === 'white') localStorage.setItem(KEY, 'sandstone')
}

function readScheme(): ThemeScheme {
  if (typeof window === 'undefined') return 'sandstone'
  const stored = localStorage.getItem(KEY)
  if (stored === 'white' || stored === 'graphite' || stored === 'sandstone') return stored
  const old = localStorage.getItem('app-scheme')
  if (old === 'white' || old === 'graphite' || old === 'sandstone') return old
  return 'sandstone'
}

// 全局 store — 所有 useTheme 实例共享同一份状态
let _scheme: ThemeScheme = readScheme()
let _listeners: Set<() => void> = new Set()

function subscribe(listener: () => void) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}
function getSnapshot() { return _scheme }
function getServerSnapshot(): ThemeScheme { return 'sandstone' }

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
