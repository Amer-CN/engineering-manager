/** AgentComposer — 输入框（自适应 textarea + 斜杠命令 + 附件 + 拖拽 + ModelPicker 插槽） */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { Tooltip } from '@/components/ui/Tooltip'
import { recognizeReceiptText } from '@/services/agent-client'
import { SLASH_COMMANDS } from './types'
import type { ReactNode } from 'react'

interface AgentComposerProps {
  value: string
  onChange: (v: string) => void
  onSend: (text?: string) => void
  disabled?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement>
  placeholder?: string
  centered?: boolean
  toolbarSlot?: ReactNode
  mascot?: ReactNode
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // 4MB
const MAX_TEXT_BYTES = 100 * 1024 // 100KB
const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.log', '.xml', '.yml', '.yaml', '.ts', '.js', '.cs', '.sql']
const isTextFile = (name: string) => TEXT_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext))

const AgentComposer: React.FC<AgentComposerProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  inputRef,
  placeholder = '向 AI 管家提问…（Shift+Enter 换行，/ 快捷命令）',
  centered = false,
  toolbarSlot,
  mascot,
}) => {
  const innerRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef || innerRef
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string } | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  /** 文档附件（文本内容注入）：文件名 → 文本 */
  const [docAttachments, setDocAttachments] = useState<{ name: string; text: string }[]>([])
  const [dragOver, setDragOver] = useState(false)

  // ── 自适应高度 ──
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [textareaRef])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  // ── 斜杠命令检测 ──
  useEffect(() => {
    if (value.startsWith('/')) {
      setShowSlashMenu(true)
      setSlashFilter(value.slice(1).toLowerCase())
    } else {
      setShowSlashMenu(false)
      setSlashFilter('')
    }
  }, [value])

  const canSend =
    (value.trim().length > 0 || !!attachment || docAttachments.length > 0) && !disabled && !ocrLoading

  // ── 处理文件（图片 → OCR 附件；文本文档 → 内容注入附件）──
  const handleFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files)
    for (const file of list) {
      if (file.type.startsWith('image/')) {
        if (file.size > MAX_IMAGE_BYTES) { setOcrError('图片过大（上限 4MB）'); continue }
        const reader = new FileReader()
        reader.onload = () => {
          setOcrError(null)
          setAttachment({ name: file.name, dataUrl: String(reader.result) })
        }
        reader.onerror = () => setOcrError('图片读取失败')
        reader.readAsDataURL(file)
      } else if (isTextFile(file.name)) {
        if (file.size > MAX_TEXT_BYTES) {
          // 超大文本只附文件名
          setDocAttachments(prev => [...prev, { name: file.name, text: `（文件过大，未读取内容）` }])
          continue
        }
        const reader = new FileReader()
        reader.onload = () => {
          setDocAttachments(prev => [...prev, { name: file.name, text: String(reader.result) }])
        }
        reader.onerror = () => setOcrError('文档读取失败')
        reader.readAsText(file)
      } else {
        // 非图片非文本：附文件名清单
        setDocAttachments(prev => [...prev, { name: file.name, text: `（${file.type || '未知类型'}，未读取内容）` }])
      }
    }
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) handleFiles(e.target.files)
      e.target.value = '' // 允许重复选择同一文件
    },
    [handleFiles],
  )

  const removeAttachment = useCallback(() => {
    setAttachment(null)
    setOcrError(null)
  }, [])

  const removeDocAttachment = useCallback((name: string) => {
    setDocAttachments(prev => prev.filter(d => d.name !== name))
  }, [])

  // ── 拖拽 ──
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || ocrLoading) return
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }, [disabled, ocrLoading, handleFiles])

  // ── 发送（图片 OCR + 文档文本注入）──
  const doSend = useCallback(async () => {
    if (!canSend) return
    const typed = value.trim()

    // 文档附件注入：文本内容拼入消息
    let docPart = ''
    if (docAttachments.length > 0) {
      docPart = docAttachments
        .map(d => `【附件：${d.name}】\n${d.text}`)
        .join('\n\n')
    }

    if (attachment) {
      setOcrLoading(true)
      setOcrError(null)
      try {
        const res = await recognizeReceiptText(attachment.dataUrl)
        if (!res.success) { setOcrError(res.error || '图片识别失败'); return }
        const ocrText = (res.text || '').trim()
        const combined = [typed, ocrText ? `【附件图片识别文字】\n${ocrText}` : '', docPart]
          .filter(Boolean)
          .join('\n\n')
        if (!combined) { setOcrError('未识别到文字，请补充问题或更换图片'); return }
        setAttachment(null)
        setDocAttachments([])
        onChange('')
        onSend(combined)
      } finally {
        setOcrLoading(false)
      }
      return
    }

    if (docAttachments.length > 0) {
      const combined = [typed, docPart].filter(Boolean).join('\n\n')
      setDocAttachments([])
      onChange('')
      onSend(combined)
      return
    }
    onSend()
  }, [canSend, value, attachment, docAttachments, onChange, onSend])

  // ── 键盘事件 ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void doSend()
      }
    },
    [doSend],
  )

  // ── 选择斜杠命令 ──
  const selectSlashCommand = useCallback(
    (prompt: string) => {
      onChange(prompt)
      setShowSlashMenu(false)
      setTimeout(() => {
        textareaRef.current?.focus()
        // 光标移到末尾
        const el = textareaRef.current
        if (el) {
          el.setSelectionRange(el.value.length, el.value.length)
        }
      }, 0)
    },
    [onChange, textareaRef],
  )

  const filteredCommands = SLASH_COMMANDS.filter(
    cmd => !slashFilter || cmd.key.slice(1).includes(slashFilter) || cmd.label.includes(slashFilter),
  )

  return (
    <div className={`relative ${centered ? 'max-w-2xl mx-auto' : ''}`}>
      <AnimatePresence>
        {showSlashMenu && filteredCommands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] shadow-lg overflow-hidden z-20"
          >
            <div className="px-3 py-2 border-b border-[color:var(--border)] text-xs font-medium text-[color:var(--muted)]">快捷命令</div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filteredCommands.map(cmd => (
                <button
                  key={cmd.key}
                  onClick={() => selectSlashCommand(cmd.prompt)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[color:var(--panel-2)] transition-colors text-left"
                >
                  <span className="px-1.5 py-0.5 rounded text-xs font-mono font-medium flex-shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {cmd.key}
                  </span>
                  <span className="text-sm text-[color:var(--fg-2)]">{cmd.label}</span>
                  <span className="text-xs text-[color:var(--muted)] truncate flex-1">{cmd.prompt}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {attachment && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)]">
          <img
            src={attachment.dataUrl}
            alt={attachment.name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
          <span className="text-xs text-[color:var(--fg-2)] truncate flex-1">{attachment.name}</span>
          {ocrLoading && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Icon name="Loader2" size={14} />
              </motion.div>
              识别中…
            </span>
          )}
          <button
            type="button"
            onClick={removeAttachment}
            disabled={ocrLoading}
            aria-label="移除附件"
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)] disabled:opacity-40"
          >
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

      {ocrError && (
        <div className="mb-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
          {ocrError}
        </div>
      )}

      <DocAttachmentChips items={docAttachments} onRemove={removeDocAttachment} />

      {/* 胶囊输入卡（DSH 布局：textarea 上 / 操作行下；整卡拖拽目标） */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col gap-2 pt-2.5 pb-2 px-2.5 rounded-[22px] border bg-[color:var(--card)] border-[color:var(--border)] focus-within:ring-2 focus-within:ring-[color:var(--accent-soft)] focus-within:border-[color:var(--accent)] transition-[box-shadow,border-color] ${dragOver ? 'ring-2 ring-[color:var(--accent)] border-[color:var(--accent)]' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.txt,.md,.csv,.json,.log,.xml,.yml,.yaml,.ts,.js,.cs,.sql"
          multiple
          className="hidden"
          aria-label="选择附件"
          onChange={handleFileChange}
        />

        {/* 文本行：Mascot 状态头像（可选） + textarea 横向排布 */}
        <div className="flex items-start gap-2">
          {mascot && (
            <div className="flex-shrink-0 pt-1" style={{ overflow: 'visible' }}>
              {mascot}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="flex-1 px-2 py-1.5 text-sm text-[color:var(--fg)] placeholder-[color:var(--muted)] bg-transparent border-0 outline-none resize-none disabled:opacity-50"
            style={{ minHeight: '36px', maxHeight: '120px' }}
          />
        </div>

        {/* 操作行：左（附件 + ModelPicker）· 右（清空 + 发送） */}
        <div className="flex items-center gap-1.5">
          <Tooltip content="附件（图片自动识别 / 文档注入内容）" position="top">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || ocrLoading}
              aria-label="添加附件"
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            >
              <Icon name="Paperclip" size={16} />
            </button>
          </Tooltip>

          {/* 工具区插槽（ModelPicker：模型选择 + 思考等级） */}
          {toolbarSlot}

          <div className="flex-1" />

          {/* 清空按钮 */}
          {value && !disabled && (
            <button
              onClick={() => {
                onChange('')
                textareaRef.current?.focus()
              }}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)] transition-colors"
            >
              <Icon name="X" size={14} />
            </button>
          )}

          {/* 发送按钮 */}
          <motion.button
            whileHover={canSend ? { scale: 1.05 } : undefined}
            whileTap={canSend ? { scale: 0.95 } : undefined}
            onClick={() => void doSend()}
            aria-label="发送"
            disabled={!canSend}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {disabled || ocrLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Icon name="Loader2" size={16} />
              </motion.div>
            ) : (
              <Icon name="ArrowUpCircle" size={16} />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

/** 文档附件 chips（文件内私有，主组件行数门禁拆分） */
function DocAttachmentChips({ items, onRemove }: {
  items: { name: string; text: string }[]
  onRemove: (name: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {items.map(d => (
        <div key={d.name} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)]">
          <Icon name="FileText" size={13} className="text-[color:var(--muted)]" />
          <span className="text-xs text-[color:var(--fg-2)] max-w-40 truncate">{d.name}</span>
          <button
            type="button"
            onClick={() => onRemove(d.name)}
            aria-label={`移除 ${d.name}`}
            className="w-5 h-5 rounded flex items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--fg-2)] hover:bg-[color:var(--card)] transition-colors"
          >
            <Icon name="X" size={11} />
          </button>
        </div>
      ))}
    </div>
  )
}

export default AgentComposer
