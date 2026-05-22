// @ts-nocheck
/**
 * useFileUpload Hook 测试
 * 测试文件上传、验证、拖拽处理
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock FileReader
class MockFileReader {
  result: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  readAsDataURL(_file: File) {
    this.result = 'data:image/png;base64,fakedata'
    setTimeout(() => this.onload?.(), 0)
  }
}

describe('useFileUpload', () => {
  let originalFileReader: typeof FileReader

  beforeEach(() => {
    vi.clearAllMocks()
    originalFileReader = globalThis.FileReader
    // @ts-expect-error mock
    globalThis.FileReader = MockFileReader
  })

  afterEach(() => {
    globalThis.FileReader = originalFileReader
  })

  function makeFile(name: string, type: string, size = 1024): File {
    return new File(['x'.repeat(size)], name, { type })
  }

  it('初始状态', async () => {
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload())
    expect(result.current.files).toEqual([])
    expect(result.current.isDragging).toBe(false)
    expect(result.current.isUploading).toBe(false)
    expect(result.current.preview).toBeNull()
  })

  it('addFile 成功添加图片文件', async () => {
    const onSuccess = vi.fn()
    const onToast = vi.fn()
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload({ onSuccess, onToast }))
    const file = makeFile('test.png', 'image/png')
    await act(async () => { await result.current.addFile(file) })
    await waitFor(() => expect(result.current.files).toHaveLength(1))
    expect(result.current.files[0].name).toBe('test.png')
    expect(result.current.files[0].fileType).toBe('image')
    expect(onSuccess).toHaveBeenCalled()
    expect(onToast).toHaveBeenCalledWith(expect.stringContaining('上传成功'), 'success')
  })

  it('addFile 验证文件类型失败', async () => {
    const onError = vi.fn()
    const onToast = vi.fn()
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload({ onError, onToast, accept: ['image/png'] }))
    const file = makeFile('test.txt', 'text/plain')
    await act(async () => { await result.current.addFile(file) })
    expect(result.current.files).toHaveLength(0)
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('只能上传'))
    expect(onToast).toHaveBeenCalledWith(expect.stringContaining('只能上传'), 'error')
  })

  it('addFile 验证文件大小失败', async () => {
    const onError = vi.fn()
    const onToast = vi.fn()
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload({ onError, onToast, maxSizeMB: 0.001 }))
    const file = makeFile('big.png', 'image/png', 1024 * 1024)
    await act(async () => { await result.current.addFile(file) })
    expect(result.current.files).toHaveLength(0)
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('不能超过'))
  })

  it('addFile PDF 文件识别为 pdf 类型', async () => {
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload({ accept: ['application/pdf'] }))
    const file = makeFile('doc.pdf', 'application/pdf')
    await act(async () => { await result.current.addFile(file) })
    await waitFor(() => expect(result.current.files).toHaveLength(1))
    expect(result.current.files[0].fileType).toBe('pdf')
  })

  it('multiple=false 时替换已有文件', async () => {
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload({ multiple: false }))
    const file1 = makeFile('a.png', 'image/png')
    const file2 = makeFile('b.png', 'image/png')
    await act(async () => { await result.current.addFile(file1) })
    await waitFor(() => expect(result.current.files).toHaveLength(1))
    await act(async () => { await result.current.addFile(file2) })
    await waitFor(() => expect(result.current.files).toHaveLength(1))
    expect(result.current.files[0].name).toBe('b.png')
  })

  it('multiple=true 时追加文件', async () => {
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload({ multiple: true }))
    const file1 = makeFile('a.png', 'image/png')
    const file2 = makeFile('b.png', 'image/png')
    await act(async () => { await result.current.addFile(file1) })
    await waitFor(() => expect(result.current.files).toHaveLength(1))
    await act(async () => { await result.current.addFile(file2) })
    await waitFor(() => expect(result.current.files).toHaveLength(2))
  })

  it('removeFile 移除指定文件', async () => {
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload())
    const file = makeFile('test.png', 'image/png')
    await act(async () => { await result.current.addFile(file) })
    await waitFor(() => expect(result.current.files).toHaveLength(1))
    act(() => { result.current.removeFile(result.current.files[0].id) })
    expect(result.current.files).toHaveLength(0)
  })

  it('clearFiles 清空所有文件', async () => {
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload({ multiple: true }))
    const file1 = makeFile('a.png', 'image/png')
    const file2 = makeFile('b.png', 'image/png')
    await act(async () => { await result.current.addFile(file1) })
    await act(async () => { await result.current.addFile(file2) })
    await waitFor(() => expect(result.current.files).toHaveLength(2))
    act(() => { result.current.clearFiles() })
    expect(result.current.files).toHaveLength(0)
  })

  it('setPreview 设置预览', async () => {
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload())
    const preview = { data: 'data:image/png;base64,abc', type: 'image' as const, title: 'test' }
    act(() => { result.current.setPreview(preview) })
    expect(result.current.preview).toEqual(preview)
    act(() => { result.current.setPreview(null) })
    expect(result.current.preview).toBeNull()
  })

  it('validateFile 返回验证结果', async () => {
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload({ accept: ['image/png'], maxSizeMB: 1 }))
    const validFile = makeFile('ok.png', 'image/png', 100)
    const invalidType = makeFile('bad.txt', 'text/plain', 100)
    const tooBig = makeFile('big.png', 'image/png', 2 * 1024 * 1024)
    expect(result.current.validateFile(validFile)).toBeNull()
    expect(result.current.validateFile(invalidType)).toContain('只能上传')
    expect(result.current.validateFile(tooBig)).toContain('不能超过')
  })

  it('dragHandlers 设置 isDragging', async () => {
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload())
    const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any
    act(() => { result.current.dragHandlers.onDragOver(mockEvent) })
    expect(result.current.isDragging).toBe(true)
    act(() => { result.current.dragHandlers.onDragLeave(mockEvent) })
    expect(result.current.isDragging).toBe(false)
  })

  it('openFileDialog 调用 inputRef.click', async () => {
    const { useFileUpload } = await import('@/hooks/useFileUpload')
    const { result } = renderHook(() => useFileUpload())
    const mockClick = vi.fn()
    // Set up the ref's current
    result.current.inputRef.current = { click: mockClick } as any
    act(() => { result.current.openFileDialog() })
    expect(mockClick).toHaveBeenCalled()
  })
})
