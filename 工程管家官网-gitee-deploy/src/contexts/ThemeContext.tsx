import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type ThemeId = 'white' | 'graphite' | 'sandstone'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'em-website-theme'
const ORDER: ThemeId[] = ['white', 'graphite', 'sandstone']

function getInitial(): ThemeId {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null
    if (stored && ORDER.includes(stored)) return stored
  }
  return 'white'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(getInitial)

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length])
  }, [theme, setTheme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider')
  return ctx
}