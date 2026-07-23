/**
 * SpeechKnowledgePage — 语音知识库主页面
 *
 * 一个入口、两个模式卡片：
 * 1. 录音转写 — 上传录音 · AI 转写 · 校对入库
 * 2. 知识库   — 全文检索 · 文档管理 · 智能问答
 */

import React, { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import PageContainer from '@/components/ui/PageContainer'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import TranscriptionWorkspace from './TranscriptionWorkspace'
import KnowledgeLibrary from './KnowledgeLibrary'

interface ModeOption {
  key: string
  label: string
  icon: string
  desc: string
  /** active state: border + bg gradient */
  activeWrap: string
  /** active state: icon circle */
  activeIcon: string
  /** active state: title text */
  activeTitle: string
  /** active state: desc text */
  activeDesc: string
  /** active state: accent bar */
  activeBar: string
}

const MODES: ModeOption[] = [
  {
    key: 'transcription',
    label: '录音转写',
    icon: 'Mic',
    desc: '上传录音 · AI 转写 · 校对入库',
    activeWrap: 'border-primary-300 bg-gradient-to-br from-primary-50/80 to-primary-100/30 shadow-sm shadow-primary-100/50',
    activeIcon: 'bg-primary-500 text-white shadow-sm shadow-primary-200',
    activeTitle: 'text-primary-700',
    activeDesc: 'text-primary-500/80',
    activeBar: 'bg-primary-500',
  },
  {
    key: 'library',
    label: '知识库',
    icon: 'Library',
    desc: '全文检索 · 文档管理 · 智能问答',
    activeWrap: 'border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-emerald-100/30 shadow-sm shadow-emerald-100/50',
    activeIcon: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200',
    activeTitle: 'text-emerald-700',
    activeDesc: 'text-emerald-500/80',
    activeBar: 'bg-emerald-500',
  },
]

const SpeechKnowledgePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('transcription')
  const [openDocId, setOpenDocId] = useState<number | null>(null)

  const handleSwitchToLibrary = useCallback((docId?: number) => {
    if (docId != null) setOpenDocId(docId)
    setActiveTab('library')
  }, [])

  // 挂载时检查是否有来自 Agent 来源卡片的 pendingDocId（可靠机制，不依赖事件时序）
  useEffect(() => {
    const pending = sessionStorage.getItem('knowledge:pendingDocId')
    if (pending) {
      sessionStorage.removeItem('knowledge:pendingDocId')
      const docId = parseInt(pending, 10)
      if (!isNaN(docId)) {
        setOpenDocId(docId)
        setActiveTab('library')
      }
    }
  }, [])

  return (
    <PageContainer maxWidth="wide">
      <Card padding="none" shadow="md" className="overflow-hidden">
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-sm">
              <Icon name="Library" size={16} />
            </span>
            <h1 className="text-xl font-bold text-slate-800">语音知识库</h1>
          </div>
          <p className="text-sm text-slate-500 mb-4 pl-[38px]">录音转写 · 校对 · 入库 · 检索</p>

          {/* ── 模式切换卡片 ── */}
          <div className="grid grid-cols-2 gap-3 pb-5">
            {MODES.map((mode) => {
              const isActive = activeTab === mode.key
              return (
                <button
                  key={mode.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(mode.key)}
                  className={`
                    group relative flex items-center gap-3 rounded-xl border-2 p-3.5
                    transition-all duration-300 ease-out text-left
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                    focus-visible:ring-slate-400
                    ${isActive
                      ? mode.activeWrap
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }
                  `}
                >
                  {/* 左侧图标圆角方块 */}
                  <span
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-lg
                      transition-all duration-300 shrink-0
                      ${isActive
                        ? mode.activeIcon
                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-500'
                      }
                    `}
                  >
                    <Icon name={mode.icon} size={20} />
                  </span>

                  {/* 右侧文字 */}
                  <span className="flex flex-col min-w-0">
                    <span
                      className={`
                        text-sm font-semibold transition-colors duration-300
                        ${isActive ? mode.activeTitle : 'text-slate-600'}
                      `}
                    >
                      {mode.label}
                    </span>
                    <span
                      className={`
                        text-xs mt-0.5 transition-colors duration-300 truncate
                        ${isActive ? mode.activeDesc : 'text-slate-400'}
                      `}
                    >
                      {mode.desc}
                    </span>
                  </span>

                  {/* 激活态：左侧竖条指示器 */}
                  {isActive && (
                    <motion.div
                      layoutId="mode-active-bar"
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-full ${mode.activeBar}`}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 内容区域 ── */}
        <div className="p-6 pt-0">
          {activeTab === 'transcription' && (
            <TranscriptionWorkspace onIngested={handleSwitchToLibrary} />
          )}
          {activeTab === 'library' && (
            <KnowledgeLibrary openDocId={openDocId} onOpenDocIdConsumed={() => setOpenDocId(null)} />
          )}
        </div>
      </Card>
    </PageContainer>
  )
}

export default SpeechKnowledgePage
