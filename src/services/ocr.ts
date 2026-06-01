/**
 * 在线OCR服务模块
 * 支持百度在线OCR + Tesseract.js离线OCR
 * 在线识别失败时自动回退到离线模式
 *
 * 重要：百度 OCR HTTP 请求通过主进程 IPC 代理，
 * 不需要关闭 webSecurity，保持安全策略开启。
 */

import { getAPI } from './api-adapter'

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
  invoice?: {
    invoiceNum: string
    invoiceCode: string
    invoiceDate: string
    invoiceType: string
    totalAmount: number
    amountWithoutTax: number
    totalTax: number
    taxRate: number
    sellerName: string
    purchaserName: string
    checkCode: string
    itemName: string
    remarks: string
  }
  bankCard?: {
    cardNumber: string
    bankName: string
    cardType: string
    validDate: string
  }
  businessLicense?: {
    creditCode: string
    companyName: string
    legalPerson: string
    registeredCapital: string
    address: string
    businessScope: string
    establishDate: string
    expireDate: string
  }
  bankReceipt?: {
    transactionDate: string
    transactionTime: string
    amount: number
    payerName: string
    payerAccount: string
    payeeName: string
    payeeAccount: string
    transactionNo: string
    bankName: string
    remarks: string
  }
  permit?: {
    companyCode: string
    companyName: string
    accountNumber: string
    bankName: string
    permitNumber: string
  }
  bankStatement?: {
    transactions: Array<{
      date: string
      time: string
      amount: number
      balance: number
      type: string
      counterparty: string
      remark: string
    }>
    accountNumber: string
    bankName: string
  }
  generalReceipt?: {
    text: string
    amount: number
    date: string
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
 * 
 * 从 public/ocr-config.json 加载内置配置，同步到 currentConfig。
 * API Key 写入后可立即使用百度 OCR。
 * 若网络不通，recognizeIdCard 中的 checkNetwork 会快速（3 秒超时）
 * 检测到并自动回退到离线识别。
 */
export async function initializeBuiltInConfig(): Promise<void> {
  if (configLoaded) return
  
  const builtIn = await loadBuiltInConfig()
  if (builtIn) {
    builtInOCRConfig = builtIn
    // 首次加载且无 localStorage 配置时，同步内置配置
    if (!currentConfig.baidu?.apiKey && builtIn.baidu?.apiKey) {
      currentConfig = { ...builtIn }
      console.debug('[OCR] 已从 ocr-config.json 同步完整配置到 currentConfig')
    }
  }
  configLoaded = true
}

// 初始化：优先从localStorage加载，否则使用预配置
const storedConfig = loadConfigFromStorage()
export const initialConfig: OCRConfig = storedConfig || builtInOCRConfig

// ============ OCR服务实现 ============

async function checkNetwork(): Promise<boolean> {
  // 使用浏览器 API 快速检测，不依赖外部站点（navigator.onLine 反映OS级网络状态）
  return navigator.onLine
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
    const result = await (await getAPI()).ocrBaiduIdCard(imageBase64, {
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
 * 百度发票 OCR 识别（通过主进程 IPC 代理）
 */
async function baiduInvoiceOCR(imageBase64: string, config: OCRConfig): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }

  try {
    const result = await (await getAPI()).ocrBaiduInvoice(imageBase64, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: any) {
    console.error('[渲染进程] 百度发票OCR IPC 调用失败:', error)
    return { success: false, error: `百度OCR请求失败: ${error.message || '未知错误'}` }
  }
}

/**
 * 百度银行卡 OCR 识别（通过主进程 IPC 代理）
 */
async function baiduBankCardOCR(imageBase64: string, config: OCRConfig): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }

  try {
    const result = await (await getAPI()).ocrBaiduBankCard(imageBase64, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: any) {
    console.error('[渲染进程] 百度银行卡OCR IPC 调用失败:', error)
    return { success: false, error: `百度OCR请求失败: ${error.message || '未知错误'}` }
  }
}

/**
 * 百度营业执照 OCR 识别（通过主进程 IPC 代理）
 */
async function baiduBusinessLicenseOCR(imageBase64: string, config: OCRConfig): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }

  try {
    const result = await (await getAPI()).ocrBaiduBusinessLicense(imageBase64, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: any) {
    console.error('[渲染进程] 百度营业执照OCR IPC 调用失败:', error)
    return { success: false, error: `百度OCR请求失败: ${error.message || '未知错误'}` }
  }
}

/**
 * 百度银行回单 OCR 识别（通过主进程 IPC 代理）
 */
async function baiduBankReceiptOCR(imageBase64: string, config: OCRConfig): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }

  try {
    const result = await (await getAPI()).ocrBaiduBankReceipt(imageBase64, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: any) {
    console.error('[渲染进程] 百度银行回单OCR IPC 调用失败:', error)
    return { success: false, error: `百度OCR请求失败: ${error.message || '未知错误'}` }
  }
}

/**
 * 百度开户许可证 OCR 识别（通过主进程 IPC 代理）
 */
async function baiduPermitOCR(imageBase64: string, config: OCRConfig): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }

  try {
    const result = await (await getAPI()).ocrBaiduPermit(imageBase64, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: any) {
    console.error('[渲染进程] 百度开户许可证OCR IPC 调用失败:', error)
    return { success: false, error: `百度OCR请求失败: ${error.message || '未知错误'}` }
  }
}

/**
 * 百度银行单据 OCR 识别（通过主进程 IPC 代理）
 */
