/**
 * editionStore - 版本能力状态（M-EDITION1 X8）
 *
 * 启动时从 GET /api/config 拉取 features 数组（后端算好下发），
 * 前端只消费不推导。禁止在前端自建 edition → features 映射。
 */

import { create } from 'zustand'
import { getAPI } from '@/services/api-adapter'

interface EditionState {
  /** 后端下发的能力集合 */
  features: string[]
  loaded: boolean
  fetchFeatures: () => Promise<void>
}

export const useEditionStore = create<EditionState>((set) => ({
  // fail-safe 初值：空数组 = 无任何企业能力 = 最保守方向（等同 personal）
  features: [],
  loaded: false,

  fetchFeatures: async () => {
    try {
      const api = await getAPI()
      if (!api) return
      const res = await api.getConfig()
      const feats = (res as any)?.features
      set({
        features: Array.isArray(feats) ? feats : [],
        loaded: true,
      })
    } catch {
      // 后端不可用时默认无能力（personal 行为）
      set({ features: [], loaded: true })
    }
  },
}))

/**
 * 判断当前是否拥有指定能力（消费后端下发，不推导）。
 * 用法：const canManageUsers = useHasFeature('userManagement')
 */
export const useHasFeature = (key: string) =>
  useEditionStore(s => s.features.includes(key))
