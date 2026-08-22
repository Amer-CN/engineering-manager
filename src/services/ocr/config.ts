/**
 * OCR 配置管理
 * 仅内存管理（provider/enabled）；百度密钥由后端 LoadOcrConfig 负责，前端不再持有与持久化
 */
import type { OCRConfig } from './types'
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
