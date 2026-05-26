import React, { useState, useEffect, useCallback } from 'react'
import { Icon } from './ui/Icon'

/**
 * 自定义标题栏（frameless 窗口）
 * - 左侧：应用图标 + 名称（可拖拽）
 * - 右侧：最小化 / 最大化 / 关闭按钮
 * - 双击拖拽区域 → 切换最大化
 */
interface TitleBarProps {
  onToggleCollapse?: () => void
  collapsed?: boolean
}

const TitleBar: React.FC<TitleBarProps> = ({ onToggleCollapse, collapsed = false }) => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return

    // 获取初始最大化状态
    api.isMaximized?.().then((max: boolean) => setIsMaximized(max))

    // 监听最大化状态变化
    const unsub = api.onMaximizeChange?.((max: boolean) => setIsMaximized(max))
    return () => { if (typeof unsub === 'function') unsub() }
  }, [])

  const minimize = useCallback(() => {
    (window as any).electronAPI?.minimizeWindow?.()
  }, [])

  const toggleMaximize = useCallback(() => {
    (window as any).electronAPI?.toggleMaximize?.()
  }, [])

  const close = useCallback(() => {
    (window as any).electronAPI?.closeWindow?.()
  }, [])

  const handleDoubleClick = useCallback(() => {
    toggleMaximize()
  }, [toggleMaximize])

  return (
    <div
      className="flex items-center justify-between h-9 px-3 select-none border-b border-[var(--border-primary)] bg-[var(--sidebar-bg)]"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={handleDoubleClick}
    >
      {/* 左侧：折叠按钮 + 应用图标 + 名称 */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={collapsed ? '展开侧边栏 (Ctrl+B)' : '折叠侧边栏 (Ctrl+B)'}
        >
          {/* 面板图标 — 矩形+左侧竖线，表示侧边栏显示/隐藏 */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
            <line x1={collapsed ? "2" : "5"} y1="2.5" x2={collapsed ? "2" : "5"} y2="13.5" />
          </svg>
        </button>
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
          <Icon name="HardHat" size={12} className="text-white" />
        </div>
        <span className="text-xs font-medium text-[var(--text-primary)]">工程管家</span>
      </div>

      {/* 右侧：窗口控制按钮 */}
      <div
        className="flex items-center gap-0 -mr-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* 最小化 */}
        <button
          onClick={minimize}
          className="h-9 w-11 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          aria-label="最小化"
          tabIndex={-1}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>

        {/* 最大化 / 还原 */}
        <button
          onClick={toggleMaximize}
          className="h-9 w-11 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          aria-label={isMaximized ? '还原' : '最大化'}
          tabIndex={-1}
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2.5" y="0.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
              <rect x="0.5" y="2.5" width="8" height="8" rx="1" fill="var(--sidebar-bg)" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="1" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>

        {/* 关闭 */}
        <button
          onClick={close}
          className="h-9 w-11 hover:bg-red-500 hover:text-white flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          aria-label="关闭"
          tabIndex={-1}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2" />
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TitleBar
