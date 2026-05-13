import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'rowHoverOpacity'
const DEFAULT = 60 // 0-100

function readStored(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v !== null) {
      const n = Number(v)
      if (Number.isFinite(n) && n >= 0 && n <= 100) return n
    }
  } catch { /* localStorage unavailable */ }
  return DEFAULT
}

export function useRowHoverOpacity() {
  const [opacity, setOpacityState] = useState(readStored)

  useEffect(() => {
    document.documentElement.style.setProperty('--row-hover-opacity', String(opacity / 100))
  }, [opacity])

  const setOpacity = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)))
    setOpacityState(clamped)
    try { localStorage.setItem(STORAGE_KEY, String(clamped)) } catch { /* ignore */ }
  }, [])

  return { opacity, setOpacity }
}
