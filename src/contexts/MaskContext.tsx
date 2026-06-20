// v0.75.0 MaskContext — PII 脱敏开关 (浮动按钮)
// 升级要点 (commit 6c43a97 + 2ff2550):
// 1. localStorage 是缓存层 (离线立即生效)
// 2. 后端 /api/user-preferences 是权威源 (多设备同步)
// 3. 同步策略: toggle 时立即写 localStorage + 异步 PUT 后端 (失败不阻塞 UI)

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react"

interface MaskContextValue {
  masked: boolean
  toggleMask: () => void
  setMasked: (v: boolean) => void
  /** v0.75.0: 后端同步状态 (true = 同步中, 可用于按钮 disabled 显示) */
  isSyncing: boolean
  /** v0.75.0: 后端拉取是否完成 (用于避免在拉取完成前 toggle 写入后端冲突) */
  isHydrated: boolean
}

const MaskContext = createContext<MaskContextValue | null>(null)
const STORAGE_KEY = "v120_mask_enabled"
const PREF_KEY = "pii_mask_enabled"

// 注: MaskProvider 不再调用 getAPI() — 由外部在登录后用 useUserIdSync 触发同步.
// 这里只暴露 setMasked / toggleMask, 它们写 localStorage + 异步 PUT 后端.

export function MaskProvider({ children }: { children: ReactNode }) {
  // v0.76.0 累计待办 #2: 同步从 localStorage 初始化 (避免首屏 mask 闪一下). 默认 true (保守).
  const [masked, setMaskedState] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === "1") return true
      if (v === "0") return false
    } catch { /* SSR / 隐私模式 fallback */ }
    return true
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // 防重复 PUT: 上次同步值与本次相同则跳过
  const lastSyncedRef = useRef<boolean | null>(null)

  // v0.76.0 累计待办 #2: localStorage 已在 useState 同步读, useEffect 只标记 hydrated
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // 同步到后端的 helper
  const syncToServer = useCallback(async (value: boolean) => {
    // 防重复: 同一值不重复请求
    if (lastSyncedRef.current === value) return
    lastSyncedRef.current = value
    setIsSyncing(true)
    try {
      // 动态 import 避免循环依赖
      const { getAPI } = await import("../services/api-adapter")
      const api = await getAPI()
      if (api?.putUserPreference) {
        await api.putUserPreference(PREF_KEY, value ? "1" : "0")
      }
    } catch (err) {
      // 失败不阻塞 UI — localStorage 已是真值, 下次 hydrate 重新拉
      console.error("[MaskContext] 后端同步失败, localStorage 仍是权威:", err)
      lastSyncedRef.current = null // 允许下次重试
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const setMasked = useCallback((v: boolean) => {
    setMaskedState(v)
    try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0") } catch {}
    // 异步同步后端 (fire-and-forget)
    void syncToServer(v)
  }, [syncToServer])

  const toggleMask = useCallback(() => setMasked(!masked), [masked, setMasked])

  // v0.75.0: 暴露 syncToServer (供外部 useUserIdSync hook 在登录后调用, 拉后端真值)
  // 注: 这里把 syncToServer 通过 ref 暴露, 不放在 context 里 (避免 context value 频繁变)
  const syncToServerRef = useRef(syncToServer)
  syncToServerRef.current = syncToServer

  return (
    <MaskContext.Provider value={{ masked, toggleMask, setMasked, isSyncing, isHydrated }}>
      {children}
    </MaskContext.Provider>
  )
}

export function useMask() {
  const ctx = useContext(MaskContext)
  if (!ctx) throw new Error("useMask must be used within MaskProvider")
  return ctx
}

/**
 * v0.75.0 useUserIdSync — 登录后拉取后端 user_preferences, 覆盖 localStorage 当前值.
 * 用法: 在 App.tsx 的已登录分支渲染 <UserIdSyncBridge userId={...} />
 */
export function useUserIdSync(userId: string | null | undefined) {
  const { setMasked, isHydrated } = useMask()
  const syncedRef = useRef(false)

  useEffect(() => {
    if (!userId || !isHydrated || syncedRef.current) return
    syncedRef.current = true
    ;(async () => {
      try {
        const { getAPI } = await import("../services/api-adapter")
        const api = await getAPI()
        if (!api?.getUserPreference) return
        const res = await api.getUserPreference(PREF_KEY)
        if (res?.success && res.data?.value != null) {
          const serverValue = res.data.value === "1" || res.data.value === "true"
          setMasked(serverValue)
        }
      } catch (err) {
        console.error("[useUserIdSync] 拉取后端 pii_mask_enabled 失败, 保持 localStorage:", err)
        syncedRef.current = false // 允许重试
      }
    })()
  }, [userId, isHydrated, setMasked])
}