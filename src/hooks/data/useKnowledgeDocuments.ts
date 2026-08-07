/**
 * useKnowledgeDocuments — 知识库文档数据层（React Query）
 *
 * queryKey: ['knowledge-folder-documents', folderId]
 * 文件夹内文档列表（KnowledgeLibrary 按选中文件夹过滤时用）。
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  knowledgeFolderClient,
  type KnowledgeFolderDocument,
} from '@/services/knowledge-folders'

export function useFolderDocuments(folderId: number | null) {
  return useQuery({
    queryKey: ['knowledge-folder-documents', folderId],
    queryFn: async () => {
      const res = await knowledgeFolderClient.listFolderDocuments(folderId!, 1, 50)
      if (!res.success || !res.data) throw new Error(res.error || '获取文件夹文档失败')
      return res.data.data as KnowledgeFolderDocument[]
    },
    enabled: folderId != null,
    staleTime: 30_000,
  })
}

/** 文档归入/移出文件夹（白名单只收 folderId；成功后失效文件夹缓存） */
export function useAssignDocumentFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ documentId, folderId }: { documentId: number; folderId: number | null }) =>
      knowledgeFolderClient.assignDocumentFolder(documentId, folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-folders'] })
      qc.invalidateQueries({ queryKey: ['knowledge-folder-documents'] })
      qc.invalidateQueries({ queryKey: ['knowledge-documents'] })
    },
  })
}
