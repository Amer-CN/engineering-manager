/**
 * TranscriptionParams — 转写参数卡片
 * 录音类型（单人/双人/多人）+ 说话人数量 + 热词 + 开始转写按钮
 */

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export type RecordingType = 'single' | 'dual' | 'multi'

interface TranscriptionParamsProps {
  recordingType: RecordingType
  onRecordingTypeChange: (type: RecordingType) => void
  numSpeakers: number
  onNumSpeakersChange: (n: number) => void
  hotwords: string
  onHotwordsChange: (s: string) => void
  engine: string
  onEngineChange: (e: string) => void
  /** 已选音频时长（秒）；null = 未选文件或读取失败 */
  audioDurationSec: number | null
  creating: boolean
  uploadedPath: string | null
  onCreateJob: () => void
}

/** 引擎选项（与后端 AllowedEngines 白名单一致） */
const ENGINE_OPTIONS = [
  { value: 'moss-transcribe-0.9b', label: 'MOSS（CPU）' },
  { value: 'paraformer-zh-int8', label: 'Paraformer · 川渝方言（CPU）' },
] as const

/**
 * 引擎引导（数字为我们自己用真实录音测的，仅作参考）：
 * - MOSS（纯 CPU，默认）：一步成段，自带说话人编号；支持热词（人名、地名）。
 *   多人任务的说话人由分离管线先分离、按时间重叠回填。31.6 分钟会议实测约 24.7 分钟完成。
 * - Paraformer（纯 CPU）：川渝方言专用模型；模型只出文字，
 *   时间戳与说话人全部来自分离管线；本轮不支持热词（填写会被忽略）。
 *   我们实测：474 秒音频全链路约 17 秒完成。
 */
const LONG_AUDIO_SEC = 10 * 60
const VERY_LONG_AUDIO_SEC = 20 * 60

/** 时长前缀（未选文件时为空） */
const durationPrefix = (durationSec: number | null) =>
  durationSec == null ? '' : `本音频约 ${Math.round(durationSec / 60)} 分钟，`

function engineGuidance(engine: string, durationSec: number | null): { tone: 'info' | 'warn'; text: string } | null {
  const prefix = durationPrefix(durationSec)

  if (engine === 'paraformer-zh-int8') {
    const base = 'Paraformer（纯 CPU，川渝方言专用模型）：模型只出文字，时间与说话人由分离管线提供；本轮不支持热词，填写会被忽略。'
    if (durationSec != null && durationSec > VERY_LONG_AUDIO_SEC) {
      return { tone: 'info', text: `${prefix}长会议音频：分离 + 逐段转写耗时随段数增加（我们实测 474 秒音频全链路约 17 秒完成，纯 CPU）。${base}` }
    }
    return { tone: 'info', text: `${prefix}我们实测 474 秒音频全链路约 17 秒完成（CPU）。${base}` }
  }

  if (engine === 'moss-transcribe-0.9b') {
    const base = 'MOSS（纯 CPU）：热词经 --hotwords 传入，用于提升人名、地名等专有名词的识别。'
    if (durationSec != null && durationSec > VERY_LONG_AUDIO_SEC) {
      return { tone: 'warn', text: `${prefix}属长会议：MOSS 按 30 秒细分块顺序推理，实测 31.6 分钟会议约 24.7 分钟完成（Vulkan，约 0.78 倍时长）；多人任务的说话人另由分离管线分离后按时间重叠回填。${base}` }
    }
    if (durationSec != null && durationSec > LONG_AUDIO_SEC) {
      return { tone: 'warn', text: `${prefix}MOSS 按 30 秒细分块顺序推理，实测 31.6 分钟会议约 24.7 分钟完成（Vulkan，约 0.78 倍时长）。${base}` }
    }
    return { tone: 'info', text: `${prefix}MOSS 一步成段，自带说话人编号。${base}` }
  }

  return { tone: 'info', text: '默认引擎为 MOSS（纯 CPU，支持热词）；Paraformer 为川渝方言专用模型，不支持热词。' }
}

const RECORDING_OPTIONS = [
  { value: 'single', label: '单人录音' },
  { value: 'dual', label: '双人通话' },
  { value: 'multi', label: '多人会议' },
] as const

const TranscriptionParams: React.FC<TranscriptionParamsProps> = ({
  recordingType,
  onRecordingTypeChange,
  numSpeakers,
  onNumSpeakersChange,
  hotwords,
  onHotwordsChange,
  engine,
  onEngineChange,
  audioDurationSec,
  creating,
  uploadedPath,
  onCreateJob,
}) => (
  <Card title="转写参数" padding="md" shadow="sm">
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-[color:var(--fg-2)] mb-2 block">录音类型</label>
        <div className="flex gap-2">
          {RECORDING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onRecordingTypeChange(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                recordingType === opt.value
                  ? 'bg-[color:var(--accent-soft)] border-[color:var(--accent)] text-[color:var(--accent)]'
                  : 'bg-[color:var(--card)] border-[color:var(--border)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {recordingType === 'multi' && (
        <div>
          <label className="text-xs font-medium text-[color:var(--fg-2)] mb-2 block">说话人数量（可选，留空自动估计）</label>
          <Input
            type="number"
            min={2}
            max={10}
            value={numSpeakers || ''}
            onChange={(e) => onNumSpeakersChange(e.target.value ? parseInt(e.target.value) : 0)}
            placeholder="自动估计"
          />
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-[color:var(--fg-2)] mb-2 block">转写引擎</label>
        <div className="flex gap-2">
          {ENGINE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onEngineChange(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                engine === opt.value
                  ? 'bg-[color:var(--accent-soft)] border-[color:var(--accent)] text-[color:var(--accent)]'
                  : 'bg-[color:var(--card)] border-[color:var(--border)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {(() => {
          const g = engineGuidance(engine, audioDurationSec)
          if (!g) return null
          return (
            <p className={`text-micro mt-1.5 ${g.tone === 'warn' ? 'text-[color:var(--warning,#b45309)]' : 'text-[color:var(--fg-3)]'}`}>
              {g.text}
            </p>
          )
        })()}
      </div>

      <div>
        <label className="text-xs font-medium text-[color:var(--fg-2)] mb-2 block">热词 / 上下文（可选）</label>
        <Input
          value={hotwords}
          onChange={(e) => onHotwordsChange(e.target.value)}
          placeholder="人名、项目名、工程术语，用逗号分隔"
        />
        <p className="text-xs text-[color:var(--muted)] mt-1">用于提升专有名词识别准确率</p>
      </div>

      <Button
        variant="primary"
        size="md"
        block
        loading={creating}
        disabled={!uploadedPath || creating}
        onClick={onCreateJob}
        leftIcon="Sparkles"
      >
        {uploadedPath ? '开始转写' : '请先添加音频'}
      </Button>
    </div>
  </Card>
)

export default TranscriptionParams
