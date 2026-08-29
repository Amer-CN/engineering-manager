/**
 * OCR 配置管理
 * 仅内存管理（provider/enabled 偏好）；百度密钥的持久化在后端（DPAPI 加密），
 * 前端不持有、不回显明文——密钥框留空 = 保留后端已存密钥。
 */
import type { OCRConfig } from './types'
import { apiClient } from '../api-client'
import { getAPI } from '../api-adapter'

export const defaultOCRConfig: OCRConfig = {
  provider: 'baidu',
  enabled: true,
  baidu: {
    apiKey: '',
    secretKey: ''
  }
}

export const initialConfig: OCRConfig = defaultOCRConfig

export let currentConfig: OCRConfig = { ...initialConfig }

export function setOCRConfig(config: Partial<OCRConfig>) {
  currentConfig = { ...currentConfig, ...config }
}

export function saveOCRConfig(config: OCRConfig) {
  currentConfig = config
  getAPI().then(api => api.ocrClearTokenCache()).catch(() => {})
}

export function getOCRConfig(): OCRConfig {
  return currentConfig
}

// ═══════════════════════════════════════════════════════════
// 百度密钥的读状态 / 保存 / 清除 — 走后端首次配置向导三端点
// （/api/ocr/setup/* 免鉴权：首次启动未登录也要能完成引导）
// ═══════════════════════════════════════════════════════════

/**
 * 从向导端点响应中取数据体——这三个端点返回裸 JSON（非 {success,data} 信封，
 * 见 OcrSetupWizard.cs 的 Results.Ok），且 HTTP 层错误时 apiClient 会把 error
 * 塞进信封字段；两种形状都要兼容。
 */
function unwrapOcrSetupData<T>(raw: unknown): T | null {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if ('error' in obj && !('configured' in obj) && !('message' in obj)) return null // 信封失败
    return raw as T
  }
  return null
}

/** 查询后端密钥配置状态（configured 判定含 env / DPAPI / 明文兼容三级，与识别链路同源） */
export async function fetchOcrSetupStatus(): Promise<{ configured: boolean; source: string } | null> {
  const result = await apiClient.get<{ configured: boolean; source: string }>('/api/ocr/setup/status')
  // 裸 JSON（向导端点）没有 success 字段——data 形状存在即成功
  const data = unwrapOcrSetupData<{ configured: boolean; source: string }>(result.data ?? result)
  if (data && typeof data.configured === 'boolean') return data
  return null
}

/** 保存密钥（后端 DPAPI 加密落盘 + 同步进程环境变量，立即生效）；两个 key 都必填 */
export async function saveOcrKeys(apiKey: string, secretKey: string): Promise<{ success: boolean; error?: string }> {
  const result = await apiClient.post<{ success?: boolean; message?: string; error?: string }>('/api/ocr/setup/save', {
    apiKey, secretKey,
  })
  // 400/500 时 apiClient 返回 {success:false,error}；200 时向导返回裸 {success,message}
  if (result.error) return { success: false, error: result.error }
  const raw = (result.data ?? result) as Record<string, unknown>
  if (raw && raw.success === false) return { success: false, error: String(raw.message ?? '保存密钥失败') }
  return { success: true }
}

/** 清除后端已保存的密钥（删 DPAPI 文件 + 清进程环境变量） */
export async function clearOcrKeys(): Promise<{ success: boolean; error?: string }> {
  const result = await apiClient.del<{ success?: boolean; error?: string }>('/api/ocr/setup/clear')
  if (result.error) return { success: false, error: result.error }
  const raw = (result.data ?? result) as Record<string, unknown>
  if (raw && raw.success === false) return { success: false, error: '清除密钥失败' }
  return { success: true }
}
