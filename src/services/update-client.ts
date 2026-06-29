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

/** 下载最新安装包（返回本地路径） */
export const downloadUpdate = async (): Promise<string | null> => {
  const res = await apiClient.post<{ path: string }>('/api/update/download', {})
  if (!res.success) return null
  return res.data?.path ?? null
}

/** 装包 + 重启 */
export const applyUpdate = async (path: string): Promise<boolean> => {
  const res = await apiClient.post('/api/update/apply', { path })
  return res.success
}
