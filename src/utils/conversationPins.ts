/**
 * conversationPins — 对话置顶列表的 localStorage 读写封装
 *
 * 项目红线「组件不得直接操作 localStorage」，ConversationHistory 一律经由本模块读写。
 * 存储格式：key 'agent:pinned-conversations'，value 为 JSON number[]（对话 id）。
 */

const STORAGE_KEY = 'agent:pinned-conversations'

/** 读取置顶对话 id 列表（解析失败/未存储返回空数组） */
export function getPinnedConversationIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : []
  } catch {
    return []
  }
}

/** 写入置顶对话 id 列表（隐私模式写失败静默忽略） */
export function setPinnedConversationIds(ids: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch { /* 隐私模式忽略 */ }
}
