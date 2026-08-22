/**
 * KnowledgeHomePage — 知识库首页（整页 = 参考项目原版全屏轮播布局）
 *
 * 用户拍板：以参考项目 demo 页为基础，不做旧集成修补。本轮：
 *   - 壳裁剪：无 WB 头部/看板/主题按钮/底部页脚条，页面 = 应用壳 + 全屏轮播舞台
 *   - 三主题真适配：代码在 KnowledgeCarouselStage（graphite→dark、sandstone/white→light，
 *     舞台背景用 --bg token，纸面由 .gc-stage-iso 隔离重置）
 *   - 数据真实：folders 来自 useKnowledgeFolders；AddFolderModal → createKnowledgeFolder
 *     真实入库；详情弹窗 → listFolderDocuments 只读展示
 *   - 空态：EmptyState + knowledge:create 门控新建
 *   - KnowledgeLibrary 保留在代码中不再渲染（文档浏览走详情弹窗）
 */

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToastContext } from '@/hooks/useToast'
import { usePermission } from '@/hooks/usePermission'
import { useTheme } from '@/hooks/useTheme'
import { useKnowledgeFolders, useCreateKnowledgeFolder } from '@/hooks/data/useKnowledgeFolders'
import type { KnowledgeFolder } from '@/services/knowledge-folders'
import { KnowledgeCarouselStage } from './glass-integration/KnowledgeCarouselStage'
import { KnowledgeFolderDetailModal } from './glass-integration/KnowledgeFolderDetailModal'
import { AddFolderModal } from './glass-integration/AddFolderModal'
import type { FolderItem } from './glass-integration/types'

/** API 文件夹 → 参考项目 FolderItem（progress 占位保留（旧看板 UI 引用）；徽章完成度已改真实文档数（S1）） */
const toFolderItem = (f: KnowledgeFolder): FolderItem => ({
  id: String(f.id),
  title: f.name,
  englishTitle: f.englishName ?? undefined,
  period: f.category ?? '知识库',
  progress: 60,               // 保留字段（看板甘特图等旧 UI 仍引用），徽章不再用它
  memberCount: f.docCount,
  docCount: f.docCount,
  lastActivityAt: f.lastActivityAt ?? null,
  category: f.category ?? '知识库',
  documents: [],
})

const KnowledgeHomePage: React.FC = () => {
  const { showToast } = useToastContext()
  const { can } = usePermission()
  const { scheme } = useTheme()

  // ── 数据：全部文件夹（跨项目通用；原版布局无筛选条）──
  const { data: folders, isLoading } = useKnowledgeFolders()
  const [items, setItems] = useState<FolderItem[]>([])
  useEffect(() => {
    if (folders) setItems(folders.map(toFolderItem))
  }, [folders])

  // ── 新建文件夹（knowleadge 门控；AddFolderModal 原版交互）──
  const [showCreate, setShowCreate] = useState(false)
  const createFolder = useCreateKnowledgeFolder()

  // ── 详情弹窗目标 ──
  const [detailFolder, setDetailFolder] = useState<FolderItem | null>(null)

  // 三主题映射（弹窗同源）：graphite → dark；sandstone/white → light
  const carouselTheme: 'dark' | 'light' = scheme === 'graphite' ? 'dark' : 'light'

  const handleCreateFolder = async (item: FolderItem) => {
    const res = await createFolder.mutateAsync({
      name: item.title,
      englishName: item.englishTitle || null,
      category: item.category,
    })
    if (!res.success) {
      showToast(res.error || '创建失败', 'error')
      return
    }
    // 入库成功 → 本地立即补一张卡（refetch 后与服务端一致）
    setItems((prev) => [
      { ...item, id: String(res.data?.id ?? item.id), documents: [] },
      ...prev,
    ])
    showToast('文件夹已创建', 'success')
  }

  return (
    <div className="w-full" style={{ background: 'var(--bg)' }}>
      {/* 页头已删（用户拍板：砍掉上部空间，页面一屏到底） */}
      {isLoading ? (
        <div className="px-6 mx-auto max-w-[1600px]">
        <Card padding="lg" shadow="sm">
          <div className="flex items-center gap-2 text-sm py-10 justify-center" style={{ color: 'var(--muted)' }}>
            <Icon name="Loader2" size={16} className="animate-spin" />
            <span>加载文件夹中...</span>
          </div>
        </Card>
        </div>
      ) : items.length > 0 ? (
        <KnowledgeCarouselStage
          folders={items}
          onOpenDetail={(f) => setDetailFolder(f)}
          onAddFolder={can('knowledge:create') ? () => setShowCreate(true) : undefined}
        />
      ) : (
        <div className="px-6 mx-auto max-w-[1600px]">
        <Card padding="lg" shadow="sm">
          <EmptyState
            icon="Library"
            title="知识库为空"
            description="创建文件夹后，可通过语音转写入库或手动添加文档"
            action={
              can('knowledge:create') ? (
                <Button variant="primary" size="sm" leftIcon="FolderPlus" onClick={() => setShowCreate(true)}>
                  新建文件夹
                </Button>
              ) : undefined
            }
          />
        </Card>
        </div>
      )}

      {/* 新建文件夹（原版弹窗 → 真实入库） */}
      <AddFolderModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onAddFolder={handleCreateFolder}
        theme={carouselTheme}
      />

      {/* 详情弹窗（真实文档只读展示） */}
      <KnowledgeFolderDetailModal
        folder={detailFolder}
        isOpen={detailFolder != null}
        onClose={() => setDetailFolder(null)}
        theme={carouselTheme}
      />
    </div>
  )
}

export default KnowledgeHomePage