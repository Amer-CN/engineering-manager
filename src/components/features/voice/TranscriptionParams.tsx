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
  creating: boolean
  uploadedPath: string | null
  onCreateJob: () => void
}

/** 引擎选项（与后端 AllowedEngines 白名单一致） */
const ENGINE_OPTIONS = [
  { value: 'qwen3-asr-1.7b-gguf', label: 'Qwen3 · 快（GPU）' },
  { value: 'moss-transcribe-0.9b', label: 'MOSS · 方言优先（CPU）' },
] as const

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
        {engine === 'moss-transcribe-0.9b' && (
          <p className="text-micro text-[color:var(--fg-3)] mt-1.5">
            MOSS 一步完成转写+说话人分离，真实川话通话实测方言语音更稳（同音词消歧零错、专有词全对、说话人轮次最细）。注意：走 CPU 较慢（10 分钟音频约 1 小时），适合短音频或方言精校；超 10 分钟自动切块，跨块说话人编号暂不保证全局一致。
          </p>
        )}
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
