/**
 * TranscriptEditor — 转写结果校对编辑器
 *
 * 多人：按 segments 顺序展示，每段可编辑
 * 单人：显示完整可编辑文本区
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/ui/Icon'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToastContext } from '@/hooks/useToast'
import { useKnowledgeFolders } from '@/hooks/data/useKnowledgeFolders'
import { maskKnowledgeText } from '@/utils/knowledgeTextMask'
import { writeWritingPrefill } from '@/hooks/useWritingPrefill'
import type { SttJobDetail, SttSegment } from '@/services/stt-client'

interface TranscriptEditorProps {
  job: SttJobDetail
  masked: boolean
  /** 本地音频播放 URL（录音/上传当次可用，历史任务为空）*/
  audioUrl?: string | null
  /** 外部共享 audio 元素 ref（TaskDetailView 持有唯一 audio，避免双 audio 元素）*/
  audioRef?: React.RefObject<HTMLAudioElement | null>
  /** 外部跳播函数（提供 audioRef 时由父组件传入；缺省用内部 audio 元素）*/
  seekTo?: (sec: number) => void
  onIngest: (correctedText: string, segments: SttSegment[], title: string, projectId?: number, occurredAt?: string, folderId?: number | null) => void
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 从 segments 重新组合 fullText */
function rebuildFullText(segments: SttSegment[]): string {
  return segments
    .filter(s => s.text.trim())
    .map(s => `【说话人${s.speaker}】${s.text.trim()}`)
    .join('\n')
}

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ job, masked, audioUrl, audioRef, seekTo, onIngest }) => {
  const { showToast } = useToastContext()

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

  // 编辑状态
  const [segments, setSegments] = useState<SttSegment[]>([])
  const [singleText, setSingleText] = useState('')
  const [title, setTitle] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  // M3：入库前文件夹选择（voice → 选文件夹 → 建文档）
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [pickFolderId, setPickFolderId] = useState<number | null>(null)
  const { data: folders } = useKnowledgeFolders()
  const [originalSegments, setOriginalSegments] = useState<SttSegment[]>([])

  // 初始化
  useEffect(() => {
    if (job.segments && job.segments.length > 0) {
      // 过滤掉 speaker 0（原始簇号不应出现在 UI）
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
  }, [job])

  // 编辑 segment
  const handleSegmentChange = useCallback((index: number, field: keyof SttSegment, value: string | number) => {
    setSegments(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
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

  // 恢复原始
  const handleRestore = useCallback(() => {
    if (originalSegments.length > 0) {
      setSegments(originalSegments.map(s => ({ ...s })))
    } else if (job.text) {
      setSingleText(job.text)
    }
    setHasChanges(false)
    showToast('已恢复原始转写', 'info')
  }, [originalSegments, job.text, showToast])


  const handleIngestConfirm = useCallback(async () => {
    setIngesting(true)

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
      setIngesting(false)
      return
    }

    await onIngest(correctedText, correctedSegments, title.trim() || job.sourceFile || `任务 #${job.id}`, undefined, undefined, pickFolderId)
    setIngesting(false)
    setHasChanges(false)
  }, [segments, singleText, job, title, onIngest, showToast, pickFolderId])

  // M3：入库前先弹文件夹选择（可选；不选 = 不放入文件夹）
  const handleIngestClick = () => {
    setPickFolderId(null)
    setShowFolderPicker(true)
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
            <label className="text-xs font-medium text-[color:var(--fg-2)]">说话人分段</label>
            <Button variant="ghost" size="xs" onClick={handleRestore} leftIcon="RotateCcw">
              恢复原始
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2 p-1">
            {segments.map((seg, i) => (
              <div key={i} className="flex gap-2 items-start p-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
                <div className="flex-shrink-0 w-20">
                  <div className="text-xs font-medium text-[color:var(--accent)]">说话人{seg.speaker}</div>
                  {/* A3 归属修正：把该段改挂到正确的人（rebuildFullText 前缀自动跟随） */}
                  <select
                    value={seg.speaker}
                    onChange={(e) => {
                      const v = e.target.value
                      handleSegmentChange(i, 'speaker', v === 'new' ? nextSpeakerNum : Number(v))
                    }}
                    title="修正此段说话人归属"
                    className="mt-1 w-full text-xs bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded px-1 py-0.5 text-[color:var(--fg-2)] outline-none focus:border-[color:var(--accent)]"
                  >
                    {speakerOptions.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                    <option value="new">新建 {nextSpeakerNum}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => jumpTo(seg.start)}
                    disabled={!audioUrl}
                    className="text-xs text-[color:var(--muted)] hover:text-[color:var(--accent)] disabled:hover:text-[color:var(--muted)] disabled:cursor-default flex items-center gap-0.5 mt-0.5 font-mono tabular-nums"
                    title={audioUrl ? '跳转到此段播放' : undefined}
                  >
                    {audioUrl && <Icon name="Play" size={9} />}
                    {formatTimestamp(seg.start)} - {formatTimestamp(seg.end)}
                  </button>
                </div>
                <textarea
                  value={seg.text}
                  onChange={(e) => handleSegmentChange(i, 'text', e.target.value)}
                  className="flex-1 min-h-[40px] text-sm text-[color:var(--fg-2)] bg-transparent border-0 outline-none resize-y p-1 rounded focus:bg-[color:var(--panel-2)]"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[color:var(--fg-2)]">转写文本</label>
            <Button variant="ghost" size="xs" onClick={handleRestore} leftIcon="RotateCcw">
              恢复原始
            </Button>
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
          loading={ingesting}
          disabled={ingesting}
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
      <Dialog open={showFolderPicker} onOpenChange={setShowFolderPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>存入知识库</DialogTitle>
          <DialogDescription>选择目标文件夹（可选；不选则作为未分类文档）</DialogDescription>
          <div className="space-y-2 pt-2 max-h-64 overflow-auto">
            <button
              onClick={() => setPickFolderId(null)}
              className={`w-full flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-colors ${
                pickFolderId === null
                  ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]'
                  : 'border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--panel-2)]'
              }`}
            >
              <span className="flex-1">不放入文件夹</span>
            </button>
            {(folders ?? []).map((f) => (
              <button
                key={f.id}
                onClick={() => setPickFolderId(f.id)}
                className={`w-full flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-colors ${
                  pickFolderId === f.id
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
            <Button variant="ghost" size="md" onClick={() => setShowFolderPicker(false)}>取消</Button>
            <Button
              variant="success"
              size="md"
              loading={ingesting}
              disabled={ingesting}
              onClick={() => { setShowFolderPicker(false); handleIngestConfirm() }}
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
