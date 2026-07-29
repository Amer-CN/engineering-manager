// Drawer.tsx — S17 侧滑抽屉容器（Stitch Bedrock）
// 规格：右侧 480px 滑入 + 左投影 shadow-[-8px_0_32px_-12px] + header(icon+标题+关闭) + 内容滚动区 + footer 插槽
import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from './Icon'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  /** 标题左侧图标（iconMap 名称） */
  icon?: string
  title: React.ReactNode
  /** 底部操作区（固定不滚动） */
  footer?: React.ReactNode
  /** 抽屉宽度，默认 S17 的 480px */
  width?: number
  children: React.ReactNode
}

export function Drawer({ open, onClose, icon, title, footer, width = 480, children }: DrawerProps) {
  // Esc 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 打开时锁定背景滚动（与 Modal 行为一致）
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {/* Drawer Surface（S17：border-l + 左投影） */}
          <motion.aside
            role="dialog" aria-modal="true"
            className="relative h-full flex flex-col bg-[color:var(--panel)] border-l border-[color:var(--border)] shadow-[-8px_0_32px_-12px_rgba(0,0,0,0.15)]"
            style={{ width, maxWidth: '92vw' }}
            initial={{ x: width }} animate={{ x: 0 }} exit={{ x: width }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            {/* Header */}
            <header className="flex justify-between items-center px-6 py-4 border-b border-[color:var(--border)] bg-[color:var(--card)] shrink-0">
              <div className="flex items-center gap-2.5">
                {icon && <Icon name={icon} size={20} className="text-[color:var(--fg)]" />}
                <h2 className="text-base font-semibold text-[color:var(--fg)]">{title}</h2>
              </div>
              <button
                type="button" onClick={onClose} aria-label="关闭"
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-[color:var(--panel-2)] text-[color:var(--muted)] hover:text-[color:var(--fg-2)] transition-colors"
              >
                <Icon name="X" size={18} />
              </button>
            </header>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
            {/* Footer */}
            {footer && (
              <div className="shrink-0 border-t border-[color:var(--border)] px-6 py-4 bg-[color:var(--card)]">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Drawer
