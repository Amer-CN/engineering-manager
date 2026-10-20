import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * tauri-bridge 默认税率解析（P1/T1b）契约测试
 *
 * 锁死 GET /api/tax-rates/resolve 的调用形状：
 * - 必须是 **GET**（读端点，不是 POST —— 历史 POST 版被迫挂写权限门，已改回 GET）；
 * - query 拼接：date / businessType / partnerTaxType / itemCategory 逐项落到 searchParams；
 * - undefined/null 维度必须被过滤掉（不下发空 query），避免后端把空串当维度值匹配。
 *
 * 判定方式同 contract-bridge.test.ts：mock global.fetch，检查真实 URL 与 method。
 */

let capture: { url: string; method: string }[] = []

function mockFetch(data: unknown = { rateId: 6, code: 'VAT13', rate: 0.13, matchedBy: 'rule' }) {
  global.fetch = vi.fn(async (url: any, init?: any) => {
    capture.push({ url: String(url), method: (init?.method || 'GET').toUpperCase() })
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as any
}

async function loadBridge() {
  const mod = await import('@/services/tauri-bridge')
  return mod.tauriAPI as any
}

/** 取最近一次请求的 URL query（用 URL 解析，避免断言受参数顺序影响） */
function lastQuery(): URLSearchParams {
  const last = capture[capture.length - 1]
  return new URL(last.url).searchParams
}

describe('tauri-bridge 默认税率解析（resolveTaxRate）契约', () => {
  beforeEach(() => {
    capture = []
    localStorage.removeItem('jwt_token')
    mockFetch()
  })
  afterEach(() => vi.restoreAllMocks())

  it('resolveTaxRate 存在，且走 GET /api/tax-rates/resolve', async () => {
    const api = await loadBridge()
    expect(typeof api.resolveTaxRate).toBe('function')

    await api.resolveTaxRate({ date: '2026-10-21', partnerTaxType: 'general' })

    expect(capture).toHaveLength(1)
    expect(capture[0].method).toBe('GET')
    expect(new URL(capture[0].url).pathname).toBe('/api/tax-rates/resolve')
  })

  it('四维入参逐项拼进 query（date/businessType/partnerTaxType/itemCategory）', async () => {
    const api = await loadBridge()
    await api.resolveTaxRate({
      date: '2026-10-21',
      businessType: 'material',
      partnerTaxType: 'general',
      itemCategory: 'goods',
    })

    const q = lastQuery()
    expect(q.get('date')).toBe('2026-10-21')
    expect(q.get('businessType')).toBe('material')
    expect(q.get('partnerTaxType')).toBe('general')
    expect(q.get('itemCategory')).toBe('goods')
    expect([...q.keys()]).toHaveLength(4)
  })

  it('undefined/null 维度被过滤，不下发空 query（仅 date）', async () => {
    const api = await loadBridge()
    await api.resolveTaxRate({
      date: '2026-10-21',
      businessType: undefined,
      partnerTaxType: undefined,
      itemCategory: undefined,
    })

    const q = lastQuery()
    expect(q.get('date')).toBe('2026-10-21')
    expect([...q.keys()]).toEqual(['date'])
    expect(capture[0].url).not.toContain('undefined')
    expect(capture[0].url).not.toContain('null')
  })

  it('空入参对象 → 无 query（后端自行缺省今天）', async () => {
    const api = await loadBridge()
    await api.resolveTaxRate({})

    expect(new URL(capture[0].url).search).toBe('')
  })

  it('解包 data：matchedBy=rule 的原样返回给调用点', async () => {
    const api = await loadBridge()
    const res = await api.resolveTaxRate({ partnerTaxType: 'general' })

    expect(res.success).toBe(true)
    expect(res.data).toEqual({ rateId: 6, code: 'VAT13', rate: 0.13, matchedBy: 'rule' })
  })

  it('matchedBy=none（rate=null）也按成功返回，由调用点决定不改税率', async () => {
    mockFetch({ rateId: null, code: null, rate: null, matchedBy: 'none' })
    const api = await loadBridge()
    const res = await api.resolveTaxRate({ date: '2026-10-21' })

    expect(res.success).toBe(true)
    expect(res.data).toEqual({ rateId: null, code: null, rate: null, matchedBy: 'none' })
  })
})
