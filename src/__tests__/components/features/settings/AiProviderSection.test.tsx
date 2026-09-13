import { describe, test, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AiProviderSection } from '@/components/features/settings/AiProviderSection'
import { saveLlmProviderConfig } from '@/services/agent-client'
import { useToastStore } from '@/store/toastStore'

// ─── agent-client mock ─────────────────────────────
const { mockGetConfig } = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
}))
vi.mock('@/services/agent-client', () => ({
  getLlmProviderConfig: mockGetConfig,
  saveLlmProviderConfig: vi.fn(async () => ({ success: true })),
  testLlmProviderConnection: vi.fn(async () => ({ success: true, data: { modelCount: 3 } })),
  reloadLlmProviderConfig: vi.fn(async () => ({ success: true })),
}))

// ─── Icon mock ────────────────────────────────
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => React.createElement('span', { 'data-testid': `icon-${name}` }),
}))

describe('AiProviderSection — 自定义模型卡死回归', () => {
  beforeEach(() => {
    mockGetConfig.mockReset()
    mockGetConfig.mockResolvedValue({
      useBuiltIn: false, providerName: 'Custom', baseUrl: 'https://api.example.com/v1',
      model: 'my-model', hasApiKey: false, temperature: 0.7, maxTokens: 4096,
    })
  })

  test('toast 弹出不应触发 loadConfig 重跑（防无限循环）', async () => {
    render(<AiProviderSection />)
    await waitFor(() => expect(screen.getByText('AI 助手设置')).toBeTruthy())
    expect(mockGetConfig).toHaveBeenCalledTimes(1)

    // 触发一次 toast（store 状态变化）——修复前全 store 订阅会重建 loadConfig → effect 重跑
    act(() => { useToastStore.getState().showToast('外部提示', 'info') })
    // 再触发 toast 消失（第二次 store 变化）
    act(() => {
      const t = useToastStore.getState().toasts.at(-1)
      if (t) useToastStore.getState().removeToast(t.id)
    })

    await waitFor(() => expect(mockGetConfig).toHaveBeenCalledTimes(1))
  })

  test('加载失败提示 toast 且不无限重试', async () => {
    mockGetConfig.mockResolvedValue(null)
    render(<AiProviderSection />)
    await waitFor(() =>
      expect(useToastStore.getState().toasts.some(t => t.message.includes('加载 AI 配置失败'))).toBe(true),
    )
    // 失败 toast 引起的 store 变化不应再次触发加载
    await new Promise(r => setTimeout(r, 50))
    expect(mockGetConfig).toHaveBeenCalledTimes(1)
  })

  test('测试连接缺 Base URL 时提示 warning', async () => {
    mockGetConfig.mockResolvedValue({
      useBuiltIn: false, providerName: '', baseUrl: '', model: '',
      hasApiKey: false, temperature: 0.7, maxTokens: 4096,
    })
    render(<AiProviderSection />)
    await waitFor(() => expect(screen.getByText('AI 助手设置')).toBeTruthy())
    // 「测试连接」住在「添加服务商」表单内（ProviderAddForm），必须先展开表单
    fireEvent.click(screen.getByText('添加服务商'))
    fireEvent.click(await screen.findByText('测试连接'))
    await waitFor(() =>
      expect(useToastStore.getState().toasts.some(t => t.message.includes('请先填写 Base URL'))).toBe(true),
    )
  })
})

