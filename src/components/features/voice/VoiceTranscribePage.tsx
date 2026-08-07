/**
 * VoiceTranscribePage — 语音转文字主页面
 *
 * 录音/上传 → AI 转写 → 校对 → 存入知识库
 * （语音转文字是知识库的"进货渠道"：转写完成的稿子一键存入知识库）
 */

import React, { useCallback } from 'react'
import PageContainer from '@/components/ui/PageContainer'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import TranscriptionWorkspace from './TranscriptionWorkspace'

const VoiceTranscribePage: React.FC = () => {
  // 转写完成入库后 → 跳转知识库并打开该文档（与 KnowledgeSourceCard 同款 sessionStorage 机制）
  const handleIngested = useCallback((docId?: number) => {
    if (docId != null) sessionStorage.setItem('knowledge:pendingDocId', String(docId))
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'knowledge' }))
  }, [])

  return (
    <PageContainer maxWidth="wide">
      <Card padding="none" shadow="md" className="overflow-hidden">
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg shadow-sm" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
              <Icon name="Mic" size={16} />
            </span>
            <h1 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">语音转文字</h1>
          </div>
          <p className="text-sm text-[color:var(--muted)] mb-4 pl-[38px]">录音 · 上传 · AI 转写 · 校对入库</p>
        </div>

        {/* ── 内容区域 ── */}
        <div className="p-6 pt-0">
          <TranscriptionWorkspace onIngested={handleIngested} />
        </div>
      </Card>
    </PageContainer>
  )
}

export default VoiceTranscribePage
