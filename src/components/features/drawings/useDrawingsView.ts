// useDrawingsView.ts — 图纸视图模式（用户裁决：轮播只留知识库，图纸回画廊/列表二视图）
import { useEffect, useState } from 'react'

export type DrawingsViewMode = 'gallery' | 'list'

const KEY = 'drawings.view'

export function useDrawingsView() {
  const [viewMode, setViewMode] = useState<DrawingsViewMode>(() => {
    try {
      const v = localStorage.getItem(KEY)
      if (v === 'gallery' || v === 'list') return v
    } catch { /* localStorage 不可用时静默走默认 */ }
    return 'list' // 默认列表
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, viewMode) } catch { /* 同上 */ }
  }, [viewMode])

  return { viewMode, setViewMode }
}