async function baiduBankStatementOCR(imageBase64: string, config: OCRConfig): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }

  try {
    const result = await (await getAPI()).ocrBaiduBankStatement(imageBase64, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: any) {
    console.error('[渲染进程] 百度银行单据OCR IPC 调用失败:', error)
    return { success: false, error: `百度OCR请求失败: ${error.message || '未知错误'}` }
  }
}

/**
 * 百度通用票据 OCR 识别（通过主进程 IPC 代理）
 */
async function baiduGeneralReceiptOCR(imageBase64: string, config: OCRConfig): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }

  try {
    const result = await (await getAPI()).ocrBaiduGeneralReceipt(imageBase64, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: any) {
    console.error('[渲染进程] 百度通用票据OCR IPC 调用失败:', error)
    return { success: false, error: `百度OCR请求失败: ${error.message || '未知错误'}` }
  }
}

/**
 * 百度企业工商信息查询（通过主进程 IPC 代理）
 */
async function baiduCompanyQuery(companyName: string, config: OCRConfig): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }

  try {
    const result = await (await getAPI()).ocrBaiduCompanyQuery(companyName, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: any) {
    console.error('[渲染进程] 百度企业查询 IPC 调用失败:', error)
    return { success: false, error: `企业查询请求失败: ${error.message || '未知错误'}` }
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
  getAPI().then(api => api.ocrClearTokenCache()).catch(() => {})
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

  // 百度模式：快速检测网络
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) {
      return offlineOCR(imageBase64)
    }
    const result = await baiduOCR(imageBase64, currentConfig)
    if (!result.success) {
      const fallbackResult = await offlineOCR(imageBase64)
      if (fallbackResult.success) return { ...fallbackResult, error: '百度OCR失败，已使用本地识别: ' + result.error }
      return result
    }
    return result
  }

  // 离线模式
  console.debug('使用离线OCR识别')
  return offlineOCR(imageBase64)
}

/**
 * 发票OCR识别主入口
 * 根据配置自动选择百度在线或离线识别
 */
export async function recognizeInvoice(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig

  if (!enabled) {
    return { success: false, error: 'OCR功能已禁用' }
  }

  // 百度模式
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) {
      return { success: false, error: '网络不可用，发票识别需要在线模式' }
    }
    return await baiduInvoiceOCR(imageBase64, currentConfig)
  }

  // 离线模式不支持发票识别
  return { success: false, error: '发票识别仅支持百度在线模式' }
}

/**
 * 银行卡OCR识别主入口
 */
export async function recognizeBankCard(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig

  if (!enabled) {
    return { success: false, error: 'OCR功能已禁用' }
  }

  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) {
      return { success: false, error: '网络不可用，银行卡识别需要在线模式' }
    }
    return await baiduBankCardOCR(imageBase64, currentConfig)
  }

  return { success: false, error: '银行卡识别仅支持百度在线模式' }
}

/**
 * 营业执照OCR识别主入口
 */
export async function recognizeBusinessLicense(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig

  if (!enabled) {
    return { success: false, error: 'OCR功能已禁用' }
  }

  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) {
      return { success: false, error: '网络不可用，营业执照识别需要在线模式' }
    }
    return await baiduBusinessLicenseOCR(imageBase64, currentConfig)
  }

  return { success: false, error: '营业执照识别仅支持百度在线模式' }
}

/**
 * 银行回单OCR识别主入口
 */
export async function recognizeBankReceipt(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig

  if (!enabled) {
    return { success: false, error: 'OCR功能已禁用' }
  }

  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) {
      return { success: false, error: '网络不可用，银行回单识别需要在线模式' }
    }
    return await baiduBankReceiptOCR(imageBase64, currentConfig)
  }

  return { success: false, error: '银行回单识别仅支持百度在线模式' }
}

/**
 * 开户许可证OCR识别主入口
 */
export async function recognizePermit(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig

  if (!enabled) {
    return { success: false, error: 'OCR功能已禁用' }
  }

  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) {
      return { success: false, error: '网络不可用，开户许可证识别需要在线模式' }
    }
    return await baiduPermitOCR(imageBase64, currentConfig)
  }

  return { success: false, error: '开户许可证识别仅支持百度在线模式' }
}

/**
 * 银行单据OCR识别主入口（高级版）
 */
export async function recognizeBankStatement(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig

  if (!enabled) {
    return { success: false, error: 'OCR功能已禁用' }
  }

  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) {
      return { success: false, error: '网络不可用，银行单据识别需要在线模式' }
    }
    return await baiduBankStatementOCR(imageBase64, currentConfig)
  }

  return { success: false, error: '银行单据识别仅支持百度在线模式' }
}

/**
 * 通用票据OCR识别主入口
 */
export async function recognizeGeneralReceipt(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig

  if (!enabled) {
    return { success: false, error: 'OCR功能已禁用' }
  }

  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) {
      return { success: false, error: '网络不可用，通用票据识别需要在线模式' }
    }
    return await baiduGeneralReceiptOCR(imageBase64, currentConfig)
  }

  return { success: false, error: '通用票据识别仅支持百度在线模式' }
}

/**
 * 企业工商信息查询主入口
 */
export async function queryCompanyInfo(companyName: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig

  if (!enabled) {
    return { success: false, error: 'OCR功能已禁用' }
  }

  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) {
      return { success: false, error: '网络不可用，企业查询需要在线模式' }
    }
    return await baiduCompanyQuery(companyName, currentConfig)
  }

  return { success: false, error: '企业查询仅支持百度在线模式' }
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
