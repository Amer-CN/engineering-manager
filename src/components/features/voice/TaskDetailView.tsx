/**
 * TaskDetailView — 转写详情子页面（仿通义听悟双栏布局）
 *
 * 全屏覆盖层（portal 到 body，避开页面过渡容器的 transform 影响）：
 * - 最左竖排操作栏：返回 / 保存（笔记 sessionStorage 暂存 + 七期转写修改/说话人名落库）/ 导出（笔记 txt/html、原文 txt）/ 分享（复制笔记全文）
 * - 左栏约 60%：顶栏（标题 + 批量摘取下拉 + 编辑）；段落流（播放高亮跟随、点时间戳跳播）；底部固定播放器
 * - 右栏约 40%：笔记浮层卡（TranscriptNotePanel，contentEditable，会话内编辑）
 * - <900px 降级为上下堆叠（笔记收到底部）；Shift+Space 全局播放/暂停（输入框/contentEditable 聚焦时不触发）
 * 编辑模式嵌入 TranscriptEditor（行内编辑 + 词级搬移），共享同一个 audioRef（全局只保留一个 audio 元素）。
 * 说话人用 speakers 实体表（AutoSubs 模式：{id,name,color}；七期保存时经 speaker_names 落库，加载时回填）。
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useToastContext } from '@/hooks/useToast'
import { sttClient, saveSttJob } from '@/services/stt-client'
import type { SttJobDetail, SttSegment } from '@/services/stt-client'
import TranscriptEditor from './TranscriptEditor'
import TranscriptNotePanel, { copyTextToClipboard } from './TranscriptNotePanel'
import SttInsightsCard from './SttInsightsCard'
import TranscriptSegmentList from './TranscriptSegmentList'
import { detectSpeakerBase } from './segmentUtils'
import { DEFAULT_COLORS } from './SpeakerNameEditor'
import type { SpeakerInfo } from './SpeakerNameEditor'
import type { TranscriptNotePanelHandle } from './TranscriptNotePanel'

interface TaskDetailViewProps {
  job: SttJobDetail
  masked: boolean
  onBack: () => void
  onIngest: (correctedText: string, segments: SttSegment[], title: string, projectId?: number, occurredAt?: string, folderId?: number | null) => void
}

const SPEEDS = [1, 1.25, 1.5, 2]
// 笔记 sessionStorage 暂存 key 前缀（沿用 agent:/knowledge:/writing: 的「域:用途」风格）
const NOTE_KEY_PREFIX = 'voice:note-'

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 左侧竖排操作栏按钮（图标 + 悬浮提示）
const RailButton: React.FC<{ icon: string; title: string; active?: boolean; onClick: () => void }> = ({ icon, title, active, onClick }) => (
  <button
    type="button" title={title} onClick={onClick}
    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'text-[color:var(--muted)] hover:bg-[color:var(--panel-2)] hover:text-[color:var(--fg)]'}`}
  >
    <Icon name={icon} size={16} />
  </button>
)

// 下拉菜单项
const MenuItem: React.FC<{ icon?: string; label: string; disabled?: boolean; onClick?: () => void }> = ({ icon, label, disabled, onClick }) => (
  <button
    type="button" disabled={disabled} onClick={onClick} title={disabled ? '本期未实现' : undefined}
    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left ${disabled ? 'text-[color:var(--muted)] cursor-not-allowed' : 'text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'}`}
  >
    {icon && <Icon name={icon} size={13} className="flex-shrink-0" />}
    {label}
  </button>
)

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ job, masked, onBack, onIngest }) => {
  const { showToast } = useToastContext()

  // 媒体信息（objectURL + 时长 + 保存后本地 job 覆盖）与播放态各并为单 state（useState 门禁 ≤8）
  const [media, setMedia] = useState<{ url: string | null; duration: number; jobOverride: SttJobDetail | null }>({ url: null, duration: job.durationSec ?? 0, jobOverride: null })
  const curJob = media.jobOverride ?? job // 七期：保存成功后 getSttJob 拉新写 override，覆盖父组件 prop 渲染（不动 TranscriptionWorkspace）
  // 过滤 speaker 0（与 TranscriptEditor 同规则）；无有效段落 = 单人纯文本视图
  const segments = (curJob.segments ?? []).filter(s => s.speaker > 0)
  const [playState, setPlayState] = useState<{ playing: boolean; time: number }>({ playing: false, time: 0 })
  const [speed, setSpeed] = useState(1)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState<'extract' | 'export' | null>(null)
  // 六期：speakers 实体表（AutoSubs 模式 {id,name,color}，会话内不落库）
  const [speakers, setSpeakers] = useState<SpeakerInfo[]>([])
  // A2：章节联动高亮区间 [start, nextStart)
  const [chapterRange, setChapterRange] = useState<{ start: number; end: number } | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const segRefs = useRef<(HTMLElement | null)[]>([])
  const curIdxRef = useRef(0)
  const noteRef = useRef<TranscriptNotePanelHandle | null>(null)
  const editorSaveRef = useRef<(() => void) | null>(null) // TranscriptEditor 注册的保存函数（挂载时非空）

  // 进入子页面：带鉴权拉取源音频 blob → objectURL；离开时释放
  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    sttClient.getSttJobAudio(job.id).then(res => {
      if (cancelled) return
      if (res.success && res.data) {
        url = URL.createObjectURL(res.data)
        setMedia(m => ({ ...m, url }))
      }
    })
    return () => {
      cancelled = true
      if (url && typeof URL !== 'undefined' && URL.revokeObjectURL) URL.revokeObjectURL(url)
    }
  }, [job.id])

  // speakers 表推导：每个出现过的说话人编号一条（七期：job.speakerNames 回填已存名字，缺省「说话人N」，色板按编号轮换）。
  // 编号基检测（防御，照 AutoSubs）：当前引擎 1 基且 0 号为噪声簇（UI 列表仍按 >0 过滤）；
  // 未来换 0 基引擎时由 detectSpeakerBase 归一放行 0 号，不炸。显示编号恒为原始编号。
  useEffect(() => {
    const raw = curJob.segments ?? []
    const base = detectSpeakerBase(raw)
    const ids = [...new Set(raw.filter(s => s.speaker > 0 || (base === 0 && s.speaker === 0)).map(s => s.speaker))]
    setSpeakers(ids.map(id => ({ id, name: curJob.speakerNames?.[String(id)] ?? `说话人${id}`, color: DEFAULT_COLORS[((id % DEFAULT_COLORS.length) + DEFAULT_COLORS.length) % DEFAULT_COLORS.length] })))
  }, [curJob])

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
    setPlayState(p => ({ ...p, time: sec }))
    a.play().catch(() => { /* 自动播放可能被浏览器拦截 */ })
  }, [])

  // 高亮跟随：timeupdate 里从当前段索引单步推进/回退，不做每帧全量扫描
  const handleTimeUpdate = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    const t = a.currentTime
    setPlayState(p => ({ ...p, time: t }))
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

  // Shift+Space 全局播放/暂停（输入框/contentEditable 聚焦时不触发）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !e.shiftKey) return
      const t = e.target
      if (t instanceof HTMLElement && t.isContentEditable) return
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
  }, [speed, media.url])

  // 下拉菜单：点击菜单外部关闭
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (e.target instanceof Element && !e.target.closest('[data-menu-root]')) setMenuOpen(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  // speakers 表显示名查询（未改名回退「说话人N」）；摘取/导出/复制统一走这里
  const speakerNameOf = useCallback(
    (sp: number) => speakers.find(s => s.id === sp)?.name ?? `说话人${sp}`,
    [speakers]
  )
  // 改名 = 改 speakers[i].name（未入库编号——如归属下拉新建——追加一条）
  const handleRename = useCallback((sp: number, name: string) => {
    setSpeakers(prev => prev.some(p => p.id === sp)
      ? prev.map(p => (p.id === sp ? { ...p, name } : p))
      : [...prev, { id: sp, name, color: DEFAULT_COLORS[((sp % DEFAULT_COLORS.length) + DEFAULT_COLORS.length) % DEFAULT_COLORS.length] }])
  }, [])

  // 摘取原文纯文本行：「【显示名】mm:ss 文本」（speakers 表名字；无分段（单人）时回退 job.text 按行）
  const noteLines = useMemo<string[]>(() => {
    if (segments.length > 0) {
      return segments.map(s => `【${speakerNameOf(s.speaker)}】${formatTime(s.start)} ${s.text}`)
    }
    return (curJob.text ?? '').split('\n').filter(l => l.trim() !== '')
  }, [segments, curJob.text, speakerNameOf])

  // 批量摘取 → 摘取原文：填充右栏笔记
  const handleExtract = useCallback(() => {
    noteRef.current?.setLines(noteLines)
    setMenuOpen(null)
  }, [noteLines])

  // 保存：笔记内容暂存 sessionStorage（不做数据库持久化）
  const handleSaveNote = useCallback(() => {
    const p = noteRef.current
    if (!p) return
    sessionStorage.setItem(`${NOTE_KEY_PREFIX}${job.id}`, JSON.stringify({ title: p.getTitle(), html: p.getHtml() }))
    showToast('已保存到本地会话', 'success')
  }, [job.id, showToast])

  // 保存成功后重拉详情写本地 override（阅读态/编辑器同步刷新，不经父组件）
  const refreshJob = useCallback(() => { sttClient.getSttJob(job.id).then(r => { const fresh = r.data; if (r.success && fresh) setMedia(m => ({ ...m, jobOverride: fresh })) }) }, [job.id])
  const registerEditorSave = useCallback((fn: (() => void) | null) => { editorSaveRef.current = fn }, [])
  // 七期保存：a) 笔记暂存（现有逻辑）b) 编辑器在挂载态 → 由其保存分段+说话人名；阅读态（无编辑器）只改了名 → 仅存 speakerNames
  const handleSaveAll = useCallback(async () => {
    handleSaveNote()
    if (editorSaveRef.current) { editorSaveRef.current(); return }
    const names = Object.fromEntries(speakers.filter(s => s.name !== `说话人${s.id}`).map(s => [String(s.id), s.name]))
    if (JSON.stringify(names) === JSON.stringify(curJob.speakerNames ?? {})) return
    const res = await saveSttJob(curJob.id, { speakerNames: names })
    if (res.success) { showToast('已保存到任务', 'success'); refreshJob() }
    else showToast(res.error ?? '保存失败', 'error')
  }, [handleSaveNote, speakers, curJob, showToast, refreshJob])

  // Blob 下载：createObjectURL → a[download] → 下一轮事件循环 revoke
  const downloadText = useCallback((filename: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }, [])

  // 导出：笔记 .txt / 笔记 .html / 原文 .txt
  const handleExport = useCallback((kind: 'note-txt' | 'note-html' | 'src-txt') => {
    setMenuOpen(null)
    const p = noteRef.current
    if (!p) return
    const name = p.getTitle().replace(/[\\/:*?"<>|]/g, '-').trim() || '笔记' // 去掉 Windows 文件名非法字符
    if (kind === 'note-txt') downloadText(`${name}.txt`, `${p.getTitle()}\n\n${p.getText()}`, 'text/plain;charset=utf-8')
    else if (kind === 'note-html') downloadText(`${name}.html`, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${p.getTitle()}</title></head><body>${p.getHtml()}</body></html>`, 'text/html;charset=utf-8')
    else downloadText(`${name}-原文.txt`, noteLines.join('\n'), 'text/plain;charset=utf-8')
  }, [noteLines, downloadText])

  // 分享：复制笔记全文到系统剪贴板
  const handleShareNote = useCallback(async () => {
    const p = noteRef.current
    if (!p) return
    const ok = await copyTextToClipboard(p.getText())
    showToast(ok ? '笔记已复制到剪贴板' : '复制失败，请手动复制', ok ? 'success' : 'error')
  }, [showToast])

  const totalDuration = media.duration || job.durationSec || 0

  // 左栏主体：段落流（阅读模式）/ 编辑器（编辑模式或单人纯文本）
  const body = segments.length > 0 && !editing ? (
    <TranscriptSegmentList
      segments={segments} activeIdx={activeIdx} chapterRange={chapterRange}
      canSeek={!!media.url} segRefs={segRefs} seekTo={seekTo}
      speakers={speakers} onRename={handleRename}
    />
  ) : (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
      <TranscriptEditor job={curJob} masked={masked} audioUrl={media.url} audioRef={audioRef} seekTo={seekTo} speakers={speakers} onRenameSpeaker={handleRename} onSaved={refreshJob} onRegisterSave={registerEditorSave} onIngest={onIngest} />
    </div>
  )

  return createPortal(
    <div className="fixed inset-x-0 top-9 bottom-0 z-30 flex bg-background">
      {/* 最左竖排操作栏 */}
      <div className="w-11 flex flex-col items-center py-3 gap-1.5 border-r border-[color:var(--border)] bg-[color:var(--panel)] flex-shrink-0">
        <RailButton icon="ArrowLeft" title="返回列表" onClick={onBack} />
        <div className="flex-1" />
        <RailButton icon="Save" title="保存（笔记暂存 + 转写修改/说话人名落库）" onClick={handleSaveAll} />
        <div className="relative" data-menu-root>
          <RailButton icon="Download" title="导出" active={menuOpen === 'export'} onClick={() => setMenuOpen(m => (m === 'export' ? null : 'export'))} />
          {menuOpen === 'export' && (
            <div className="absolute left-full top-0 ml-1 z-40 w-44 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] shadow-lg py-1 overflow-hidden">
              <MenuItem icon="FileText" label="导出笔记 .txt" onClick={() => handleExport('note-txt')} />
              <MenuItem icon="FileDown" label="导出笔记 .html" onClick={() => handleExport('note-html')} />
              <MenuItem icon="ScrollText" label="导出原文 .txt" onClick={() => handleExport('src-txt')} />
            </div>
          )}
        </div>
        <RailButton icon="ClipboardCheck" title="分享（复制笔记全文到剪贴板）" onClick={handleShareNote} />
      </div>

      {/* 主区 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 顶栏：标题 + 批量摘取 + 编辑 */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[color:var(--border)] flex-shrink-0">
          <span className="text-sm font-medium text-[color:var(--fg)] truncate flex-1">
            {curJob.sourceFile || `任务 #${curJob.id}`}
          </span>
          {segments.length > 0 && (
            <div className="relative flex-shrink-0" data-menu-root>
              <Button
                variant={menuOpen === 'extract' ? 'primary' : 'outline'} size="sm" leftIcon="ClipboardPen"
                onClick={() => setMenuOpen(m => (m === 'extract' ? null : 'extract'))}
              >
                批量摘取
              </Button>
              {menuOpen === 'extract' && (
                <div className="absolute right-0 top-full mt-1 z-40 w-44 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] shadow-lg py-1 overflow-hidden">
                  <MenuItem icon="FileText" label="摘取原文" onClick={handleExtract} />
                  <MenuItem icon="SquareCheck" label="摘取标记内容" disabled />
                </div>
              )}
            </div>
          )}
          {segments.length > 0 && (
            <Button
              variant={editing ? 'primary' : 'outline'} size="sm" leftIcon={editing ? 'Eye' : 'Pencil'}
              onClick={() => setEditing(v => !v)} className="flex-shrink-0"
            >
              {editing ? '退出编辑' : '编辑'}
            </Button>
          )}
        </div>

        {/* 双栏主体：<900px 上下堆叠，≥900px 左右 60/40 */}
        <div className="flex-1 min-h-0 flex flex-col min-[900px]:flex-row">
          {/* 左栏 ≈60%：智能速览卡 + 段落流 / 编辑器 + 底部播放器 */}
          <section className="flex flex-col min-h-0 flex-1 min-[900px]:flex-initial min-[900px]:basis-[60%] min-[900px]:min-w-0">
            <SttInsightsCard jobId={job.id} onSeek={seekTo} onChapterSelect={setChapterRange} />

            {body}

            {/* 唯一的 audio 元素（隐藏），TranscriptEditor 通过 audioRef 复用 */}
            <audio
              ref={audioRef} src={media.url ?? undefined} preload="metadata" className="hidden"
              onPlay={() => setPlayState(p => ({ ...p, playing: true }))}
              onPause={() => setPlayState(p => ({ ...p, playing: false }))}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                const a = audioRef.current
                if (!a) return
                const d = a.duration
                setMedia(m => ({ ...m, duration: Number.isFinite(d) && d > 0 ? d : (job.durationSec ?? 0) }))
              }}
            />

            {/* 底部固定播放器 */}
            {media.url && (
              <div className="flex items-center gap-3 px-6 h-16 border-t border-[color:var(--border)] bg-[color:var(--panel)] flex-shrink-0">
                <button
                  type="button" onClick={togglePlay}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                  title={playState.playing ? '暂停 (Shift+Space)' : '播放 (Shift+Space)'}
                >
                  <Icon name={playState.playing ? 'Pause' : 'Play'} size={16} />
                </button>
                <span className="text-xs text-[color:var(--muted)] font-mono tabular-nums flex-shrink-0">{formatTime(playState.time)}</span>
                <input
                  type="range" min={0} max={totalDuration || 0} step={0.1}
                  value={Math.min(playState.time, totalDuration || 0)} disabled={!totalDuration}
                  onChange={(e) => {
                    const sec = Number(e.target.value)
                    setPlayState(p => ({ ...p, time: sec }))
                    if (audioRef.current) audioRef.current.currentTime = sec
                  }}
                  className="flex-1 accent-[color:var(--accent)]"
                />
                <span className="text-xs text-[color:var(--muted)] font-mono tabular-nums flex-shrink-0">{formatTime(totalDuration)}</span>
                <Button
                  variant="outline" size="xs" title="切换倍速" className="flex-shrink-0 font-mono tabular-nums"
                  onClick={() => setSpeed(s => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
                >
                  {speed.toFixed(2)}x
                </Button>
              </div>
            )}
          </section>

          {/* 右栏 ≈40%：笔记浮层卡 */}
          <aside className="flex flex-col min-h-0 flex-shrink-0 h-[45%] p-2 min-[900px]:h-auto min-[900px]:flex-initial min-[900px]:basis-[40%] min-[900px]:min-w-0">
            <TranscriptNotePanel
              ref={noteRef}
              defaultTitle={`${curJob.sourceFile || `任务 #${curJob.id}`}笔记`}
              className="flex-1 min-h-[280px]"
            />
          </aside>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default TaskDetailView
