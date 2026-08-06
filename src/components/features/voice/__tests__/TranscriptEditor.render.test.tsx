/**
 * TranscriptEditor 真实渲染测试
 *
 * 验证审核第五轮反馈第 3 项：
 * - 单人模式：渲染 TranscriptEditor → 点击"存入知识库" → 确认 → 捕获 onIngest payload
 *   预期：correctedText = 纯文本（无【说话人N】前缀），segments = []
 * - 多人模式：渲染 TranscriptEditor → 点击"存入知识库" → 确认 → 捕获 onIngest payload
 *   预期：correctedText = rebuildFullText(segments)（带【说话人N】前缀），segments = 校对后 segments
 * - 空文本：点击入库 → 应显示错误提示，不调用 onIngest
 * - 修改 segment 文本 → onIngest 携带修改后的 segments
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import React from 'react'

// ═══════════════════════════════════════════════════════════════
// Mock modules — 必须在 import 组件之前
// ═══════════════════════════════════════════════════════════════

vi.mock('@/hooks/useToast', () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}))

// M3：文件夹选择依赖数据层，测试中 stub（真实查询需 QueryClientProvider）
vi.mock('@/hooks/data/useKnowledgeFolders', () => ({
  useKnowledgeFolders: () => ({ data: [] }),
}))

vi.mock('@/contexts/MaskContext', () => ({
  useMask: () => ({ masked: false, setMasked: vi.fn(), toggleMask: vi.fn(), isSyncing: false, isHydrated: true }),
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

// ═══════════════════════════════════════════════════════════════
// Import component after mocks
// ═══════════════════════════════════════════════════════════════

import TranscriptEditor from '../TranscriptEditor'
import type { SttJobDetail } from '@/services/stt-client'

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function makeSingleSpeakerJob(text: string): SttJobDetail {
  return {
    id: 1,
    sourceFile: 'single.wav',
    engine: 'test',
    status: 'completed',
    progress: 100,
    isMultiSpeaker: false,
    createdAt: '2026-07-01 10:00:00',
    updatedAt: '2026-07-01 10:05:00',
    text,
    segments: undefined,
  }
}

function makeMultiSpeakerJob(segments: { speaker: number; start: number; end: number; text: string }[]): SttJobDetail {
  return {
    id: 2,
    sourceFile: 'multi.wav',
    engine: 'test',
    status: 'completed',
    progress: 100,
    isMultiSpeaker: true,
    createdAt: '2026-07-01 10:00:00',
    updatedAt: '2026-07-01 10:05:00',
    text: undefined,
    segments,
  }
}

// ═══════════════════════════════════════════════════════════════
// Tests: 单人模式 — onIngest payload 验证
// ═══════════════════════════════════════════════════════════════

describe('TranscriptEditor — 单人模式 onIngest payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('单人模式 → onIngest 发送纯文本，segments 为空数组', async () => {
    const onIngest = vi.fn()
    const job = makeSingleSpeakerJob('这是单人模式的转写文本')

    render(
      <TranscriptEditor
        job={job}
        masked={false}
        onIngest={onIngest}
      />
    )

    // 确认渲染了 textarea（单人模式）
    expect(screen.getByDisplayValue('这是单人模式的转写文本')).toBeInTheDocument()

    // 点击"存入知识库"
    act(() => { fireEvent.click(screen.getByText('存入知识库')) })

    // 确认对话框出现 → 点击"确认入库"
    await waitFor(() => { expect(screen.getByText('确认入库')).toBeInTheDocument() })
    act(() => { fireEvent.click(screen.getByText('确认入库')) })

    // 验证 onIngest 被调用
    await waitFor(() => { expect(onIngest).toHaveBeenCalledTimes(1) })

    const [correctedText, segments, title] = onIngest.mock.calls[0]

    // 关键断言：correctedText 是纯文本（无【说话人N】前缀）
    expect(correctedText).toBe('这是单人模式的转写文本')
    expect(correctedText).not.toContain('【说话人')

    // segments 是空数组（不发送 segments）
    expect(segments).toEqual([])

    // title 默认使用 sourceFile
    expect(title).toBe('single.wav')
  })

  it('单人模式 → 修改文本后 → onIngest 发送修改后的纯文本', async () => {
    const onIngest = vi.fn()
    const job = makeSingleSpeakerJob('原始文本')

    render(
      <TranscriptEditor job={job} masked={false} onIngest={onIngest} />
    )

    // 修改文本
    const textarea = screen.getByDisplayValue('原始文本')
    act(() => { fireEvent.change(textarea, { target: { value: '修改后的文本内容' } }) })

    // 点击入库
    act(() => { fireEvent.click(screen.getByText('存入知识库')) })
    await waitFor(() => { expect(screen.getByText('确认入库')).toBeInTheDocument() })
    act(() => { fireEvent.click(screen.getByText('确认入库')) })

    await waitFor(() => { expect(onIngest).toHaveBeenCalledTimes(1) })

    const [correctedText, segments] = onIngest.mock.calls[0]
    expect(correctedText).toBe('修改后的文本内容')
    expect(segments).toEqual([])
  })

  it('单人模式 → 空文本 → 不调用 onIngest', async () => {
    const onIngest = vi.fn()
    const job = makeSingleSpeakerJob('')

    render(
      <TranscriptEditor job={job} masked={false} onIngest={onIngest} />
    )

    // 点击入库
    act(() => { fireEvent.click(screen.getByText('存入知识库')) })
    await waitFor(() => { expect(screen.getByText('确认入库')).toBeInTheDocument() })
    act(() => { fireEvent.click(screen.getByText('确认入库')) })

    // onIngest 不应被调用（文本为空）
    await waitFor(() => { expect(onIngest).not.toHaveBeenCalled() })
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: 多人模式 — onIngest payload 验证
// ═══════════════════════════════════════════════════════════════

describe('TranscriptEditor — 多人模式 onIngest payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('多人模式 → onIngest 发送 rebuildFullText 和 segments', async () => {
    const onIngest = vi.fn()
    const segments = [
      { speaker: 1, start: 0, end: 5, text: '第一段对话' },
      { speaker: 2, start: 5, end: 10, text: '第二段对话' },
    ]
    const job = makeMultiSpeakerJob(segments)

    render(
      <TranscriptEditor job={job} masked={false} onIngest={onIngest} />
    )

    // 确认渲染了说话人分段编辑器
    expect(screen.getByText('说话人1')).toBeInTheDocument()
    expect(screen.getByText('说话人2')).toBeInTheDocument()

    // 点击入库
    act(() => { fireEvent.click(screen.getByText('存入知识库')) })
    await waitFor(() => { expect(screen.getByText('确认入库')).toBeInTheDocument() })
    act(() => { fireEvent.click(screen.getByText('确认入库')) })

    await waitFor(() => { expect(onIngest).toHaveBeenCalledTimes(1) })

    const [correctedText, correctedSegments, title] = onIngest.mock.calls[0]

    // 关键断言：correctedText 是 rebuildFullText 格式
    expect(correctedText).toBe('【说话人1】第一段对话\n【说话人2】第二段对话')

    // segments 包含原始 segments
    expect(correctedSegments).toEqual(segments)

    // title 默认使用 sourceFile
    expect(title).toBe('multi.wav')
  })

  it('多人模式 → 修改某段文本 → onIngest 携带修改后的 segments', async () => {
    const onIngest = vi.fn()
    const segments = [
      { speaker: 1, start: 0, end: 5, text: '原文第一段' },
      { speaker: 2, start: 5, end: 10, text: '原文第二段' },
    ]
    const job = makeMultiSpeakerJob(segments)

    render(
      <TranscriptEditor job={job} masked={false} onIngest={onIngest} />
    )

    // 修改第一段文本
    const textareas = screen.getAllByRole('textbox')
    // 第一个 textarea 是标题，后续是 segments
    act(() => { fireEvent.change(textareas[1], { target: { value: '修改后的第一段' } }) })

    // 点击入库
    act(() => { fireEvent.click(screen.getByText('存入知识库')) })
    await waitFor(() => { expect(screen.getByText('确认入库')).toBeInTheDocument() })
    act(() => { fireEvent.click(screen.getByText('确认入库')) })

    await waitFor(() => { expect(onIngest).toHaveBeenCalledTimes(1) })

    const [correctedText, correctedSegments] = onIngest.mock.calls[0]

    // correctedText 应反映修改
    expect(correctedText).toBe('【说话人1】修改后的第一段\n【说话人2】原文第二段')

    // segments 也应反映修改
    expect(correctedSegments[0].text).toBe('修改后的第一段')
    expect(correctedSegments[1].text).toBe('原文第二段')
  })

  it('多人模式 → 过滤 speaker=0 的 segment', async () => {
    const onIngest = vi.fn()
    const segments = [
      { speaker: 0, start: 0, end: 2, text: '簇0不应出现' },
      { speaker: 1, start: 2, end: 5, text: '说话人1文本' },
      { speaker: 2, start: 5, end: 10, text: '说话人2文本' },
    ]
    const job = makeMultiSpeakerJob(segments)

    render(
      <TranscriptEditor job={job} masked={false} onIngest={onIngest} />
    )

    // speaker=0 不应在 UI 中显示
    expect(screen.queryByText('说话人0')).not.toBeInTheDocument()
    expect(screen.getByText('说话人1')).toBeInTheDocument()
    expect(screen.getByText('说话人2')).toBeInTheDocument()

    // 点击入库
    act(() => { fireEvent.click(screen.getByText('存入知识库')) })
    await waitFor(() => { expect(screen.getByText('确认入库')).toBeInTheDocument() })
    act(() => { fireEvent.click(screen.getByText('确认入库')) })

    await waitFor(() => { expect(onIngest).toHaveBeenCalledTimes(1) })

    const [correctedText, correctedSegments] = onIngest.mock.calls[0]

    // speaker=0 被过滤掉
    expect(correctedSegments).toHaveLength(2)
    expect(correctedSegments[0].speaker).toBe(1)
    expect(correctedSegments[1].speaker).toBe(2)
    expect(correctedText).toBe('【说话人1】说话人1文本\n【说话人2】说话人2文本')
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: 前后端一致性验证
// ═══════════════════════════════════════════════════════════════

describe('TranscriptEditor — 前后端 segments 一致性', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('单人模式 payload 不触发后端 segments 重组校验（segments=[] → TranscriptionWorkspace 发送 undefined）', async () => {
    // 模拟 TranscriptionWorkspace.handleIngest 的逻辑：
    // segments: segments.length > 0 ? segments : undefined
    const onIngest = vi.fn()
    const job = makeSingleSpeakerJob('单人纯文本')

    render(<TranscriptEditor job={job} masked={false} onIngest={onIngest} />)

    act(() => { fireEvent.click(screen.getByText('存入知识库')) })
    await waitFor(() => { expect(screen.getByText('确认入库')).toBeInTheDocument() })
    act(() => { fireEvent.click(screen.getByText('确认入库')) })

    await waitFor(() => { expect(onIngest).toHaveBeenCalledTimes(1) })

    const [, segments] = onIngest.mock.calls[0]
    // segments 是空数组 → TranscriptionWorkspace 会发送 undefined
    // 后端 dto.Segments == null → 跳过重组校验 → 不会失败
    expect(segments).toEqual([])
    expect(segments.length).toBe(0)
  })

  it('多人模式 payload 的 correctedText 与后端重组格式完全一致', async () => {
    const onIngest = vi.fn()
    const segments = [
      { speaker: 1, start: 0, end: 5, text: '  前后空格  ' },
      { speaker: 2, start: 5, end: 10, text: '第二段' },
    ]
    const job = makeMultiSpeakerJob(segments)

    render(<TranscriptEditor job={job} masked={false} onIngest={onIngest} />)

    act(() => { fireEvent.click(screen.getByText('存入知识库')) })
    await waitFor(() => { expect(screen.getByText('确认入库')).toBeInTheDocument() })
    act(() => { fireEvent.click(screen.getByText('确认入库')) })

    await waitFor(() => { expect(onIngest).toHaveBeenCalledTimes(1) })

    const [correctedText, correctedSegments] = onIngest.mock.calls[0]

    // 模拟后端重组逻辑
    const backendRecomposed = correctedSegments
      .filter((s: { text: string }) => s.text.trim() !== '')
      .map((s: { speaker: number; text: string }) => `【说话人${s.speaker}】${s.text.trim()}`)
      .join('\n')

    // 前端 correctedText 必须与后端重组一致
    expect(correctedText.trim()).toBe(backendRecomposed.trim())
  })
})
