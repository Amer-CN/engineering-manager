/**
 * 在线OCR服务模块
 * 支持百度在线OCR + Tesseract.js离线OCR
 * 在线识别失败时自动回退到离线模式
 * 
 * 重要：百度 OCR HTTP 请求通过主进程 IPC 代理，
 * 不需要关闭 webSecurity，保持安全策略开启。
 */

// ============ 类型定义 ============

export type OCRProvider = 'baidu' | 'offline'

export interface OCRConfig {
  provider: OCRProvider
  enabled: boolean
  // 百度OCR
  baidu?: {
    apiKey: string
    secretKey: string
  }
}

export interface OCRResult {
  success: boolean
  text?: string
  idCard?: {
    number: string
    name?: string
    gender?: string
    ethnicity?: string
    birthDate?: string
    address?: string
    issueAuthority?: string
    validDate?: string
  }
  error?: string
}

// ============ 本地存储 Key ============
const STORAGE_KEY = 'workbuddy_ocr_config'

// ============ 本地存储 ============

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

// ============ 默认配置 ============

export const defaultOCRConfig: OCRConfig = {
  provider: 'offline',
  enabled: true
}

// 内置预配置（安装包自带）- 从配置文件加载
let builtInOCRConfig: OCRConfig = {
  provider: 'baidu',
  enabled: true,
  baidu: {
    apiKey: '',
    secretKey: ''
  }
}

// 标记是否已尝试加载预配置
let configLoaded = false

/**
 * 加载预置的OCR配置文件
 */
export async function loadBuiltInConfig(): Promise<OCRConfig | null> {
  try {
    // 尝试从打包的资源中加载配置
    const response = await fetch('./ocr-config.json')
    if (response.ok) {
      const config = await response.json()
      console.debug('成功加载预置OCR配置:', config)
      return config as OCRConfig
    }
  } catch (error) {
    console.debug('加载预置OCR配置失败，使用默认值:', error)
  }
  return null
}

/**
 * 初始化内置配置（异步）
 */
export async function initializeBuiltInConfig(): Promise<void> {
  if (configLoaded) return
  
  const builtIn = await loadBuiltInConfig()
  if (builtIn) {
    builtInOCRConfig = builtIn
  }
  configLoaded = true
}

// 初始化：优先从localStorage加载，否则使用预配置
const storedConfig = loadConfigFromStorage()
export const initialConfig: OCRConfig = storedConfig || builtInOCRConfig

// ============ OCR服务实现 ============

/**
 * 检查网络连接（通过主进程 IPC，不受浏览器同源策略影响）
 */
async function checkNetwork(): Promise<boolean> {
  try {
    return await window.electronAPI.ocrCheckNetwork()
  } catch {
    // IPC 失败时回退到浏览器 API
    return navigator.onLine
  }
}

/**
 * 百度OCR识别（通过主进程 IPC 代理）
 * 
 * HTTP 请求在主进程发起，不受浏览器同源策略限制，
 * 因此不需要关闭 webSecurity。
 */
async function baiduOCR(imageBase64: string, config: OCRConfig): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }

  try {
    console.debug('[渲染进程] 通过 IPC 调用主进程百度OCR...')
    const result = await window.electronAPI.ocrBaiduIdCard(imageBase64, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: any) {
    console.error('[渲染进程] 百度OCR IPC 调用失败:', error)
    return { success: false, error: `百度OCR请求失败: ${error.message || '未知错误'}` }
  }
}

/**
 * Tesseract.js 离线OCR识别
 */
