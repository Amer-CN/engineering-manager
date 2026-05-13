import { useState, useEffect, useCallback } from 'react'
import { OCRConfig, OCRProvider, setOCRConfig, getOCRConfig, checkOCRStatus, getProviderName, saveOCRConfig, initialConfig, initializeBuiltInConfig } from '../services/ocr'

export function useOCRConfig() {
  const [ocrConfig, setOcrConfigState] = useState<OCRConfig>(initialConfig)
  const [ocrStatus, setOcrStatus] = useState<{ online: boolean; provider: OCRProvider; configured: boolean } | null>(null)
  const [testingOCR, setTestingOCR] = useState(false)
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
    initializeBuiltInConfig().then(() => { loadOCRConfig() })
  }, [loadOCRConfig])

  const handleSaveOCRConfig = useCallback(() => {
    saveOCRConfig(ocrConfig)
    setOCRConfig(ocrConfig)
    setOcrMessage({ type: 'success', text: 'OCR配置已保存' })
    loadOCRConfig()
  }, [ocrConfig, loadOCRConfig])

  const handleTestOCR = useCallback(async () => {
    setTestingOCR(true); setOcrMessage(null)
    try {
      const status = await checkOCRStatus()
      if (status.online) {
        setOcrMessage({ type: 'success', text: `网络连接正常，当前使用${getProviderName(status.provider)}识别` })
      } else {
        setOcrMessage({ type: 'info', text: '当前离线，将使用本地Tesseract.js识别' })
      }
    } catch (error: any) {
      setOcrMessage({ type: 'error', text: `检测失败 ${error.message}` })
    } finally {
      setTestingOCR(false)
    }
  }, [])

  return { ocrConfig, setOcrConfig: setOcrConfigState, ocrStatus, testingOCR, ocrMessage, handleSaveOCRConfig, handleTestOCR }
}
