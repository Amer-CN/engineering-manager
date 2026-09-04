/**
 * TranscriptSegmentList — 阅读态段落流（从 TaskDetailView 抽出，features 400 行门禁）
 *
 * 仿通义听悟阅读模式：播放高亮跟随（activeIdx 单步推进）、章节联动高亮、点时间戳跳播、
 * 说话人徽标改名（speakers 实体表：头像底色 inline hex + 显示名，全局同步）
 */

import React from 'react'
import { Icon } from '@/components/ui/Icon'
import SpeakerNameEditor, { speakerOf } from './SpeakerNameEditor'
import type { SpeakerInfo } from './SpeakerNameEditor'
import type { SttSegment } from '@/services/stt-client'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface TranscriptSegmentListProps {
  segments: SttSegment[]
  /** 播放高亮段索引（-1 = 无，段间空隙不高亮） */
  activeIdx: number
  /** B2 章节联动高亮区间 [start, nextStart) */
  chapterRange: { start: number; end: number } | null
  canSeek: boolean
  /** 段落 DOM ref（播放高亮 scrollIntoView 用） */
  segRefs: React.MutableRefObject<(HTMLElement | null)[]>
  seekTo: (sec: number) => void
  /** speakers 实体表（改名/头像色状态源，TaskDetailView 持有） */
  speakers: SpeakerInfo[]
  onRename: (speaker: number, name: string) => void
}

const TranscriptSegmentList: React.FC<TranscriptSegmentListProps> = ({
  segments, activeIdx, chapterRange, canSeek, segRefs, seekTo, speakers, onRename,
}) => (
  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-2">
    {segments.map((seg, i) => {
      const info = speakerOf(speakers, seg.speaker)
      // 章节联动：段落起点落在所选章节 [startSec, nextStartSec) 内；播放跟随优先
      const inChapter = chapterRange !== null && seg.start >= chapterRange.start && seg.start < chapterRange.end
      return (
        <div
          key={i} ref={(el) => { segRefs.current[i] = el }}
          className={`p-3 rounded-lg border transition-colors ${
            i === activeIdx
              ? 'bg-[color:var(--accent-soft)] border-[color:var(--accent)]'
              : inChapter
                ? 'bg-[color:var(--accent-soft)] border-transparent border-l-4 border-l-[color:var(--accent)]'
                : 'border-transparent hover:bg-[color:var(--panel-2)]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <SpeakerNameEditor
              name={info.name} color={info.color}
              onRename={newName => onRename(seg.speaker, newName)}
            />
            <button
              type="button" onClick={() => seekTo(seg.start)} disabled={!canSeek}
              title={canSeek ? '跳转到此段播放' : undefined}
              className="text-xs text-[color:var(--muted)] hover:text-[color:var(--accent)] disabled:hover:text-[color:var(--muted)] disabled:cursor-default flex items-center gap-0.5 font-mono tabular-nums"
            >
              {canSeek && <Icon name="Play" size={9} />}
              {formatTime(seg.start)}
            </button>
          </div>
          <p className="text-sm text-[color:var(--fg-2)] whitespace-pre-wrap break-words">{seg.text}</p>
        </div>
      )
    })}
  </div>
)

export default TranscriptSegmentList
