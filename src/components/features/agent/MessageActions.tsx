/**
 * MessageActions — 消息操作条（复刻 ZCode 规格）
 *
 * 复制 / 重新生成(assistant) / 编辑(user：内容回填输入框) / 分叉(assistant：以该消息为起点派生新对话) / 👍👎
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { useToastStore } from '@/store/toastStore'

interface MessageActionsProps {
  content: string
  /** assistant 消息：重新生成 */
  onResend?: () => void
  /** user 消息：编辑（内容回填输入框，由用户改后手动重发） */
  onEdit?: () => void
  /** assistant 消息：分叉（以该消息为起点派生新对话） */
  onFork?: () => void
}

const MessageActions: React.FC<MessageActionsProps> = ({ content, onResend, onEdit, onFork }) => {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const showToast = useToastStore(s => s.showToast)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      showToast('已复制到剪贴板', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('复制失败', 'error')
    }
  }

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(prev => prev === type ? null : type)
    if (type === 'up') {
      showToast('感谢反馈！', 'success')
    } else {
      showToast('已记录您的反馈', 'info')
    }
  }

  const btnClass = 'p-1.5 rounded-lg text-[color:var(--border-strong)] hover:text-[color:var(--muted)] hover:bg-[color:var(--panel-2)] transition-colors'

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-center gap-0.5 mt-1"
    >
      <button onClick={handleCopy} className={btnClass} title="复制">
        <Icon name={copied ? 'Check' : 'Copy'} size={13} />
      </button>
      {onEdit && (
        <button onClick={onEdit} className={btnClass} title="编辑（回填到输入框）">
          <Icon name="Pencil" size={13} />
        </button>
      )}
      {onResend && (
        <button onClick={() => onResend()} className={btnClass} title="重新生成">
          <Icon name="RefreshCw" size={13} />
        </button>
      )}
      {onFork && (
        <button
          onClick={() => { onFork(); showToast('已从该消息分叉出新对话', 'success') }}
          className={btnClass}
          title="从此处分叉新对话"
        >
          <Icon name="GitFork" size={13} />
        </button>
      )}
      <button
        onClick={() => handleFeedback('up')}
        className={`${btnClass} ${feedback === 'up' ? 'text-success-500' : ''}`}
        title="有帮助"
      >
        <Icon name="ThumbsUp" size={13} />
      </button>
      <button
        onClick={() => handleFeedback('down')}
        className={`${btnClass} ${feedback === 'down' ? 'text-warning-500' : ''}`}
        title="需改进"
      >
        <Icon name="ThumbsDown" size={13} />
      </button>
    </motion.div>
  )
}

export default MessageActions
