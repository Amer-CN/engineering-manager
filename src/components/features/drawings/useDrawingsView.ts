// useDrawingsView.ts — 图纸视图模式（Stage-Surface 红线：扁平视图是默认，舞台是主动进入且选择持久化）
import { useEffect, useState } from 'react'

export type DrawingsViewMode = 'gallery' | 'list' | 'stack'

const KEY = 'drawings.view'

export function useDrawingsView() {
  const [viewMode, setViewMode] = useState<DrawingsViewMode>(() => {
    try {
      const v = localStorage.getItem(KEY)
      if (v === 'gallery' || v === 'list' || v === 'stack') return v
    } catch { /* localStorage 不可用时静默走默认 */ }
    return 'list' // 默认列表（DESIGN.md § Stage Surfaces 第 ② 条）
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, viewMode) } catch { /* 同上 */ }
  }, [viewMode])

  return { viewMode, setViewMode }
}
