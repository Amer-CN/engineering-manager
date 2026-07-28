/**
 * MessageActions — AI 消息操作条
 *
 * 复制(navigator.clipboard)、重发(重跑上一条 user)、👍👎(本地态+Toast,不持久化)
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { useToastStore } from '@/store/toastStore'

interface MessageActionsProps {
  content: string
  onResend?: () => void
}

const MessageActions: React.FC<MessageActionsProps> = ({ content, onResend }) => {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const toast = useToastStore()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  const handleResend = () => {
    onResend?.()
  }

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(prev => prev === type ? null : type)
    if (type === 'up') {
      toast.success('感谢反馈！')
    } else {
      toast.info('已记录您的反馈')
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
      {onResend && (
        <button onClick={handleResend} className={btnClass} title="重新生成">
          <Icon name="RefreshCw" size={13} />
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
