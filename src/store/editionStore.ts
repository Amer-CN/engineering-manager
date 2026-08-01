/**
 * editionStore - 版本能力状态（M-EDITION1 X8）
 *
 * 启动时从 GET /api/config 拉取 features 数组（后端算好下发），
 * 前端只消费不推导。禁止在前端自建 edition → features 映射。
 *
 * 三态设计（8F.2）：
 *   features = null  → 未就绪（/api/config 尚未返回）
 *   features = []    → personal（已加载，无企业能力）
 *   features = [...]  → enterprise（已加载，有能力）
 *
 * 未就绪时 useHasFeature 返回 false（fail-safe），
 * App.tsx 在 loaded=false 时不渲染受控区域（避免首屏闪现）。
 */

import { create } from 'zustand'
import { getAPI } from '@/services/api-adapter'

interface EditionState {
  /** 后端下发的能力集合。null=未就绪, []=personal, 非空=enterprise */
  features: string[] | null
  loaded: boolean
  fetchFeatures: () => Promise<void>
}

export const useEditionStore = create<EditionState>((set) => ({
  // 8F.2: 初值 null = 未就绪（区别于 [] = personal）
  features: null,
  loaded: false,

  fetchFeatures: async () => {
    try {
      const api = await getAPI()
      if (!api) {
        set({ features: [], loaded: true })
        return
      }
      const res = await api.getConfig()
      const feats = (res as any)?.features
      set({
        features: Array.isArray(feats) ? feats : [],
        loaded: true,
      })
    } catch {
      // 后端不可用时 fallback 到 personal 行为（空集）
      set({ features: [], loaded: true })
    }
  },
}))

/**
 * 判断当前是否拥有指定能力（消费后端下发，不推导）。
 * 未就绪（features=null）时返回 false（fail-safe，不闪现企业功能）。
 * 用法：const canManageUsers = useHasFeature('userManagement')
 */
export const useHasFeature = (key: string) =>
  useEditionStore(s => s.features !== null && s.features.includes(key))

/** 能力是否已加载（供 App.tsx 首屏时序判断） */
export const useEditionLoaded = () => useEditionStore(s => s.loaded)
