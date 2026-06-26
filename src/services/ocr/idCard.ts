/**
 * 身份证 OCR 识别
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduOCR(imageBase64: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduIdCard(imageBase64, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度OCR')
  }
}

async function offlineOCR(imageBase64: string): Promise<OCRResult> {
  try {
    const response = await fetch(imageBase64)
    const blob = await response.blob()
    const imageUrl = URL.createObjectURL(blob)
    try {
      const Tesseract = await import('tesseract.js')
      const result = await Tesseract.recognize(imageUrl, 'chi_sim+eng')
      const text = result.data.text.replace(/\s+/g, '').trim()
      const patterns = [
        /(\d{17}[\dXx])/,
        /\D(\d{17}[\dXx])\D/,
        /([1-6]\d{16}[\dXx])/,
      ]
      let idCard: string | null = null
      for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) { idCard = match[1].toUpperCase(); break }
      }
      if (!idCard) {
        return { success: false, error: '未能识别到身份证号' }
      }
      const parsed = parseIdCard(idCard)
      return { success: true, text, idCard: { number: idCard, ...parsed } }
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  } catch (error: unknown) {
    console.error('[离线OCR] 识别失败:', error)
    return { success: false, error: `离线OCR失败: ${error instanceof Error ? error.message : '未知错误'}` }
  }
}

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

export async function recognizeIdCard(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return offlineOCR(imageBase64)
    const result = await baiduOCR(imageBase64, currentConfig)
    if (!result.success) {
      const fallbackResult = await offlineOCR(imageBase64)
      if (fallbackResult.success) return { ...fallbackResult, error: '百度OCR失败，已使用本地识别: ' + result.error }
      return result
    }
    return result
  }
  return offlineOCR(imageBase64)
}
