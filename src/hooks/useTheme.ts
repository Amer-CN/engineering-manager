import { useState, useEffect, useCallback } from 'react'

export type ThemeScheme = 'default' | 'graphite' | 'sandstone'

const SCHEME_KEY = 'app-scheme'
const DARK_KEY = 'app-dark'
const OLD_KEY = 'app-theme' // 旧版兼容

function getInitialScheme(): ThemeScheme {
  if (typeof window === 'undefined') return 'default'

  // 新版 key 优先
  const scheme = localStorage.getItem(SCHEME_KEY)
  if (scheme === 'default' || scheme === 'graphite' || scheme === 'sandstone') return scheme

  // 旧版兼容：'app-theme' = 'light'|'dark' → scheme='default'
  const old = localStorage.getItem(OLD_KEY)
  if (old === 'light' || old === 'dark') {
    localStorage.removeItem(OLD_KEY) // 迁移后清理
  }

  return 'default'
}

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return false

  // 新版 key 优先
  const stored = localStorage.getItem(DARK_KEY)
  if (stored !== null) return stored === 'true'

  // 旧版兼容
  const old = localStorage.getItem(OLD_KEY)
  if (old === 'dark') return true

  return false
}

export function useTheme() {
  const [scheme, setSchemeState] = useState<ThemeScheme>(getInitialScheme)
  const [isDark, setIsDarkState] = useState<boolean>(getInitialDark)

  // 同步到 DOM
  useEffect(() => {
    const root = document.documentElement

    // 设置 data-theme 属性
    root.setAttribute('data-theme', scheme)

    // 切换 dark class
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    localStorage.setItem(SCHEME_KEY, scheme)
    localStorage.setItem(DARK_KEY, String(isDark))
  }, [scheme, isDark])

  const setScheme = useCallback((s: ThemeScheme) => {
    setSchemeState(s)
  }, [])

  const toggleDark = useCallback(() => {
    setIsDarkState(prev => !prev)
  }, [])

  const setDark = useCallback((d: boolean) => {
    setIsDarkState(d)
  }, [])

  return { scheme, setScheme, isDark, setDark, toggleDark }
}
