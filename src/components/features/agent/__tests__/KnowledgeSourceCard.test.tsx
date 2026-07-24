import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import KnowledgeSourceCard from '../KnowledgeSourceCard'

// Mock useMask context
vi.mock('@/contexts/MaskContext', () => ({
  useMask: () => ({ masked: false, setMasked: vi.fn() }),
}))

// Mock sessionStorage
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

// Mock CustomEvent
Object.defineProperty(window, 'CustomEvent', {
  value: class CustomEvent extends Event {
    detail: unknown
    constructor(type: string, options?: { detail?: unknown }) {
      super(type)
      this.detail = options?.detail
    }
  },
})

const mockResult = {
  success: true,
  query: '测试查询',
  totalHits: 2,
  usedSemantic: true,
  hits: [
    {
      documentId: 42,
      chunkId: 1,
      chunkIndex: 0,
      docTitle: '测试文档1',
      sourceType: 'call',
      occurredAt: '2026-07-01',
      speakers: '说话人1;说话人2',
      text: '这是匹配的文本片段1',
      relevance: { ftsRank: 0.001, semanticRank: 0.85, rrfScore: 0.012 },
    },
    {
      documentId: 43,
      chunkId: 2,
      chunkIndex: 0,
      docTitle: '测试文档2',
      sourceType: 'manual',
      occurredAt: '2026-07-02',
      text: '这是匹配的文本片段2',
      relevance: { ftsRank: null, semanticRank: 0.78, rrfScore: 0.008 },
    },
  ],
}

function renderCard(result: unknown) {
  return render(<KnowledgeSourceCard result={result} />)
}

describe('KnowledgeSourceCard', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    vi.clearAllMocks()
  })

  it('renders hits when result has data', () => {
    renderCard(mockResult)
    expect(screen.getByText('测试文档1')).toBeInTheDocument()
    expect(screen.getByText('测试文档2')).toBeInTheDocument()
    expect(screen.getByText(/2 条命中/)).toBeInTheDocument()
  })

  it('renders empty state when no hits', () => {
    renderCard({ success: true, hits: [] })
    expect(screen.getByText('知识库检索：无命中结果')).toBeInTheDocument()
  })

  it('renders empty state when result is null', () => {
    renderCard(null)
    expect(screen.getByText('知识库检索：无命中结果')).toBeInTheDocument()
  })

  it('click on card sets sessionStorage pendingDocId and dispatches navigate event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    renderCard(mockResult)

    const card = screen.getByText('测试文档1').closest('div')
    expect(card).toBeTruthy()

    act(() => {
      fireEvent.click(card!)
    })

    // sessionStorage 应该被设置了 pendingDocId
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('knowledge:pendingDocId', '42')
    // navigate 事件应该被派发
    const navigateCall = dispatchSpy.mock.calls.find(
      call => (call[0] as Event).type === 'navigate'
    )
    expect(navigateCall).toBeDefined()
    expect((navigateCall![0] as CustomEvent).detail).toBe('knowledge')
  })

  it('click on card without documentId does not navigate', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const resultNoDocId = {
      success: true,
      hits: [
        { chunkId: 1, docTitle: '无文档ID', text: '测试' },
      ],
    }
    renderCard(resultNoDocId)

    const card = screen.getByText('无文档ID').closest('div')
    act(() => {
      fireEvent.click(card!)
    })

    // 不应该设置 sessionStorage
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled()
    // 不应该派发 navigate 事件
    const navigateCall = dispatchSpy.mock.calls.find(
      call => (call[0] as Event).type === 'navigate'
    )
    expect(navigateCall).toBeUndefined()
  })

  it('expands to show all hits when clicking expand button', () => {
    const manyHits = {
      success: true,
      query: 'test',
      totalHits: 5,
      hits: Array.from({ length: 5 }, (_, i) => ({
        documentId: i + 1,
        chunkId: i + 1,
        docTitle: `文档${i + 1}`,
        text: `文本${i + 1}`,
      })),
    }

    renderCard(manyHits)

    // 初始只显示 3 条
    expect(screen.getByText('文档1')).toBeInTheDocument()
    expect(screen.getByText('文档3')).toBeInTheDocument()
    expect(screen.queryByText('文档4')).not.toBeInTheDocument()

    // 点击展开
    const expandBtn = screen.getByText(/查看全部来源/)
    act(() => {
      fireEvent.click(expandBtn)
    })

    // 现在显示全部 5 条
    expect(screen.getByText('文档4')).toBeInTheDocument()
    expect(screen.getByText('文档5')).toBeInTheDocument()
  })

  it('does not render expand button when hits <= 3', () => {
    renderCard(mockResult)
    expect(screen.queryByText(/查看全部来源/)).not.toBeInTheDocument()
  })

  it('renders hit type badge (keyword, semantic, mixed)', () => {
    renderCard(mockResult)
    // 文档1 有 ftsRank + semanticRank → mixed
    // 文档2 只有 semanticRank → semantic
    expect(screen.getByText('混合命中')).toBeInTheDocument()
    expect(screen.getByText('语义命中')).toBeInTheDocument()
  })
})
