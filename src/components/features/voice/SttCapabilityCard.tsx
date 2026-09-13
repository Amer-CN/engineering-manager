/**
 * SttCapabilityCard — 语音转写能力检测结果卡（检测中 / 不可用 / 就绪三态）。
 * 从 TranscriptionWorkspace.tsx 机械搬移（门禁 400 行），零逻辑改动。
 */
import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import type { SttCapability } from '@/services/stt-client'

interface SttCapabilityCardProps {
  capLoading: boolean
  canTranscribe: boolean
  canDiarize: boolean
  capability: SttCapability | null
}

const SttCapabilityCard: React.FC<SttCapabilityCardProps> = ({ capLoading, canTranscribe, canDiarize, capability }) =>
  capLoading ? (
    <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
      <Icon name="Loader2" size={16} className="animate-spin" />
      <span>检测转写能力...</span>
    </div>
  ) : !canTranscribe ? (
    <Card padding="md" className="bg-warning-50 border-warning-200">
      <div className="flex items-start gap-3">
        <Icon name="AlertTriangle" size={20} className="text-warning-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-warning-800">语音转写当前不可用</p>
          <p className="text-xs text-warning-700 mt-1">
            {capability?.unavailableReason || '需要独立显卡和 ASR 模型'}
          </p>
          <p className="text-xs text-warning-600 mt-1">云端转写尚未启用</p>
        </div>
      </div>
    </Card>
  ) : (
    <Card padding="sm" className="bg-success-50 border-success-200">
      <div className="flex items-center gap-2 text-sm">
        <Icon name="CheckCircle" size={16} className="text-success-500" />
        <span className="text-success-800 font-medium">Qwen3-ASR-1.7B 本地模型已就绪</span>
        {!canDiarize && (
          <Badge variant="warning" size="sm">说话人分离模型未就绪</Badge>
        )}
      </div>
    </Card>
  )

export default SttCapabilityCard