async function offlineOCR(imageBase64: string): Promise<OCRResult> {
  try {
    console.debug('[离线OCR] 开始识别...')

    // Tesseract.js 需要图片URL或File对象
    // 将base64转换为Blob URL
    const response = await fetch(imageBase64)
    const blob = await response.blob()

    // 创建临时URL
    const imageUrl = URL.createObjectURL(blob)

    console.debug('[离线OCR] 图片URL创建成功:', imageUrl.substring(0, 50))

    try {
      const Tesseract = await import('tesseract.js')
      const result = await Tesseract.recognize(imageUrl, 'chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.debug(`[离线OCR] 识别进度: ${Math.round(m.progress * 100)}%`)
          }
        }
      })

      console.debug('[离线OCR] 原始识别文本:', result.data.text.substring(0, 200))

      const text = result.data.text.replace(/\s+/g, '').trim()
      console.debug('[离线OCR] 清理后文本:', text.substring(0, 100))

      // 提取身份证号 - 多种正则匹配
      const patterns = [
        /(\d{17}[\dXx])/,           // 标准18位
        /\D(\d{17}[\dXx])\D/,       // 带边界
        /([1-6]\d{16}[\dXx])/,     // 以地区码开头
      ]

      let idCard: string | null = null
      for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) {
          idCard = match[1].toUpperCase()
          console.debug('[离线OCR] 匹配到身份证号:', idCard)
          break
        }
      }

      if (!idCard) {
        // 最后尝试：搜索所有17-18位数字组合
        const allNumbers = text.match(/\d{15,18}/g)
        console.debug('[离线OCR] 所有15-18位数字:', allNumbers)
        return { success: false, error: '未能识别到身份证号' }
      }

      const parsed = parseIdCard(idCard)
      console.debug('[离线OCR] 解析结果:', parsed)

      return {
        success: true,
        text,
        idCard: {
          number: idCard,
          ...parsed
        }
      }
    } finally {
      // 清理临时URL
      URL.revokeObjectURL(imageUrl)
    }
  } catch (error: any) {
    console.error('[离线OCR] 识别失败:', error)
    return { success: false, error: `离线OCR失败: ${error.message}` }
  }
}

/**
 * 解析身份证号获取基本信息（离线模式用）
 */
function parseIdCard(idCard: string): { gender?: string; birthDate?: string } {
  const match = idCard.match(/^(\d{6})(\d{8})(\d{3}[\dXx])$/)
  if (!match) return {}

  const birthStr = match[2]
  const genderCode = parseInt(match[3][0])
  
  return {
    gender: genderCode % 2 === 1 ? '男' : '女',
    birthDate: `${birthStr.slice(0, 4)}-${birthStr.slice(4, 6)}-${birthStr.slice(6, 8)}`
  }
}

// ============ 主服务 ============

let currentConfig: OCRConfig = { ...initialConfig }

/**
 * 更新OCR配置（仅更新内存）
 */
export function setOCRConfig(config: Partial<OCRConfig>) {
  currentConfig = { ...currentConfig, ...config }
}

/**
 * 保存并持久化OCR配置
 */
export function saveOCRConfig(config: OCRConfig) {
  currentConfig = config
  saveConfigToStorage(config)
  // 配置变更时清除主进程的 Token 缓存
  window.electronAPI.ocrClearTokenCache().catch(() => {})
}

/**
 * 获取当前OCR配置
 */
export function getOCRConfig(): OCRConfig {
  return currentConfig
}

/**
 * 主OCR识别函数
 * 优先使用百度OCR，失败时自动回退到离线模式
 */
export async function recognizeIdCard(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig

  if (!enabled) {
    return { success: false, error: 'OCR功能已禁用' }
  }

  // 检查网络
  const isOnline = await checkNetwork()

  // 离线模式或离线网络
  if (provider === 'offline' || !isOnline) {
    console.debug('使用离线OCR识别')
    return offlineOCR(imageBase64)
  }

  // 使用百度OCR
  console.debug('使用百度OCR识别')
  const result = await baiduOCR(imageBase64, currentConfig)

  // 在线识别失败，尝试离线备选
  if (!result.success) {
    console.warn(`百度OCR失败: ${result.error}，尝试离线OCR...`)
    const fallbackResult = await offlineOCR(imageBase64)
    if (fallbackResult.success) {
      console.debug('离线OCR备选成功')
      return { 
        ...fallbackResult, 
        error: `百度OCR失败，已使用本地识别: ${result.error}` 
      }
    }
    return result
  }

  return result
}

/**
 * 检查OCR配置状态
 */
export async function checkOCRStatus(): Promise<{ online: boolean; provider: OCRProvider; configured: boolean }> {
  const isOnline = await checkNetwork()
  let configured = currentConfig.provider === 'offline' || 
                   !!(currentConfig.baidu?.apiKey && currentConfig.baidu?.secretKey)

  return {
    online: isOnline,
    provider: currentConfig.provider,
    configured
  }
}

/**
 * 获取服务商名称
 */
export function getProviderName(provider: OCRProvider): string {
  switch (provider) {
    case 'baidu': return '百度OCR'
    case 'offline': return '本地离线'
    default: return provider
  }
}
