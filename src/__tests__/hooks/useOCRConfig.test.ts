/**
 * useOCRConfig Hook 测试
 * 测试 OCR 配置管理
 */
import { renderHook, act, waitFor } from '@testing-library/react'

const mockInitialConfig = {
  provider: 'offline' as const,
  baiduApiKey: '',
  baiduSecretKey: '',
  autoDetect: true,
}

// Import the mocked module for control
const mockCheckOCRStatus = vi.fn(() => Promise.resolve({ online: true, provider: 'offline', configured: true }))
const mockGetOCRConfig = vi.fn(() => mockInitialConfig)
const mockSetOCRConfig = vi.fn()
const mockSaveOCRConfig = vi.fn()
const mockInitializeBuiltInConfig = vi.fn(() => Promise.resolve())
const mockGetProviderName = vi.fn((p: string) => p === 'baidu' ? '百度OCR' : '离线Tesseract.js')

vi.mock('@/services/ocr', () => ({
  getOCRConfig: mockGetOCRConfig,
  setOCRConfig: mockSetOCRConfig,
  checkOCRStatus: mockCheckOCRStatus,
  getProviderName: mockGetProviderName,
  saveOCRConfig: mockSaveOCRConfig,
  initialConfig: mockInitialConfig,
  initializeBuiltInConfig: mockInitializeBuiltInConfig,
} as any))

describe('useOCRConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default implementations
    mockCheckOCRStatus.mockImplementation(() => Promise.resolve({ online: true, provider: 'offline', configured: true }))
    mockGetOCRConfig.mockImplementation(() => ({ ...mockInitialConfig } as any))
  })

  it('初始加载配置和状态', async () => {
    const { useOCRConfig } = await import('@/hooks/useOCRConfig')
    const { result } = renderHook(() => useOCRConfig())
    await waitFor(() => {
      expect(result.current.ocrConfig).toBeDefined()
      expect(result.current.ocrStatus).toBeDefined()
    })
    expect(result.current.ocrConfig.provider).toBe('offline')
    expect(result.current.ocrStatus?.online).toBe(true)
  })

  it('handleSaveOCRConfig 保存配置', async () => {
    const { useOCRConfig } = await import('@/hooks/useOCRConfig')
    const { result } = renderHook(() => useOCRConfig())
    await waitFor(() => expect(result.current.ocrConfig).toBeDefined())
    // hook returns setOcrConfig (mapped from setOcrConfigState)
    act(() => {
      result.current.setOcrConfig({ ...result.current.ocrConfig!, baiduApiKey: 'new-key' } as any)
    })
    await act(async () => {
      result.current.handleSaveOCRConfig()
    })
    expect(mockSaveOCRConfig).toHaveBeenCalled()
    expect(mockSetOCRConfig).toHaveBeenCalled()
    expect(result.current.ocrMessage?.type).toBe('success')
    expect(result.current.ocrMessage?.text).toContain('已保存')
  })

  it('handleTestOCR 在线状态', async () => {
    const { useOCRConfig } = await import('@/hooks/useOCRConfig')
    const { result } = renderHook(() => useOCRConfig())
    await waitFor(() => expect(result.current.ocrConfig).toBeDefined())
    await act(async () => {
      result.current.handleTestOCR()
    })
    await waitFor(() => {
      expect(result.current.testingOCR).toBe(false)
    })
    expect(result.current.ocrMessage?.type).toBe('success')
    expect(result.current.ocrMessage?.text).toContain('正常')
  })

  it('handleTestOCR 离线状态', async () => {
    // Override mock BEFORE mounting
    mockCheckOCRStatus.mockImplementation(() => Promise.resolve({ online: false, provider: 'offline', configured: true }))
    const { useOCRConfig } = await import('@/hooks/useOCRConfig')
    const { result } = renderHook(() => useOCRConfig())
    await waitFor(() => expect(result.current.ocrConfig).toBeDefined())
    await act(async () => {
      result.current.handleTestOCR()
    })
    await waitFor(() => {
      expect(result.current.testingOCR).toBe(false)
    })
    expect(result.current.ocrMessage?.type).toBe('info')
    expect(result.current.ocrMessage?.text).toContain('离线')
  })

  it('handleTestOCR 异常', async () => {
    let callCount = 0
    mockCheckOCRStatus.mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.resolve({ online: true, provider: 'offline', configured: true })
      return Promise.reject(new Error('网络断开'))
    })
    const { useOCRConfig } = await import('@/hooks/useOCRConfig')
    const { result } = renderHook(() => useOCRConfig())
    await waitFor(() => expect(result.current.ocrConfig).toBeDefined())
    await act(async () => {
      result.current.handleTestOCR()
    })
    await waitFor(() => {
      expect(result.current.testingOCR).toBe(false)
    })
    expect(result.current.ocrMessage?.type).toBe('error')
    expect(result.current.ocrMessage?.text).toContain('检测失败')
  })

  it('setOcrConfig 更新本地状态', async () => {
    const { useOCRConfig } = await import('@/hooks/useOCRConfig')
    const { result } = renderHook(() => useOCRConfig())
    await waitFor(() => expect(result.current.ocrConfig).toBeDefined())
    act(() => {
      result.current.setOcrConfig({ ...result.current.ocrConfig!, provider: 'baidu' } as any)
    })
    expect(result.current.ocrConfig.provider).toBe('baidu')
  })
})
