/**
 * OCR 服务入口 — Barrel Export
 * 所有外部 import 路径 '@/services/ocr' 或 '../services/ocr' 保持不变
 */
import type { OCRProvider } from './types'
import { currentConfig } from './config'
import { fetchOcrSetupStatus } from './config'
import { checkNetwork } from './utils'

// ─── 类型 re-export ───
export type { OCRProvider, OCRConfig, OCRResult } from './types'

// ─── 配置管理 re-export ───
export {
  defaultOCRConfig,
  initialConfig,
  setOCRConfig,
  saveOCRConfig,
  getOCRConfig,
  fetchOcrSetupStatus,
  saveOcrKeys,
  clearOcrKeys,
} from './config'

// ─── 识别函数 re-export ───
export { recognizeIdCard } from './idCard'
export { recognizeInvoice } from './invoice'
export { recognizeBankCard } from './bankCard'
export { recognizeBusinessLicense } from './businessLicense'
export { recognizeBankReceipt } from './bankReceipt'
export { recognizePermit } from './permit'
export { recognizeBankStatement } from './bankStatement'
export { recognizeGeneralReceipt } from './generalReceipt'
export { queryCompanyInfo } from './companyQuery'

/**
 * 检查OCR配置状态
 * configured 以后端为准（/api/ocr/setup/status 与识别链路 LoadOcrConfig 同源，
 * 含 env / DPAPI / 明文兼容三级）——前端内存不持有密钥，不能用内存判断。
 * 后端不可达时回退内存判断（浏览器 dev mock 场景）。
 */
export async function checkOCRStatus(): Promise<{ online: boolean; provider: OCRProvider; configured: boolean }> {
  const isOnline = await checkNetwork()
  let configured: boolean
  try {
    const status = await fetchOcrSetupStatus()
    configured = !!status?.configured
  } catch {
    configured = currentConfig.provider === 'offline' ||
      !!(currentConfig.baidu?.apiKey && currentConfig.baidu?.secretKey)
  }
  return { online: isOnline, provider: currentConfig.provider, configured }
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
