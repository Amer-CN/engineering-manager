/**
 * AudioUploadCard 测试
 *
 * 验证审核第五轮反馈第 5 项：
 * - 上传进度条显示
 * - 格式/大小验证 UI 反馈
 * - 拖拽上传
 * - 点击选择文件
 * - 清除文件
 * - 上传成功状态
 * - 禁用状态
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import AudioUploadCard from '../AudioUploadCard'

// Mock framer-motion
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

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    selectedFile: null,
    uploading: false,
    uploadProgress: 0,
    uploadedPath: null,
    accept: '.wav,.mp3,.m4a,.aac,.flac,.ogg,.wma,.amr,.opus',
    disabled: false,
    onFileSelect: vi.fn(),
    onUpload: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  }
}

describe('AudioUploadCard — 初始状态', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('渲染拖拽上传区域', () => {
    render(<AudioUploadCard {...makeProps()} />)
    expect(screen.getByText('拖拽音频文件到此处')).toBeInTheDocument()
    expect(screen.getByText('或点击选择文件')).toBeInTheDocument()
  })

  it('显示支持的格式和大小限制', () => {
    render(<AudioUploadCard {...makeProps()} />)
    expect(screen.getByText(/支持.*wav.*mp3.*最大 500MB/)).toBeInTheDocument()
  })
})

describe('AudioUploadCard — 文件选择', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('拖拽文件 → 调用 onFileSelect', () => {
    const onFileSelect = vi.fn()
    render(<AudioUploadCard {...makeProps({ onFileSelect })} />)

    const dropZone = screen.getByText('拖拽音频文件到此处').closest('div')
    expect(dropZone).toBeTruthy()

    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })
    act(() => {
      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [file] },
      })
    })

    expect(onFileSelect).toHaveBeenCalledWith(file)
  })

  it('禁用状态下不响应拖拽', () => {
    const onFileSelect = vi.fn()
    render(<AudioUploadCard {...makeProps({ onFileSelect, disabled: true })} />)

    const dropZone = screen.getByText('拖拽音频文件到此处').closest('div')
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })
    act(() => {
      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [file] },
      })
    })

    expect(onFileSelect).not.toHaveBeenCalled()
  })
})

describe('AudioUploadCard — 文件已选择（未上传）', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('显示文件名和大小', () => {
    const file = new File(['audio data here'], 'recording.wav', { type: 'audio/wav' })
    render(<AudioUploadCard {...makeProps({ selectedFile: file })} />)

    expect(screen.getByText('recording.wav')).toBeInTheDocument()
    expect(screen.getByText(/B|KB|MB/)).toBeInTheDocument()
  })

  it('显示"开始上传"按钮', () => {
    const file = new File(['x'], 'test.mp3', { type: 'audio/mpeg' })
    render(<AudioUploadCard {...makeProps({ selectedFile: file })} />)

    expect(screen.getByText('开始上传')).toBeInTheDocument()
  })

  it('点击"开始上传" → 调用 onUpload', () => {
    const onUpload = vi.fn()
    const file = new File(['x'], 'test.mp3', { type: 'audio/mpeg' })
    render(<AudioUploadCard {...makeProps({ selectedFile: file, onUpload })} />)

    act(() => { fireEvent.click(screen.getByText('开始上传')) })
    expect(onUpload).toHaveBeenCalledTimes(1)
  })

  it('点击清除按钮 → 调用 onClear', () => {
    const onClear = vi.fn()
    const file = new File(['x'], 'test.mp3', { type: 'audio/mpeg' })
    render(<AudioUploadCard {...makeProps({ selectedFile: file, onClear })} />)

    // 找到清除按钮（X 图标按钮）
    const clearButton = screen.getByRole('button', { name: '' })
    act(() => { fireEvent.click(clearButton) })
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})

describe('AudioUploadCard — 上传中', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('显示上传进度百分比', () => {
    const file = new File(['x'], 'test.mp3', { type: 'audio/mpeg' })
    render(<AudioUploadCard {...makeProps({
      selectedFile: file,
      uploading: true,
      uploadProgress: 45,
    })} />)

    expect(screen.getByText('上传中...')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('进度条宽度与百分比一致', () => {
    const file = new File(['x'], 'test.mp3', { type: 'audio/mpeg' })
    const { container } = render(<AudioUploadCard {...makeProps({
      selectedFile: file,
      uploading: true,
      uploadProgress: 75,
    })} />)

    const progressBar = container.querySelector('[style*="width: 75%"]')
    expect(progressBar).toBeTruthy()
  })

  it('上传中不显示开始上传按钮', () => {
    const file = new File(['x'], 'test.mp3', { type: 'audio/mpeg' })
    render(<AudioUploadCard {...makeProps({
      selectedFile: file,
      uploading: true,
      uploadProgress: 50,
    })} />)

    expect(screen.queryByText('开始上传')).not.toBeInTheDocument()
  })

  it('上传进度 100% 仍显示进度条', () => {
    const file = new File(['x'], 'test.mp3', { type: 'audio/mpeg' })
    render(<AudioUploadCard {...makeProps({
      selectedFile: file,
      uploading: true,
      uploadProgress: 100,
    })} />)

    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})

describe('AudioUploadCard — 上传成功', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('显示成功状态', () => {
    const file = new File(['x'], 'test.mp3', { type: 'audio/mpeg' })
    render(<AudioUploadCard {...makeProps({
      selectedFile: file,
      uploadedPath: 'stt/1/abc.mp3',
    })} />)

    expect(screen.getByText('上传成功')).toBeInTheDocument()
  })

  it('成功状态下可清除', () => {
    const onClear = vi.fn()
    const file = new File(['x'], 'test.mp3', { type: 'audio/mpeg' })
    render(<AudioUploadCard {...makeProps({
      selectedFile: file,
      uploadedPath: 'stt/1/abc.mp3',
      onClear,
    })} />)

    const clearButton = screen.getByRole('button', { name: '' })
    act(() => { fireEvent.click(clearButton) })
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})

describe('AudioUploadCard — 禁用状态', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('禁用时拖拽区域显示不可用样式', () => {
    render(<AudioUploadCard {...makeProps({ disabled: true })} />)

    const dropZone = screen.getByText('拖拽音频文件到此处').closest('div')
    expect(dropZone?.className).toContain('cursor-not-allowed')
  })
})
