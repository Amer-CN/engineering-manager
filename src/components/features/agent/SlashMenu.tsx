/**
 * SlashMenu — 斜杠命令菜单（AgentComposer 行数门禁拆分件）
 * JSX 原样迁自 AgentComposer.tsx 的斜杠菜单块，零行为变化。
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SlashCommand } from './types'

interface SlashMenuProps {
  open: boolean
  commands: SlashCommand[]
  onSelect: (prompt: string) => void
}

const SlashMenu: React.FC<SlashMenuProps> = ({ open, commands, onSelect }) => (
  <AnimatePresence>
    {open && commands.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] shadow-lg overflow-hidden z-20"
      >
        <div className="px-3 py-2 border-b border-[color:var(--border)] text-xs font-medium text-[color:var(--muted)]">快捷命令</div>
        <div className="max-h-48 overflow-y-auto py-1">
          {commands.map(cmd => (
            <button
              key={cmd.key}
              onClick={() => onSelect(cmd.prompt)}
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
)

export default SlashMenu
