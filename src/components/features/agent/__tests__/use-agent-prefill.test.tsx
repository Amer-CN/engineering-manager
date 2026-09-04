/**
 * use-agent-prefill.test.tsx — useAgentPrefill 预填通道测试（缺陷4）
 *
 *  - sessionStorage + plain Event（字符串路径）→ 替换草稿（向后兼容，其他页面调用方零影响）
 *  - CustomEvent 对象 detail { text, append: true } → 函数式追加（prev 非空 → prev+'\n\n'+text）
 *  - { text, append: true } 草稿为空 → 直接写入
 *  - { text } 无 append → 替换
 */

import React, { useState } from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAgentPrefill } from '../useAgentPrefill'

/** 测试挂载壳：内部 useState 模拟输入框草稿；value 同步到 ref + DOM，focus 计数 */
const Harness: React.FC<{
  valueRef: React.MutableRefObject<string>
  focusCountRef: React.MutableRefObject<number>
}> = ({ valueRef, focusCountRef }) => {
  const [value, setValue] = useState('')
  valueRef.current = value
  useAgentPrefill(setValue, () => { focusCountRef.current += 1 })
  return <div data-testid="draft">{value}</div>
}

const mountHarness = () => {
  const valueRef = { current: '' } as React.MutableRefObject<string>
  const focusCountRef = { current: 0 } as React.MutableRefObject<number>
  render(<Harness valueRef={valueRef} focusCountRef={focusCountRef} />)
  return { valueRef, focusCountRef }
}

const settle = () => {
  act(() => { vi.advanceTimersByTime(150) }) // focus 的 100ms 延迟
}

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  sessionStorage.clear()
})

describe('useAgentPrefill（缺陷4：追加模式 + 向后兼容）', () => {
  it('sessionStorage + plain Event（字符串路径）→ 替换草稿并清 sessionStorage（向后兼容）', () => {
    const { valueRef, focusCountRef } = mountHarness()
    sessionStorage.setItem('agent:prefill', '知识库问题')
    act(() => { window.dispatchEvent(new Event('agent:prefill')) })
    expect(valueRef.current).toBe('知识库问题')
    expect(sessionStorage.getItem('agent:prefill')).toBeNull()
    settle()
    expect(focusCountRef.current).toBe(1)
  })

  it('{ text, append: true } 草稿非空 → 追加 prev+\\n\\n+text（不覆盖草稿）', () => {
    const { valueRef, focusCountRef } = mountHarness()
    // 先用兼容通道造一个非空草稿
    sessionStorage.setItem('agent:prefill', '已有草稿')
    act(() => { window.dispatchEvent(new Event('agent:prefill')) })
    settle()
    expect(valueRef.current).toBe('已有草稿')

    act(() => {
      window.dispatchEvent(new CustomEvent('agent:prefill', { detail: { text: '选中文字', append: true } }))
    })
    expect(valueRef.current).toBe('已有草稿\n\n选中文字')
    settle()
    expect(focusCountRef.current).toBe(2)
  })

  it('{ text, append: true } 草稿为空 → 直接写入', () => {
    const { valueRef } = mountHarness()
    act(() => {
      window.dispatchEvent(new CustomEvent('agent:prefill', { detail: { text: '选中文字', append: true } }))
    })
    expect(valueRef.current).toBe('选中文字')
  })

  it('{ text } 无 append → 替换草稿', () => {
    const { valueRef } = mountHarness()
    sessionStorage.setItem('agent:prefill', '旧草稿')
    act(() => { window.dispatchEvent(new Event('agent:prefill')) })
    settle()
    act(() => {
      window.dispatchEvent(new CustomEvent('agent:prefill', { detail: { text: '新草稿' } }))
    })
    expect(valueRef.current).toBe('新草稿')
  })
})
