/**
 * 企业工商信息查询
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork } from './utils'

async function baiduCompanyQuery(companyName: string): Promise<OCRResult> {
  try {
    const result = await (await getAPI()).ocrBaiduCompanyQuery(companyName)
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度企业查询 IPC 调用失败:', error)
    return { success: false, error: `企业查询请求失败: ${error instanceof Error ? error.message : '未知错误'}` }
  }
}

export async function queryCompanyInfo(companyName: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu') {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，企业查询需要在线模式' }
    return await baiduCompanyQuery(companyName)
  }
  return { success: false, error: '企业查询仅支持百度在线模式' }
}
