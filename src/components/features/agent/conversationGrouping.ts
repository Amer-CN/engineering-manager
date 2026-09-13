/**
 * conversationGrouping — 对话历史的分组纯逻辑
 * 从 ConversationHistory.tsx 抽出（CI 行数门禁拆分）：日期分档（今天/昨天/近 7 天/更早）、
 * 置顶/进行中 两组数据准备。
 */

import type { AgentConversation } from '@/types/agent'

export type GroupKey = 'today' | 'yesterday' | 'week' | 'earlier'

export const GROUP_LABELS: Record<GroupKey, string> = {
  today: '今天', yesterday: '昨天', week: '近 7 天', earlier: '更早',
}

export const GROUP_ORDER: GroupKey[] = ['today', 'yesterday', 'week', 'earlier']

/** 按更新时间归入四档 */
export function getGroupKey(iso: string): GroupKey {
  const d = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = d.getTime()
  if (t >= startOfToday) return 'today'
  if (t >= startOfToday - 86400000) return 'yesterday'
  if (t >= startOfToday - 7 * 86400000) return 'week'
  return 'earlier'
}

export interface ConversationGroups {
  pinnedItems: AgentConversation[]
  groupedOngoing: { key: GroupKey; label: string; items: AgentConversation[] }[]
  isAllEmpty: boolean
}

/** 由会话列表 + 置顶集合 + 搜索词准备两组数据（置顶 / 进行中按日期分档） */
export function buildConversationGroups(
  conversations: AgentConversation[],
  pinnedSet: Set<number>,
  matchesQuery: (c: AgentConversation) => boolean,
): ConversationGroups {
  const pinnedItems = conversations.filter(
    c => pinnedSet.has(c.id) && matchesQuery(c),
  )

  const ongoing = conversations.filter(
    c => !pinnedSet.has(c.id) && matchesQuery(c),
  )
  const map = new Map<GroupKey, AgentConversation[]>()
  for (const conv of ongoing) {
    const key = getGroupKey(conv.updatedAt)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(conv)
  }
  const groupedOngoing = GROUP_ORDER.filter(k => map.has(k)).map(k => ({
    key: k, label: GROUP_LABELS[k], items: map.get(k)!,
  }))

  const ongoingCount = pinnedItems.length + groupedOngoing.reduce((n, g) => n + g.items.length, 0)
  return {
    pinnedItems, groupedOngoing,
    isAllEmpty: ongoingCount === 0,
  }
}
