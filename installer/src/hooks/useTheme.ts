import { useState, useCallback } from 'react'

type Theme = 'white' | 'graphite' | 'sandstone'

const DEFAULT_INSTALL_PATHS: Record<string, string> = {
  white: 'C:\\Program Files\\工程管家',
  graphite: 'C:\\Program Files\\工程管家',
  sandstone: 'C:\\Program Files\\工程管家',
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('white')

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
    setTheme(t)
  }, [])

  const getDefaultPath = useCallback(() => {
    return DEFAULT_INSTALL_PATHS[theme] || DEFAULT_INSTALL_PATHS.white
  }, [theme])

  return { theme, setTheme: applyTheme, getDefaultPath }
}
