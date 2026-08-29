import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import { getAPI } from '../services/api-adapter'
import { useAuthStore } from '@/store/authStore'
import { useNotifications, type AppNotification } from '../hooks/useNotifications'
import { NotificationCenter } from './NotificationCenter'

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
  // S2 通知中心
  const [notifOpen, setNotifOpen] = useState(false)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  // S0 Stitch: 标题栏右侧用户头像
  const currentUser = useAuthStore(s => s.currentUser)

  const handleNotifClick = useCallback((n: AppNotification) => {
    markRead(n.id)
    setNotifOpen(false)
    if (n.target) window.dispatchEvent(new CustomEvent('navigate', { detail: n.target }))
  }, [markRead])

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
            <defs><mask id="mark-mask"><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask></defs>
            <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="var(--brand)" strokeLinejoin="round" mask="url(#mark-mask)" />
          </svg>
          <span className="text-sm font-semibold tracking-tight leading-none" style={{ color: 'var(--fg)', marginTop: 1 }}>工程管家</span>
        </div>
      </div>

      {/* ── S0 Stitch: 命令面板搜索触发器 ── */}
      <div className="flex-1 flex items-center justify-center px-4">
        <button
          onClick={(e) => {
            e.stopPropagation()
            // 模拟 Ctrl+K 触发 CommandPalette
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
          }}
          onDoubleClick={e => e.stopPropagation()}
          className="flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-colors cursor-text max-w-[240px] w-full"
          style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--panel-2)' }}
          title="搜索 (Ctrl+K)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span className="opacity-70 truncate">搜索指令或数据...</span>
        </button>
      </div>

      {/* ── S2 通知铃铛 ── */}
      <button
        data-notif-trigger
        onClick={(e) => { e.stopPropagation(); setNotifOpen(v => !v) }}
        onDoubleClick={e => e.stopPropagation()}
        className="relative h-full w-[38px] flex items-center justify-center shrink-0"
        style={{ color: notifOpen ? 'var(--accent)' : 'var(--muted)' }}
        onMouseEnter={e => { e.currentTarget.style.background = interaction.hoverBg; if (!notifOpen) e.currentTarget.style.color = interaction.hoverIconColor }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (!notifOpen) e.currentTarget.style.color = 'var(--muted)' }}
        aria-label="通知中心" title="通知中心" tabIndex={-1}
      >
        <motion.div whileHover={{ scale: interaction.hoverScale }} whileTap={{ scale: interaction.tapScale }} transition={interaction.transition}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        </motion.div>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--danger)' }} />
        )}
      </button>

      {/* ── S0 设置齿轮 ── */}
      <button
        onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' })) }}
        onDoubleClick={e => e.stopPropagation()}
        className="h-full w-[38px] flex items-center justify-center shrink-0"
        style={{ color: 'var(--muted)' }}
        onMouseEnter={e => { e.currentTarget.style.background = interaction.hoverBg; e.currentTarget.style.color = interaction.hoverIconColor }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
        aria-label="系统设置" title="系统设置" tabIndex={-1}
      >
        <motion.div whileHover={{ scale: interaction.hoverScale }} whileTap={{ scale: interaction.tapScale }} transition={interaction.transition}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </motion.div>
      </button>

      {/* ── S0 用户头像（首字母圆，点击进设置-个人账户） ── */}
      {currentUser && (
        <button
          onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' })) }}
          onDoubleClick={e => e.stopPropagation()}
          className="h-full w-[38px] flex items-center justify-center shrink-0"
          aria-label="个人账户" title={`${currentUser.displayName || currentUser.username}`} tabIndex={-1}
        >
          <motion.span
            whileHover={{ scale: interaction.hoverScale }} whileTap={{ scale: interaction.tapScale }} transition={interaction.transition}
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-caption font-semibold border"
            style={{ background: 'var(--panel-2)', color: 'var(--fg-2)', borderColor: 'var(--border)' }}
          >
            {(currentUser.displayName || currentUser.username || '?').charAt(0)}
          </motion.span>
        </button>
      )}

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

      {/* S2 通知中心浮层 */}
      <NotificationCenter
        open={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onMarkAllRead={markAllRead}
        onItemClick={handleNotifClick}
        onViewAll={() => { setNotifOpen(false); window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' })) }}
      />
    </div>
  )
}

export default TitleBar
