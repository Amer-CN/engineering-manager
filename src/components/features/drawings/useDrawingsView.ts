// useDrawingsView.ts — 图纸视图模式（忠实度批：stack 改接 GlassCarousel 回归）
import { useEffect, useState } from 'react'

export type DrawingsViewMode = 'gallery' | 'list' | 'stack'

const KEY = 'drawings.view'

export function useDrawingsView() {
  const [viewMode, setViewMode] = useState<DrawingsViewMode>(() => {
    try {
      const v = localStorage.getItem(KEY)
      if (v === 'gallery' || v === 'list' || v === 'stack') return v
    } catch { /* localStorage 不可用时静默走默认 */ }
    return 'list' // 默认列表
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, viewMode) } catch { /* 同上 */ }
  }, [viewMode])

  return { viewMode, setViewMode }
}
