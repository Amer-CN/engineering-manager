import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'

interface TitleBarProps {
  onToggleCollapse?: () => void
  collapsed?: boolean
}

const TitleBar: React.FC<TitleBarProps> = ({ onToggleCollapse, collapsed = false }) => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return
    api.isMaximized?.().then((max: boolean) => setIsMaximized(max))
    const unsub = api.onMaximizeChange?.((max: boolean) => setIsMaximized(max))
    return () => { if (typeof unsub === 'function') unsub() }
  }, [])

  const minimize  = useCallback(() => (window as any).electronAPI?.minimizeWindow?.(), [])
  const maximize  = useCallback(() => (window as any).electronAPI?.toggleMaximize?.(), [])
  const close     = useCallback(() => (window as any).electronAPI?.closeWindow?.(), [])

  return (
    <div
      className="flex items-center h-9 select-none"
      style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={maximize}
    >
      {/* ── 左侧：折叠按钮 + 品牌 ── */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* 折叠按钮 — 使用 CSS 变量 */}
        <motion.button
          onClick={onToggleCollapse}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="w-7 h-7 rounded flex items-center justify-center mx-1 transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg-2)'; e.currentTarget.style.background = 'var(--panel-2)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
          title={collapsed ? '展开侧边栏 (Ctrl+B)' : '折叠侧边栏 (Ctrl+B)'}
        >
          <motion.svg
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.3"
            strokeLinecap="round" strokeLinejoin="round"
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1={collapsed ? "3" : "9"} y1="3" x2={collapsed ? "3" : "9"} y2="21" />
          </motion.svg>
        </motion.button>

        {/* 品牌 */}
        <div className="flex items-center gap-2 ml-0.5">
          {/* 工程管家 logo mark — Reasonix 风格渐变三角 */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0" style={{ marginTop: 1 }}>
            <defs>
              <linearGradient id="mark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--violet)" />
              </linearGradient>
            </defs>
            <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#mark-grad)" strokeLinejoin="round" />
            <path d="M5 14 L9 6 L13 14 Z" fill="var(--bg-2)" />
          </svg>
          <span
            className="text-[13.5px] font-semibold tracking-tight leading-none"
            style={{ color: 'var(--fg)', marginTop: 1 }}
          >
            工程管家
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* ── 右侧：窗口控制 ── */}
      <div
        className="flex items-stretch h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={minimize}
          className="h-full w-[46px] flex items-center justify-center transition-colors duration-75"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          aria-label="最小化"
          tabIndex={-1}
        >
          <svg width="11" height="11" viewBox="0 0 11 11">
            <rect x="1" y="5" width="9" height="1" rx="0.5" fill="currentColor" />
          </svg>
        </button>

        <button
          onClick={maximize}
          className="h-full w-[46px] flex items-center justify-center transition-colors duration-75"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          aria-label={isMaximized ? '还原' : '最大化'}
          tabIndex={-1}
        >
          {isMaximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
              <rect x="2" y="0.5" width="7" height="7" rx="1" />
              <rect x="0.5" y="2" width="7" height="7" rx="1" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="9" height="9" rx="1.3" />
            </svg>
          )}
        </button>

        <button
          onClick={close}
          className="h-full w-[46px] flex items-center justify-center transition-colors duration-75"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
          aria-label="关闭"
          tabIndex={-1}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <line x1="2" y1="2" x2="9" y2="9" />
            <line x1="9" y1="2" x2="2" y2="9" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TitleBar
