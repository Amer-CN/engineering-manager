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

/** SSE 推送的下载进度 */
export interface DownloadProgress {
  phase: 'idle' | 'downloading' | 'verifying' | 'done' | 'error' | 'cancelled'
  bytesReceived: number
  totalBytes?: number
  percent?: number
  speedBytesPerSec?: number
  filePath?: string
  error?: string
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

/** 启动后台下载（立即返回） */
export const startDownload = async (): Promise<boolean> => {
  const res = await apiClient.post<{ accepted: boolean }>('/api/update/download', {})
  return res.success && !!res.data?.accepted
}

/**
 * 订阅下载进度（SSE）。返回 EventSource，调用方在组件卸载时 eventSource.close()
 * onProgress 收到 snake_case → camelCase 转换后的进度对象
 */
export const subscribeDownloadProgress = (
  onProgress: (p: DownloadProgress) => void
): EventSource => {
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:5048'
  const es = new EventSource(`${base}/api/update/download/stream`)
  es.onmessage = (e) => {
    try {
      const raw = JSON.parse(e.data)
      // 后端返回的 camelCase 经过 JSON 序列化后是 camelCase，直接使用
      onProgress(raw as DownloadProgress)
    } catch { /* ignore parse errors */ }
  }
  es.onerror = () => {
    // EventSource 自动重连，不做特殊处理
  }
  return es
}

/** 取消下载 */
export const cancelDownload = async (): Promise<boolean> => {
  const res = await apiClient.post('/api/update/download/cancel', {})
  return res.success
}

/** 装包 + 重启 */
export const applyUpdate = async (path: string): Promise<boolean> => {
  const res = await apiClient.post('/api/update/apply', { path })
  return res.success
}
