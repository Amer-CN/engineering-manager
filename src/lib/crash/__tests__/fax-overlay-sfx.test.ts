import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FaxOverlayDeps } from '../fax-overlay'

/**
 * fax-overlay 音效门控测试
 * ──────────────────────────
 * 走真实 sfx 模块（localStorage 控制开关），stub 全局 AudioContext。
 * 每次测试用 vi.resetModules() + 动态 import 拿到全新 fax-overlay 模块实例，
 * 避免 waPredecoded 等模块级状态在用例间串扰。
 */

class FakeAudioContext {
  state = 'running'
  destination = {}
  decodeAudioData = vi.fn()
  resume = vi.fn().mockResolvedValue(undefined)
  createGain() {
    const node = { gain: { value: 0 }, connect: vi.fn() }
    node.connect.mockImplementation(() => node)
    return node
  }
  createWaveShaper() {
    return { curve: null, oversample: 'none' }
  }
}

const AudioContextSpy = vi.fn(function () {
  return new FakeAudioContext()
})

const payload = {
  kind: 'unhandled',
  message: 'test crash',
  stack: 'at fn (file.ts:1:1)',
  version: '0.0.0-test',
  os: 'Windows',
  arch: 'x64',
  language: 'zh-CN',
}

const deps: FaxOverlayDeps = {
  send: async () => true,
  computeNumber: async () => 'R-ABCD1234',
  copyText: () => 'copy',
  onClosed: () => {},
}

async function loadShowFaxOverlay() {
  vi.resetModules()
  const mod = await import('../fax-overlay')
  return mod.showFaxOverlay
}

describe('fax-overlay 音效门控', () => {
  beforeEach(() => {
    localStorage.clear()
    AudioContextSpy.mockClear()
    vi.stubGlobal('AudioContext', AudioContextSpy)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('音效关闭：不创建 AudioContext，传真机 DOM 照常挂载', async () => {
    localStorage.setItem('ui-sfx-enabled', '0')
    const show = await loadShowFaxOverlay()
    const handle = show(payload, 'dup-off', deps)
    expect(AudioContextSpy).not.toHaveBeenCalled()
    expect(document.querySelector('.crash-fax')).toBeTruthy()
    handle.tearDown()
  })

  test('音效开启（默认）：showFaxOverlay 创建 AudioContext', async () => {
    const show = await loadShowFaxOverlay()
    const handle = show(payload, 'dup-on', deps)
    expect(AudioContextSpy).toHaveBeenCalledTimes(1)
    handle.tearDown()
  })
})
