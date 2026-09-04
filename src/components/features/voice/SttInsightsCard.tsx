/**
 * SttInsightsCard — 智能速览卡（听悟式详情页左栏顶部，播放器上方）
 *
 * 懒加载：进详情页不自动调 LLM，点「生成速览」才请求（避免每次进页烧 token）。
 * 生成中 loading 态（LLM 最长约 30s）；失败显示错误与重试按钮。
 * 展示三件套：关键词 chips（flex-wrap）/ 全文概要（默认 3 行，点击展开）/
 * 章节速览（每行 = 时间戳按钮 seekTo(startSec) + 标题，点击行高亮该章节）。
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { sttClient } from '@/services/stt-client'
import type { SttInsights } from '@/services/stt-client'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface SttInsightsCardProps {
  jobId: number
  /** 点章节时间戳跳播（复用详情页播放器的 seekTo） */
  onSeek: (sec: number) => void
}

const SttInsightsCard: React.FC<SttInsightsCardProps> = ({ jobId, onSeek }) => {
  const [data, setData] = useState<SttInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [activeChapter, setActiveChapter] = useState(-1)

  const generate = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    const res = await sttClient.getSttInsights(jobId)
    setLoading(false)
    if (res.success && res.data) {
      setData(res.data)
      setExpanded(false)
      setActiveChapter(-1)
    } else {
      setError(res.error || '速览生成失败，请重试')
    }
  }

  // 未生成 / 生成中 / 失败：单行引导条（懒加载入口 + loading + 错误重试）
  if (!data) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-[color:var(--border)] bg-[color:var(--panel)] flex-shrink-0">
        <span className="text-xs text-[color:var(--muted)] flex items-center gap-1.5 min-w-0">
          <Icon
            name={loading ? 'Loader2' : error ? 'AlertCircle' : 'Sparkles'}
            size={13}
            className={`flex-shrink-0 ${loading ? 'animate-spin' : ''}`}
          />
          <span className="truncate">
            {loading ? '正在生成速览…（最长约 30s）' : error || '智能速览：AI 提炼关键词、概要与章节'}
          </span>
        </span>
        {!loading && (
          <Button variant="outline" size="xs" leftIcon="Sparkles" onClick={generate} className="flex-shrink-0">
            {error ? '重试' : '生成速览'}
          </Button>
        )}
      </div>
    )
  }

  // 已生成：完整速览（关键词 chips / 可折叠概要 / 章节速览）
  return (
    <div className="px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--panel)] flex-shrink-0 space-y-2.5 max-h-[40%] overflow-y-auto">
      {data.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.keywords.map((kw, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full text-xs bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {data.summary && (
        <div className="text-xs leading-5 text-[color:var(--fg-2)]">
          <button
            type="button" onClick={() => setExpanded(v => !v)}
            title={expanded ? '收起' : '展开'}
            className="inline-flex items-center gap-1 font-medium text-[color:var(--fg)]"
          >
            全文概要 <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={11} />
          </button>
          <p onClick={() => setExpanded(v => !v)} className={`mt-0.5 ${expanded ? '' : 'line-clamp-3'}`}>
            {data.summary}
          </p>
        </div>
      )}

      {data.chapters.length > 0 && (
        <div>
          <span className="text-xs font-medium text-[color:var(--fg)]">章节速览</span>
          <div className="mt-1 space-y-0.5">
            {data.chapters.map((ch, i) => (
              <button
                key={i} type="button"
                onClick={() => { setActiveChapter(i); onSeek(ch.startSec) }}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs transition-colors ${
                  i === activeChapter
                    ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
                    : 'text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'
                }`}
              >
                <span className="font-mono tabular-nums text-[color:var(--muted)] flex-shrink-0">
                  {formatTime(ch.startSec)}
                </span>
                <span className="truncate">{ch.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SttInsightsCard
