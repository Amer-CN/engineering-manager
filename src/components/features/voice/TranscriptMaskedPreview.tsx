/**
 * TranscriptMaskedPreview — 转写文本脱敏预览条（脱敏开关开启且文本非空时渲染）。
 * 从 TranscriptEditor.tsx 机械搬移（门禁 400 行），零逻辑改动。
 */
import React from 'react'
import { maskKnowledgeText } from '@/utils/knowledgeTextMask'

interface TranscriptMaskedPreviewProps {
  text: string
}

const TranscriptMaskedPreview: React.FC<TranscriptMaskedPreviewProps> = ({ text }) => (
  <div className="p-2 bg-[color:var(--panel-2)] rounded text-xs text-[color:var(--muted)]">
    <span className="text-[color:var(--muted)]">脱敏预览：</span>
    <span className="break-all">{maskKnowledgeText(text, true).substring(0, 200)}...</span>
  </div>
)

export default TranscriptMaskedPreview
