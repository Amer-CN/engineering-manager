/**
 * SuggestionChips — 推荐问题 pills（由 SuggestionCards 改造）
 *
 * 保留 6 条按 requiredPermission 过滤
 * 点击填入 Composer 发送
 * Bedrock：统一中性 chip（细发丝边 + 墨字 + muted 图标），hover 走 accent-soft。
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { SuggestionCardConfig } from '@/types/agent'

interface SuggestionChipsProps {
  suggestions: SuggestionCardConfig[]
  onSelect: (prompt: string) => void
  disabled?: boolean
}

const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  onSelect,
  disabled = false,
}) => {
  if (suggestions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
    >
      {/* 紧凑建议组（K3 审查改版）：gap-1.5 收拢 + xs 字号 + muted 基调，
          从属于上方输入框而不是漂浮 */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {suggestions.map((sug, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.2 }}
            whileHover={disabled ? undefined : { scale: 1.03, y: -1 }}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            onClick={() => !disabled && onSelect(sug.prompt)}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.borderColor = 'var(--accent-strong)'; e.currentTarget.style.color = 'var(--fg-2)' } }}
            onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' } }}
          >
            <span style={{ color: 'var(--muted)' }}>
              <Icon name={sug.icon} size={12} />
            </span>
            <span>{sug.title}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

export default SuggestionChips
