/**
 * AgentSearch — ⌘K/Ctrl+K 命令面板式页内搜索
 *
 * 分组：直接问 AI（置顶）/ 对话（filter getAgentConversations）/ 功能模块（filter routes, can() 过滤）
 * 输入防抖 150ms；↑↓ 选择、Enter 执行、Esc 关闭
 * 空态给最近对话 + 高频模块
 * 纯前端，复用 Modal + Input
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { usePermission } from '@/hooks/usePermission'
import { getAgentConversations } from '@/services/agent-client'
import { routes, type PageId } from '@/routes'
import type { AgentConversation } from '@/types/agent'
import { navigateTo } from './types'

interface AgentSearchProps {
  open: boolean
  onClose: () => void
  onAsk: (query: string) => void
  onSelectConversation: (conv: AgentConversation) => void
}

/** 搜索结果项 */
type SearchItem =
  | { type: 'ask'; label: string; query: string }
  | { type: 'conversation'; label: string; sub: string; conv: AgentConversation }
  | { type: 'module'; label: string; sub: string; icon: string; pageId: PageId }

/** 模块权限映射 */
const MODULE_PERMS: Record<string, string> = {
  projects: 'projects:read',
  contracts: 'contracts:read',
  partners: 'partners:read',
  hr: 'hr:read',
  labor: 'labor:read',
  wages: 'wages:read',
  settlement: 'settlement:read',
  templates: 'templates:read',
  inventory: 'inventory:read',
  invoices: 'invoices:read',
  costLedger: 'costLedger:read',
  drawings: 'drawings:read',
  expenses: 'expenses:read',
  settings: 'settings:read',
  users: 'users:read',
}

const HIGH_FREQ_MODULES: PageId[] = ['projects', 'invoices', 'contracts', 'settlement', 'costLedger', 'hr']

