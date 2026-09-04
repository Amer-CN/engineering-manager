/**
 * CodeBlockCard — Markdown 代码块卡片（Beautiful UI B2）
 *
 * 来源：TurboKach/ai-native-react-components（MIT），视觉基准
 * .work/reference/beautifului/code-block.tsx 裁剪移植（复制按钮 copied 态 Check 1.5s 复位）：
 *  - 头栏：语言标签（fence 语言，空则「代码」）+ 复制按钮（MessageActions 的 clipboard+toast 模式）
 *  - 正文：行号列与代码列并列——行号在 <code> 外层，code.textContent 保持纯代码
 *    （MarkdownRenderer.test 锁定 pre>code 结构与文本）
 *  - 未闭合围栏（流式吃到尾部）：正常渲染已有行+行号，复制按钮禁用
 *  - 语法高亮不做（自研 tokenizer 风险大）：单色 + 语言标签
 */

import React, { useCallback, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useToastStore } from '@/store/toastStore'

interface CodeBlockCardProps {
  /** 围栏语言（空串 → 显示「代码」） */
  language: string
  /** 代码行（以已渲染行为准） */
  lines: string[]
  /** 围栏是否闭合（流式未闭合时复制禁用） */
  closed: boolean
}

const CodeBlockCard: React.FC<CodeBlockCardProps> = ({ language, lines, closed }) => {
  const [copied, setCopied] = useState(false)
  const showToast = useToastStore((s) => s.showToast)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      showToast('已复制到剪贴板', 'success')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      showToast('复制失败', 'error')
    }
  }, [lines, showToast])

  return (
    <div className="my-2 rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {/* 头栏：语言标签 + 复制 */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-1.5 border-b"
        style={{ background: 'var(--panel-2)', borderColor: 'var(--border)' }}
      >
        <span className="text-xs font-mono font-medium whitespace-nowrap" style={{ color: 'var(--fg)' }}>
          {language || '代码'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!closed}
          aria-label="复制代码"
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: copied ? 'var(--success)' : 'var(--muted)' }}
        >
          <Icon name={copied ? 'Check' : 'Copy'} size={13} />
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      {/* 正文：行号列（code 外层，select-none）+ 代码列并列，外层统一横向滚动 */}
      <div className="flex overflow-x-auto" style={{ background: 'var(--panel-2)' }}>
        <div
          aria-hidden
          className="select-none py-3 pl-3 pr-2 text-xs font-mono leading-relaxed text-right"
          style={{ color: 'var(--muted)' }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="flex-1 py-3 pr-3 text-xs font-mono leading-relaxed" style={{ color: 'var(--fg)' }}>
          <code>{lines.join('\n')}</code>
        </pre>
      </div>
    </div>
  )
}

export default CodeBlockCard
