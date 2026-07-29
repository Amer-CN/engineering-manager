/**
 * AiProviderSection.test.tsx — AI 助手设置面板测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'

// ── Mock agent-client 四个函数 ──
const mockGetLlmProviderConfig = vi.hoisted(() => vi.fn())
const mockSaveLlmProviderConfig = vi.hoisted(() => vi.fn())
const mockTestLlmProviderConnection = vi.hoisted(() => vi.fn())
const mockReloadLlmProviderConfig = vi.hoisted(() => vi.fn())

vi.mock('@/services/agent-client', () => ({
  getLlmProviderConfig: mockGetLlmProviderConfig,
  saveLlmProviderConfig: mockSaveLlmProviderConfig,
  testLlmProviderConnection: mockTestLlmProviderConnection,
  reloadLlmProviderConfig: mockReloadLlmProviderConfig,
}))

// ── Mock toast store ──
const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  showToast: vi.fn(),
  removeToast: vi.fn(),
  toasts: [],
}))
vi.mock('@/store/toastStore', () => ({
  // 组件改用 selector 订阅（useToastStore(s => s.showToast)），mock 需透传 selector
  useToastStore: (selector?: (s: typeof mockToast) => unknown) => (selector ? selector(mockToast) : mockToast),
}))

import { AiProviderSection } from '../AiProviderSection'

const mockConfig = {
  providerName: 'Agnes',
  baseUrl: 'https://apihub.agnes-ai.com/v1',
  model: 'agnes-2.0-flash',
  useBuiltIn: true,
  temperature: 0.7,
  maxTokens: 4096,
  hasApiKey: false,
}

describe('AiProviderSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLlmProviderConfig.mockResolvedValue(mockConfig)
    mockSaveLlmProviderConfig.mockResolvedValue({ success: true })
    mockReloadLlmProviderConfig.mockResolvedValue(true)
  })

  test('渲染后温度显示 0.7 且出现"推荐"', async () => {
    render(<AiProviderSection />)

    await waitFor(() => {
      expect(screen.getByText(/温度 0\.7/)).toBeTruthy()
    })
    expect(screen.getByText('推荐')).toBeTruthy()
  })

  test('点击"发散 1.0" → 说明变为发散文案', async () => {
    render(<AiProviderSection />)

    await waitFor(() => {
      expect(screen.getByText(/温度 0\.7/)).toBeTruthy()
    })

    // 初始均衡文案
    expect(screen.getByText(/均衡模式/)).toBeTruthy()

    // 点击"发散 1.0"
    fireEvent.click(screen.getByText('发散 1.0'))

    // 温度变为 1.0
    await waitFor(() => {
      expect(screen.getByText(/温度 1\.0/)).toBeTruthy()
    })
    // 说明变为发散文案
    expect(screen.getByText(/发散模式/)).toBeTruthy()
  })

  test('点"保存" → payload 含 temperature:1.0、maxTokens:4096、apiKey:""、useBuiltIn:true，且调用了 reload', async () => {
    render(<AiProviderSection />)

    await waitFor(() => {
      expect(screen.getByText(/温度 0\.7/)).toBeTruthy()
    })

    // 先切到发散 1.0
    fireEvent.click(screen.getByText('发散 1.0'))

    // 点保存
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1)
    })

    const payload = mockSaveLlmProviderConfig.mock.calls[0][0]
    expect(payload.temperature).toBe(1.0)
    expect(payload.maxTokens).toBe(4096)
    expect(payload.apiKey).toBe('')
    expect(payload.useBuiltIn).toBe(true)

    // reload 被调用
    expect(mockReloadLlmProviderConfig).toHaveBeenCalled()
    // toast 成功
    expect(mockToast.showToast).toHaveBeenCalledWith('AI 设置已保存', 'success')
  })

  test('自定义模式下 apiKey 为空点"测试" → 出现 warning，testLlmProviderConnection 未被调用', async () => {
    // 自定义模式 + 有 baseUrl 但没 apiKey
    mockGetLlmProviderConfig.mockResolvedValue({
      ...mockConfig,
      useBuiltIn: false,
      baseUrl: 'https://api.example.com/v1',
      hasApiKey: false,
    })

    render(<AiProviderSection />)

    await waitFor(() => {
      expect(screen.getByText('AI 助手设置')).toBeTruthy()
    })

    // 点"测试连接"
    fireEvent.click(screen.getByText('测试连接'))

    await waitFor(() => {
      expect(mockToast.showToast).toHaveBeenCalledWith('测试连接需要填写 API Key（出于安全，已保存的密钥不会回填）', 'warning')
    })

    // testLlmProviderConnection 未被调用
    expect(mockTestLlmProviderConnection).not.toHaveBeenCalled()
  })
})