const AgentSearch: React.FC<AgentSearchProps> = ({
  open,
  onClose,
  onAsk,
  onSelectConversation,
}) => {
  const { can } = usePermission()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // ── 加载对话 ──
  useEffect(() => {
    if (open) {
      getAgentConversations().then(setConversations).catch(() => {})
      setQuery('')
      setDebouncedQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // ── 防抖 ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150)
    return () => clearTimeout(t)
  }, [query])

  // ── 构建搜索结果 ──
  const results = useMemo(() => {
    const items: SearchItem[] = []
    const q = debouncedQuery.toLowerCase().trim()

    // 1. 直接问 AI（置顶）
    if (q) {
      items.push({ type: 'ask', label: `问 AI：${debouncedQuery}`, query: debouncedQuery })
    }

    // 2. 对话
    const matchedConvs = q
      ? conversations.filter(
          c =>
            (c.title || '').toLowerCase().includes(q) ||
            (c.lastMessage || '').toLowerCase().includes(q),
        )
      : conversations.slice(0, 5) // 空态显示最近 5 条

    for (const conv of matchedConvs) {
      items.push({
        type: 'conversation',
        label: conv.title || `对话 ${conv.id}`,
        sub: conv.lastMessage || `${conv.messageCount} 条消息`,
        conv,
      })
    }

    // 3. 功能模块
    const visibleRoutes = routes.filter(r => {
      const perm = MODULE_PERMS[r.id]
      if (perm && !can(perm as any)) return false
      return true
    })

    const matchedModules = q
      ? visibleRoutes.filter(
          r =>
            r.label.toLowerCase().includes(q) ||
            (r.description || '').toLowerCase().includes(q),
        )
      : visibleRoutes.filter(r => HIGH_FREQ_MODULES.includes(r.id))

    for (const r of matchedModules) {
      items.push({
        type: 'module',
        label: r.label,
        sub: r.description || '',
        icon: r.icon,
        pageId: r.id,
      })
    }

    return items
  }, [debouncedQuery, conversations, can])

  // ── 重置选中 ──
  useEffect(() => {
    setSelectedIndex(0)
  }, [debouncedQuery])

  // ── 键盘导航 ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = results[selectedIndex]
        if (!item) return
        if (item.type === 'ask') {
          onAsk(item.query)
          onClose()
        } else if (item.type === 'conversation') {
          onSelectConversation(item.conv)
          onClose()
        } else if (item.type === 'module') {
          navigateTo(item.pageId)
          onClose()
        }
      }
    },
    [results, selectedIndex, onAsk, onSelectConversation, onClose],
  )

  // ── 滚动到选中项 ──
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // ── 执行选中 ──
  const handleSelect = useCallback(
    (item: SearchItem) => {
      if (item.type === 'ask') {
        onAsk(item.query)
        onClose()
      } else if (item.type === 'conversation') {
        onSelectConversation(item.conv)
        onClose()
      } else if (item.type === 'module') {
        navigateTo(item.pageId)
        onClose()
      }
    },
    [onAsk, onSelectConversation, onClose],
  )

  // ── 分组渲染 ──
  let currentGroup = ''
  let flatIdx = -1

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="lg"
      showClose={false}
      showOverlay={true}
      closeOnOverlay={true}
      centered={false}
      className="!max-w-xl mt-[10vh]"
    >
      <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
        {/* 搜索输入 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Icon name="Search" size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索对话、功能模块，或直接提问..."
            className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
          />
          <kbd className="flex-shrink-0 px-1.5 py-0.5 rounded bg-slate-100 text-caption font-mono text-slate-400">
            Esc
          </kbd>
        </div>

        {/* 结果列表 */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="SearchX" size={32} className="text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">未找到相关结果</p>
              {debouncedQuery && (
                <button
                  onClick={() => {
                    onAsk(debouncedQuery)
                    onClose()
                  }}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  向 AI 提问「{debouncedQuery}」
                </button>
              )}
            </div>
          ) : (
            results.map((item) => {
              flatIdx++
              const idx = flatIdx
              const isSelected = idx === selectedIndex

              // 分组标题
              let groupHeader: React.ReactNode = null
              if (item.type === 'ask' && currentGroup !== 'ask') {
                currentGroup = 'ask'
                groupHeader = <p className="text-xs font-medium text-slate-400 px-4 pt-2 pb-1">直接问 AI</p>
              } else if (item.type === 'conversation' && currentGroup !== 'conv') {
                currentGroup = 'conv'
                groupHeader = <p className="text-xs font-medium text-slate-400 px-4 pt-2 pb-1">
                  {debouncedQuery ? '匹配的对话' : '最近对话'}
                </p>
              } else if (item.type === 'module' && currentGroup !== 'module') {
                currentGroup = 'module'
                groupHeader = <p className="text-xs font-medium text-slate-400 px-4 pt-2 pb-1">
                  {debouncedQuery ? '匹配的功能' : '常用功能'}
                </p>
              }

              return (
                <div key={idx}>
                  {groupHeader}
                  <button
                    data-idx={idx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* 图标 */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center">
                      {item.type === 'ask' && (
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                          <Icon name="Sparkles" size={14} className="text-white" />
                        </span>
                      )}
                      {item.type === 'conversation' && (
                        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Icon name="MessageSquare" size={14} className="text-slate-500" />
                        </span>
                      )}
                      {item.type === 'module' && (
                        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Icon name={item.icon} size={14} className="text-slate-500" />
                        </span>
                      )}
                    </div>

                    {/* 文本 */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${
                        item.type === 'ask' ? 'text-blue-600' : 'text-slate-700'
                      }`}>
                        {item.label}
                      </p>
                      {(item.type === 'conversation' || item.type === 'module') && item.sub && (
                        <p className="text-xs text-slate-400 truncate">{item.sub}</p>
                      )}
                    </div>

                    {/* 选中指示 */}
                    {isSelected && (
                      <Icon name="CornerDownLeft" size={14} className="flex-shrink-0 text-slate-400" />
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-caption">↑↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-caption">↵</kbd>
              选择
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-caption">Esc</kbd>
              关闭
            </span>
          </div>
          <span className="text-xs text-slate-300">{results.length} 项结果</span>
        </div>
      </div>
    </Modal>
  )
}

export default AgentSearch
