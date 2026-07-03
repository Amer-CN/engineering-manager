/**
 * Agent 建议卡片配置 — 从 AgentDashboard 抽出，控制文件行数
 */

import type { SuggestionCardConfig } from '@/types/agent'

export const allSuggestions: SuggestionCardConfig[] = [
  { icon: 'FolderKanban', title: '项目概况', prompt: '帮我总结一下目前所有项目的状态', requiredPermission: 'projects:read', color: 'blue' },
  { icon: 'Receipt', title: '发票待办', prompt: '有哪些发票需要付款？', requiredPermission: 'invoices:read', color: 'amber' },
  { icon: 'ClipboardList', title: '结算进度', prompt: '最近的结算办理情况如何？', requiredPermission: 'settlement:read', color: 'emerald' },
  { icon: 'Users', title: '团队成员', prompt: '我们有多少员工和工人？', requiredPermission: 'hr:read', color: 'violet' },
  { icon: 'Package', title: '库存物料', prompt: '仓库里有哪些物料？', requiredPermission: 'inventory:read', color: 'orange' },
  { icon: 'DollarSign', title: '成本分析', prompt: '帮我分析一下成本支出情况', requiredPermission: 'costLedger:read', color: 'rose' },
]

/** 按权限过滤建议卡片 */
export function getFilteredSuggestions(
  can: (code: any) => boolean,
): SuggestionCardConfig[] {
  return allSuggestions.filter(
    (s) => !s.requiredPermission || can(s.requiredPermission as any),
  )
}
