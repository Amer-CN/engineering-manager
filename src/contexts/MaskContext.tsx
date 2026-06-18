// v1.2.0 阶段 C: MaskContext — PII 脱敏开关 (浮动按钮)
// 避开 v1.0.0 4 次 revert 根因:
// 1. 不接 WinForms StatusBar (是 React-only 浮动按钮)
// 2. 默认 masked=true (保守, 列表始终脱敏)
// 3. localStorage 记忆用户选择
// 4. 状态变化不触发 StatusBar 渲染 (React 内部)

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

interface MaskContextValue {
  masked: boolean
  toggleMask: () => void
  setMasked: (v: boolean) => void
}

const MaskContext = createContext<MaskContextValue | null>(null)
const STORAGE_KEY = "v120_mask_enabled"

export function MaskProvider({ children }: { children: ReactNode }) {
  // 默认 masked=true (保守)
  const [masked, setMaskedState] = useState<boolean>(true)

  // localStorage 记忆
  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v !== null) setMaskedState(v === "1")
    } catch { /* SSR / 隐私模式 fallback to default */ }
  }, [])

  const setMasked = (v: boolean) => {
    setMaskedState(v)
    try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0") } catch {}
  }

  const toggleMask = () => setMasked(!masked)

  return (
    <MaskContext.Provider value={{ masked, toggleMask, setMasked }}>
      {children}
    </MaskContext.Provider>
  )
}

export function useMask() {
  const ctx = useContext(MaskContext)
  if (!ctx) throw new Error("useMask must be used within MaskProvider")
  return ctx
}
