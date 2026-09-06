/**
 * TranscriptEditor — 转写结果校对编辑器（六期：行内编辑 + 词级搬移，AutoSubs 模式；七期：保存到任务）
 * 多人：段落默认纯展示，点击段落进入行内编辑（TranscriptRow：contentEditable 就地编辑
 * + 操作按钮组「首词→上一段 / 末词→下一段 / 插入 / 删除」，时间按字符比例重算）
 * 单人：显示完整可编辑文本区
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToastContext } from '@/hooks/useToast'
import { useKnowledgeFolders } from '@/hooks/data/useKnowledgeFolders'
import { maskKnowledgeText } from '@/utils/knowledgeTextMask'
import { writeWritingPrefill } from '@/hooks/useWritingPrefill'
import TranscriptRow from './TranscriptRow'
import { speakerOf } from './SpeakerNameEditor'
import type { SpeakerInfo } from './SpeakerNameEditor'
import { moveFirstWordToPrev, moveLastWordToNext, insertSegmentAfter } from './segmentUtils'
import { saveSttJob, type SttJobDetail, type SttSegment, type SttSavePayload } from '@/services/stt-client'

interface TranscriptEditorProps {
  job: SttJobDetail
  masked: boolean
  /** 本地音频播放 URL（录音/上传当次可用，历史任务为空）*/
  audioUrl?: string | null
  /** 外部共享 audio 元素 ref（TaskDetailView 持有唯一 audio，避免双 audio 元素）*/
  audioRef?: React.RefObject<HTMLAudioElement | null>
  /** 外部跳播函数（提供 audioRef 时由父组件传入；缺省用内部 audio 元素）*/
  seekTo?: (sec: number) => void
  /** 说话人实体表（AutoSubs speakers 模型，TaskDetailView 持有；未入库编号按色板兜底）*/
  speakers?: SpeakerInfo[]
  /** 发言人改名回调（改 speakers[i].name，编辑态与阅读态全局同步）*/
  onRenameSpeaker?: (speaker: number, name: string) => void
  onSaved?: () => void // 保存成功回调（父组件重拉 job 详情刷新阅读态）
  onRegisterSave?: (fn: (() => void) | null) => void // 注册保存函数（父组件操作栏「保存」复用；卸载置 null）
  onIngest: (correctedText: string, segments: SttSegment[], title: string, projectId?: number, occurredAt?: string, folderId?: number | null) => void
}

/** 从 segments 重新组合 fullText。
 *  入库契约：后端 SttEndpoints 强校验重组文本 = 「【说话人N】原文」逐段一致 + 编号 1..N 连续，
 *  因此前缀必须保持原始编号（显示名的统一只作用于摘取/导出/复制，见 TaskDetailView.noteLines）。 */
