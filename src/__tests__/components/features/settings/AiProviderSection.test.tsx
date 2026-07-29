import { describe, test, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AiProviderSection } from '@/components/features/settings/AiProviderSection'
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
    fireEvent.click(screen.getByText('测试连接'))
    await waitFor(() =>
      expect(useToastStore.getState().toasts.some(t => t.message.includes('请先填写 Base URL'))).toBe(true),
    )
  })
})
