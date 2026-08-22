/**
 * 银行单据 OCR 识别（高级版）
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduBankStatementOCR(imageBase64: string): Promise<OCRResult> {
  try {
    const result = await (await getAPI()).ocrBaiduBankStatement(imageBase64)
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度银行单据OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度银行单据OCR')
  }
}

export async function recognizeBankStatement(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu') {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，银行单据识别需要在线模式' }
    return await baiduBankStatementOCR(imageBase64)
  }
  return { success: false, error: '银行单据识别仅支持百度在线模式' }
}
