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
  { value: 'qwen3-asr-1.7b-gguf', label: 'Qwen3 · 快（GPU）' },
  { value: 'moss-transcribe-0.9b', label: 'MOSS · 方言优先（CPU）' },
] as const

/**
 * 引擎引导（分界线来自 2026-09-09 真实录音实测）：
 * - ≤10 分钟：MOSS 甜点区（质量最优：同音消歧零错、说话人轮次最细），约 1× 音频时长出结果
 * - 10-20 分钟：MOSS 速度超线性恶化开始明显，Qwen3 更稳
 * - >20 分钟：MOSS 实测不可用（31.6 分钟实测约 2.8 小时），Qwen3 是唯一可靠选项（GPU，约 0.45× 音频时长）
 */
const LONG_AUDIO_SEC = 10 * 60
const VERY_LONG_AUDIO_SEC = 20 * 60

function engineGuidance(engine: string, durationSec: number | null): { tone: 'info' | 'warn'; text: string } | null {
  if (durationSec == null) {
    if (engine === 'moss-transcribe-0.9b') {
      return { tone: 'info', text: 'MOSS 一步完成转写+说话人分离，真实川话实测方言语音最稳（同音词消歧零错、说话人轮次最细）。速度较慢，适合 10 分钟以内的短音频或方言精校；长会议（20 分钟以上）请改用 Qwen3。' }
    }
    return { tone: 'info', text: 'Qwen3 走 GPU，速度最快（31 分钟会议约 14 分钟完成），长录音/长会议首选；支持热词提升人名地名准确率。10 分钟以内的川话短音频想要更高质量的说话人分离，可切换 MOSS。' }
  }
  const minutes = Math.round(durationSec / 60)
  if (durationSec > VERY_LONG_AUDIO_SEC) {
    if (engine === 'moss-transcribe-0.9b') {
      return { tone: 'warn', text: `本音频约 ${minutes} 分钟，属于长会议：MOSS 在此长度实测不可用（31 分钟音频约需 2.8 小时），请改用 Qwen3（实测 31 分钟约 14 分钟完成）。` }
    }
    return { tone: 'info', text: `本音频约 ${minutes} 分钟（长会议）。Qwen3 是长录音唯一可靠引擎：GPU 加速约 0.45× 时长完成，热词可提升专有名词识别。` }
  }
  if (durationSec > LONG_AUDIO_SEC) {
    if (engine === 'moss-transcribe-0.9b') {
      return { tone: 'warn', text: `本音频约 ${minutes} 分钟：MOSS 速度在此长度开始明显变慢（约为音频时长的 2-3 倍）。追求质量可继续，追求速度建议改用 Qwen3。` }
    }
    return { tone: 'info', text: `本音频约 ${minutes} 分钟，Qwen3 是此长度的稳妥选择（GPU 加速，约 0.45× 时长完成）。` }
  }
  if (engine === 'moss-transcribe-0.9b') {
    return { tone: 'info', text: `本音频约 ${minutes} 分钟，处于 MOSS 甜点区：方言质量最优（同音消歧零错、说话人轮次最细），预计 ${minutes} 分钟左右完成。` }
  }
  return { tone: 'info', text: `本音频约 ${minutes} 分钟。此长度 MOSS 的方言质量更优（川话同音消歧、说话人轮次），但速度慢约 2 倍；追求速度保持 Qwen3 即可。` }
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
