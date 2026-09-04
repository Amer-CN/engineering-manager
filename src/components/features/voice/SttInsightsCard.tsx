/**
 * SttInsightsCard — 智能速览卡（听悟式详情页左栏顶部，播放器上方）
 *
 * 表面逻辑对齐通义听悟：
 * - 标题「智能速览」（Sparkles）→ 关键词 chips 一行（超出 +N，「展开」变 flex-wrap 全显）
 *   → 全文概要（默认 line-clamp-2，行尾「展开全部/收起」内联切换）
 *   → 标签页「章节速览｜发言总结｜问答回顾」（后两个本期占位 EmptyState「即将支持」）
 *   → 章节列表（默认前 3 条，底部「展开全部章节 (N)」红字展开/收起）
 * - 点击章节行：① seekTo(startSec) ② 通过 onChapterSelect 上报段落区间
 *   [startSec, nextStartSec) 给 TaskDetailView 做左栏高亮卡联动；再次点击取消
 * - 懒加载不烧 LLM：未生成显示引导条，生成中显示 chips/概要骨架，失败可重试
 * - 数据结构不变（keywords/summary/chapters），零后端改动
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { sttClient } from '@/services/stt-client'
import type { SttInsights } from '@/services/stt-client'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** chips 收起时一行内直接可见的数量，其余以 +N 汇总 */
const CHIPS_VISIBLE = 5
/** 章节列表收起时显示的条数 */
const CHAPTERS_VISIBLE = 3

type TabId = 'chapters' | 'speech' | 'qa'
const TABS: { id: TabId; label: string; emptyTip: string }[] = [
  { id: 'chapters', label: '章节速览', emptyTip: '' },
  { id: 'speech', label: '发言总结', emptyTip: '发言总结功能即将支持' },
  { id: 'qa', label: '问答回顾', emptyTip: '问答回顾功能即将支持' },
]

interface SttInsightsCardProps {
  jobId: number
  /** 点章节时间戳跳播（复用详情页播放器的 seekTo） */
  onSeek: (sec: number) => void
  /** 章节选中/取消：上报段落高亮区间 [startSec, nextStartSec)，null = 取消 */
  onChapterSelect: (range: { start: number; end: number } | null) => void
}

