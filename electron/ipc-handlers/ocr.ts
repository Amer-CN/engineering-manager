/**
 * OCR IPC 处理器
 *
 * 将百度 OCR API 请求从渲染进程移到主进程，
 * 避免需要关闭 webSecurity 导致的安全风险。
 *
 * 主进程使用 Node.js 的 net.fetch (Electron 内置) 发起 HTTP 请求，
 * 不受浏览器同源策略限制。
 */

import { ipcMain } from 'electron'
import log from 'electron-log'

// ============ 类型定义 ============

interface BaiduOCRConfig {
  apiKey: string
  secretKey: string
}

interface OCRResult {
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

// ============ Token 缓存 ============

interface TokenCache {
  accessToken: string
  expiresAt: number  // Unix timestamp (ms)
}

let tokenCache: TokenCache | null = null

/**
 * 获取百度 OCR access_token（带缓存）
 * Token 有效期 30 天，提前 1 小时刷新
 */
async function getAccessToken(config: BaiduOCRConfig): Promise<string> {
  // 检查缓存
  if (tokenCache && tokenCache.expiresAt > Date.now() + 3600_000) {
    log.info('[OCR] 使用缓存的 access_token')
    return tokenCache.accessToken
  }

  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${config.secretKey}`

  log.info('[OCR] 获取新的 access_token...')

  const response = await net.fetch(tokenUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000)
  })

  const data = await response.json() as any

  if (data.error) {
    throw new Error(`获取Token失败: ${data.error_description || data.error}`)
  }

  // 缓存 token（百度返回的 expires_in 是秒数，通常 2592000 = 30天）
  const expiresIn = data.expires_in || 2592000
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000
  }

  log.info('[OCR] access_token 获取成功，有效期:', Math.round(expiresIn / 86400), '天')
  return data.access_token
}

/**
 * 百度身份证 OCR 识别
 */
async function baiduIdCardOCR(imageBase64: string, config: BaiduOCRConfig): Promise<OCRResult> {
  try {
    log.info('[OCR] 开始百度身份证识别...')

    // Step 1: 获取 access_token
    const accessToken = await getAccessToken(config)

    // Step 2: 调用身份证识别 API
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    const ocrUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=${accessToken}`

    // 百度 API 要求 image 参数放在 form 中
    const formData = new URLSearchParams()
    formData.append('id_card_side', 'front')
    formData.append('image', base64Data)

    log.info('[OCR] 发送识别请求...')
    const ocrResponse = await net.fetch(ocrUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(15_000)
    })

    const ocrData = await ocrResponse.json() as any

    if (ocrData.error_code) {
      // 如果是 token 过期，清除缓存让下次重新获取
      if (ocrData.error_code === 110 || ocrData.error_code === 111) {
        log.warn('[OCR] Token 无效或过期，清除缓存')
        tokenCache = null
      }
      return { success: false, error: `百度OCR错误: ${ocrData.error_msg || ocrData.error_code}` }
    }

    // 解析结果
    const words = ocrData.words_result || {}

    const result: OCRResult = {
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

    log.info('[OCR] 识别成功, 姓名:', result.idCard?.name, '身份证号:', result.idCard?.number?.substring(0, 3) + '****')
    return result
  } catch (error: any) {
    log.error('[OCR] 百度OCR失败:', error.message)
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
 * 检查网络连通性（从主进程检测，不依赖浏览器 API）
 */
async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const response = await net.fetch('https://www.baidu.com/favicon.ico', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch {
    return false
  }
}

// ============ 注册 IPC 处理器 ============

export function registerOCRHandlers(): void {
  /**
   * 百度 OCR 身份证识别
   * 渲染进程通过 IPC 调用，避免需要 webSecurity: false
   */
  ipcMain.handle('ocr:baiduIdCard', async (_event, imageBase64: string, config: BaiduOCRConfig) => {
    log.info('[OCR] 收到身份证识别请求')
    return await baiduIdCardOCR(imageBase64, config)
  })

  /**
   * 检查网络连通性
   */
  ipcMain.handle('ocr:checkNetwork', async () => {
    return await checkNetworkConnectivity()
  })

  /**
   * 清除 Token 缓存（配置变更时调用）
   */
  ipcMain.handle('ocr:clearTokenCache', async () => {
    tokenCache = null
    log.info('[OCR] Token 缓存已清除')
    return true
  })

  log.info('[OCR] IPC 处理器注册完成')
}
