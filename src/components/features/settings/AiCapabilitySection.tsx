import { useOCRConfig } from '@/hooks/useOCRConfig'
import { AiProviderSection } from './AiProviderSection'
import { SettingsOcrSection } from '@/components/SettingsOcrSection'

/**
 * AI 能力面板 (v0.83.0 设置页重构)
 * 子区: AI 助手(大模型) / AI 智能识别(OCR)
 * 治卡顿: useOCRConfig 下沉到本面板 — 仅在进入「AI 能力」分类时才请求 OCR 配置/统计
 */
export function AiCapabilitySection() {
  const ocr = useOCRConfig()

  return (
    <div className="space-y-6">
      <div id="ai-provider" data-setting-anchor>
        <AiProviderSection />
      </div>
      <div id="ocr" data-setting-anchor>
        <SettingsOcrSection
          ocrConfig={ocr.ocrConfig}
          setOcrConfig={ocr.setOcrConfig}
          ocrStatus={ocr.ocrStatus}
          testingOCR={ocr.testingOCR}
          savingOCR={ocr.savingOCR}
          ocrMessage={ocr.ocrMessage}
          onSave={ocr.handleSaveOCRConfig}
          onTest={ocr.handleTestOCR}
          onClearKeys={ocr.handleClearOcrKeys}
        />
      </div>
    </div>
  )
}
