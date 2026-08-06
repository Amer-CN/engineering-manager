/**
 * ProjectKnowledgeTab — 项目知识库 Tab（M3-4）
 *
 * 按当前项目过滤的知识库文件夹 + 文档列表。
 * 不嵌 3D 轮播舞台（M3 评审补强 ⑤）：全部走 primary/slate 普通组件。
 */

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useKnowledgeFolders } from '@/hooks/data/useKnowledgeFolders'
import { useFolderDocuments } from '@/hooks/data/useKnowledgeDocuments'

interface ProjectKnowledgeTabProps {
  projectId: number
}

export const ProjectKnowledgeTab: React.FC<ProjectKnowledgeTabProps> = ({ projectId }) => {
  const { data: folders, isLoading } = useKnowledgeFolders(projectId)
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null)
  const { data: docs, isLoading: docsLoading } = useFolderDocuments(activeFolderId)

  return (
    <div className="space-y-4">
      {/* 项目文件夹列表 */}
      <Card padding="md" shadow="sm" title="项目文件夹">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[color:var(--muted)] py-6 justify-center">
            <Icon name="Loader2" size={16} className="animate-spin" />
            <span>加载中...</span>
          </div>
        ) : !folders || folders.length === 0 ? (
          <EmptyState icon="Library" title="该项目暂无知识库文件夹" description="在知识库首页可创建项目文件夹" />
        ) : (
          <div className="space-y-2">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFolderId(activeFolderId === f.id ? null : f.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  activeFolderId === f.id
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]'
                    : 'border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--panel-2)]'
                }`}
                aria-pressed={activeFolderId === f.id}
              >
                <Icon name="Folder" size={18} className="text-[color:var(--muted)] flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-[color:var(--fg-2)] truncate">{f.name}</span>
                  {f.englishName && (
                    <span className="block text-xs text-[color:var(--muted)] font-mono">{f.englishName}</span>
                  )}
                </span>
                <Badge variant="gray" size="sm">{f.docCount} 文档</Badge>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 选中文件夹的文档列表 */}
      {activeFolderId != null && (
        <Card padding="md" shadow="sm" title="文件夹文档">
          {docsLoading ? (
            <div className="flex items-center gap-2 text-sm text-[color:var(--muted)] py-6 justify-center">
              <Icon name="Loader2" size={16} className="animate-spin" />
              <span>加载中...</span>
            </div>
          ) : !docs || docs.length === 0 ? (
            <EmptyState icon="FileText" title="文件夹内暂无文档" description="可通过语音转写入库或知识库首页添加" />
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
                  <Icon name="FileText" size={16} className="text-[color:var(--muted)] flex-shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[color:var(--fg-2)] truncate">{d.title}</span>
                    <span className="block text-xs text-[color:var(--muted)] font-mono">{d.createdAt}</span>
                  </span>
                  {d.sourceType && <Badge variant="gray" size="sm">{d.sourceType}</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
