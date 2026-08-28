import { describe, test, expect, beforeEach } from 'vitest'
import { isSfxEnabled, setSfxEnabled } from '../sfx'

describe('sfx 界面音效开关模块', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('默认（无 localStorage 键）= 开', () => {
    expect(isSfxEnabled()).toBe(true)
  })

  test('set false 后读取为关，且 localStorage 值为 0', () => {
    setSfxEnabled(false)
    expect(isSfxEnabled()).toBe(false)
    expect(localStorage.getItem('ui-sfx-enabled')).toBe('0')
  })

  test('set true 恢复为开，localStorage 值为 1', () => {
    setSfxEnabled(false)
    setSfxEnabled(true)
    expect(isSfxEnabled()).toBe(true)
    expect(localStorage.getItem('ui-sfx-enabled')).toBe('1')
  })
})
