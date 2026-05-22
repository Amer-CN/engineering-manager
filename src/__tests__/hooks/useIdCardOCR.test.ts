// @ts-nocheck
/**
 * useIdCardOCR Hook 测试
 * 测试身份证 OCR 识别和文件处理
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock OCR service
vi.mock('@/services/ocr', () => ({
  recognizeIdCard: vi.fn(),
  getOCRConfig: vi.fn(() => ({ provider: 'offline' })),
  OCRProvider: { Offline: 'offline', Baidu: 'baidu' },
}))

// Mock FileReader
class MockFileReader {
  result: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  readAsDataURL(_file: File) {
    this.result = 'data:image/jpeg;base64,fakedata'
    setTimeout(() => this.onload?.(), 0)
  }
}

describe('useIdCardOCR', () => {
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

  function makeImageFile(name = 'idcard.jpg', type = 'image/jpeg', size = 1024): File {
    return new File(['x'.repeat(size)], name, { type })
  }

  it('初始状态', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    expect(result.current.loading).toBe(false)
    expect(result.current.toast).toBeNull()
  })

  it('validateImageFile 有效图片返回 null', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = makeImageFile()
    expect(result.current.validateImageFile(file)).toBeNull()
  })

  it('validateImageFile 无效类型返回错误', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = new File(['x'], 'test.txt', { type: 'text/plain' })
    expect(result.current.validateImageFile(file)).toContain('只能上传')
  })

  it('validateImageFile 超大文件返回错误', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = makeImageFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024)
    expect(result.current.validateImageFile(file)).toContain('不能超过 5MB')
  })

  it('validateFile 有效文件返回 null', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = makeImageFile()
    expect(result.current.validateFile(file)).toBeNull()
  })

  it('validateFile PDF 文件有效', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    expect(result.current.validateFile(file)).toBeNull()
  })

  it('validateFile 无效类型返回错误', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = new File(['x'], 'test.txt', { type: 'text/plain' })
    expect(result.current.validateFile(file)).toContain('只能上传')
  })

  it('showToast 设置 toast 消息', async () => {
    vi.useFakeTimers()
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    act(() => { result.current.showToast('测试消息', 'success') })
    expect(result.current.toast).toEqual({ message: '测试消息', type: 'success' })
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.toast).toBeNull()
    vi.useRealTimers()
  })

  it('processIdCardFile 无效文件返回 null', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = new File(['x'], 'test.txt', { type: 'text/plain' })
    const res = await result.current.processIdCardFile(file)
    expect(res).toBeNull()
  })

  it('processIdCardFile OCR 成功', async () => {
    const { recognizeIdCard } = await import('@/services/ocr')
    const mockedRecognize = recognizeIdCard as ReturnType<typeof vi.fn>
    mockedRecognize.mockResolvedValue({
      success: true,
      idCard: { number: '510000199001011234', gender: '男', birthDate: '1990-01-01', name: '张三', ethnicity: '汉', address: '四川省' },
    })
    const onOCRResult = vi.fn()
    const onFileChange = vi.fn()
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR({ onOCRResult, onFileChange }))
    const file = makeImageFile()
    let base64Result: string | null = null
    await act(async () => {
      base64Result = await result.current.processIdCardFile(file)
    })
    expect(base64Result).toBeTruthy()
    expect(onOCRResult).toHaveBeenCalledWith(expect.objectContaining({ name: '张三' }))
    expect(onFileChange).toHaveBeenCalledWith('idCardFront', expect.any(String))
  })

  it('processIdCardFile OCR 失败仍返回 base64', async () => {
    const { recognizeIdCard } = await import('@/services/ocr')
    const mockedRecognize = recognizeIdCard as ReturnType<typeof vi.fn>
    mockedRecognize.mockResolvedValue({ success: false, error: '识别失败' })
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = makeImageFile()
    let base64Result: string | null = null
    await act(async () => {
      base64Result = await result.current.processIdCardFile(file)
    })
    expect(base64Result).toBeTruthy() // 仍返回 base64
  })

  it('processUploadFile 有效图片返回 base64+type', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = makeImageFile()
    let uploadResult: any = null
    await act(async () => {
      uploadResult = await result.current.processUploadFile(file)
    })
    expect(uploadResult).toBeTruthy()
    expect(uploadResult.type).toBe('image')
    expect(uploadResult.base64).toBeTruthy()
  })

  it('processUploadFile PDF 返回 pdf 类型', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    let uploadResult: any = null
    await act(async () => {
      uploadResult = await result.current.processUploadFile(file)
    })
    expect(uploadResult?.type).toBe('pdf')
  })

  it('processUploadFile 无效文件返回 null', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = new File(['x'], 'test.txt', { type: 'text/plain' })
    const res = await result.current.processUploadFile(file)
    expect(res).toBeNull()
  })

  it('readFileAsBase64 读取文件', async () => {
    const { useIdCardOCR } = await import('@/hooks/useIdCardOCR')
    const { result } = renderHook(() => useIdCardOCR())
    const file = makeImageFile()
    const base64 = await result.current.readFileAsBase64(file)
    expect(base64).toBeTruthy()
  })
})
