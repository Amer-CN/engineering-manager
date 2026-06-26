/**
 * OCR 通用工具函数
 */
import type { OCRConfig } from './types'

export async function checkNetwork(): Promise<boolean> {
  return navigator.onLine
}

/**
 * 校验百度 API 凭据并调用指定端点
 */
export async function callBaiduOcrEndpoint(
  apiMethod: string,
  params: { imageBase64: string; config: OCRConfig; companyName?: string },
): Promise<{ apiKey: string; secretKey: string } | { error: string }> {
  const { config } = params
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { error: '百度OCR未配置API Key' }
  }
  return { apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey }
}

/**
 * 构造百度 OCR 通用错误结果
 */
export function baiduOcrError(error: unknown, context: string): { success: false; error: string } {
  return {
    success: false,
    error: `百度OCR请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
  }
}
