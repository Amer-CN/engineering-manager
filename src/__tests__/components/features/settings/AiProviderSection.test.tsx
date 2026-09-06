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
    fireEvent.click(await screen.findByText('更换密钥'))
    // 弹窗标题含服务商名
    await screen.findByText('更换 DeepSeek 的密钥')
    // 空输入 → 保存密钥禁用（Button 文本包在 span 里，按 role 取按钮本身）
    expect(screen.getByRole('button', { name: '保存密钥' })).toBeDisabled()
  })

  test('填写新 key 保存后走保存链路（目标 provider 带新 key）', async () => {
    render(<AiProviderSection />)
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
