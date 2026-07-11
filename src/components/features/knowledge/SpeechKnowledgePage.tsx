/**
 * SpeechKnowledgePage — 语音知识库主页面
 *
 * 一个入口、两个一级 Tab：
 * 1. 录音转写
 * 2. 知识库
 */

import React, { useState, useCallback, useEffect } from 'react'
import PageContainer from '@/components/ui/PageContainer'
import { Tabs } from '@/components/ui/Tabs'
import { Card } from '@/components/ui/Card'
import TranscriptionWorkspace from './TranscriptionWorkspace'
import KnowledgeLibrary from './KnowledgeLibrary'

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
        <div className="px-6 pt-5 pb-0">
          <h1 className="text-xl font-bold text-slate-800 mb-1">语音知识库</h1>
          <p className="text-sm text-slate-500 mb-4">录音转写 · 校对 · 入库 · 检索</p>
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              { key: 'transcription', label: '录音转写', icon: 'FileText' },
              { key: 'library', label: '知识库', icon: 'Library' },
            ]}
            fullWidth
            size="md"
          />
        </div>
        <div className="p-6">
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
