/**
 * TaskDetailView — 转写详情子页面（仿通义听悟）
 *
 * 全屏覆盖层（portal 到 body，避开页面过渡容器的 transform 影响）：
 * - 顶部：返回列表 + 任务标题 + 操作栏（编辑/退出编辑）
 * - 中部：说话人段落流（播放时段落高亮 + 自动滚动跟随；点时间戳跳播）
 * - 底部固定播放器：播放/暂停、进度条拖拽 seek、当前时间/总时长、倍速
 * - Shift+Space 全局播放/暂停（输入框聚焦时不触发）
 * 编辑模式嵌入 TranscriptEditor，共享同一个 audioRef（全局只保留一个 audio 元素）。
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { sttClient } from '@/services/stt-client'
import type { SttJobDetail, SttSegment } from '@/services/stt-client'
import TranscriptEditor from './TranscriptEditor'

interface TaskDetailViewProps {
  job: SttJobDetail
  masked: boolean
  onBack: () => void
  onIngest: (correctedText: string, segments: SttSegment[], title: string, projectId?: number, occurredAt?: string, folderId?: number | null) => void
}

const SPEEDS = [1, 1.25, 1.5, 2]

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ job, masked, onBack, onIngest }) => {
  // 过滤 speaker 0（与 TranscriptEditor 同规则）；无有效段落 = 单人纯文本视图
  const segments = (job.segments ?? []).filter(s => s.speaker > 0)

  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(job.durationSec ?? 0)
  const [speed, setSpeed] = useState(1)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [editing, setEditing] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const segRefs = useRef<(HTMLElement | null)[]>([])
  const curIdxRef = useRef(0)

  // 进入子页面：带鉴权拉取源音频 blob → objectURL；离开时释放
  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    sttClient.getSttJobAudio(job.id).then(res => {
      if (cancelled) return
      if (res.success && res.data) {
        url = URL.createObjectURL(res.data)
        setAudioUrl(url)
      }
    })
    return () => {
      cancelled = true
      if (url && typeof URL !== 'undefined' && URL.revokeObjectURL) URL.revokeObjectURL(url)
    }
  }, [job.id])

  const togglePlay = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) a.play().catch(() => { /* 自动播放可能被浏览器拦截 */ })
    else a.pause()
  }, [])

  // 点时间戳/段落跳播
  const seekTo = useCallback((sec: number) => {
    const a = audioRef.current
    if (!a) return
    a.currentTime = sec
    setCurrentTime(sec)
    a.play().catch(() => { /* 自动播放可能被浏览器拦截 */ })
  }, [])

  // 高亮跟随：timeupdate 里从当前段索引单步推进/回退，不做每帧全量扫描
  const handleTimeUpdate = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    const t = a.currentTime
    setCurrentTime(t)
    if (segments.length === 0) return
    let i = curIdxRef.current
    if (i >= segments.length) i = segments.length - 1
    while (i < segments.length - 1 && t >= segments[i].end) i++
    while (i > 0 && t < segments[i].start) i--
    curIdxRef.current = i
    // 落在段间空隙时不高亮（active = -1），两个 while 各自收敛不会来回振荡
    const active = t >= segments[i].start && t < segments[i].end ? i : -1
    setActiveIdx(active)
    if (active >= 0) segRefs.current[active]?.scrollIntoView({ block: 'nearest' })
  }, [segments])

  // Shift+Space 全局播放/暂停（输入框聚焦时不触发）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !e.shiftKey) return
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return
      e.preventDefault()
      togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay])

  // 倍速（audio 元素挂载后也要重新应用）
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed, audioUrl])

  const totalDuration = duration || job.durationSec || 0

  // 段落流（阅读模式） / 编辑器（编辑模式或单人纯文本）
  const body = segments.length > 0 && !editing ? (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-2">
      {segments.map((seg, i) => (
        <div
          key={i}
          ref={(el) => { segRefs.current[i] = el }}
          className={`p-3 rounded-lg border transition-colors ${
            i === activeIdx
              ? 'bg-[color:var(--accent-soft)] border-[color:var(--accent)]'
              : 'border-transparent hover:bg-[color:var(--panel-2)]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[color:var(--accent)]">说话人{seg.speaker}</span>
            <button
              type="button"
              onClick={() => seekTo(seg.start)}
              disabled={!audioUrl}
              className="text-xs text-[color:var(--muted)] hover:text-[color:var(--accent)] disabled:hover:text-[color:var(--muted)] disabled:cursor-default flex items-center gap-0.5 font-mono tabular-nums"
              title={audioUrl ? '跳转到此段播放' : undefined}
            >
              {audioUrl && <Icon name="Play" size={9} />}
              {formatTime(seg.start)}
            </button>
          </div>
          <p className="text-sm text-[color:var(--fg-2)] whitespace-pre-wrap break-words">{seg.text}</p>
        </div>
      ))}
    </div>
  ) : (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
      <TranscriptEditor
        job={job}
        masked={masked}
        audioUrl={audioUrl}
        audioRef={audioRef}
        seekTo={seekTo}
        onIngest={onIngest}
      />
    </div>
  )

  return createPortal(
    <div className="fixed inset-x-0 top-9 bottom-0 z-30 flex flex-col bg-background">
      {/* 顶部：返回 + 标题 + 操作栏 */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-[color:var(--border)] flex-shrink-0">
        <Button variant="ghost" size="sm" leftIcon="ArrowLeft" onClick={onBack}>返回列表</Button>
        <span className="text-sm font-medium text-[color:var(--fg)] truncate flex-1">
          {job.sourceFile || `任务 #${job.id}`}
        </span>
        {segments.length > 0 && (
          <Button
            variant={editing ? 'primary' : 'outline'}
            size="sm"
            leftIcon={editing ? 'Eye' : 'Pencil'}
            onClick={() => setEditing(v => !v)}
          >
            {editing ? '退出编辑' : '编辑'}
          </Button>
        )}
      </div>

      {body}

      {/* 唯一的 audio 元素（隐藏），TranscriptEditor 通过 audioRef 复用 */}
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          const a = audioRef.current
          if (!a) return
          const d = a.duration
          setDuration(Number.isFinite(d) && d > 0 ? d : (job.durationSec ?? 0))
        }}
      />

      {/* 底部固定播放器 */}
      {audioUrl && (
        <div className="flex items-center gap-3 px-6 h-16 border-t border-[color:var(--border)] bg-[color:var(--panel)] flex-shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            title={playing ? '暂停 (Shift+Space)' : '播放 (Shift+Space)'}
          >
            <Icon name={playing ? 'Pause' : 'Play'} size={16} />
          </button>
          <span className="text-xs text-[color:var(--muted)] font-mono tabular-nums flex-shrink-0">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={totalDuration || 0}
            step={0.1}
            value={Math.min(currentTime, totalDuration || 0)}
            onChange={(e) => {
              const sec = Number(e.target.value)
              setCurrentTime(sec)
              if (audioRef.current) audioRef.current.currentTime = sec
            }}
            className="flex-1 accent-[color:var(--accent)]"
            disabled={!totalDuration}
          />
          <span className="text-xs text-[color:var(--muted)] font-mono tabular-nums flex-shrink-0">
            {formatTime(totalDuration)}
          </span>
          <Button
            variant="outline"
            size="xs"
            className="flex-shrink-0 font-mono tabular-nums"
            onClick={() => setSpeed(s => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
            title="切换倍速"
          >
            {speed.toFixed(2)}x
          </Button>
        </div>
      )}
    </div>,
    document.body
  )
}

export default TaskDetailView