const SttInsightsCard: React.FC<SttInsightsCardProps> = ({ jobId, onSeek, onChapterSelect }) => {
  const [data, setData] = useState<SttInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chipsExpanded, setChipsExpanded] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [chaptersExpanded, setChaptersExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('chapters')
  const [activeChapter, setActiveChapter] = useState(-1)

  const generate = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    const res = await sttClient.getSttInsights(jobId)
    setLoading(false)
    if (res.success && res.data) {
      setData(res.data)
      setChipsExpanded(false)
      setSummaryExpanded(false)
      setChaptersExpanded(false)
      setActiveChapter(-1)
      setActiveTab('chapters')
      onChapterSelect(null) // 重新生成后旧章节联动失效
    } else {
      setError(res.error || '速览生成失败，请重试')
    }
  }

  // 点击章节行：再点同一章 = 取消；点其他章 = seek + 上报区间
  const selectChapter = (i: number) => {
    if (!data) return
    if (i === activeChapter) {
      setActiveChapter(-1)
      onChapterSelect(null)
      return
    }
    setActiveChapter(i)
    const ch = data.chapters[i]
    const end = i + 1 < data.chapters.length ? data.chapters[i + 1].startSec : Number.POSITIVE_INFINITY
    onChapterSelect({ start: ch.startSec, end })
    onSeek(ch.startSec)
  }

  const header = (
    <div className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--fg)]">
      <Icon name="Sparkles" size={13} className="text-[color:var(--accent)] flex-shrink-0" />
      智能速览
    </div>
  )

  // 生成中：骨架占位（chips 行 + 概要行），不触发 LLM 之外的请求
  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--panel)] flex-shrink-0 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs text-[color:var(--muted)]">
          <Icon name="Loader2" size={13} className="flex-shrink-0 animate-spin" />
          智能速览
          <span className="font-normal">正在生成…（最长约 30s）</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className="h-5 rounded-full bg-[color:var(--panel-2)] animate-pulse" style={{ width: 56 + (i % 2) * 24 }} />
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="h-3 rounded bg-[color:var(--panel-2)] animate-pulse w-11/12" />
          <div className="h-3 rounded bg-[color:var(--panel-2)] animate-pulse w-2/3" />
        </div>
      </div>
    )
  }

  // 未生成 / 失败：单行引导条（懒加载入口 + 错误重试）
  if (!data) {
    return (
      <div className="px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--panel)] flex-shrink-0 space-y-1.5">
        {header}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[color:var(--muted)] flex items-center gap-1.5 min-w-0">
            {error && <Icon name="AlertCircle" size={13} className="flex-shrink-0" />}
            <span className="truncate">{error || 'AI 提炼关键词、概要与章节速览'}</span>
          </span>
          <Button variant="outline" size="xs" leftIcon="Sparkles" onClick={generate} className="flex-shrink-0">
            {error ? '重试' : '生成速览'}
          </Button>
        </div>
      </div>
    )
  }

  // 已生成：chips / 概要 / 三标签页 / 章节列表
  const chapters = data.chapters
  const shownChapters = chaptersExpanded ? chapters : chapters.slice(0, CHAPTERS_VISIBLE)
  const shownChips = chipsExpanded ? data.keywords : data.keywords.slice(0, CHIPS_VISIBLE)
  const hiddenChips = data.keywords.length - shownChips.length

  return (
    <div className="px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--panel)] flex-shrink-0 space-y-2.5 max-h-[40%] overflow-y-auto">
      {header}

      {data.keywords.length > 0 && (
        <div className={`flex gap-1.5 ${chipsExpanded ? 'flex-wrap items-center' : 'items-center overflow-hidden'}`}>
          {shownChips.map((kw, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full text-xs flex-shrink-0 bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
            >
              {kw}
            </span>
          ))}
          {hiddenChips > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs flex-shrink-0 bg-[color:var(--panel-2)] text-[color:var(--muted)]">
              +{hiddenChips}
            </span>
          )}
          {data.keywords.length > CHIPS_VISIBLE && (
            <button
              type="button" onClick={() => setChipsExpanded(v => !v)}
              className="text-xs text-[color:var(--accent)] flex items-center gap-0.5 flex-shrink-0 hover:underline"
            >
              {chipsExpanded ? '收起' : '展开'}
              <Icon name={chipsExpanded ? 'ChevronUp' : 'ChevronDown'} size={11} />
            </button>
          )}
        </div>
      )}

      {data.summary && (
        <div className="flex items-end gap-1">
          <p className={`flex-1 min-w-0 text-xs leading-5 text-[color:var(--fg-2)] ${summaryExpanded ? '' : 'line-clamp-2'}`}>
            {data.summary}
          </p>
          <button
            type="button" onClick={() => setSummaryExpanded(v => !v)}
            className="text-xs text-[color:var(--accent)] flex-shrink-0 hover:underline whitespace-nowrap"
          >
            {summaryExpanded ? '收起' : '展开全部'}
          </button>
        </div>
      )}

      {/* 标签页行：章节速览 | 发言总结 | 问答回顾 */}
      <div className="flex items-center gap-4 border-b border-[color:var(--border)] -mb-0.5">
        {TABS.map(t => (
          <button
            key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className={`pb-1 text-xs transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'text-[color:var(--accent)] border-[color:var(--accent)] font-medium'
                : 'text-[color:var(--muted)] border-transparent hover:text-[color:var(--fg-2)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'chapters' ? (
        chapters.length > 0 ? (
          <div className="space-y-0.5">
            {shownChapters.map((ch, i) => (
              <button
                key={i} type="button" onClick={() => selectChapter(i)}
                title="点击跳播并高亮该章节段落"
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs transition-colors ${
                  i === activeChapter
                    ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
                    : 'text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'
                }`}
              >
                <span className="px-1.5 py-0.5 rounded bg-[color:var(--panel-2)] text-[color:var(--muted)] font-mono tabular-nums flex-shrink-0">
                  {formatTime(ch.startSec)}
                </span>
                <span className="truncate">{ch.title}</span>
              </button>
            ))}
            {chapters.length > CHAPTERS_VISIBLE && (
              <button
                type="button" onClick={() => setChaptersExpanded(v => !v)}
                className="px-2 py-1 text-xs text-red-500 hover:underline"
              >
                {chaptersExpanded ? '收起章节' : `展开全部章节 (${chapters.length})`}
              </button>
            )}
          </div>
        ) : (
          <p className="px-2 py-1 text-xs text-[color:var(--muted)]">本次速览未生成章节</p>
        )
      ) : (
        <EmptyState
          icon="Construction"
          title="即将支持"
          description={TABS.find(t => t.id === activeTab)?.emptyTip}
        />
      )}
    </div>
  )
}

export default SttInsightsCard
