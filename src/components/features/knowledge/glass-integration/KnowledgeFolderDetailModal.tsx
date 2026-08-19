/**
 * KnowledgeFolderDetailModal — 文件夹详情弹窗（真实库只读适配）
 *
 * 原版 FolderDetailModal 的能力（新建/删除文档、状态勾选编辑）依赖前端文件夹内
 * documents 列表，后端无状态字段、文档由语音转写/Agent 归入。本适配层：
 *   1. 打开时按 folder.id 调 listFolderDocuments 拉取真实文档
 *   2. 映射为原版 DocumentItem（title/createdAt/sourceType 展示）
 *   3. 以 readonly 模式渲染原版弹窗（隐藏新建/删除/状态勾选编辑）
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { knowledgeFolderClient, type KnowledgeFolderDocument } from '@/services/knowledge-folders'
import { FolderDetailModal } from './FolderDetailModal'
import type { FolderItem, DocumentItem } from './types'

interface KnowledgeFolderDetailModalProps {
  folder: FolderItem | null
  isOpen: boolean
  onClose: () => void
  theme?: 'dark' | 'light'
}

const toDocumentItem = (d: KnowledgeFolderDocument): DocumentItem => ({
  id: String(d.id),
  title: d.title,
  code: d.sourceType || '文档',
  priority: '中',
  status: '进行中',
  date: d.createdAt,
  assignee: '',
})

export const KnowledgeFolderDetailModal: React.FC<KnowledgeFolderDetailModalProps> = ({
  folder,
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const folderId = folder ? Number(folder.id) : null

  const { data } = useQuery({
    queryKey: ['knowledge-folder-documents', folderId],
    queryFn: async () => {
      if (folderId == null) throw new Error('缺少文件夹 ID')
      return knowledgeFolderClient.listFolderDocuments(folderId)
    },
    enabled: isOpen && folderId != null,
    staleTime: 30_000,
  })

  const docs: DocumentItem[] = (data?.success ? data.data?.data ?? [] : []).map(toDocumentItem)
  const merged: FolderItem | null = folder ? { ...folder, documents: docs } : null

  return (
    <FolderDetailModal
      folder={merged}
      isOpen={isOpen}
      onClose={onClose}
      onUpdateFolder={() => {}}
      theme={theme}
      readonly
    />
  )
}