import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import { getAPI } from '../services/api-adapter'

type WebViewWindow = Window & { chrome?: { webview?: { postMessage: (msg: string) => void } }; electronAPI?: { [key: string]: (...args: any[]) => any } };
const getWebview = () => (window as unknown as WebViewWindow).chrome?.webview;
const getElectronAPI = () => (window as unknown as WebViewWindow).electronAPI;

interface TitleBarProps {
  onToggleCollapse?: () => void
  collapsed?: boolean
}

const THEME_INTERACTION = {
  white: {
    hoverScale: 1.12, tapScale: 0.88,
    hoverBg: 'var(--panel-2)', hoverIconColor: 'var(--accent)',
    transition: { type: 'spring', stiffness: 400, damping: 20 },
  },
  graphite: {
    hoverScale: 1.15, tapScale: 0.85,
    hoverBg: 'rgba(255, 255, 255, 0.12)', hoverIconColor: 'var(--accent)',
    transition: { type: 'spring', stiffness: 500, damping: 15 },
  },
  sandstone: {
    hoverScale: 1.08, tapScale: 0.92,
    hoverBg: 'rgba(0, 0, 0, 0.08)', hoverIconColor: 'var(--warning)',
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
} as const

const TitleBar: React.FC<TitleBarProps> = ({ onToggleCollapse, collapsed = false }) => {
  const { scheme } = useTheme()
  const interaction = useMemo(() => THEME_INTERACTION[scheme], [scheme])
  const [isMaximized, setIsMaximized] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    const api = getElectronAPI()
    if (api) {
      api.isMaximized?.().then((max: boolean) => setIsMaximized(max))
      const unsub = api.onMaximizeChange?.((max: boolean) => setIsMaximized(max))
      return () => { if (typeof unsub === 'function') unsub() }
    }
    const webview = getWebview()
    if (webview) {
      const handler = (event: any) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'maximizeChange') setIsMaximized(data.isMaximized)
          if (data.type === 'fullScreenChange') setIsFullScreen(data.isFullScreen)
        } catch (err) { console.warn('[TitleBar] 解析webview消息失败:', err) }
      }
      webview.addEventListener('message', handler)
      return () => webview.removeEventListener('message', handler)
    }
  }, [])

  const minimize  = useCallback(() => { getAPI().then(api => api?.minimizeWindow?.()) }, [])
  const maximize  = useCallback(() => { getAPI().then(api => api?.toggleMaximize?.()) }, [])
  const close     = useCallback(() => { getAPI().then(api => api?.closeWindow?.()) }, [])
  const toggleFullscreen = useCallback(() => { getAPI().then(api => api?.setFullScreen?.()) }, [])

  // 标题栏点击 → 立即发送 startDrag，无延迟
  // 双击最大化由 C# 端检测两次 startDrag 的时间间隔处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('a')) return

    const webview = getWebview()
    if (webview) {
      webview.postMessage(JSON.stringify({ action: 'startDrag' }))
    }
  }, [])

  return (
    <div
      className="flex items-center h-9 select-none"
      style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}
      onMouseDown={handleMouseDown}
    >
      {/* ── 左侧：折叠按钮 + 品牌 ── */}
      <div className="flex items-center h-full">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCollapse?.() }}
          onDoubleClick={(e) => e.stopPropagation()}
          className="w-7 h-7 rounded flex items-center justify-center mx-1"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = interaction.hoverIconColor; e.currentTarget.style.background = interaction.hoverBg }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
          title={collapsed ? '展开侧边栏 (Ctrl+B)' : '折叠侧边栏 (Ctrl+B)'}
        >
          <motion.svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
            strokeLinecap="round" strokeLinejoin="round"
            animate={{ rotate: collapsed ? 180 : 0 }}
            whileHover={{ scale: interaction.hoverScale }} whileTap={{ scale: interaction.tapScale }} transition={interaction.transition}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1={collapsed ? "3" : "9"} y1="3" x2={collapsed ? "3" : "9"} y2="21" />
          </motion.svg>
        </button>
        <div className="flex items-center gap-2 ml-0.5">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0" style={{ marginTop: 1 }}>
            <defs><linearGradient id="mark-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--violet)" /></linearGradient><mask id="mark-mask"><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask></defs>
            <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#mark-grad)" strokeLinejoin="round" mask="url(#mark-mask)" />
          </svg>
          <span className="text-sm font-semibold tracking-tight leading-none" style={{ color: 'var(--fg)', marginTop: 1 }}>工程管家</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* ── 全屏按钮 ── */}
      <button
        onClick={toggleFullscreen}
        className="h-full w-[38px] flex items-center justify-center shrink-0"
        style={{ color: isFullScreen ? 'var(--accent)' : 'var(--muted)' }}
        onMouseEnter={e => { e.currentTarget.style.background = interaction.hoverBg; if (!isFullScreen) e.currentTarget.style.color = interaction.hoverIconColor }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (!isFullScreen) e.currentTarget.style.color = 'var(--muted)' }}
        aria-label={isFullScreen ? '退出全屏' : '全屏'} tabIndex={-1}
        title={isFullScreen ? '退出全屏 (F11)' : '全屏模式 (F11)'}
      >
        <motion.div whileHover={{ scale: interaction.hoverScale }} whileTap={{ scale: interaction.tapScale }} transition={interaction.transition}>
          {isFullScreen ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 L6 6 L2 6" /><path d="M5 9 L5 5 L9 5" /></svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6 L2 2 L6 2" /><path d="M9 5 L9 9 L5 9" /></svg>
          )}
        </motion.div>
      </button>

      {/* ── 右侧：窗口控制 ── */}
      <div className="flex items-stretch h-full">
        <button onClick={minimize}
          className="h-full w-[46px] flex items-center justify-center shrink-0"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = interaction.hoverBg; e.currentTarget.style.color = interaction.hoverIconColor }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
          aria-label="最小化" tabIndex={-1}>
          <motion.div whileHover={{ scale: interaction.hoverScale }} whileTap={{ scale: interaction.tapScale }} transition={interaction.transition}>
            <svg width="11" height="11" viewBox="0 0 11 11"><rect x="1" y="5" width="9" height="1" rx="0.5" fill="currentColor" /></svg>
          </motion.div>
        </button>

        <button onClick={maximize}
          className="h-full w-[46px] flex items-center justify-center shrink-0"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = interaction.hoverBg; e.currentTarget.style.color = interaction.hoverIconColor }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
          aria-label={isMaximized ? '还原' : '最大化'} tabIndex={-1}>
          <motion.div whileHover={{ scale: interaction.hoverScale }} whileTap={{ scale: interaction.tapScale }} transition={interaction.transition}>
            {isMaximized ? (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"><rect x="2" y="0.5" width="7" height="7" rx="1" /><rect x="0.5" y="2" width="7" height="7" rx="1" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="9" height="9" rx="1.3" /></svg>
            )}
          </motion.div>
        </button>

        <button onClick={close}
          className="h-full w-[46px] flex items-center justify-center shrink-0"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
          aria-label="关闭" tabIndex={-1}>
          <motion.div whileHover={{ scale: interaction.hoverScale }} whileTap={{ scale: interaction.tapScale }} transition={interaction.transition}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><line x1="2" y1="2" x2="9" y2="9" /><line x1="9" y1="2" x2="2" y2="9" /></svg>
          </motion.div>
        </button>
      </div>
    </div>
  )
}

export default TitleBar
