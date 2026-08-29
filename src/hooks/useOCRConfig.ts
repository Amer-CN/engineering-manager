import { useState, useEffect, useCallback } from 'react'
import {
  OCRProvider, OCRConfig, setOCRConfig, getOCRConfig, checkOCRStatus, getProviderName,
  saveOCRConfig, saveOcrKeys, clearOcrKeys, initialConfig,
} from '../services/ocr'

export function useOCRConfig() {
  const [ocrConfig, setOcrConfigState] = useState<OCRConfig>(initialConfig)
  const [ocrStatus, setOcrStatus] = useState<{ online: boolean; provider: OCRProvider; configured: boolean } | null>(null)
  const [testingOCR, setTestingOCR] = useState(false)
  const [savingOCR, setSavingOCR] = useState(false)
  const [ocrMessage, setOcrMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const loadOCRConfig = useCallback(async () => {
    try {
      const saved = getOCRConfig()
      setOcrConfigState(saved)
      const status = await checkOCRStatus()
      setOcrStatus(status)
    } catch (error) {
      console.error('加载OCR配置失败:', error)
    }
  }, [])

  useEffect(() => {
    loadOCRConfig()
  }, [loadOCRConfig])

  /**
   * 保存：填了新密钥 → 后端 DPAPI 加密落盘并立即生效（成功后清空输入框，密钥不回显）；
   * 留空 → 只保存 provider/enabled 模式偏好。半填（只填一个框）拦截提示。
   */
  const handleSaveOCRConfig = useCallback(async () => {
    setSavingOCR(true)
    try {
      const apiKey = ocrConfig.baidu?.apiKey?.trim() ?? ''
      const secretKey = ocrConfig.baidu?.secretKey?.trim() ?? ''

      if ((apiKey || secretKey) && (!apiKey || !secretKey)) {
        setOcrMessage({ type: 'error', text: 'API Key 和 Secret Key 要么都填，要么都留空（留空 = 保留已保存密钥）' })
        return
      }

      if (apiKey && secretKey) {
        const res = await saveOcrKeys(apiKey, secretKey)
        if (!res.success) {
          setOcrMessage({ type: 'error', text: res.error || '保存密钥失败' })
          return
        }
        // 成功：清空输入框（后端不回显明文），保持「留空 = 保留原密钥」语义
        setOcrConfigState(prev => ({ ...prev, baidu: { apiKey: '', secretKey: '' } }))
        setOcrMessage({ type: 'success', text: '密钥已加密保存并立即生效' })
      } else {
        setOcrMessage({ type: 'info', text: '未填写新密钥，已保存模式偏好' })
      }

      saveOCRConfig(ocrConfig)
      setOCRConfig(ocrConfig)
      await loadOCRConfig()
    } finally {
      setSavingOCR(false)
    }
  }, [ocrConfig, loadOCRConfig])

  /** 清除后端已保存的密钥（恢复未配置状态；识别将回退离线模式） */
  const handleClearOcrKeys = useCallback(async () => {
    const res = await clearOcrKeys()
    if (!res.success) {
      setOcrMessage({ type: 'error', text: res.error || '清除密钥失败' })
      return
    }
    setOcrMessage({ type: 'success', text: '已清除保存的密钥' })
    await loadOCRConfig()
  }, [loadOCRConfig])

  const handleTestOCR = useCallback(async () => {
    setTestingOCR(true); setOcrMessage(null)
    try {
      const status = await checkOCRStatus()
      if (status.online && status.configured) {
        setOcrMessage({ type: 'success', text: `网络连接正常，密钥已配置，当前使用${getProviderName(status.provider)}识别` })
      } else if (status.online) {
        setOcrMessage({ type: 'info', text: '网络正常，但尚未配置百度 OCR 密钥，请在下方填写后保存' })
      } else {
        setOcrMessage({ type: 'info', text: '当前离线，将使用本地Tesseract.js识别' })
      }
    } catch (error: unknown) {
      setOcrMessage({ type: 'error', text: `检测失败 ${error instanceof Error ? error.message : '未知错误'}` })
    } finally {
      setTestingOCR(false)
    }
  }, [])

  return {
    ocrConfig, setOcrConfig: setOcrConfigState, ocrStatus, testingOCR, savingOCR,
    ocrMessage, handleSaveOCRConfig, handleTestOCR, handleClearOcrKeys,
  }
}
