/**
 * 在线OCR服务模块
 * 支持百度在线OCR + Tesseract.js离线OCR
 * 在线识别失败时自动回退到离线模式
 */

import Tesseract from 'tesseract.js'

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
    const response = await fetch('/ocr-config.json')
    if (response.ok) {
      const config = await response.json()
      console.log('成功加载预置OCR配置:', config)
      return config as OCRConfig
    }
  } catch (error) {
    console.log('加载预置OCR配置失败，使用默认值:', error)
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
 * 检查网络连接
 */
async function checkNetwork(): Promise<boolean> {
  // 先检查浏览器在线状态
  if (!navigator.onLine) {
    return false
  }
  
  // 尝试连接百度验证实际网络（使用首页而非 API 域名，避免 403）
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    await fetch('https://www.baidu.com/favicon.ico', {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    return true
  } catch {
    return false
  }
}

/**
 * 百度OCR识别
 * 文档: https://cloud.baidu.com/doc/OCR/OCR-API.html
 */
async function baiduOCR(imageBase64: string, config: OCRConfig): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }

  try {
    console.log('开始百度OCR识别...')
    
    // Step 1: 获取access_token
    const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${config.baidu.apiKey}&client_secret=${config.baidu.secretKey}`
    console.log('获取Token URL:', tokenUrl.substring(0, 80) + '...')
    
    const tokenResponse = await fetch(tokenUrl, { 
      method: 'POST',
      signal: AbortSignal.timeout(10000)
    })
    const tokenData = await tokenResponse.json()
    console.log('Token响应:', tokenData)

    if (tokenData.error) {
      return { success: false, error: `获取Token失败: ${tokenData.error_description || tokenData.error}` }
    }

    const accessToken = tokenData.access_token
    console.log('获取Token成功:', accessToken ? '是' : '否')

    // Step 2: 调用身份证识别API
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    console.log('图片Base64长度:', base64Data.length)
    
    const ocrUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=${accessToken}`
    console.log('OCR请求URL:', ocrUrl.substring(0, 100) + '...')
    
    const formData = new FormData()
    formData.append('id_card_side', 'front') // 人像面
    formData.append('image', base64Data)

    console.log('发送OCR请求...')
    const ocrResponse = await fetch(ocrUrl, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000)
    })
    console.log('OCR响应状态:', ocrResponse.status)
    
    const ocrData = await ocrResponse.json()
    console.log('OCR响应数据:', JSON.stringify(ocrData).substring(0, 200))

    if (ocrData.error_code) {
      return { success: false, error: `百度OCR错误: ${ocrData.error_msg || ocrData.error_code}` }
    }

    // 解析结果
    const words = ocrData.words_result || {}
    
    return {
      success: true,
      text: JSON.stringify(words),
      idCard: {
        number: words?.公民身份号码?.words || '',
        name: words?.姓名?.words,
        gender: words?.性别?.words,
        ethnicity: words?.民族?.words,
        birthDate: formatBirthDate(words?.出生?.words),
        address: words?.住址?.words,
        issueAuthority: words?.签发机关?.words,
        validDate: words?.有效期限?.words
      }
    }
  } catch (error: any) {
    console.error('百度OCR详细错误:', error)
    if (error.name === 'AbortError') {
      return { success: false, error: '百度OCR请求超时，请检查网络连接' }
    }
    return { success: false, error: `百度OCR请求失败: ${error.message || '未知错误'}` }
  }
}

/**
 * 格式化出生日期 (YYYYMMDD -> YYYY-MM-DD)
 */
function formatBirthDate(birth: string | undefined): string | undefined {
  if (!birth || birth.length !== 8) return birth
  return `${birth.slice(0, 4)}-${birth.slice(4, 6)}-${birth.slice(6, 8)}`
}

/**
 * Tesseract.js 离线OCR识别
 */
async function offlineOCR(imageBase64: string): Promise<OCRResult> {
  try {
    console.log('[离线OCR] 开始识别...')

    // Tesseract.js 需要图片URL或File对象
    // 将base64转换为Blob URL
    const response = await fetch(imageBase64)
    const blob = await response.blob()

    // 创建临时URL
    const imageUrl = URL.createObjectURL(blob)

    console.log('[离线OCR] 图片URL创建成功:', imageUrl.substring(0, 50))

    try {
      const result = await Tesseract.recognize(imageUrl, 'chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[离线OCR] 识别进度: ${Math.round(m.progress * 100)}%`)
          }
        }
      })

      console.log('[离线OCR] 原始识别文本:', result.data.text.substring(0, 200))

      const text = result.data.text.replace(/\s+/g, '').trim()
      console.log('[离线OCR] 清理后文本:', text.substring(0, 100))

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
          console.log('[离线OCR] 匹配到身份证号:', idCard)
          break
        }
      }

      if (!idCard) {
        // 最后尝试：搜索所有17-18位数字组合
        const allNumbers = text.match(/\d{15,18}/g)
        console.log('[离线OCR] 所有15-18位数字:', allNumbers)
        return { success: false, error: '未能识别到身份证号' }
      }

      const parsed = parseIdCard(idCard)
      console.log('[离线OCR] 解析结果:', parsed)

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
    console.log('使用离线OCR识别')
    return offlineOCR(imageBase64)
  }

  // 使用百度OCR
  console.log('使用百度OCR识别')
  const result = await baiduOCR(imageBase64, currentConfig)

  // 在线识别失败，尝试离线备选
  if (!result.success) {
    console.warn(`百度OCR失败: ${result.error}，尝试离线OCR...`)
    const fallbackResult = await offlineOCR(imageBase64)
    if (fallbackResult.success) {
      console.log('离线OCR备选成功')
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
