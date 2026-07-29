// Drawer.tsx — S17 侧滑抽屉容器（Stitch Bedrock）
// 规格：右侧 480px 滑入 + 左投影 shadow-[-8px_0_32px_-12px] + header(icon+标题+关闭) + 内容滚动区 + footer 插槽
import React, { useEffect, useState } from 'react'
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
  /**
   * 表单有未保存修改时传 true：Esc/遮罩/X 三条误触关闭路径先弹「放弃修改」确认。
   * footer 里的显式取消按钮（调用方直接调 onClose）不经过此拦截——明确意图不设卡。
   */
  dirty?: boolean
  children: React.ReactNode
}

export function Drawer({ open, onClose, icon, title, footer, width = 480, dirty = false, children }: DrawerProps) {
  const [confirming, setConfirming] = useState(false)

  // 误触路径统一入口：dirty 时先确认，否则直接关
  const requestClose = () => {
    if (dirty) setConfirming(true)
    else onClose()
  }

  // 关闭后复位确认层，避免下次打开残留
  useEffect(() => {
    if (!open) setConfirming(false)
  }, [open])

  // Esc 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (dirty) setConfirming(true)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, dirty])

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
            onClick={requestClose}
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
                type="button" onClick={requestClose} aria-label="关闭"
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
            {/* dirty 误触关闭确认层 */}
            <AnimatePresence>
              {confirming && (
                <motion.div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div role="alertdialog" aria-label="放弃修改确认" className="mx-6 w-full max-w-xs rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="AlertTriangle" size={18} className="text-warning-500" />
                      <h3 className="text-sm font-semibold text-[color:var(--fg)]">放弃修改？</h3>
                    </div>
                    <p className="text-xs text-[color:var(--muted)] mb-4">表单有未保存的修改，关闭后将丢失。</p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button" onClick={() => setConfirming(false)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-[color:var(--border)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)] transition-colors"
                      >
                        继续编辑
                      </button>
                      <button
                        type="button" onClick={() => { setConfirming(false); onClose() }}
                        className="px-3 py-1.5 text-xs rounded-lg bg-danger-500 text-white hover:bg-danger-600 transition-colors"
                      >
                        放弃修改
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Drawer
