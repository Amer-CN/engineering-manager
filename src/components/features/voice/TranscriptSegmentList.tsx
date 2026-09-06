/**
 * TranscriptSegmentList — 阅读态段落流（从 TaskDetailView 抽出，features 400 行门禁）
 *
 * 仿通义听悟阅读模式：一段落一卡（groupIntoParagraphs 合并连续同说话人分段）：
 * 卡片头部 = 说话人徽标改名 + 段落起始时间戳按钮（seekTo(p.start)）；正文 <p> 内逐分段
 * <span> 内联渲染（ref 注册到 segRefs.current[flat 索引]，活跃分段加底色高亮，播放
 * scrollIntoView 用）；卡片含活跃分段时边框 accent，章节联动高亮（左竖线）照旧。
 */

import React from 'react'
import { Icon } from '@/components/ui/Icon'
import SpeakerNameEditor, { speakerOf } from './SpeakerNameEditor'
import type { SpeakerInfo } from './SpeakerNameEditor'
import type { SttParagraph } from './segmentUtils'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface TranscriptSegmentListProps {
  /** 阅读态段落（groupIntoParagraphs 产物，覆盖 normalize 后的连续同说话人分段） */
  paragraphs: SttParagraph[]
  /** 播放高亮分段索引（flat 索引，-1 = 无，段间空隙不高亮） */
  activeIdx: number
  /** B2 章节联动高亮区间 [start, nextStart) */
  chapterRange: { start: number; end: number } | null
  canSeek: boolean
  /** 分段 DOM ref（播放高亮 scrollIntoView 用，按 flat 索引存放） */
  segRefs: React.MutableRefObject<(HTMLElement | null)[]>
  seekTo: (sec: number) => void
  /** speakers 实体表（改名/头像色状态源，TaskDetailView 持有） */
  speakers: SpeakerInfo[]
  onRename: (speaker: number, name: string) => void
}

const TranscriptSegmentList: React.FC<TranscriptSegmentListProps> = ({
  paragraphs, activeIdx, chapterRange, canSeek, segRefs, seekTo, speakers, onRename,
}) => (
  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-2">
    {paragraphs.map((p) => {
      const info = speakerOf(speakers, p.speaker)
      // 章节联动：段落起点落在所选章节 [startSec, nextStartSec) 内；播放跟随优先
      const inChapter = chapterRange !== null && p.start >= chapterRange.start && p.start < chapterRange.end
      // 卡片含活跃分段（flat 索引落在本段落的分段区间内）→ 边框 accent
      const hasActive = activeIdx >= p.segStartIdx && activeIdx < p.segStartIdx + p.segs.length
      return (
        <div
          key={p.segStartIdx}
          className={`p-3 rounded-lg border transition-colors ${
            hasActive
              ? 'bg-[color:var(--accent-soft)] border-[color:var(--accent)]'
              : inChapter
                ? 'bg-[color:var(--accent-soft)] border-transparent border-l-4 border-l-[color:var(--accent)]'
                : 'border-transparent hover:bg-[color:var(--panel-2)]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <SpeakerNameEditor
              name={info.name} color={info.color}
              onRename={newName => onRename(p.speaker, newName)}
            />
            <button
              type="button" onClick={() => seekTo(p.start)} disabled={!canSeek}
              title={canSeek ? '跳转到此段播放' : undefined}
              className="text-xs text-[color:var(--muted)] hover:text-[color:var(--accent)] disabled:hover:text-[color:var(--muted)] disabled:cursor-default flex items-center gap-0.5 font-mono tabular-nums"
            >
              {canSeek && <Icon name="Play" size={9} />}
              {formatTime(p.start)}
            </button>
          </div>
          <p className="text-sm text-[color:var(--fg-2)] whitespace-pre-wrap break-words">
            {p.segs.map((s, si) => {
              const flat = p.segStartIdx + si
              return (
                <span
                  key={si} ref={(el) => { segRefs.current[flat] = el }}
                  className={flat === activeIdx ? 'rounded-sm bg-[color:var(--accent-soft)]' : undefined}
                >{s.text}</span>
              )
            })}
          </p>
        </div>
      )
    })}
  </div>
)

export default TranscriptSegmentList
