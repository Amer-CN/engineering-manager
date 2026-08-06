/**
 * VoiceTranscribePage 测试
 *
 * 真实渲染 VoiceTranscribePage 组件，验证：
 * 1. 默认直接渲染 TranscriptionWorkspace（语音转文字流水线）
 * 2. onIngested（转写完成入库）→ sessionStorage 写 pendingDocId + navigate 到知识库
 * 3. 无 docId 时不写 sessionStorage，但仍跳转知识库
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ═══════════════════════════════════════════════════════════════
// vi.hoisted — mock 对象
// ═══════════════════════════════════════════════════════════════

const { mockWorkspaceProps } = vi.hoisted(() => ({
  mockWorkspaceProps: { onIngested: null as ((docId?: number) => void) | null },
}))

// ═══════════════════════════════════════════════════════════════
// Mock modules
// ═══════════════════════════════════════════════════════════════

vi.mock('@/hooks/useToast', () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}))

// Mock TranscriptionWorkspace — 捕获 onIngested prop
vi.mock('../TranscriptionWorkspace', () => ({
  default: function MockTW(props: { onIngested?: (docId?: number) => void }) {
    mockWorkspaceProps.onIngested = props.onIngested ?? null
    return React.createElement('div', { 'data-testid': 'tw' }, '语音转写流水线')
  },
}))

// ═══════════════════════════════════════════════════════════════
// sessionStorage mock
// ═══════════════════════════════════════════════════════════════

const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

// ═══════════════════════════════════════════════════════════════
// Import component after mocks
// ═══════════════════════════════════════════════════════════════

import VoiceTranscribePage from '../VoiceTranscribePage'

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('VoiceTranscribePage', () => {
  let navigateSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorageMock.clear()
    vi.clearAllMocks()
    mockWorkspaceProps.onIngested = null
    // 捕获 window navigate 事件（与 App.tsx 的监听机制一致）
    navigateSpy = vi.fn()
    window.addEventListener('navigate', navigateSpy as EventListener)
  })

  afterEach(() => {
    window.removeEventListener('navigate', navigateSpy as EventListener)
  })

  it('renders TranscriptionWorkspace by default', () => {
    render(<VoiceTranscribePage />)
    expect(screen.getByTestId('tw')).toBeInTheDocument()
  })

  it('passes onIngested callback to TranscriptionWorkspace', () => {
    render(<VoiceTranscribePage />)
    expect(typeof mockWorkspaceProps.onIngested).toBe('function')
  })

  it('onIngested(docId) → writes pendingDocId + navigates to knowledge', () => {
    render(<VoiceTranscribePage />)

    mockWorkspaceProps.onIngested?.(42)

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('knowledge:pendingDocId', '42')
    expect(navigateSpy).toHaveBeenCalledTimes(1)
    const event = navigateSpy.mock.calls[0][0] as CustomEvent
    expect(event.detail).toBe('knowledge')
  })

  it('onIngested() without docId → navigates to knowledge without writing sessionStorage', () => {
    render(<VoiceTranscribePage />)

    mockWorkspaceProps.onIngested?.()

    expect(sessionStorageMock.setItem).not.toHaveBeenCalled()
    expect(navigateSpy).toHaveBeenCalledTimes(1)
    const event = navigateSpy.mock.calls[0][0] as CustomEvent
    expect(event.detail).toBe('knowledge')
  })
})
