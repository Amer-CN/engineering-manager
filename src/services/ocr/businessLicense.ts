/**
 * 营业执照 OCR 识别
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduBusinessLicenseOCR(imageBase64: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduBusinessLicense(imageBase64, {
      apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度营业执照OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度营业执照OCR')
  }
}

export async function recognizeBusinessLicense(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，营业执照识别需要在线模式' }
    return await baiduBusinessLicenseOCR(imageBase64, currentConfig)
  }
  return { success: false, error: '营业执照识别仅支持百度在线模式' }
}
