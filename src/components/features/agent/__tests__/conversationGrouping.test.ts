/**
 * conversationGrouping.test.ts — 分组纯逻辑测试
 * 归档/删除合并为单一「删除」后：分组只输出 置顶 / 进行中 两组。
 */

import { describe, test, expect } from 'vitest'
import { buildConversationGroups, getGroupKey } from '../conversationGrouping'
import type { AgentConversation } from '@/types/agent'

const now = new Date()
const yesterday = new Date(now.getTime() - 86400000)
const earlier = new Date(now.getTime() - 10 * 86400000)

const conv = (id: number, updatedAt: string, title = `对话${id}`): AgentConversation => ({
  id, title, createdAt: updatedAt, updatedAt, messageCount: 1,
})

const matchesAll = () => true

describe('conversationGrouping', () => {
  test('分组只输出 置顶/进行中 两组（不输出其他分组）', () => {
    const conversations = [
      conv(1, now.toISOString()),
      conv(2, yesterday.toISOString()),
      conv(3, earlier.toISOString()),
    ]
    const groups = buildConversationGroups(conversations, new Set([1]), matchesAll)

    // 只有两个字段：pinnedItems + groupedOngoing
    expect(Object.keys(groups).sort()).toEqual(['groupedOngoing', 'isAllEmpty', 'pinnedItems'])
    expect(groups.pinnedItems.map(c => c.id)).toEqual([1])
    expect(groups.groupedOngoing.map(g => g.key)).toEqual(['yesterday', 'earlier'])
    expect(groups.isAllEmpty).toBe(false)
  })

  test('日期分档：今天/昨天/近 7 天/更早', () => {
    expect(getGroupKey(now.toISOString())).toBe('today')
    expect(getGroupKey(yesterday.toISOString())).toBe('yesterday')
    expect(getGroupKey(new Date(now.getTime() - 3 * 86400000).toISOString())).toBe('week')
    expect(getGroupKey(earlier.toISOString())).toBe('earlier')
  })

  test('空列表 → isAllEmpty 为 true', () => {
    const groups = buildConversationGroups([], new Set(), matchesAll)
    expect(groups.pinnedItems).toHaveLength(0)
    expect(groups.groupedOngoing).toHaveLength(0)
    expect(groups.isAllEmpty).toBe(true)
  })
})
