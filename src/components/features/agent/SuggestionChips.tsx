/**
 * SuggestionChips — 推荐问题 pills（由 SuggestionCards 改造）
 *
 * 保留 6 条按 requiredPermission 过滤
 * 点击填入 Composer 发送
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

const iconColorMap: Record<string, string> = {
  blue: 'text-blue-500',
  amber: 'text-amber-500',
  emerald: 'text-emerald-500',
  violet: 'text-violet-500',
  orange: 'text-orange-500',
  rose: 'text-rose-500',
  teal: 'text-teal-500',
  indigo: 'text-indigo-500',
}

const borderHoverMap: Record<string, string> = {
  blue: 'hover:border-blue-300 hover:bg-blue-50',
  amber: 'hover:border-amber-300 hover:bg-amber-50',
  emerald: 'hover:border-emerald-300 hover:bg-emerald-50',
  violet: 'hover:border-violet-300 hover:bg-violet-50',
  orange: 'hover:border-orange-300 hover:bg-orange-50',
  rose: 'hover:border-rose-300 hover:bg-rose-50',
  teal: 'hover:border-teal-300 hover:bg-teal-50',
  indigo: 'hover:border-indigo-300 hover:bg-indigo-50',
}

function extractColorKey(color?: string): string {
  if (!color) return 'blue'
  if (iconColorMap[color]) return color
  const match = color.match(/bg-(\w+)-/)
  return match ? match[1] : 'blue'
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
      <p className="text-xs font-medium text-slate-400 mb-2.5">快捷提问</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((sug, i) => {
          const colorKey = extractColorKey(sug.color)
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i, duration: 0.2 }}
              whileHover={disabled ? undefined : { scale: 1.03, y: -1 }}
              whileTap={disabled ? undefined : { scale: 0.97 }}
              onClick={() => !disabled && onSelect(sug.prompt)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm text-slate-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${borderHoverMap[colorKey] || borderHoverMap.blue}`}
            >
              <span className={iconColorMap[colorKey] || iconColorMap.blue}>
                <Icon name={sug.icon} size={14} />
              </span>
              <span className="font-medium">{sug.title}</span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

export default SuggestionChips
