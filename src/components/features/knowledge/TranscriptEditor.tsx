/**
 * TranscriptEditor — 转写结果校对编辑器
 *
 * 多人：按 segments 顺序展示，每段可编辑
 * 单人：显示完整可编辑文本区
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToastContext } from '@/hooks/useToast'
import { maskKnowledgeText } from './knowledgeTextMask'
import type { SttJobDetail, SttSegment } from '@/services/stt-client'

interface TranscriptEditorProps {
  job: SttJobDetail
  masked: boolean
  onIngest: (correctedText: string, segments: SttSegment[], title: string, projectId?: number, occurredAt?: string) => void
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

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ job, masked, onIngest }) => {
  const { showToast } = useToastContext()

  // 编辑状态
  const [segments, setSegments] = useState<SttSegment[]>([])
  const [singleText, setSingleText] = useState('')
  const [title, setTitle] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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

  // 入库
  const handleIngestClick = useCallback(() => {
    setShowConfirm(true)
  }, [])

  const handleIngestConfirm = useCallback(async () => {
    setShowConfirm(false)
    setIngesting(true)

    let correctedText = ''
    let correctedSegments: SttSegment[] = []

    if (segments.length > 0) {
      correctedSegments = segments
      correctedText = rebuildFullText(segments)
    } else {
      correctedText = singleText.trim()
      correctedSegments = [{
        speaker: 1,
        start: 0,
        end: job.durationSec || 0,
        text: correctedText,
      }]
    }

    if (!correctedText.trim()) {
      showToast('文本内容不能为空', 'error')
      setIngesting(false)
      return
    }

    await onIngest(correctedText, correctedSegments, title.trim() || job.sourceFile || `任务 #${job.id}`)
    setIngesting(false)
    setHasChanges(false)
  }, [segments, singleText, job, title, onIngest, showToast])

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
        <label className="text-xs font-medium text-slate-600 mb-1 block">文档标题</label>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setHasChanges(true) }}
          placeholder="为这份转写文档起个标题"
        />
      </div>

      {/* 编辑区 */}
      {segments.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">说话人分段</label>
            <Button variant="ghost" size="xs" onClick={handleRestore} leftIcon="RotateCcw">
              恢复原始
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2 p-1">
            {segments.map((seg, i) => (
              <div key={i} className="flex gap-2 items-start p-2 rounded-lg border border-slate-200 bg-white">
                <div className="flex-shrink-0 w-20">
                  <div className="text-xs font-medium text-primary-600">说话人{seg.speaker}</div>
                  <div className="text-xs text-slate-400">
                    {formatTimestamp(seg.start)} - {formatTimestamp(seg.end)}
                  </div>
                </div>
                <textarea
                  value={seg.text}
                  onChange={(e) => handleSegmentChange(i, 'text', e.target.value)}
                  className="flex-1 min-h-[40px] text-sm text-slate-700 bg-transparent border-0 outline-none resize-y p-1 rounded focus:bg-slate-50"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">转写文本</label>
            <Button variant="ghost" size="xs" onClick={handleRestore} leftIcon="RotateCcw">
              恢复原始
            </Button>
          </div>
          <textarea
            value={singleText}
            onChange={(e) => { setSingleText(e.target.value); setHasChanges(true) }}
            className="w-full min-h-[200px] text-sm text-slate-700 p-3 border border-slate-200 rounded-lg outline-none resize-y focus:border-primary-300 focus:ring-1 focus:ring-primary-200"
          />
        </div>
      )}

      {/* 脱敏预览 */}
      {masked && displayText && (
        <div className="p-2 bg-slate-50 rounded text-xs text-slate-500">
          <span className="text-slate-400">脱敏预览：</span>
          <span className="break-all">{maskKnowledgeText(displayText, true).substring(0, 200)}...</span>
        </div>
      )}

      {/* 入库 */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
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
        {hasChanges && (
          <span className="text-xs text-amber-500">有未保存的修改</span>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="存入知识库"
        content={`确认将校对后的文本存入知识库？${hasChanges ? '（包含您的修改）' : ''}`}
        confirmText="确认入库"
        onConfirm={handleIngestConfirm}
        onClose={() => setShowConfirm(false)}
      />
    </div>
  )
}

export default TranscriptEditor
