/**
 * AgentHero — AI 助手 Hero 区域
 *
 * 空态：蓝紫渐变 Hero + 时段问候 + 机器人光晕 + 只读模型徽章 + 搜索入口
 * 对话态(compact)：收窄的横条，仅问候 + 搜索
 *
 * 专用组件，不复用公共 HeroBanner（accentColor 只有 emerald/amber/blue）
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { Tooltip } from '@/components/ui/Tooltip'
import { getGreeting } from '@/components/features/dashboard/dashboardConstants'
import { getLlmProviderConfig } from '@/services/agent-client'
import { navigateTo } from './types'

interface AgentHeroProps {
  username: string
  model?: string
  onOpenSearch: () => void
  compact?: boolean
}

const AgentHero: React.FC<AgentHeroProps> = ({ username, model, onOpenSearch, compact = false }) => {
  const [providerName, setProviderName] = useState<string>('')
  const [modelName, setModelName] = useState<string>('')

  useEffect(() => {
    if (model) {
      setModelName(model)
      return
    }
    let cancelled = false
    getLlmProviderConfig().then(cfg => {
      if (cancelled || !cfg) return
      setProviderName(cfg.providerName || '')
      setModelName(cfg.model || '')
    }).catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [model])

  // ── Compact 模式（对话态顶部条） ──
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600/10 via-blue-600/10 to-transparent border border-slate-100 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-sm">
            <Icon name="Bot" size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">
              {getGreeting()}，{username}
            </p>
            {modelName && (
              <p className="text-xs text-slate-400 truncate">{modelName}</p>
            )}
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onOpenSearch}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white hover:border-slate-300 transition-colors"
        >
          <Icon name="Search" size={14} />
          <span className="hidden sm:inline">搜索</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 text-caption text-slate-400 font-mono">⌘K</kbd>
        </motion.button>
      </div>
    )
  }

  // ── 完整模式（空态 Hero） ──
  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl mb-6"
    >
      {/* 渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700" />

      {/* 装饰光晕 */}
      <motion.div
        className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3), transparent 70%)' }}
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.25), transparent 70%)' }}
        animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.15, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* 内容 */}
      <div className="relative z-10 p-6 md:p-8 flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* 机器人图标 */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
            className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20"
          >
            <Icon name="Bot" size={32} className="text-white" />
          </motion.div>

          <div>
            <motion.h1
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-2xl md:text-3xl font-bold text-white tracking-tight"
            >
              {getGreeting()}，{username} 👋
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm md:text-base text-white/60 mt-1"
            >
              我是你的 AI 工程管理助手，有什么可以帮你的？
            </motion.p>

            {/* 模型徽章 */}
            {modelName && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/70 font-medium">
                  {providerName ? `${providerName} · ` : ''}{modelName}
                </span>
                <Tooltip content="点击前往设置修改模型配置" position="bottom">
                  <button
                    onClick={() => navigateTo('settings')}
                    className="ml-1 p-0.5 rounded text-white/40 hover:text-white/80 transition-colors"
                  >
                    <Icon name="Settings" size={11} />
                  </button>
                </Tooltip>
              </motion.div>
            )}
          </div>
        </div>

        {/* 搜索入口 */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenSearch}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium transition-colors"
        >
          <Icon name="Search" size={16} />
          <span className="hidden md:inline">页内搜索</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/10 text-caption font-mono">⌘K</kbd>
        </motion.button>
      </div>
    </motion.section>
  )
}

export default AgentHero
