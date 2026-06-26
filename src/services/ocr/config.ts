/**
 * OCR 配置管理
 * 包含本地存储、内置配置加载、currentConfig 管理
 */
import type { OCRConfig } from './types'
import { getAPI } from '../api-adapter'

const STORAGE_KEY = 'workbuddy_ocr_config'

function saveConfigToStorage(config: OCRConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('保存OCR配置到localStorage失败:', error)
  }
}

function loadConfigFromStorage(): OCRConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as OCRConfig
    }
  } catch (error) {
    console.error('从localStorage加载OCR配置失败:', error)
  }
  return null
}

export const defaultOCRConfig: OCRConfig = {
  provider: 'offline',
  enabled: true
}

let builtInOCRConfig: OCRConfig = {
  provider: 'baidu',
  enabled: true,
  baidu: { apiKey: '', secretKey: '' }
}

let configLoaded = false

export async function loadBuiltInConfig(): Promise<OCRConfig | null> {
  try {
    const response = await fetch('./ocr-config.json')
    if (response.ok) {
      const config = await response.json()
      return config as OCRConfig
    }
  } catch (err) { console.warn('[OcrConfig] 加载内置配置失败:', err) }
  return null
}

export async function initializeBuiltInConfig(): Promise<void> {
  if (configLoaded) return
  const builtIn = await loadBuiltInConfig()
  if (builtIn) {
    builtInOCRConfig = builtIn
    if (!currentConfig.baidu?.apiKey && builtIn.baidu?.apiKey) {
      currentConfig = { ...builtIn }
    }
  }
  configLoaded = true
}

const storedConfig = loadConfigFromStorage()
export const initialConfig: OCRConfig = storedConfig || builtInOCRConfig

export let currentConfig: OCRConfig = { ...initialConfig }

export function setOCRConfig(config: Partial<OCRConfig>) {
  currentConfig = { ...currentConfig, ...config }
}

export function saveOCRConfig(config: OCRConfig) {
  currentConfig = config
  saveConfigToStorage(config)
  getAPI().then(api => api.ocrClearTokenCache()).catch(() => {})
}

export function getOCRConfig(): OCRConfig {
  return currentConfig
}
