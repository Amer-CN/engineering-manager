/**
 * AgentComposer — AI 助手输入框组件
 *
 * 自适应 textarea + 斜杠命令 + 附件占位 + 发送按钮
 * Enter 发送 / Shift+Enter 换行
 * 复用于空态居中和对话态底部
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { Tooltip } from '@/components/ui/Tooltip'
import { recognizeReceiptText } from '@/services/agent-client'
import { SLASH_COMMANDS } from './types'

interface AgentComposerProps {
  value: string
  onChange: (v: string) => void
  onSend: (text?: string) => void
  disabled?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement>
  placeholder?: string
  /** 是否居中样式（空态用） */
  centered?: boolean
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // 4MB

const AgentComposer: React.FC<AgentComposerProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  inputRef,
  placeholder = '输入你的问题...  (Shift+Enter 换行,  / 打开快捷命令)',
  centered = false,
}) => {
  const innerRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef || innerRef
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string } | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

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
    (value.trim().length > 0 || !!attachment) && !disabled && !ocrLoading

  // ── 选择图片文件 ──
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = '' // 允许重复选择同一文件
      if (!file) return
      if (!file.type.startsWith('image/')) { setOcrError('仅支持图片文件'); return }
      if (file.size > MAX_IMAGE_BYTES) { setOcrError('图片过大（上限 4MB）'); return }
      const reader = new FileReader()
      reader.onload = () => {
        setOcrError(null)
        setAttachment({ name: file.name, dataUrl: String(reader.result) })
      }
      reader.onerror = () => setOcrError('图片读取失败')
      reader.readAsDataURL(file)
    },
    [],
  )

  const removeAttachment = useCallback(() => {
    setAttachment(null)
    setOcrError(null)
  }, [])

  // ── 发送（含附件 OCR）──
  const doSend = useCallback(async () => {
    if (!canSend) return
    const typed = value.trim()
    if (attachment) {
      setOcrLoading(true)
      setOcrError(null)
      try {
        const res = await recognizeReceiptText(attachment.dataUrl)
        if (!res.success) { setOcrError(res.error || '图片识别失败'); return }
        const ocrText = (res.text || '').trim()
        const combined = [typed, ocrText ? `【附件图片识别文字】\n${ocrText}` : '']
          .filter(Boolean)
          .join('\n\n')
        if (!combined) { setOcrError('未识别到文字，请补充问题或更换图片'); return }
        setAttachment(null)
        onChange('')
        onSend(combined)
      } finally {
        setOcrLoading(false)
      }
      return
    }
    onSend()
  }, [canSend, value, attachment, onChange, onSend])

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
      {/* 斜杠命令浮层 */}
      <AnimatePresence>
        {showSlashMenu && filteredCommands.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20"
          >
            <div className="px-3 py-2 border-b border-slate-50">
              <span className="text-xs font-medium text-slate-400">快捷命令</span>
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filteredCommands.map(cmd => (
                <button
                  key={cmd.key}
                  onClick={() => selectSlashCommand(cmd.prompt)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-xs font-mono font-medium flex-shrink-0">
                    {cmd.key}
                  </span>
                  <span className="text-sm text-slate-600">{cmd.label}</span>
                  <span className="text-xs text-slate-400 truncate flex-1">{cmd.prompt}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 附件预览 */}
      {attachment && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
          <img
            src={attachment.dataUrl}
            alt={attachment.name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
          <span className="text-xs text-slate-600 truncate flex-1">{attachment.name}</span>
          {ocrLoading && (
            <span className="text-xs text-violet-500 flex items-center gap-1">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
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
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

      {/* OCR 错误提示 */}
      {ocrError && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
          {ocrError}
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex items-end gap-2.5 p-2 rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-400/30 focus-within:border-blue-400 transition-all">
        {/* 隐藏文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="选择图片文件"
          onChange={handleFileChange}
        />

        {/* 附件按钮（图片 OCR） */}
        <Tooltip content="上传图片（自动识别文字）" position="top">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || ocrLoading}
            aria-label="上传图片"
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 disabled:text-slate-300 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
          >
            <Icon name="Paperclip" size={18} />
          </button>
        </Tooltip>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 px-2 py-2.5 text-sm text-slate-700 placeholder-slate-400 bg-transparent border-0 outline-none resize-none disabled:opacity-50"
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />

        {/* 清空按钮 */}
        {value && !disabled && (
          <button
            onClick={() => {
              onChange('')
              textareaRef.current?.focus()
            }}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Icon name="X" size={16} />
          </button>
        )}

        {/* 发送按钮 */}
        <motion.button
          whileHover={canSend ? { scale: 1.05 } : undefined}
          whileTap={canSend ? { scale: 0.95 } : undefined}
          onClick={() => void doSend()}
          aria-label="发送"
          disabled={!canSend}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-blue-200/40 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-300/50 transition-shadow"
        >
          {disabled || ocrLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Icon name="Loader2" size={18} />
            </motion.div>
          ) : (
            <Icon name="ArrowUpCircle" size={18} />
          )}
        </motion.button>
      </div>
    </div>
  )
}

export default AgentComposer
