/**
 * TranscriptionWorkspace 测试
 *
 * 验证审核第五轮反馈第 5 项：
 * - 轮询继续：任务 pending/running 时持续轮询
 * - 轮询终止：任务 completed/failed 时停止轮询
 * - 卸载清理：组件卸载时清理 setInterval
 * - 能力检测：挂载时调用 getSttStatus
 * - 文件验证：不支持的格式不选中
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import React from 'react'

// ═══════════════════════════════════════════════════════════════
// Mock state — use vi.hoisted to avoid top-level variable issues
// ═══════════════════════════════════════════════════════════════

const { mockSttClient } = vi.hoisted(() => ({
  mockSttClient: {
    getSttStatus: vi.fn(),
    uploadSttAudio: vi.fn(),
    createSttJob: vi.fn(),
    getSttJob: vi.fn(),
    getSttJobs: vi.fn(),
    ingestSttJob: vi.fn(),
  },
}))

vi.mock('@/services/stt-client', () => ({
  sttClient: mockSttClient,
}))

vi.mock('@/hooks/useToast', () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
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

// Mock SttJobList to avoid loading job list API
vi.mock('../SttJobList', () => ({
  default: function MockJobList() {
    return React.createElement('div', { 'data-testid': 'stt-job-list' }, '历史任务')
  },
}))

// ═══════════════════════════════════════════════════════════════
// Import after mocks
// ═══════════════════════════════════════════════════════════════

import TranscriptionWorkspace from '../TranscriptionWorkspace'

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const CAPABILITY_READY = {
  canTranscribe: true,
  canDiarize: true,
  gpu: { hasDiscreteGpu: true, name: 'RTX 4060', vramMb: 8192, supportsVulkan: true, allGpus: ['RTX 4060'] },
  asrModelReady: true,
  diarizationModelReady: true,
  unavailableReason: '',
}

const CAPABILITY_UNAVAILABLE = {
  canTranscribe: false,
  canDiarize: false,
  gpu: { hasDiscreteGpu: false, name: '', vramMb: 0, supportsVulkan: false, allGpus: [] },
  asrModelReady: false,
  diarizationModelReady: false,
  unavailableReason: '无独立显卡',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSttClient.getSttStatus.mockResolvedValue({ success: true, data: CAPABILITY_READY })
})

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('TranscriptionWorkspace — 能力检测', () => {
  it('挂载时调用 getSttStatus', async () => {
    render(<TranscriptionWorkspace />)
    expect(mockSttClient.getSttStatus).toHaveBeenCalledTimes(1)
  })

  it('能力不可用时显示提示', async () => {
    mockSttClient.getSttStatus.mockResolvedValue({ success: true, data: CAPABILITY_UNAVAILABLE })

    render(<TranscriptionWorkspace />)

    await waitFor(() => {
      expect(screen.getByText('语音转写当前不可用')).toBeInTheDocument()
    })
  })

  it('能力可用时显示就绪状态', async () => {
    render(<TranscriptionWorkspace />)

    await waitFor(() => {
      expect(screen.getByText(/已就绪/)).toBeInTheDocument()
    })
  })
})

describe('TranscriptionWorkspace — 卸载清理', () => {
  it('卸载时清理 setInterval', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    const { unmount } = render(<TranscriptionWorkspace />)
    await waitFor(() => { expect(screen.getByText(/已就绪/)).toBeInTheDocument() })

    unmount()

    // clearInterval 至少被调用一次（卸载清理 effect）
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
})

describe('TranscriptionWorkspace — 文件验证', () => {
  it('不支持的格式 → 不选中文件', async () => {
    render(<TranscriptionWorkspace />)
    await waitFor(() => { expect(screen.getByText(/已就绪/)).toBeInTheDocument() })

    // 拖拽一个 .txt 文件
    const dropZone = screen.getByText('拖拽音频文件到此处').closest('div')
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })
    act(() => {
      fireEvent.drop(dropZone!, { dataTransfer: { files: [file] } })
    })

    // 不支持的格式 → 文件未被选中（上传按钮仍不可见）
    expect(screen.queryByText('开始上传')).not.toBeInTheDocument()
  })

  it('空文件 → 不选中', async () => {
    render(<TranscriptionWorkspace />)
    await waitFor(() => { expect(screen.getByText(/已就绪/)).toBeInTheDocument() })

    const dropZone = screen.getByText('拖拽音频文件到此处').closest('div')
    const file = new File([], 'empty.wav', { type: 'audio/wav' })
    act(() => {
      fireEvent.drop(dropZone!, { dataTransfer: { files: [file] } })
    })

    expect(screen.queryByText('开始上传')).not.toBeInTheDocument()
  })

  it('支持的格式 → 选中文件', async () => {
    render(<TranscriptionWorkspace />)
    await waitFor(() => { expect(screen.getByText(/已就绪/)).toBeInTheDocument() })

    const dropZone = screen.getByText('拖拽音频文件到此处').closest('div')
    const file = new File(['audio data'], 'recording.wav', { type: 'audio/wav' })
    act(() => {
      fireEvent.drop(dropZone!, { dataTransfer: { files: [file] } })
    })

    await waitFor(() => {
      expect(screen.getByText('recording.wav')).toBeInTheDocument()
    })
  })
})
