/**
 * useActiveLlmModel — 当前生效 LLM 配置（React Query）
 *
 * queryKey: ['llm', 'active-model']
 * 包装 getLlmProviderConfig()：失败静默返回 null（不抛错）。
 * 供无模型选择器的 AI 功能（报告生成 / 文秘）展示「当前模型」小字用。
 */

import { useQuery } from '@tanstack/react-query'
import { getLlmProviderConfig } from '@/services/agent-client'

export function useActiveLlmModel() {
  return useQuery({
    queryKey: ['llm', 'active-model'],
    queryFn: async () => {
      try {
        return await getLlmProviderConfig()
      } catch {
        return null
      }
    },
    staleTime: 30_000,
  })
}
