/**
 * AiProviderSection.test.tsx — AI 助手设置（多服务商管理）测试
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'

// ── Mock agent-client ──
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
  showToast: vi.fn(),
}))
vi.mock('@/store/toastStore', () => ({
  useToastStore: (selector?: (s: typeof mockToast) => unknown) => (selector ? selector(mockToast) : mockToast),
}))

import { AiProviderSection } from '../AiProviderSection'

const emptyConfig = {
  providerName: 'Agnes',
  baseUrl: 'https://apihub.agnes-ai.com/v1',
  model: 'agnes-2.5-flash',
  useBuiltIn: true,
  temperature: 0.7,
  maxTokens: 4096,
  availableModels: ['agnes-2.5-flash'],
  modelCapabilities: {},
  hasApiKey: false,
  activeProviderId: null,
  providers: [],
  proxyUrl: '',
}

const deepseekProvider = {
  id: 'p_1',
  name: 'DeepSeek',
  baseUrl: 'https://api.deepseek.com/v1',
  hasApiKey: true,
  activeModelId: 'deepseek-chat',
  models: [
    { id: 'deepseek-chat', input: ['text'], output: ['text'] },
    { id: 'deepseek-vl', input: ['text', 'image'], output: ['text'] },
  ],
}

const oneProviderConfig = {
  ...emptyConfig,
  useBuiltIn: false,
  activeProviderId: 'p_1',
  providers: [deepseekProvider],
}


describe('AiProviderSection（多服务商管理）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLlmProviderConfig.mockResolvedValue(emptyConfig)
    mockSaveLlmProviderConfig.mockResolvedValue({ success: true })
    mockReloadLlmProviderConfig.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('加载后渲染服务商区块（无服务商时显示空态提示）', async () => {
    render(<AiProviderSection />)
    await waitFor(() => {
      expect(screen.getByText('还没有自定义服务商，点右上角「添加服务商」开始。')).toBeTruthy()
    })
    expect(screen.getByText('添加服务商')).toBeTruthy()
  })

  test('添加服务商 → 进列表并立即启用；保存 payload 结构正确（key 明文随请求、useBuiltIn 关）', async () => {
    render(<AiProviderSection />)

    await waitFor(() => expect(screen.getByText('添加服务商')).toBeTruthy())
    fireEvent.click(screen.getByText('添加服务商'))

    fireEvent.change(screen.getByPlaceholderText('如 DeepSeek / 智谱 / 自己起的名字'), { target: { value: 'DeepSeek' } })
    fireEvent.change(screen.getByPlaceholderText('https://api.openai.com/v1'), { target: { value: 'https://api.deepseek.com/v1' } })
    fireEvent.change(screen.getByPlaceholderText('请输入 API Key'), { target: { value: 'sk-test' } })
    fireEvent.click(screen.getByText('保存服务商'))

    // 列表出现并标记当前生效，内置开关自动关闭
    await waitFor(() => expect(screen.getByText('DeepSeek')).toBeTruthy())
    expect(screen.getByText('当前生效')).toBeTruthy()

    // 改动即时自动保存：添加服务商后 saveLlmProviderConfig 被自动调用
    await waitFor(() => expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1))

    const payload = mockSaveLlmProviderConfig.mock.calls[0][0]
    expect(payload.useBuiltIn).toBe(false)
    expect(payload.providers).toHaveLength(1)
    expect(payload.providers[0].name).toBe('DeepSeek')
    expect(payload.providers[0].baseUrl).toBe('https://api.deepseek.com/v1')
    expect(payload.providers[0].apiKey).toBe('sk-test')
    expect(payload.activeProviderId).toBe(payload.providers[0].id)
    expect(mockReloadLlmProviderConfig).toHaveBeenCalled()
  })

  test('添加服务商时「获取模型列表」→ 多选列表出现并全选，保存后模型进列表', async () => {
    mockTestLlmProviderConnection.mockResolvedValue({
      success: true,
      data: { models: ['deepseek-chat', 'deepseek-reasoner'], modelCount: 2 },
    })

    render(<AiProviderSection />)
    await waitFor(() => expect(screen.getByText('添加服务商')).toBeTruthy())
    fireEvent.click(screen.getByText('添加服务商'))

    fireEvent.change(screen.getByPlaceholderText('如 DeepSeek / 智谱 / 自己起的名字'), { target: { value: 'DeepSeek' } })
    fireEvent.change(screen.getByPlaceholderText('https://api.openai.com/v1'), { target: { value: 'https://api.deepseek.com/v1' } })
    fireEvent.change(screen.getByPlaceholderText('请输入 API Key'), { target: { value: 'sk-test' } })
    fireEvent.click(screen.getByText('获取模型列表'))

    await waitFor(() => expect(screen.getByText('deepseek-reasoner')).toBeTruthy())
    // 保存服务商（勾选模型默认全选）
    fireEvent.click(screen.getByText('保存服务商'))
    await waitFor(() => expect(screen.getByText(/2 个模型/)).toBeTruthy())

    await waitFor(() => expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1))
    const payload = mockSaveLlmProviderConfig.mock.calls[0][0]
    expect(payload.providers[0].models.map((m: { id: string }) => m.id)).toEqual(['deepseek-chat', 'deepseek-reasoner'])
    // 第一个勾选模型即默认模型
    expect(payload.providers[0].activeModelId).toBe('deepseek-chat')
  })

  test('已有服务商：模型列表展示能力徽章；添加模型弹窗（勾图片）→ 保存 payload 带能力标记', async () => {
    mockGetLlmProviderConfig.mockResolvedValue(oneProviderConfig)
    render(<AiProviderSection />)

    // 既有模型带「图」徽章
    await waitFor(() => expect(screen.getByText('deepseek-vl')).toBeTruthy())
    expect(screen.getByTitle('支持图片输入')).toBeTruthy()

    // 添加模型
    fireEvent.click(screen.getByText('添加模型'))
    await waitFor(() => expect(screen.getByText('模型 ID')).toBeTruthy())
    fireEvent.change(screen.getByPlaceholderText('如 deepseek-chat / glm-5.3'), { target: { value: 'glm-5.3v' } })
    fireEvent.click(screen.getByLabelText('图片'))
    fireEvent.click(screen.getByText('保存模型'))

    await waitFor(() => expect(screen.getByText('glm-5.3v')).toBeTruthy())

    await waitFor(() => expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1))
    const payload = mockSaveLlmProviderConfig.mock.calls[0][0]
    const added = payload.providers[0].models.find((m: { id: string }) => m.id === 'glm-5.3v')
    expect(added.input).toContain('image')
    expect(added.output).toEqual(['text'])
  })

  test('编辑模型弹窗：模型 ID 重复被拦截', async () => {
    mockGetLlmProviderConfig.mockResolvedValue(oneProviderConfig)
    render(<AiProviderSection />)

    await waitFor(() => expect(screen.getByText('添加模型')).toBeTruthy())
    fireEvent.click(screen.getByText('添加模型'))
    await waitFor(() => expect(screen.getByText('模型 ID')).toBeTruthy())
    fireEvent.change(screen.getByPlaceholderText('如 deepseek-chat / glm-5.3'), { target: { value: 'deepseek-chat' } })
    fireEvent.click(screen.getByText('保存模型'))

    await waitFor(() => {
      expect(mockToast.showToast).toHaveBeenCalledWith('模型「deepseek-chat」已存在', 'warning')
    })
  })

  test('删除服务商：确认弹窗 → 确认后行消失', async () => {
    mockGetLlmProviderConfig.mockResolvedValue(oneProviderConfig)
    render(<AiProviderSection />)

    await waitFor(() => expect(screen.getByText('DeepSeek')).toBeTruthy())
    fireEvent.click(screen.getByLabelText('删除服务商 DeepSeek'))
    await waitFor(() => expect(screen.getByText('确认删除')).toBeTruthy())
    fireEvent.click(screen.getByText('删除'))

    await waitFor(() => {
      expect(screen.getByText('还没有自定义服务商，点右上角「添加服务商」开始。')).toBeTruthy()
    })
    // 删除确认后自动保存
    await waitFor(() => expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1))
  })

  test('多服务商切换启用 + 模型「设为默认」', async () => {
    mockGetLlmProviderConfig.mockResolvedValue({
      ...oneProviderConfig,
      providers: [
        deepseekProvider,
        {
          id: 'p_2',
          name: '智谱',
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
          hasApiKey: true,
          activeModelId: 'glm-5.3',
          models: [{ id: 'glm-5.3', input: ['text'], output: ['text'] }],
        },
      ],
    })
    render(<AiProviderSection />)

    await waitFor(() => expect(screen.getByText('智谱')).toBeTruthy())
    // 切换启用智谱（自动保存）
    fireEvent.click(screen.getByText('启用'))
    await waitFor(() => expect(screen.getByText('glm-5.3')).toBeTruthy())
    // 等本次自动保存结束（保存中按钮 disabled）
    await waitFor(() => expect(screen.getByText('改动即时保存')).toBeTruthy())

    // deepseek-chat 当前非激活服务商的模型不可见；智谱的模型列表出现
    expect(screen.queryByText('deepseek-chat')).toBeNull()

    // 添加第二个模型再设默认（glm 仅有 1 个，先添加）
    fireEvent.click(screen.getByText('添加模型'))
    await waitFor(() => expect(screen.getByText('模型 ID')).toBeTruthy())
    fireEvent.change(screen.getByPlaceholderText('如 deepseek-chat / glm-5.3'), { target: { value: 'glm-4-flash' } })
    fireEvent.click(screen.getByText('保存模型'))
    await waitFor(() => expect(screen.getByText('glm-4-flash')).toBeTruthy())
    await waitFor(() => expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText('改动即时保存')).toBeTruthy())

    fireEvent.click(screen.getByText('设为默认'))
    // glm-4-flash 行出现「默认」徽章，自动保存第 3 次
    await waitFor(() => {
      const row = screen.getByText('glm-4-flash').closest('div')!
      expect(row.textContent).toContain('默认')
    })
    await waitFor(() => expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(3))
  })

  test('获取模型列表返回重复/大小写变体 → 去重后保存，不出现重复模型', async () => {
    mockTestLlmProviderConnection.mockResolvedValue({
      success: true,
      data: { models: ['deepseek-chat', 'DeepSeek-Chat', 'deepseek-chat', 'deepseek-reasoner'], modelCount: 4 },
    })

    render(<AiProviderSection />)
    await waitFor(() => expect(screen.getByText('添加服务商')).toBeTruthy())
    fireEvent.click(screen.getByText('添加服务商'))

    fireEvent.change(screen.getByPlaceholderText('如 DeepSeek / 智谱 / 自己起的名字'), { target: { value: 'DeepSeek' } })
    fireEvent.change(screen.getByPlaceholderText('https://api.openai.com/v1'), { target: { value: 'https://api.deepseek.com/v1' } })
    fireEvent.change(screen.getByPlaceholderText('请输入 API Key'), { target: { value: 'sk-test' } })
    fireEvent.click(screen.getByText('获取模型列表'))

    // toast 显示去重后的数量
    await waitFor(() => expect(mockToast.showToast).toHaveBeenCalledWith('获取成功，共 2 个模型', 'success'))
    fireEvent.click(screen.getByText('保存服务商'))

    await waitFor(() => expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1))
    const payload = mockSaveLlmProviderConfig.mock.calls[0][0]
    const ids = payload.providers[0].models.map((m: { id: string }) => m.id)
    expect(ids).toEqual(['deepseek-chat', 'deepseek-reasoner'])
    // 大小写变体不会各自成行
    expect(ids.filter((i: string) => i.toLowerCase() === 'deepseek-chat')).toHaveLength(1)
  })

  test('温度滑块/档位/代理输入 → 防抖 800ms 合并为一次保存，payload 正确', async () => {
    render(<AiProviderSection />)
    await waitFor(() => expect(screen.getByText(/温度 0\.7/)).toBeTruthy())

    vi.useFakeTimers()
    // 连续拖两次温度滑块：防抖合并，只在停顿 800ms 后保存一次
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '0.3' } })
    fireEvent.change(slider, { target: { value: '0.9' } })
    expect(mockSaveLlmProviderConfig).not.toHaveBeenCalled()

    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1)
    expect(mockSaveLlmProviderConfig.mock.calls[0][0].temperature).toBe(0.9)

    // 第二轮：maxTokens 档位 + 代理输入，同样合并为一次
    fireEvent.click(screen.getByText('8K'))
    fireEvent.change(screen.getByPlaceholderText('http://127.0.0.1:7890（留空 = 直连）'), {
      target: { value: '127.0.0.1:7890' },
    })
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(2)
    const payload = mockSaveLlmProviderConfig.mock.calls[1][0]
    expect(payload.temperature).toBe(0.9)
    expect(payload.maxTokens).toBe(8192)
    expect(payload.proxyUrl).toBe('127.0.0.1:7890')
  })

  test('界面无「保存」主按钮；弹窗内「保存模型」保留；显示「改动即时保存」', async () => {
    mockGetLlmProviderConfig.mockResolvedValue(oneProviderConfig)
    render(<AiProviderSection />)
    await waitFor(() => expect(screen.getByText('deepseek-chat')).toBeTruthy())

    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
    expect(screen.getByText('改动即时保存')).toBeTruthy()

    // 弹窗表单确认按钮（表单语义）不受影响
    fireEvent.click(screen.getByText('添加模型'))
    await waitFor(() => expect(screen.getByText('保存模型')).toBeTruthy())
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
  })

  test('切换 useBuiltIn 开关 → 立即自动保存（无防抖），payload.useBuiltIn 取反', async () => {
    render(<AiProviderSection />)
    await waitFor(() => expect(screen.getByRole('switch')).toBeTruthy())
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')

    fireEvent.click(screen.getByRole('switch'))
    // 同步立即调用：未推进任何定时器即已保存
    expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1)
    expect(mockSaveLlmProviderConfig.mock.calls[0][0].useBuiltIn).toBe(false)
    await waitFor(() => expect(mockReloadLlmProviderConfig).toHaveBeenCalledTimes(1))
  })

  test('加固：保存进行中开关禁用，防止并发保存竞态', async () => {
    let resolveSave: ((v: { success: boolean }) => void) | null = null
    mockSaveLlmProviderConfig.mockImplementation(() => new Promise(resolve => { resolveSave = resolve }))

    render(<AiProviderSection />)
    await waitFor(() => expect(screen.getByRole('switch')).toBeTruthy())

    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getByRole('switch')).toBeDisabled()   // 保存未完成期间禁用
    expect(screen.getByText('保存中...')).toBeTruthy()

    await act(async () => { resolveSave?.({ success: true }) })
    await waitFor(() => expect(screen.getByRole('switch')).not.toBeDisabled())
  })

  test('加固：防抖挂起期间点开关（immediate）→ 取消挂起 timer，只发一次保存请求', async () => {
    render(<AiProviderSection />)
    await waitFor(() => expect(screen.getByRole('switch')).toBeTruthy())

    vi.useFakeTimers()
    // 防抖改动挂起（800ms 未到）
    fireEvent.change(screen.getByPlaceholderText('http://127.0.0.1:7890（留空 = 直连）'), {
      target: { value: '127.0.0.1:7890' },
    })
    expect(mockSaveLlmProviderConfig).not.toHaveBeenCalled()

    // immediate 保存触发：挂起的防抖被取消，合并为一次请求
    fireEvent.click(screen.getByRole('switch'))
    expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1)

    // 原 800ms 窗口到期后不再补发第二次
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1)
    const payload = mockSaveLlmProviderConfig.mock.calls[0][0]
    expect(payload.proxyUrl).toBe('127.0.0.1:7890')   // 防抖改动也随本次请求带上
    expect(payload.useBuiltIn).toBe(false)
  })

  test('加固：防抖窗口内卸载组件 → 冲刷保存挂起的改动（不丢最后一次输入）', async () => {
    const { unmount } = render(<AiProviderSection />)
    await waitFor(() => expect(screen.getByText(/温度 0\.7/)).toBeTruthy())

    vi.useFakeTimers()
    fireEvent.change(screen.getByPlaceholderText('http://127.0.0.1:7890（留空 = 直连）'), {
      target: { value: '127.0.0.1:7897' },
    })
    expect(mockSaveLlmProviderConfig).not.toHaveBeenCalled()   // 还在防抖窗口内

    // unmount：冲刷立即保存，无需等 800ms
    unmount()
    expect(mockSaveLlmProviderConfig).toHaveBeenCalledTimes(1)
    expect(mockSaveLlmProviderConfig.mock.calls[0][0].proxyUrl).toBe('127.0.0.1:7897')
  })
})
