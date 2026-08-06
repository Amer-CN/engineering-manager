/**
 * KnowledgeHomePage 集成测试
 *
 * 真实渲染 KnowledgeHomePage 组件，验证：
 * 1. sessionStorage pendingDocId 消费 → 传入 openDocId 给 KnowledgeLibrary
 * 2. 无 pendingDocId 时正常渲染知识库
 * 3. 恶意 HTML 防护（XSS）— 通过真实渲染 KnowledgeDocumentDrawer 验证
 * 4. MaskContext 脱敏联动
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// ═══════════════════════════════════════════════════════════════
// vi.hoisted — mock 对象
// ═══════════════════════════════════════════════════════════════

const { mockMaskState, lastLibraryProps } = vi.hoisted(() => ({
  mockMaskState: { masked: false },
  lastLibraryProps: { openDocId: null as number | null, onOpenDocIdConsumed: null as (() => void) | null },
}))

// ═══════════════════════════════════════════════════════════════
// Mock modules
// ═══════════════════════════════════════════════════════════════

vi.mock('@/contexts/MaskContext', () => ({
  useMask: () => ({
    masked: mockMaskState.masked,
    setMasked: vi.fn((v: boolean) => { mockMaskState.masked = v }),
    toggleMask: vi.fn(),
    isSyncing: false,
    isHydrated: true,
  }),
}))

vi.mock('@/hooks/useToast', () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}))

// Mock framer-motion — 避免 heavy animation
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props as Record<string, unknown>
      return React.createElement('div', rest, children as React.ReactNode)
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) =>
    React.createElement(React.Fragment, null, children),
}))

// createPortal mock — render inline instead of portal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return { ...actual, createPortal: (node: React.ReactNode) => node }
})

// Mock KnowledgeLibrary — 捕获 openDocId prop
vi.mock('../KnowledgeLibrary', () => ({
  default: function MockKL(props: { openDocId?: number | null; onOpenDocIdConsumed?: () => void }) {
    lastLibraryProps.openDocId = props.openDocId ?? null
    lastLibraryProps.onOpenDocIdConsumed = props.onOpenDocIdConsumed ?? null
    return React.createElement('div', { 'data-testid': 'kl' },
      `知识库(openDocId=${props.openDocId ?? 'null'})`)
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
// Import components after mocks
// ═══════════════════════════════════════════════════════════════

import KnowledgeHomePage from '../KnowledgeHomePage'
import KnowledgeDocumentDrawer from '../KnowledgeDocumentDrawer'

// ═══════════════════════════════════════════════════════════════
// Tests: KnowledgeHomePage sessionStorage 消费
// ═══════════════════════════════════════════════════════════════

describe('KnowledgeHomePage — sessionStorage consumption', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    vi.clearAllMocks()
    mockMaskState.masked = false
    lastLibraryProps.openDocId = null
    lastLibraryProps.onOpenDocIdConsumed = null
  })

  it('consumes pendingDocId from sessionStorage → passes openDocId to KnowledgeLibrary', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '42')

    render(<KnowledgeHomePage />)

    expect(sessionStorageMock.getItem).toHaveBeenCalledWith('knowledge:pendingDocId')
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('knowledge:pendingDocId')

    // 渲染知识库，openDocId=42 应传入 KnowledgeLibrary
    await waitFor(() => {
      expect(screen.getByTestId('kl')).toBeInTheDocument()
    })
    expect(lastLibraryProps.openDocId).toBe(42)
  })

  it('removes pendingDocId after consumption (one-time only)', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '99')

    render(<KnowledgeHomePage />)

    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('knowledge:pendingDocId')
  })

  it('does not consume when sessionStorage is empty → renders library normally', async () => {
    render(<KnowledgeHomePage />)

    expect(sessionStorageMock.removeItem).not.toHaveBeenCalledWith('knowledge:pendingDocId')
    expect(screen.getByTestId('kl')).toBeInTheDocument()
    expect(lastLibraryProps.openDocId).toBeNull()
  })

  it('ignores invalid (NaN) pendingDocId', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', 'abc')

    render(<KnowledgeHomePage />)

    // removeItem 仍被调用（清除无效值）
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('knowledge:pendingDocId')
    // NaN 被忽略：不传 openDocId
    expect(screen.getByTestId('kl')).toBeInTheDocument()
    expect(lastLibraryProps.openDocId).toBeNull()
  })

  it('passes openDocId when valid pendingDocId present', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '55')

    render(<KnowledgeHomePage />)

    await waitFor(() => {
      expect(screen.getByTestId('kl')).toBeInTheDocument()
    })
    expect(lastLibraryProps.openDocId).toBe(55)
  })

  it('pendingDocId consumed once — re-render does not re-consume', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '77')

    const { rerender } = render(<KnowledgeHomePage />)

    await waitFor(() => {
      expect(screen.getByTestId('kl')).toBeInTheDocument()
    })

    const removeCallsBefore = sessionStorageMock.removeItem.mock.calls.length
    rerender(<KnowledgeHomePage />)
    expect(sessionStorageMock.removeItem.mock.calls.length).toBe(removeCallsBefore)
  })

  it('passes onOpenDocIdConsumed callback to KnowledgeLibrary', async () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '42')

    render(<KnowledgeHomePage />)

    await waitFor(() => {
      expect(screen.getByTestId('kl')).toBeInTheDocument()
    })
    expect(typeof lastLibraryProps.onOpenDocIdConsumed).toBe('function')
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: XSS 防护
// ═══════════════════════════════════════════════════════════════

describe('XSS prevention — KnowledgeDocumentDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMaskState.masked = false
  })

  it('escapes malicious HTML in document fullText', async () => {
    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>'

    const { container } = render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: 'XSS 测试', sourceType: 'call',
          fullText: xssPayload,
          chunks: [{ id: 1, index: 0, text: '<script>alert(1)</script>' }],
          chunkCount: 1, createdAt: '2026-07-01',
        },
        loading: false, masked: false, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText('XSS 测试')).toBeInTheDocument() })

    // 没有实际 script 标签
    expect(container.querySelectorAll('script').length).toBe(0)
    // 没有 onerror 的 img
    expect(container.querySelectorAll('img[onerror]').length).toBe(0)
    // 文本被转义
    expect(container.innerHTML).toContain('&lt;script&gt;')
  })

  it('escapes malicious HTML in chunk text', async () => {
    const { container } = render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '测试', sourceType: 'call',
          fullText: '正常文本',
          chunks: [{ id: 1, index: 0, text: '<img src=x onerror=alert("xss")>' }],
          chunkCount: 1, createdAt: '2026-07-01',
        },
        loading: false, masked: false, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText('正常文本')).toBeInTheDocument() })
    expect(container.querySelectorAll('img[onerror]').length).toBe(0)
  })

  it('escapes HTML in document title', async () => {
    const { container } = render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '<img src=x onerror=alert(1)>', sourceType: 'call',
          fullText: '正常', chunks: [], chunkCount: 0, createdAt: '2026-07-01',
        },
        loading: false, masked: false, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText(/正常/)).toBeInTheDocument() })
    expect(container.querySelectorAll('img[onerror]').length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: MaskContext 脱敏联动
// ═══════════════════════════════════════════════════════════════

describe('MaskContext integration — KnowledgeDocumentDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('masks phone numbers when masked=true', async () => {
    render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '通话记录', sourceType: 'call',
          fullText: '联系电话 [已脱敏]',
          chunks: [], chunkCount: 0, createdAt: '2026-07-01',
        },
        loading: false, masked: true, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText(/138\*+/)).toBeInTheDocument() })
    expect(screen.queryByText('[已脱敏]')).not.toBeInTheDocument()
  })

  it('masks ID card numbers when masked=true', async () => {
    render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '身份信息', sourceType: 'call',
          fullText: '身份证 11010519491231002X',
          chunks: [], chunkCount: 0, createdAt: '2026-07-01',
        },
        loading: false, masked: true, onClose: () => {},
      })
    )

    // 原始身份证号不应可见
    await waitFor(() => { expect(screen.queryByText('11010519491231002X')).not.toBeInTheDocument() })
    // 应该有脱敏标记
    expect(screen.getByText(/\*\*\*\*/)).toBeInTheDocument()
  })

  it('does not mask when masked=false', async () => {
    render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '通话记录', sourceType: 'call',
          fullText: '联系电话 [已脱敏]',
          chunks: [], chunkCount: 0, createdAt: '2026-07-01',
        },
        loading: false, masked: false, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText(/[已脱敏]/)).toBeInTheDocument() })
  })

  it('masks PII in chunk text when masked=true', async () => {
    render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '测试', sourceType: 'call',
          fullText: '正常文本',
          chunks: [{ id: 1, index: 0, text: '银行卡 6222021234567890123' }],
          chunkCount: 1, createdAt: '2026-07-01',
        },
        loading: false, masked: true, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText(/6222\*+/)).toBeInTheDocument() })
    expect(screen.queryByText('6222021234567890123')).not.toBeInTheDocument()
  })
})
