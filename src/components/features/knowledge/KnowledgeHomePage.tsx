/**
 * KnowledgeHomePage — 知识库首页
 *
 * M2：3D 玻璃文件夹轮播舞台（glass/ 组件树，演示数据）+
 * 下方文档库与检索（KnowledgeLibrary，既有能力零回退）。
 * M3：接入真实知识库 API、项目筛选与详情联动。
 */

import React, { useState, useEffect } from 'react'
import PageContainer from '@/components/ui/PageContainer'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { GlassCarousel } from './glass/GlassCarousel'
import KnowledgeLibrary from './KnowledgeLibrary'

const KnowledgeHomePage: React.FC = () => {
  const [openDocId, setOpenDocId] = useState<number | null>(null)

  // 挂载时检查是否有来自 Agent 来源卡片 / 语音转写入库的 pendingDocId（可靠机制，不依赖事件时序）
  useEffect(() => {
    const pending = sessionStorage.getItem('knowledge:pendingDocId')
    if (pending) {
      sessionStorage.removeItem('knowledge:pendingDocId')
      const docId = parseInt(pending, 10)
      if (!isNaN(docId)) setOpenDocId(docId)
    }
  }, [])

  return (
    <PageContainer maxWidth="wide">
      {/* ── 3D 玻璃文件夹轮播舞台（Stage-Surface 授权区）── */}
      <GlassCarousel />

      {/* ── 文档库与检索（零回退）── */}
      <Card padding="none" shadow="md" className="overflow-hidden">
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg shadow-sm" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
              <Icon name="Library" size={16} />
            </span>
            <h1 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">知识库</h1>
          </div>
          <p className="text-sm text-[color:var(--muted)] mb-4 pl-[38px]">文档资料库与知识检索</p>
        </div>

        <div className="p-6 pt-0">
          <KnowledgeLibrary openDocId={openDocId} onOpenDocIdConsumed={() => setOpenDocId(null)} />
        </div>
      </Card>
    </PageContainer>
  )
}

export default KnowledgeHomePage
