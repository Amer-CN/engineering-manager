/**
 * KnowledgeHomePage — 知识库首页
 *
 * M3：真实数据打通——
 *   - 3D 轮播接 useKnowledgeFolders（支持项目筛选）
 *   - 空态：EmptyState + knowledge:create 门控的「新建文件夹」
 *   - 下方文档库与检索（KnowledgeLibrary，既有能力零回退）
 * M2 演示数据已下线（demoData.ts 删除）。
 */

import React, { useState, useEffect } from 'react'
import PageContainer from '@/components/ui/PageContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToastContext } from '@/hooks/useToast'
import { usePermission } from '@/hooks/usePermission'
import { useProjects } from '@/hooks/data/useProjects'
import { useKnowledgeFolders, useCreateKnowledgeFolder } from '@/hooks/data/useKnowledgeFolders'
import { KnowledgeCarouselStage } from './glass-integration/KnowledgeCarouselStage'
import KnowledgeLibrary from './KnowledgeLibrary'

const KnowledgeHomePage: React.FC = () => {
  const { showToast } = useToastContext()
  const { can } = usePermission()
  const [openDocId, setOpenDocId] = useState<number | null>(null)

  // ── 项目筛选（null = 全部，含跨项目通用资料）──
  const [projectId, setProjectId] = useState<number | null>(null)
  const { data: projects } = useProjects()
  const { data: folders, isLoading } = useKnowledgeFolders(projectId ?? undefined)

  // ── 新建文件夹 ──
  const [showCreate, setShowCreate] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const createFolder = useCreateKnowledgeFolder()

  // 挂载时检查是否有来自 Agent 来源卡片 / 语音转写入库的 pendingDocId（可靠机制，不依赖事件时序）
  useEffect(() => {
    const pending = sessionStorage.getItem('knowledge:pendingDocId')
    if (pending) {
      sessionStorage.removeItem('knowledge:pendingDocId')
      const docId = parseInt(pending, 10)
      if (!isNaN(docId)) setOpenDocId(docId)
    }
  }, [])



  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) {
      showToast('文件夹名称不能为空', 'error')
      return
    }
    const res = await createFolder.mutateAsync({ name, projectId })
    if (res.success) {
      showToast('文件夹已创建', 'success')
      setShowCreate(false)
      setNewFolderName('')
    } else {
      showToast(res.error || '创建失败', 'error')
    }
  }

  return (
    <PageContainer maxWidth="wide">
      {/* ── 项目筛选 + 新建（primary/slate 普通组件，非舞台区）── */}
      <Card padding="md" shadow="sm" className="mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[color:var(--muted)]">项目筛选</span>
            <select
              value={projectId ?? ''}
              onChange={(e) => setProjectId(e.target.value === '' ? null : Number(e.target.value))}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
              aria-label="按项目筛选文件夹"
            >
              <option value="">全部项目（含跨项目通用）</option>
              {(projects ?? []).map((p: { id: number; name: string }) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {can('knowledge:create') && (
            <Button variant="primary" size="sm" leftIcon="FolderPlus" onClick={() => setShowCreate(true)}>
              新建文件夹
            </Button>
          )}
        </div>
      </Card>

      {/* ── 3D 玻璃文件夹轮播舞台（Stage-Surface 授权区；空态 → EmptyState + 新建）── */}
      {isLoading ? (
        <Card padding="lg" shadow="sm" className="mb-4">
          <div className="flex items-center gap-2 text-sm text-[color:var(--muted)] py-8 justify-center">
            <Icon name="Loader2" size={16} className="animate-spin" />
            <span>加载文件夹中...</span>
          </div>
        </Card>
      ) : (folders ?? []).length > 0 ? (
        <KnowledgeCarouselStage folders={folders ?? []} />
      ) : (
        <Card padding="lg" shadow="sm" className="mb-4">
          <EmptyState
            icon="Library"
            title="知识库为空"
            description="创建文件夹后，可通过语音转写入库或手动添加文档"
            action={can('knowledge:create') ? (
              <Button variant="primary" size="sm" leftIcon="FolderPlus" onClick={() => setShowCreate(true)}>
                新建文件夹
              </Button>
            ) : undefined}
          />
        </Card>
      )}

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

      {/* ── 新建文件夹弹窗 ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>新建文件夹</DialogTitle>
          <DialogDescription>
            {projectId != null ? '新文件夹将归属当前筛选的项目' : '新建跨项目通用资料文件夹'}
          </DialogDescription>
          <div className="space-y-4 pt-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="文件夹名称（如：安全生产资料）"
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => setShowCreate(false)}>取消</Button>
              <Button variant="primary" size="md" loading={createFolder.isPending} onClick={handleCreateFolder}>
                创建
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

export default KnowledgeHomePage
