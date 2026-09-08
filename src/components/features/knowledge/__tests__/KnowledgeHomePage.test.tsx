/**
 * KnowledgeHomePage 集成测试（整页原版全屏轮播布局）
 *
 * 覆盖：
 * 1. 有文件夹 → 舞台容器（.gc-stage-iso）渲染，真实 API 数据经映射传入
 * 2. 空文件夹 → EmptyState「知识库为空」+ knowledge:create 门控新建按钮
 * 3. 点击空态新建 → 打开 AddFolderModal（mock 断言）
 * 4. XSS 防护 / MaskContext 脱敏联动（KnowledgeDocumentDrawer 直测，保留历史覆盖）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// ═══════════════════════════════════════════════════════════
// vi.hoisted — mock 状态
// ═══════════════════════════════════════════════════════════

const { mockCan, mockFolders, mockCreateFolder, lastStageProps, mockMaskState } = vi.hoisted(() => ({
  mockCan: vi.fn((_permission: string) => true),
  mockFolders: [] as Array<{ id: number; name: string; englishName: string | null; projectId: number | null; category: string | null; docCount: number; createdAt: string; updatedAt: string; createdBy: string }>,
  mockCreateFolder: { mutateAsync: vi.fn(async () => ({ success: true, data: { id: 1 } })), isPending: false },
  lastStageProps: { folders: [] as Array<{ id: string; title: string }> },
  mockMaskState: { masked: false },
}))

// ═══════════════════════════════════════════════════════════
// Mock modules
// ═══════════════════════════════════════════════════════════

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

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: mockCan }),
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ scheme: 'sandstone', setScheme: vi.fn() }),
}))

// Mock 数据层 hooks（页面接线测试；数据映射在页面内做）
vi.mock('@/hooks/data/useKnowledgeFolders', () => ({
  useKnowledgeFolders: () => ({ data: mockFolders, isLoading: false }),
  useCreateKnowledgeFolder: () => mockCreateFolder,
}))

// Mock 原版轮播部分：舞台（捕获 folders 真实传入）、两个弹窗
vi.mock('../glass-integration/KnowledgeCarouselStage', () => ({
  KnowledgeCarouselStage: (props: { folders: Array<{ id: string; title: string }> }) => {
    lastStageProps.folders = props.folders
    return React.createElement('div', { 'data-testid': 'gc-stage' }, `轮播舞台(${props.folders.length})`)
  },
}))

vi.mock('../glass-integration/KnowledgeFolderDetailModal', () => ({
  KnowledgeFolderDetailModal: (props: { isOpen: boolean }) =>
    React.createElement('div', { 'data-testid': 'gc-detail', 'data-open': String(props.isOpen) }),
}))

vi.mock('../glass-integration/AddFolderModal', () => ({
  AddFolderModal: (props: { isOpen: boolean }) =>
    React.createElement('div', { 'data-testid': 'gc-create', 'data-open': String(props.isOpen) }),
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

// ═══════════════════════════════════════════════════════════
// Import components after mocks
// ═══════════════════════════════════════════════════════════

import KnowledgeHomePage from '../KnowledgeHomePage'
import KnowledgeDocumentDrawer from '../KnowledgeDocumentDrawer'

// ═══════════════════════════════════════════════════════════
// Tests: 新原版布局（全屏轮播舞台）
// ═══════════════════════════════════════════════════════════

describe('KnowledgeHomePage — 全屏原版轮播布局', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMaskState.masked = false
    mockFolders.length = 0
    lastStageProps.folders = []
    mockCan.mockImplementation(() => true)
  })

  it('有文件夹时渲染舞台容器，真实数据映射后传入（id/姓名/英文名/分类/docCount）', () => {
    mockFolders.push({
      id: 3, name: '安全生产资料', englishName: 'SAFETY', projectId: null,
      category: '安全', docCount: 5, createdAt: '2026-01-01', updatedAt: '2026-01-01', createdBy: 'admin',
    })
    render(<KnowledgeHomePage />)

    expect(screen.getByTestId('gc-stage')).toBeInTheDocument()
    expect(lastStageProps.folders).toHaveLength(1)
    expect(lastStageProps.folders[0].id).toBe('3')
    expect(lastStageProps.folders[0].title).toBe('安全生产资料')
    expect(lastStageProps.folders[0]).toMatchObject({
      englishTitle: 'SAFETY',
      category: '安全',
      memberCount: 5,
    })
  })

  it('多文件夹全部映射传入', () => {
    mockFolders.push(
      { id: 1, name: '项目 A 资料', englishName: null, projectId: 1, category: '项目', docCount: 2, createdAt: '2026-01-01', updatedAt: '2026-01-01', createdBy: 'admin' },
      { id: 2, name: '项目 B 资料', englishName: 'PROJ-B', projectId: 2, category: '通用', docCount: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01', createdBy: 'admin' },
    )
    render(<KnowledgeHomePage />)

    expect(lastStageProps.folders).toHaveLength(2)
    expect(lastStageProps.folders.map((f) => f.id).sort()).toEqual(['1', '2'])
  })

  it('空文件夹 → EmptyState「知识库为空」，不渲染舞台', () => {
    render(<KnowledgeHomePage />)

    expect(screen.getByText('知识库为空')).toBeInTheDocument()
    expect(screen.queryByTestId('gc-stage')).toBeNull()
  })

  it('新建按钮受 knowledge:create 门控（无权限 → 无按钮）', () => {
    mockCan.mockImplementation((p: string) => p !== 'knowledge:create')
    render(<KnowledgeHomePage />)

    expect(screen.getByText('知识库为空')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /新建文件夹/ })).toBeNull()
  })

  it('有权限 → 点击「新建文件夹」打开 AddDialog 弹窗', () => {
    render(<KnowledgeHomePage />)

    fireEvent.click(screen.getByRole('button', { name: /新建文件夹/ }))
    expect(screen.getByTestId('gc-create').getAttribute('data-open')).toBe('true')
  })

  it('详情弹窗初始关闭', () => {
    mockFolders.push({ id: 3, name: '安全生产资料', englishName: null, projectId: null, category: '安全', docCount: 5, createdAt: '2026-01-01', updatedAt: '2026-01-01', createdBy: 'admin' })
    render(<KnowledgeHomePage />)

    expect(screen.getByTestId('gc-detail').getAttribute('data-open')).toBe('false')
  })
})

// ═══════════════════════════════════════════════════════════
// Tests: XSS 防护
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// Tests: MaskContext 脱敏联动
// ═══════════════════════════════════════════════════════════

describe('MaskContext integration — KnowledgeDocumentDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('masks phone numbers when masked=true', async () => {
    render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '通话记录', sourceType: 'call',
          fullText: '联系电话 13812345678',
          chunks: [], chunkCount: 0, createdAt: '2026-07-01',
        },
        loading: false, masked: true, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText(/138\*+/)).toBeInTheDocument() })
    expect(screen.queryByText('13812345678')).not.toBeInTheDocument()
  })

  it('does not mask when masked=false', async () => {
    render(
      React.createElement(KnowledgeDocumentDrawer, {
        doc: {
          id: 1, title: '通话记录', sourceType: 'call',
          fullText: '联系电话 13812345678',
          chunks: [], chunkCount: 0, createdAt: '2026-07-01',
        },
        loading: false, masked: false, onClose: () => {},
      })
    )

    await waitFor(() => { expect(screen.getByText(/13812345678/)).toBeInTheDocument() })
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