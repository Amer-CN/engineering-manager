import { apiClient } from './api-client'

export interface UpdatePackage {
  url: string
  size: number
  sha256: string
  signature?: string
}

export interface UpdateCheck {
  hasUpdate: boolean
  current: string
  latest: string
  forced: boolean
  notesUrl?: string
  package?: UpdatePackage
}

/**
 * 检查版本更新 — 后端返回 Common.Ok 包装：{ success, data }
 * apiClient 已自动拆包并蛇形→驼峰转换
 */
export const checkUpdate = async (): Promise<UpdateCheck | null> => {
  const res = await apiClient.get<UpdateCheck>('/api/update/check')
  if (!res.success) return null
  return res.data ?? null
}
