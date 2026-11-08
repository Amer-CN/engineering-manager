/**
 * useTaxRates / useResolveTaxRate（P1 税率主数据 + T1b 默认税率解析）hook 测试
 *
 * useTaxRates 覆盖验收 4 的两条路径：
 * - 正常：GET /api/tax-rates 成功 → 返回主数据；
 * - 异常：success=false 或抛错 → query 进入 error（调用点据此回落 constants 兜底）。
 *
 * useResolveTaxRate 覆盖 T1b mutation 两路径：
 * - 成功：返回解析结果（含 matchedBy=none 不猜值）；
 * - 失败：success=false / 抛错 → mutation 进入 error（调用点提示「取默认税率失败」）。
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

describe('useResolveTaxRate（T1b 默认税率解析 mutation）', () => {
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

  it('成功：命中规则 → 返回 rate/matchedBy=rule，且入参透传给 resolveTaxRate', async () => {
    const resolveTaxRate = vi.fn().mockResolvedValue({
      success: true,
      data: { rateId: 6, code: 'VAT13', rate: 0.13, matchedBy: 'rule' },
    })
    mockGetAPI.mockResolvedValue({ resolveTaxRate })

    const { useResolveTaxRate } = await import('../../hooks/data/useTaxRates')
    const { result } = renderHook(() => useResolveTaxRate(), { wrapper })

    // 关键：不点击（不 mutate）时不得发出任何请求 —— 禁止自动解析
    expect(resolveTaxRate).not.toHaveBeenCalled()

    const res = await result.current.mutateAsync({ date: '2026-10-21', partnerTaxType: 'general' })
    expect(res).toEqual({ rateId: 6, code: 'VAT13', rate: 0.13, matchedBy: 'rule' })
    expect(resolveTaxRate).toHaveBeenCalledWith({ date: '2026-10-21', partnerTaxType: 'general' })
  })

  it('成功：matchedBy=none（rate=null）原样返回，不猜默认值', async () => {
    mockGetAPI.mockResolvedValue({
      resolveTaxRate: vi.fn().mockResolvedValue({
        success: true,
        data: { rateId: null, code: null, rate: null, matchedBy: 'none' },
      }),
    })

    const { useResolveTaxRate } = await import('../../hooks/data/useTaxRates')
    const { result } = renderHook(() => useResolveTaxRate(), { wrapper })

    const res = await result.current.mutateAsync({ date: '2026-10-21' })
    expect(res.matchedBy).toBe('none')
    expect(res.rate).toBeNull()
  })

  it('失败：success=false → mutation 进入 error（调用点据此提示失败）', async () => {
    mockGetAPI.mockResolvedValue({
      resolveTaxRate: vi.fn().mockResolvedValue({ success: false, error: '后端不可用' }),
    })

    const { useResolveTaxRate } = await import('../../hooks/data/useTaxRates')
    const { result } = renderHook(() => useResolveTaxRate(), { wrapper })

    await expect(result.current.mutateAsync({ date: '2026-10-21' })).rejects.toThrow('后端不可用')
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('后端不可用')
  })

  it('失败：请求抛错 → mutation 进入 error', async () => {
    mockGetAPI.mockResolvedValue({
      resolveTaxRate: vi.fn().mockRejectedValue(new Error('网络异常')),
    })

    const { useResolveTaxRate } = await import('../../hooks/data/useTaxRates')
    const { result } = renderHook(() => useResolveTaxRate(), { wrapper })

    await expect(result.current.mutateAsync({ date: '2026-10-21' })).rejects.toThrow('网络异常')
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('失败：success=true 但 data 缺失 → 回落 matchedBy=none（不返回 undefined）', async () => {
    mockGetAPI.mockResolvedValue({
      resolveTaxRate: vi.fn().mockResolvedValue({ success: true }),
    })

    const { useResolveTaxRate } = await import('../../hooks/data/useTaxRates')
    const { result } = renderHook(() => useResolveTaxRate(), { wrapper })

    const res = await result.current.mutateAsync({ date: '2026-10-21' })
    expect(res).toEqual({ rateId: null, code: null, rate: null, matchedBy: 'none' })
  })
})
