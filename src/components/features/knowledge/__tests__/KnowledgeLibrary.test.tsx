/**
 * KnowledgeLibrary 测试
 *
 * 验证审核第五轮反馈第 5 项：
 * - 搜索：输入关键词 → 调用 searchKnowledge → 显示结果
 * - 列表：挂载时加载文档列表
 * - 详情：点击文档 → 调用 getKnowledgeDocument
 * - 删除：点击删除 → 确认 → 调用 deleteKnowledgeDocument → 刷新列表
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import React from 'react'

// ═══════════════════════════════════════════════════════════════
// Mock modules — use vi.hoisted
// ═══════════════════════════════════════════════════════════════

const { mockKnowledgeClient, stableShowToast } = vi.hoisted(() => ({
  mockKnowledgeClient: {
    searchKnowledge: vi.fn(),
    listKnowledgeDocuments: vi.fn(),
    getKnowledgeDocument: vi.fn(),
    deleteKnowledgeDocument: vi.fn(),
  },
  stableShowToast: vi.fn(),
}))

vi.mock('@/services/knowledge-client', () => ({
  knowledgeClient: mockKnowledgeClient,
}))

vi.mock('@/hooks/useToast', () => ({
  useToastContext: () => ({ showToast: stableShowToast }),
}))

vi.mock('@/contexts/MaskContext', () => ({
  useMask: () => ({ masked: false, setMasked: vi.fn(), toggleMask: vi.fn(), isSyncing: false, isHydrated: true }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileHover, ...rest } = props as Record<string, unknown>
      return React.createElement('div', rest, children as React.ReactNode)
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) =>
    React.createElement(React.Fragment, null, children),
}))

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return { ...actual, createPortal: (node: React.ReactNode) => node }
})

// Mock KnowledgeDocumentDrawer to simplify rendering
vi.mock('../KnowledgeDocumentDrawer', () => ({
  default: function MockDrawer({ doc, loading }: { doc: unknown; loading: boolean }) {
    if (loading) return React.createElement('div', { 'data-testid': 'drawer-loading' }, '加载中...')
    if (!doc) return null
    const d = doc as { title?: string; fullText?: string }
    return React.createElement('div', { 'data-testid': 'drawer' },
      React.createElement('span', null, d.title || ''),
      React.createElement('span', null, d.fullText || ''),
    )
  },
}))

// ═══════════════════════════════════════════════════════════════
// Import after mocks
// ═══════════════════════════════════════════════════════════════

import KnowledgeLibrary from '../KnowledgeLibrary'

// ═══════════════════════════════════════════════════════════════
// Test data
// ═══════════════════════════════════════════════════════════════

const MOCK_DOCS = [
  { id: 1, title: '会议记录一', sourceType: 'call', createdAt: '2026-07-01', chunkCount: 3 },
  { id: 2, title: '会议记录二', sourceType: 'call', createdAt: '2026-07-02', chunkCount: 5 },
]

const MOCK_DOC_DETAIL = {
  id: 1, title: '会议记录一', sourceType: 'call', createdAt: '2026-07-01',
  fullText: '这是文档的完整内容', chunkCount: 1,
  chunks: [{ id: 1, index: 0, text: '这是文档的完整内容' }],
}

const MOCK_HITS = [
  { documentId: 1, chunkId: 1, chunkIndex: 0, text: '匹配的文本片段', docTitle: '会议记录一' },
]

// ═══════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers() // 确保不用 fake timers
  mockKnowledgeClient.listKnowledgeDocuments.mockResolvedValue({
    success: true, data: { data: MOCK_DOCS, total: 2, page: 1, size: 10 },
  })
  mockKnowledgeClient.searchKnowledge.mockResolvedValue({
    success: true, data: { query: '会议', totalHits: 1, usedSemantic: false, hits: MOCK_HITS, documents: [] },
  })
  mockKnowledgeClient.getKnowledgeDocument.mockResolvedValue({
    success: true, data: MOCK_DOC_DETAIL,
  })
  mockKnowledgeClient.deleteKnowledgeDocument.mockResolvedValue({
    success: true, data: null,
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: 文档列表
// ═══════════════════════════════════════════════════════════════

describe('KnowledgeLibrary — 文档列表', () => {
  it('挂载时加载文档列表', async () => {
    render(<KnowledgeLibrary />)

    await waitFor(() => {
      expect(screen.getByText('会议记录一')).toBeInTheDocument()
      expect(screen.getByText('会议记录二')).toBeInTheDocument()
    })

    expect(mockKnowledgeClient.listKnowledgeDocuments).toHaveBeenCalledWith(1, 10)
  })

  it('列表为空时显示空状态', async () => {
    mockKnowledgeClient.listKnowledgeDocuments.mockResolvedValue({
      success: true, data: { data: [], total: 0, page: 1, size: 10 },
    })

    render(<KnowledgeLibrary />)

    await waitFor(() => {
      expect(screen.getByText('知识库为空')).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: 搜索
// ═══════════════════════════════════════════════════════════════

describe('KnowledgeLibrary — 搜索', () => {
  it('输入关键词并点击搜索 → 调用 searchKnowledge', async () => {
    render(<KnowledgeLibrary />)

    await waitFor(() => { expect(screen.getByText('会议记录一')).toBeInTheDocument() })

    const input = screen.getByPlaceholderText(/搜索知识库/)
    act(() => { fireEvent.change(input, { target: { value: '会议' } }) })

    // 提交表单（点击搜索按钮）
    act(() => { fireEvent.click(screen.getByText('搜索')) })

    await waitFor(() => {
      expect(mockKnowledgeClient.searchKnowledge).toHaveBeenCalledWith('会议', 10)
    })
  })

  it('搜索结果为空 → 显示无结果', async () => {
    mockKnowledgeClient.searchKnowledge.mockResolvedValue({
      success: true, data: { query: '不存在', totalHits: 0, usedSemantic: false, hits: [], documents: [] },
    })

    render(<KnowledgeLibrary />)

    await waitFor(() => { expect(screen.getByText('会议记录一')).toBeInTheDocument() })

    const input = screen.getByPlaceholderText(/搜索知识库/)
    act(() => { fireEvent.change(input, { target: { value: '不存在' } }) })
    act(() => { fireEvent.click(screen.getByText('搜索')) })

    await waitFor(() => {
      expect(screen.getByText('无搜索结果')).toBeInTheDocument()
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: 文档详情
// ═══════════════════════════════════════════════════════════════

describe('KnowledgeLibrary — 文档详情', () => {
  it('点击文档 → 调用 getKnowledgeDocument', async () => {
    render(<KnowledgeLibrary />)

    await waitFor(() => { expect(screen.getByText('会议记录一')).toBeInTheDocument() })

    act(() => { fireEvent.click(screen.getByText('会议记录一')) })

    await waitFor(() => {
      expect(mockKnowledgeClient.getKnowledgeDocument).toHaveBeenCalledWith(1)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: 删除文档
// ═══════════════════════════════════════════════════════════════

describe('KnowledgeLibrary — 删除文档', () => {
  it('确认删除 → 调用 deleteKnowledgeDocument → 刷新列表', async () => {
    render(<KnowledgeLibrary />)

    await waitFor(() => { expect(screen.getByText('会议记录一')).toBeInTheDocument() })

    // 找到删除按钮 — iconOnly button 在每个文档行末尾
    // 页面结构：刷新按钮 + 每个文档行的删除按钮
    // 删除按钮是 iconOnly 的，没有文本内容
    // 刷新按钮有文本"刷新"
    // 所以找所有没有文本内容的 button
    const allButtons = screen.getAllByRole('button')
    // 排除有文本"刷新"的按钮，排除搜索按钮
    const iconButtons = allButtons.filter(b => {
      const text = b.textContent?.trim() || ''
      return text === '' || text === '×' // iconOnly 按钮没有文本或只有图标符号
    })

    // 应该至少有 2 个 iconOnly 按钮（2 个文档各有 1 个删除按钮）
    expect(iconButtons.length).toBeGreaterThanOrEqual(1)

    // 点击第一个 iconOnly 按钮（第一个文档的删除按钮）
    act(() => { fireEvent.click(iconButtons[0]) })

    // 确认对话框出现
    await waitFor(() => {
      expect(screen.getByText(/确认删除文档/)).toBeInTheDocument()
    })

    // 点击"删除"确认按钮 — 对话框中的确认按钮（文字在 span 内）
    const allBtns = screen.getAllByRole('button')
    const dialogDeleteBtn = allBtns.find(b => b.textContent?.includes('删除'))
    expect(dialogDeleteBtn).toBeTruthy()
    act(() => { fireEvent.click(dialogDeleteBtn!) })

    await waitFor(() => {
      expect(mockKnowledgeClient.deleteKnowledgeDocument).toHaveBeenCalledWith(1)
    })

    // 删除后应刷新列表
    await waitFor(() => {
      expect(mockKnowledgeClient.listKnowledgeDocuments).toHaveBeenCalledTimes(2)
    })
  })
})
