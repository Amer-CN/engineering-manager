/**
 * useKnowledgeFolders — 知识库文件夹数据层（React Query）
 *
 * queryKey: ['knowledge-folders', projectId]（projectId 为空 = 全部）
 * 轮播首页 / 项目筛选共用；M3 起替代 demoData。
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  knowledgeFolderClient,
  type KnowledgeFolder,
} from '@/services/knowledge-folders'

export function useKnowledgeFolders(projectId?: number) {
  return useQuery({
    queryKey: ['knowledge-folders', projectId ?? null],
    queryFn: async () => {
      const res = await knowledgeFolderClient.listKnowledgeFolders(projectId)
      if (!res.success || !res.data) throw new Error(res.error || '获取文件夹失败')
      return res.data as KnowledgeFolder[]
    },
    staleTime: 30_000,
  })
}

/** 建文件夹（成功后失效列表缓存） */
export function useCreateKnowledgeFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; englishName?: string | null; projectId?: number | null; category?: string | null }) =>
      knowledgeFolderClient.createKnowledgeFolder(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-folders'] })
    },
  })
}
