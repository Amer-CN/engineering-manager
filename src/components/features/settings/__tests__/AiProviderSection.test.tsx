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
  model: 'agnes-2.5-flash',
  useBuiltIn: true,
  temperature: 0.7,
  maxTokens: 4096,
  availableModels: ['agnes-2.5-flash'],
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
      expect(mockToast.showToast).toHaveBeenCalledWith('需要填写 API Key（出于安全，已保存的密钥不会回填）', 'warning')
    })

    // testLlmProviderConnection 未被调用
    expect(mockTestLlmProviderConnection).not.toHaveBeenCalled()
  })

  test('点"获取模型列表" → 拉到清单后展示可搜索列表，点选模型回填模型名，保存时清单随配置回传', async () => {
    mockGetLlmProviderConfig.mockResolvedValue({
      ...mockConfig,
      useBuiltIn: false,
      providerName: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      availableModels: ['deepseek-chat'],
      hasApiKey: true,
    })
    mockTestLlmProviderConnection.mockResolvedValue({
      success: true,
      data: { models: ['deepseek-chat', 'deepseek-reasoner'], modelCount: 2 },
    })

    render(<AiProviderSection />)

    await waitFor(() => {
      expect(screen.getByText('AI 助手设置')).toBeTruthy()
    })

    // 填 API Key（已保存密钥不回填，需现填才能拉列表）
    fireEvent.change(screen.getByPlaceholderText('已配置，留空则保留原密钥'), {
      target: { value: 'sk-test' },
    })

    // 点"获取模型列表"
    fireEvent.click(screen.getByText('获取模型列表'))

    await waitFor(() => {
      expect(mockTestLlmProviderConnection).toHaveBeenCalledWith({
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: 'sk-test',
      })
    })
    await waitFor(() => {
      expect(mockToast.showToast).toHaveBeenCalledWith('获取成功，共 2 个模型', 'success')
    })

    // 列表出现两个模型，点选 deepseek-reasoner
    fireEvent.click(screen.getByText('deepseek-reasoner'))
    expect((screen.getByPlaceholderText('gpt-4o-mini（也可从上方列表选择）') as HTMLInputElement).value)
      .toBe('deepseek-reasoner')

    // 保存 → payload 带上完整清单
    fireEvent.click(screen.getByText('保存'))
    await waitFor(() => {
      expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1)
    })
    const payload = mockSaveLlmProviderConfig.mock.calls[0][0]
    expect(payload.model).toBe('deepseek-reasoner')
    expect(payload.availableModels).toEqual(['deepseek-chat', 'deepseek-reasoner'])
  })

  test('手填清单外模型保存 → 清单补入该模型（前端保证当前模型在列表内）', async () => {
    mockGetLlmProviderConfig.mockResolvedValue({
      ...mockConfig,
      useBuiltIn: false,
      providerName: 'Custom',
      baseUrl: 'https://api.example.com/v1',
      model: 'deepseek-chat',
      availableModels: ['deepseek-chat', 'deepseek-reasoner'],
      hasApiKey: true,
    })

    render(<AiProviderSection />)

    await waitFor(() => {
      expect(screen.getByText('AI 助手设置')).toBeTruthy()
    })

    // 手动改模型名为清单外的自定义模型
    fireEvent.change(screen.getByPlaceholderText('gpt-4o-mini（也可从上方列表选择）'), {
      target: { value: 'my-local-model' },
    })

    fireEvent.click(screen.getByText('保存'))
    await waitFor(() => {
      expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1)
    })
    const payload = mockSaveLlmProviderConfig.mock.calls[0][0]
    expect(payload.model).toBe('my-local-model')
    expect(payload.availableModels).toContain('my-local-model')
    expect(payload.availableModels).toContain('deepseek-chat')
  })

  test('选服务商预设 → Base URL 自动填充', async () => {
    mockGetLlmProviderConfig.mockResolvedValue({
      ...mockConfig,
      useBuiltIn: false,
      providerName: '',
      baseUrl: '',
      model: '',
      availableModels: [],
      hasApiKey: false,
    })

    render(<AiProviderSection />)

    await waitFor(() => {
      expect(screen.getByText('AI 助手设置')).toBeTruthy()
    })

    // 选择 DeepSeek 预设
    fireEvent.change(screen.getByDisplayValue('自定义 / 不在列表中'), {
      target: { value: 'DeepSeek' },
    })

    const baseUrlInput = screen.getByPlaceholderText('https://api.openai.com/v1') as HTMLInputElement
    expect(baseUrlInput.value).toBe('https://api.deepseek.com/v1')
  })

  test('maxTokens 快捷档位 → 点 8K 后保存 payload 带上 8192', async () => {
    render(<AiProviderSection />)

    await waitFor(() => {
      expect(screen.getByText(/温度 0\.7/)).toBeTruthy()
    })

    fireEvent.click(screen.getByText('8K'))

    fireEvent.click(screen.getByText('保存'))
    await waitFor(() => {
      expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1)
    })
    const payload = mockSaveLlmProviderConfig.mock.calls[0][0]
    expect(payload.maxTokens).toBe(8192)
  })
})