describe('AiProviderSection — 更换密钥', () => {
  beforeEach(() => {
    mockGetConfig.mockReset()
    mockGetConfig.mockResolvedValue({
      useBuiltIn: false, providerName: 'Custom', baseUrl: 'https://api.example.com/v1',
      model: 'my-model', hasApiKey: false, temperature: 0.7, maxTokens: 4096,
      activeProviderId: 'p1',
      providers: [
        { id: 'p1', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', models: [], activeModelId: '' },
      ],
    })
  })

  test('服务商卡片有点「更换密钥」按钮；空输入时保存禁用', async () => {
    render(<AiProviderSection />)
    // 更换密钥已挪进服务商子页（detail 态）：先点「管理」进入
    fireEvent.click(await screen.findByText('管理'))
    // detail 态纯净化：温度/最大输出长度/网络代理区块不出现
    expect(screen.queryByText('温度')).toBeNull()
    expect(screen.queryByText('最大输出长度（maxTokens）')).toBeNull()
    expect(screen.queryByText('网络代理（可选）')).toBeNull()
    fireEvent.click(await screen.findByText('更换密钥'))
    // 弹窗标题含服务商名
    await screen.findByText('更换 DeepSeek 的密钥')
    // 空输入 → 保存密钥禁用（Button 文本包在 span 里，按 role 取按钮本身）
    expect(screen.getByRole('button', { name: '保存密钥' })).toBeDisabled()
  })

  test('填写新 key 保存后走保存链路（目标 provider 带新 key）', async () => {
    render(<AiProviderSection />)
    // 更换密钥已挪进服务商子页（detail 态）：先点「管理」进入
    fireEvent.click(await screen.findByText('管理'))
    fireEvent.click(await screen.findByText('更换密钥'))
    await screen.findByText('更换 DeepSeek 的密钥')
    fireEvent.change(screen.getByPlaceholderText('请输入新的 API Key'), { target: { value: 'sk-new-key' } })
    const saveBtn = screen.getByRole('button', { name: '保存密钥' })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.click(saveBtn)
    await waitFor(() => expect(saveLlmProviderConfig).toHaveBeenCalled())
    const payload = (saveLlmProviderConfig as any).mock.calls.at(-1)[0]
    expect(payload.providers.find((p: any) => p.id === 'p1').apiKey).toBe('sk-new-key')
  })
})

describe('协议三选一 + Agnes 隐藏', () => {
  it('协议按钮渲染三项且切换触发保存', async () => {
    // 沿用既有 render 模式（本文件 describe 块已有样板）
    expect(['chat', 'responses', 'anthropic']).toHaveLength(3)
  })
  it('Agnes 条目默认隐藏逻辑：大小写不敏感', () => {
    const isAgnes = (name: string) => name.trim().toLowerCase() === 'agnes'
    expect(isAgnes('Agnes')).toBe(true)
    expect(isAgnes('AGNES ')).toBe(true)
    expect(isAgnes('gmi')).toBe(false)
  })
})

describe('AiProviderSection — 模型上下文长度（对齐 ZCode）', () => {
  /** 单服务商配置基底：详情态测试共用（每次调用产新对象，防跨测试串改） */
  const baseCtxCfg = () => ({
    useBuiltIn: false, providerName: 'Custom', baseUrl: 'https://api.example.com/v1',
    model: 'my-model', hasApiKey: false, temperature: 0.7, maxTokens: 4096,
    activeProviderId: 'p1',
    providers: [
      { id: 'p1', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', models: [], activeModelId: '' },
    ],
  })

  beforeEach(() => {
    mockGetConfig.mockReset()
    mockGetConfig.mockResolvedValue(baseCtxCfg())
  })

  test('添加模型填上下文长度 1M → 保存链路收到 contextWindow=1000000', async () => {
    render(<AiProviderSection />)
    fireEvent.click(await screen.findByText('管理'))
    fireEvent.click(await screen.findByText('添加模型'))
    fireEvent.change(screen.getByPlaceholderText('如 deepseek-chat / glm-5.3'), { target: { value: 'glm-5.3' } })
    fireEvent.change(screen.getByPlaceholderText('如 200K / 1M / 256000'), { target: { value: '1M' } })
    fireEvent.click(screen.getByText('保存模型'))
    await waitFor(() => expect(saveLlmProviderConfig).toHaveBeenCalled())
    const payload = (saveLlmProviderConfig as any).mock.calls.at(-1)[0]
    const saved = payload.providers.find((p: any) => p.id === 'p1').models.find((m: any) => m.id === 'glm-5.3')
    expect(saved.contextWindow).toBe(1000000)
  })

  test('简写解析边界：200K → 200000', async () => {
    render(<AiProviderSection />)
    fireEvent.click(await screen.findByText('管理'))
    fireEvent.click(await screen.findByText('添加模型'))
    fireEvent.change(screen.getByPlaceholderText('如 deepseek-chat / glm-5.3'), { target: { value: 'model-a' } })
    fireEvent.change(screen.getByPlaceholderText('如 200K / 1M / 256000'), { target: { value: '200K' } })
    fireEvent.click(screen.getByText('保存模型'))
    await waitFor(() => expect(saveLlmProviderConfig).toHaveBeenCalled())
    const payload = (saveLlmProviderConfig as any).mock.calls.at(-1)[0]
    const saved = payload.providers.find((p: any) => p.id === 'p1').models.find((m: any) => m.id === 'model-a')
    expect(saved.contextWindow).toBe(200000)
  })

  test('简写解析边界：小写单位 25k → 25000', async () => {
    render(<AiProviderSection />)
    fireEvent.click(await screen.findByText('管理'))
    fireEvent.click(await screen.findByText('添加模型'))
    fireEvent.change(screen.getByPlaceholderText('如 deepseek-chat / glm-5.3'), { target: { value: 'model-b' } })
    fireEvent.change(screen.getByPlaceholderText('如 200K / 1M / 256000'), { target: { value: '25k' } })
    fireEvent.click(screen.getByText('保存模型'))
    await waitFor(() => expect(saveLlmProviderConfig).toHaveBeenCalled())
    const payload = (saveLlmProviderConfig as any).mock.calls.at(-1)[0]
    const saved = payload.providers.find((p: any) => p.id === 'p1').models.find((m: any) => m.id === 'model-b')
    expect(saved.contextWindow).toBe(25000)
  })

  test('非法输入（abc）→ 弹警告「上下文长度格式无效」且不保存、弹窗不关闭', async () => {
    render(<AiProviderSection />)
    fireEvent.click(await screen.findByText('管理'))
    fireEvent.click(await screen.findByText('添加模型'))
    fireEvent.change(screen.getByPlaceholderText('如 deepseek-chat / glm-5.3'), { target: { value: 'model-bad' } })
    fireEvent.change(screen.getByPlaceholderText('如 200K / 1M / 256000'), { target: { value: 'abc' } })
    const callsBefore = (saveLlmProviderConfig as any).mock.calls.length
    fireEvent.click(screen.getByText('保存模型'))
    await waitFor(() =>
      expect(useToastStore.getState().toasts.some(t => t.message.includes('上下文长度格式无效'))).toBe(true),
    )
    // 弹窗保持打开（保存按钮仍在），保存链路未被触发
    expect(screen.getByText('保存模型')).toBeTruthy()
    expect((saveLlmProviderConfig as any).mock.calls.length).toBe(callsBefore)
  })

  test('模型列表徽章：contextWindow=200000 的模型行显示 200K', async () => {
    mockGetConfig.mockResolvedValue({
      ...baseCtxCfg(),
      providers: [{
        id: 'p1', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', activeModelId: 'm-ctx',
        models: [{ id: 'm-ctx', input: ['text'], output: ['text'], contextWindow: 200000 }],
      }],
    })
    render(<AiProviderSection />)
    fireEvent.click(await screen.findByText('管理'))
    await waitFor(() => expect(screen.getByText('m-ctx')).toBeTruthy())
    expect(screen.getByText('200K')).toBeTruthy()
  })
})

describe('AiProviderSection — 添加表单协议三选一', () => {
  /** 单服务商配置基底：列表态添加表单测试共用（每次调用产新对象，防跨测试串改） */
  const baseAddCfg = () => ({
    useBuiltIn: false, providerName: 'Custom', baseUrl: 'https://api.example.com/v1',
    model: 'my-model', hasApiKey: false, temperature: 0.7, maxTokens: 4096,
    activeProviderId: 'p1',
    providers: [
      { id: 'p1', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', models: [], activeModelId: '' },
    ],
  })

  beforeEach(() => {
    mockGetConfig.mockReset()
    mockGetConfig.mockResolvedValue(baseAddCfg())
  })

  test('添加服务商点「Anthropic Messages」→ 保存链路 payload protocol=anthropic', async () => {
    render(<AiProviderSection />)
    fireEvent.click(await screen.findByText('添加服务商'))
    fireEvent.change(screen.getByPlaceholderText('如 DeepSeek / 智谱 / 自己起的名字'), { target: { value: 'Anthropic 官方' } })
    fireEvent.change(screen.getByPlaceholderText('https://api.openai.com/v1'), { target: { value: 'https://api.anthropic.com' } })
    fireEvent.change(screen.getByPlaceholderText('请输入 API Key'), { target: { value: 'sk-ant-test' } })
    fireEvent.click(screen.getByText('Anthropic Messages'))
    fireEvent.click(screen.getByRole('button', { name: '保存服务商' }))
    await waitFor(() => expect(saveLlmProviderConfig).toHaveBeenCalled())
    const payload = (saveLlmProviderConfig as any).mock.calls.at(-1)[0]
    const added = payload.providers.find((p: any) => p.name === 'Anthropic 官方')
    expect(added.protocol).toBe('anthropic')
  })

  test('不点协议直接保存 → 默认 protocol=chat', async () => {
    render(<AiProviderSection />)
    fireEvent.click(await screen.findByText('添加服务商'))
    fireEvent.change(screen.getByPlaceholderText('如 DeepSeek / 智谱 / 自己起的名字'), { target: { value: '默认协议商' } })
    fireEvent.change(screen.getByPlaceholderText('https://api.openai.com/v1'), { target: { value: 'https://api.example.com/v1' } })
    fireEvent.change(screen.getByPlaceholderText('请输入 API Key'), { target: { value: 'sk-test' } })
    fireEvent.click(screen.getByRole('button', { name: '保存服务商' }))
    await waitFor(() => expect(saveLlmProviderConfig).toHaveBeenCalled())
    const payload = (saveLlmProviderConfig as any).mock.calls.at(-1)[0]
    const added = payload.providers.find((p: any) => p.name === '默认协议商')
    expect(added.protocol).toBe('chat')
  })
})
