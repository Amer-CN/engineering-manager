/**
 * useTaxRates（P1/T1 税率主数据）hook 测试
 *
 * 覆盖验收 4 的两条路径：
 * - 正常：GET /api/tax-rates 成功 → 返回主数据；
 * - 异常：success=false 或抛错 → query 进入 error（调用点据此回落 constants 兜底）。
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockGetAPI = vi.fn()
vi.mock('@/services/api-adapter', () => ({ getAPI: () => mockGetAPI() }))

describe('useTaxRates', () => {
  let client: QueryClient
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children as any)

  beforeEach(() => {
    mockGetAPI.mockReset()
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  afterEach(() => {
    client.clear()
  })

  it('正常：成功返回 6 档主数据', async () => {
    const data = [
      { id: 1, code: 'VAT0', name: '不征税', rate: 0 },
      { id: 2, code: 'VAT1', name: '1%', rate: 0.01 },
      { id: 3, code: 'VAT3', name: '3%', rate: 0.03 },
      { id: 4, code: 'VAT6', name: '6%', rate: 0.06 },
      { id: 5, code: 'VAT9', name: '9%', rate: 0.09 },
      { id: 6, code: 'VAT13', name: '13%', rate: 0.13 },
    ]
    mockGetAPI.mockResolvedValue({ getTaxRates: vi.fn().mockResolvedValue({ success: true, data }) })

    const { useTaxRates } = await import('../../hooks/data/useTaxRates')
    const { result } = renderHook(() => useTaxRates(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(6)
    expect(result.current.data?.[5].code).toBe('VAT13')
    expect(result.current.data?.[5].rate).toBe(0.13)
  })

  it('异常：success=false 时 throw，进入 error 供调用点兜底', async () => {
    mockGetAPI.mockResolvedValue({
      getTaxRates: vi.fn().mockResolvedValue({ success: false, error: '后端不可用' }),
    })

    const { useTaxRates } = await import('../../hooks/data/useTaxRates')
    const { result } = renderHook(() => useTaxRates(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('后端不可用')
  })

  it('异常：请求抛错时进入 error', async () => {
    mockGetAPI.mockResolvedValue({
      getTaxRates: vi.fn().mockRejectedValue(new Error('网络异常')),
    })

    const { useTaxRates } = await import('../../hooks/data/useTaxRates')
    const { result } = renderHook(() => useTaxRates(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('网络异常')
  })

  it('data 缺省时返回空数组（不返回 undefined）', async () => {
    mockGetAPI.mockResolvedValue({ getTaxRates: vi.fn().mockResolvedValue({ success: true }) })

    const { useTaxRates } = await import('../../hooks/data/useTaxRates')
    const { result } = renderHook(() => useTaxRates(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
