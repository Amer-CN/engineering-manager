/**
 * useAtSource — AgentComposer 的 @ 数据来源菜单状态机（行数门禁拆分件）
 *
 * 触发：草稿末尾存在「(^|\s)@词头」（detectAtToken）；↑↓ 循环、Enter 选中、
 * Esc 关闭（临时屏蔽，直到词头变化）；选中把 @token 替换为「@key 」。
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject, KeyboardEvent } from 'react'
import { detectAtToken, filterAtSources, insertAtSource } from './AtSourceMenu'
import type { AtSource } from './AtSourceMenu'

interface UseAtSourceOptions {
  value: string
  onChange: (v: string) => void
  textareaRef: RefObject<HTMLTextAreaElement>
  /** 斜杠菜单开启时 @ 菜单让位 */
  suspended?: boolean
}

export function useAtSource({ value, onChange, textareaRef, suspended = false }: UseAtSourceOptions) {
  const token = useMemo(() => detectAtToken(value), [value])
  const query = token?.query ?? null
  const [dismissed, setDismissed] = useState(false)
  const [index, setIndex] = useState(0)
  const items = useMemo(() => (token ? filterAtSources(token.query) : []), [token])
  const open = !!token && !dismissed && !suspended && items.length > 0
  const activeIndex = items.length === 0 ? 0 : Math.min(index, items.length - 1)

  // 词头变化（含清空）→ 解除 Esc 屏蔽并归零高亮
  useEffect(() => {
    setDismissed(false)
    setIndex(0)
  }, [query])

  const select = useCallback(
    (s: AtSource) => {
      if (!token) return
      onChange(insertAtSource(value, token.tokenStart, s.key))
      window.setTimeout(() => {
        const el = textareaRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }, 0)
    },
    [token, value, onChange, textareaRef],
  )

  /** textarea keydown 前置处理；返回 true = 事件已被菜单消费（不再触发发送） */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!open || items.length === 0) return false
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndex((i) => (i + 1) % items.length)
        return true
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndex((i) => (i - 1 + items.length) % items.length)
        return true
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        select(items[Math.min(index, items.length - 1)])
        return true
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setDismissed(true)
        return true
      }
      return false
    },
    [open, items, index, select],
  )

  return { open, items, activeIndex, select, handleKeyDown, setIndex }
}