function rebuildFullText(segments: SttSegment[]): string {
  return segments
    .filter(s => s.text.trim())
    .map(s => `【说话人${s.speaker}】${s.text.trim()}`)
    .join('\n')
}

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ job, masked, audioUrl, audioRef, seekTo, speakers, onRenameSpeaker, onSaved, onRegisterSave, onIngest }) => {
  const { showToast } = useToastContext()

  // speakers 表查询：显示名/头像色（未入库编号兜底「说话人N」+ 色板轮换；编辑态与阅读态共用同一状态源）
  const speakerNameOf = useCallback(
    (sp: number) => speakerOf(speakers, sp).name,
    [speakers]
  )

  // 音频播放 + 分段跳转（外部传入 audioRef 时复用父组件的唯一 audio 元素）
  const internalAudioRef = useRef<HTMLAudioElement | null>(null)
  const aRef = audioRef ?? internalAudioRef
  const internalSeek = useCallback((sec: number) => {
    const a = aRef.current
    if (!a) return
    a.currentTime = sec
    a.play().catch(() => { /* 自动播放可能被浏览器拦截，忽略 */ })
  }, [aRef])
  const jumpTo = seekTo ?? internalSeek

  // 编辑状态（useState 门禁 ≤8：folderPick 合并对象态，activeIdx = 行内编辑激活段）
  const [segments, setSegments] = useState<SttSegment[]>([])
  const [singleText, setSingleText] = useState('')
  const [title, setTitle] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [busy, setBusy] = useState(false) // 入库/保存共用 loading（useState 门禁 ≤8）
  const [activeIdx, setActiveIdx] = useState(-1)
  // M3：入库前文件夹选择（voice → 选文件夹 → 建文档）
  const [folderPick, setFolderPick] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const { data: folders } = useKnowledgeFolders()
  const [originalSegments, setOriginalSegments] = useState<SttSegment[]>([])

  // 初始化
  useEffect(() => {
    if (job.segments && job.segments.length > 0) {
      // 过滤掉 speaker 0（原始簇号不应出现在 UI）。编号基检测（防御）：当前引擎 1 基、
      // 0 号为噪声簇故过滤；未来换 0 基引擎时按 segmentUtils.detectSpeakerBase 归一放行
      const validSegs = job.segments.filter(s => s.speaker > 0)
      setSegments(validSegs)
      setOriginalSegments(validSegs.map(s => ({ ...s })))
      setSingleText('')
    } else if (job.text) {
      setSingleText(job.text)
      setSegments([])
      setOriginalSegments([])
    }
    setTitle(job.sourceFile || `任务 #${job.id}`)
    setHasChanges(false)
    setActiveIdx(-1)
  }, [job])

  // 行内编辑提交（TranscriptRow 失焦/Enter/Esc 回传；Esc 还原 = 提交回原文）
  const handleTextCommit = useCallback((index: number, text: string) => {
    setSegments(prev => prev.map((s, i) => (i === index ? { ...s, text } : s)))
    setHasChanges(true)
  }, [])

  // A3 归属修正下拉：把该段改挂到正确的人（搬移/插删不改归属，归属仍由下拉负责）
  const handleSpeakerChange = useCallback((index: number, speaker: number) => {
    setSegments(prev => prev.map((s, i) => (i === index ? { ...s, speaker } : s)))
    setHasChanges(true)
  }, [])

  // 词级搬移：纯函数改 segments，时间按字符比例重算；结构变化后退出行内编辑
  const handleMoveFirstWord = useCallback((index: number) => {
    setSegments(prev => moveFirstWordToPrev(prev, index))
    setActiveIdx(-1)
    setHasChanges(true)
  }, [])
  const handleMoveLastWord = useCallback((index: number) => {
    setSegments(prev => moveLastWordToNext(prev, index))
    setActiveIdx(-1)
    setHasChanges(true)
  }, [])

  // 在此段后插入新段（继承 speaker，文本为空；激活段文本未变，保持行内编辑）
  const handleInsertAfter = useCallback((index: number) => {
    setSegments(prev => insertSegmentAfter(prev, index))
    setHasChanges(true)
  }, [])

  // 删除此段（单段守卫；删除后索引位移，退出行内编辑）
  const handleDeleteSegment = useCallback((index: number) => {
    setSegments(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
    setActiveIdx(-1)
    setHasChanges(true)
  }, [])

  // A3 归属修正下拉：选项 = 当前出现的全部说话人编号；「新建」= 最大编号 + 1
  const speakerOptions = useMemo(
    () => [...new Set(segments.map(s => s.speaker))].sort((a, b) => a - b),
    [segments]
  )
  const nextSpeakerNum = useMemo(
    () => (speakerOptions.length ? Math.max(...speakerOptions) : 0) + 1,
    [speakerOptions]
  )
  const speakerChoices = useMemo(
    () => speakerOptions.map(n => ({ value: n, label: speakerNameOf(n) })),
    [speakerOptions, speakerNameOf]
  )

  // 恢复原始
  const handleRestore = useCallback(() => {
    if (originalSegments.length > 0) {
      setSegments(originalSegments.map(s => ({ ...s })))
    } else if (job.text) {
      setSingleText(job.text)
    }
    setActiveIdx(-1)
    setHasChanges(false)
    showToast('已恢复原始转写', 'info')
  }, [originalSegments, job.text, showToast])

  // 七期：保存到任务（多任务 segments+speakerNames——props speakers 表导出只含非默认名；单人 text）。
  // 改名不改段（hasChanges=false）时由 speakerNames 差异兜底触发
  const handleSave = useCallback(async () => {
    const names = Object.fromEntries((speakers ?? []).filter(s => s.name !== `说话人${s.id}`).map(s => [String(s.id), s.name]))
    if (busy || (!hasChanges && JSON.stringify(names) === JSON.stringify(job.speakerNames ?? {}))) return
    const payload: SttSavePayload = segments.length > 0 ? { segments, speakerNames: names } : { text: singleText }
    setBusy(true)
    const res = await saveSttJob(job.id, payload)
    setBusy(false)
    if (!res.success) { showToast(res.error ?? '保存失败', 'error'); return }
    setHasChanges(false)
    showToast('已保存到任务', 'success')
    onSaved?.()
  }, [busy, hasChanges, speakers, job, segments, singleText, showToast, onSaved])
  // Ctrl+S 保存（preventDefault 防浏览器保存对话框；contentEditable 聚焦也生效，不设守卫）+ 注册给父组件操作栏
  useEffect(() => {
    onRegisterSave?.(handleSave)
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); onRegisterSave?.(null) }
  }, [handleSave, onRegisterSave])
  const handleIngestConfirm = useCallback(async () => {
    setBusy(true)

    let correctedText = ''
    let correctedSegments: SttSegment[] = []

    if (segments.length > 0) {
      correctedSegments = segments
      correctedText = rebuildFullText(segments)
    } else {
      // 单人模式：只发送纯文本，不发送 segments（避免后端重组不一致）
      correctedText = singleText.trim()
      correctedSegments = [] // 不发送 segments
    }

    if (!correctedText.trim()) {
      showToast('文本内容不能为空', 'error')
      setBusy(false)
      return
    }

    await onIngest(correctedText, correctedSegments, title.trim() || job.sourceFile || `任务 #${job.id}`, undefined, undefined, folderPick.id)
    setBusy(false)
    setHasChanges(false)
  }, [segments, singleText, job, title, onIngest, showToast, folderPick.id])

  // M3：入库前先弹文件夹选择（可选；不选 = 不放入文件夹）
  const handleIngestClick = () => {
    setFolderPick({ open: true, id: null })
  }

  // W3：生成会议纪要 → 跳写作中心，预填素材/文体/source_ref
  const handleWriteMinutes = () => {
    const text = displayText?.trim()
    if (!text) {
      showToast('转写内容为空，无法生成会议纪要', 'error')
      return
    }
    writeWritingPrefill({
      material: text,
      docType: 'minutes_items',
      styleId: 'S1',
      sourceType: 'stt',
      sourceRef: String(job.id),
      title: `${title.trim() || '会议'}纪要`,
    })
  }

  const displayText = useMemo(() => {
    if (segments.length > 0) {
      return rebuildFullText(segments)
    }
    return singleText
  }, [segments, singleText])

  return (
    <div className="space-y-4">
      {/* 标题输入 */}
      <div>
        <label className="text-xs font-medium text-[color:var(--fg-2)] mb-1 block">文档标题</label>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setHasChanges(true) }}
          placeholder="为这份转写文档起个标题"
        />
      </div>

      {/* 音频播放器 — 边听边改（父组件持有 audio 时由父组件渲染播放器） */}
      {audioUrl && !audioRef && (
        <div>
          <label className="text-xs font-medium text-[color:var(--fg-2)] mb-1 block">原始录音</label>
          <audio ref={internalAudioRef} src={audioUrl} controls preload="metadata" className="w-full h-10" />
        </div>
      )}

      {/* 编辑区 */}
      {segments.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[color:var(--fg-2)]">说话人分段（点击段落编辑；激活段可搬词/插删/改归属）</label>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="xs" onClick={handleSave} loading={busy} disabled={!hasChanges || busy} leftIcon="Save">保存修改</Button>
              <Button variant="ghost" size="xs" onClick={handleRestore} leftIcon="RotateCcw">恢复原始</Button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2 p-1">
            {segments.map((seg, i) => (
              <TranscriptRow
                key={i}
                seg={seg}
                index={i}
                active={activeIdx === i}
                isFirst={i === 0}
                isLast={i === segments.length - 1}
                isOnly={segments.length === 1}
                name={speakerNameOf(seg.speaker)}
                color={speakerOf(speakers, seg.speaker).color}
                speakerChoices={speakerChoices}
                nextSpeakerNum={nextSpeakerNum}
                canPlay={!!audioUrl}
                onActivate={setActiveIdx}
                onSeekStart={(idx) => jumpTo(segments[idx].start)}
                onTextCommit={handleTextCommit}
                onSpeakerChange={handleSpeakerChange}
                onMoveFirstWord={handleMoveFirstWord}
                onMoveLastWord={handleMoveLastWord}
                onInsertAfter={handleInsertAfter}
                onDelete={handleDeleteSegment}
                onRenameSpeaker={onRenameSpeaker}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[color:var(--fg-2)]">转写文本</label>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="xs" onClick={handleSave} loading={busy} disabled={!hasChanges || busy} leftIcon="Save">保存修改</Button>
              <Button variant="ghost" size="xs" onClick={handleRestore} leftIcon="RotateCcw">恢复原始</Button>
            </div>
          </div>
          <textarea
            value={singleText}
            onChange={(e) => { setSingleText(e.target.value); setHasChanges(true) }}
            className="w-full min-h-[200px] text-sm text-[color:var(--fg-2)] p-3 border border-[color:var(--border)] rounded-lg outline-none resize-y focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent-soft)]"
          />
        </div>
      )}

      {/* 脱敏预览 */}
      {masked && displayText && (
        <div className="p-2 bg-[color:var(--panel-2)] rounded text-xs text-[color:var(--muted)]">
          <span className="text-[color:var(--muted)]">脱敏预览：</span>
          <span className="break-all">{maskKnowledgeText(displayText, true).substring(0, 200)}...</span>
        </div>
      )}

      {/* 入库 */}
      <div className="flex items-center gap-3 pt-2 border-t border-[color:var(--border)]">
        <Button
          variant="success"
          size="md"
          loading={busy}
          disabled={busy}
          onClick={handleIngestClick}
          leftIcon="Database"
        >
          存入知识库
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleWriteMinutes}
          leftIcon="PenLine"
        >
          生成会议纪要
        </Button>
        {hasChanges && (
          <span className="text-xs text-warning-500">有未保存的修改</span>
        )}
      </div>

      {/* M3：文件夹选择弹窗（存入知识库前） */}
      <Dialog open={folderPick.open} onOpenChange={(v) => setFolderPick(p => ({ ...p, open: v }))}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>存入知识库</DialogTitle>
          <DialogDescription>选择目标文件夹（可选；不选则作为未分类文档）</DialogDescription>
          <div className="space-y-2 pt-2 max-h-64 overflow-auto">
            <button
              onClick={() => setFolderPick(p => ({ ...p, id: null }))}
              className={`w-full flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-colors ${
                folderPick.id === null
                  ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]'
                  : 'border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--panel-2)]'
              }`}
            >
              <span className="flex-1">不放入文件夹</span>
            </button>
            {(folders ?? []).map((f) => (
              <button
                key={f.id}
                onClick={() => setFolderPick(p => ({ ...p, id: f.id }))}
                className={`w-full flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-colors ${
                  folderPick.id === f.id
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]'
                    : 'border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--panel-2)]'
                }`}
              >
                <span className="flex-1 min-w-0 truncate">{f.name}</span>
                <span className="text-xs text-[color:var(--muted)]">{f.docCount} 文档</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={() => setFolderPick(p => ({ ...p, open: false }))}>取消</Button>
            <Button
              variant="success"
              size="md"
              loading={busy}
              disabled={busy}
              onClick={() => { setFolderPick(p => ({ ...p, open: false })); handleIngestConfirm() }}
            >
              确认入库
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TranscriptEditor
