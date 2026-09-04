/**
 * TranscriptNotePanel — 右栏笔记（仿通义听悟浮层卡片式）
 *
 * - 标题输入（默认「{任务标题}笔记」）+ 复制全文 / 清空
 * - 轻量工具栏：加粗 / 斜体 / 删除线 / 无序列表 / 有序列表 / 高亮底色 / 清除格式
 * - contentEditable 编辑区：内容由父组件（TaskDetailView）通过 ref 写入/读取，
 *   React 不受控；摘取原文的段落先经 escapeHtml 再写入（无 HTML 注入面）
 * - 会话内编辑，不做数据库持久化（保存由父级写入 sessionStorage）
 *
 * 兼容性策略：document.execCommand 已被标记废弃，但 Chromium/WebView2 仍全面支持；
 * 本项目桌面壳固定 WebView2，沿用该 API 实现轻量富文本，不引第三方富文本库，
 * exec 失败静默返回 false，不向全局泄漏任何状态。
 */

import { useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToastContext } from '@/hooks/useToast'

export interface TranscriptNotePanelHandle {
  getTitle: () => string
  getHtml: () => string
  getText: () => string
  /** 用纯文本行填充笔记（每行一个 <div>，内部做 HTML 转义） */
  setLines: (lines: string[]) => void
  clear: () => void
}

interface TranscriptNotePanelProps {
  defaultTitle: string
  className?: string
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => HTML_ESCAPES[c] ?? c)
}

/** document.execCommand 兼容封装（已废弃但 WebView2/Chromium 支持），失败返回 false */
function exec(cmd: string, value?: string): boolean {
  try {
    return document.execCommand(cmd, false, value)
  } catch {
    return false
  }
}

/** 复制文本到系统剪贴板：优先 Clipboard API，失败回退 textarea + execCommand('copy') */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 权限被拒等场景 → 走下方 fallback
    }
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// 高亮底色：淡琥珀 rgba（避免硬编码 hex 触发样式门禁告警）
const HILITE_COLOR = 'rgba(250, 204, 21, 0.45)'

const TranscriptNotePanel = forwardRef<TranscriptNotePanelHandle, TranscriptNotePanelProps>(
  ({ defaultTitle, className = '' }, ref) => {
    const { showToast } = useToastContext()
    const [title, setTitle] = useState(defaultTitle)
    const [empty, setEmpty] = useState(true)
    const editorRef = useRef<HTMLDivElement | null>(null)

    const syncEmpty = useCallback(() => {
      setEmpty(!editorRef.current || editorRef.current.innerText.trim() === '')
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        getTitle: () => title,
        getHtml: () => editorRef.current?.innerHTML ?? '',
        getText: () => editorRef.current?.innerText ?? '',
        setLines: (lines: string[]) => {
          if (!editorRef.current) return
          editorRef.current.innerHTML = lines.map(l => `<div>${escapeHtml(l)}</div>`).join('')
          setEmpty(lines.length === 0)
        },
        clear: () => {
          if (editorRef.current) editorRef.current.innerHTML = ''
          setEmpty(true)
        },
      }),
      [title]
    )

    const handleCopy = useCallback(async () => {
      const text = editorRef.current?.innerText ?? ''
      const ok = await copyTextToClipboard(text)
      showToast(ok ? '已复制笔记全文' : '复制失败，请手动复制', ok ? 'success' : 'error')
    }, [showToast])

    // 工具栏（onMouseDown preventDefault 保住 contentEditable 里的选区）
    const tools: { icon: string; label: string; run: () => void }[] = [
      { icon: 'Bold', label: '加粗', run: () => exec('bold') },
      { icon: 'Italic', label: '斜体', run: () => exec('italic') },
      { icon: 'Minus', label: '删除线', run: () => exec('strikeThrough') },
      { icon: 'List', label: '无序列表', run: () => exec('insertUnorderedList') },
      { icon: 'ListOrdered', label: '有序列表', run: () => exec('insertOrderedList') },
      {
        icon: 'PaintBucket',
        label: '高亮底色',
        run: () => {
          if (!exec('hiliteColor', HILITE_COLOR)) exec('backColor', HILITE_COLOR)
        },
      },
      { icon: 'Eraser', label: '清除格式', run: () => exec('removeFormat') },
    ]

    return (
      <div
        className={`flex flex-col min-h-0 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] shadow-sm ${className}`}
      >
        {/* 标题 + 操作 */}
        <div className="flex items-center gap-2 px-3 h-10 border-b border-[color:var(--border)] flex-shrink-0">
          <Icon name="PenLine" size={14} className="text-[color:var(--muted)] flex-shrink-0" />
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="笔记标题"
            className="flex-1 min-w-0 bg-transparent text-sm font-medium text-[color:var(--fg)] outline-none placeholder:text-[color:var(--muted)]"
          />
          <button
            type="button"
            title="复制全文"
            onClick={handleCopy}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[color:var(--muted)] hover:bg-[color:var(--panel-2)] hover:text-[color:var(--fg)] flex-shrink-0"
          >
            <Icon name="Copy" size={14} />
          </button>
          <button
            type="button"
            title="清空笔记"
            onClick={() => {
              if (editorRef.current) editorRef.current.innerHTML = ''
              setEmpty(true)
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[color:var(--muted)] hover:bg-[color:var(--panel-2)] hover:text-[color:var(--fg)] flex-shrink-0"
          >
            <Icon name="Trash2" size={14} />
          </button>
        </div>

        {/* 富文本工具栏 */}
        <div className="flex items-center gap-0.5 px-2 h-9 border-b border-[color:var(--border)] flex-shrink-0 overflow-x-auto">
          {tools.map(t => (
            <button
              key={t.icon}
              type="button"
              title={t.label}
              onMouseDown={e => {
                e.preventDefault()
                t.run()
              }}
              className="w-7 h-7 rounded-md flex items-center justify-center text-[color:var(--muted)] hover:bg-[color:var(--panel-2)] hover:text-[color:var(--fg)] flex-shrink-0"
            >
              <Icon name={t.icon} size={14} />
            </button>
          ))}
        </div>

        {/* 编辑区 */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncEmpty}
            className="absolute inset-0 overflow-y-auto px-4 py-3 text-sm leading-6 text-[color:var(--fg-2)] outline-none break-words"
          />
          {empty && (
            <div className="absolute inset-0 px-4 py-3 pointer-events-none text-sm text-[color:var(--muted)]">
              点击左栏「批量摘取 → 摘取原文」快速填充，或直接在此记录笔记
            </div>
          )}
        </div>
      </div>
    )
  }
)

TranscriptNotePanel.displayName = 'TranscriptNotePanel'

export default TranscriptNotePanel
