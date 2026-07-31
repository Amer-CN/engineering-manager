import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * tauri-bridge 合同 CRUD 端点回归测试
 *
 * 锁死「其他协议(agreement)」的 增/删/改 桥接方法存在且打对端点——
 * 历史 bug：electron.d.ts 声明了 createAgreementContract/update/delete、
 * contractConfig 也在调，但 tauri-bridge 只实现了 getAgreementContracts，
 * 三个写方法缺失 → 新建/编辑/删除「其他协议」运行时崩溃。
 * 本测试通过 mock fetch 拦截真实 URL，确保三类合同 CRUD 对称、不再回归。
 */

let capture: { url: string; method: string }[] = []

function mockFetch() {
  global.fetch = vi.fn(async (url: any, init?: any) => {
    capture.push({ url: String(url), method: (init?.method || 'GET').toUpperCase() })
    return new Response(JSON.stringify({ success: true, data: { id: 1 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as any
}

async function loadBridge() {
  const mod = await import('@/services/tauri-bridge')
  return mod.tauriAPI as any
}

describe('tauri-bridge 合同 CRUD 端点对称性', () => {
  beforeEach(() => { capture = []; mockFetch() })
  afterEach(() => vi.restoreAllMocks())

  it('三类合同的 create 方法均存在且打对端点', async () => {
    const api = await loadBridge()
    for (const [fn, path] of [
      ['createIncomeContract', '/api/contracts/income'],
      ['createExpenseContract', '/api/contracts/expense'],
      ['createAgreementContract', '/api/contracts/agreement'], // 历史缺失项
    ] as const) {
      expect(typeof api[fn]).toBe('function')
      await api[fn]({ name: 't' })
      expect(capture.some(c => c.url.endsWith(path) && c.method === 'POST')).toBe(true)
    }
  })

  it('三类合同的 update 方法均存在且打对端点', async () => {
    const api = await loadBridge()
    for (const [fn, path] of [
      ['updateIncomeContract', '/api/contracts/income'],
      ['updateExpenseContract', '/api/contracts/expense'],
      ['updateAgreementContract', '/api/contracts/agreement'], // 历史缺失项
    ] as const) {
      expect(typeof api[fn]).toBe('function')
      await api[fn]({ id: 1, name: 't' })
      expect(capture.some(c => c.url.endsWith(path) && c.method === 'PUT')).toBe(true)
    }
  })

  it('三类合同的 delete 方法均存在且打对端点（含 id）', async () => {
    const api = await loadBridge()
    for (const [fn, path] of [
      ['deleteIncomeContract', '/api/contracts/income/9'],
      ['deleteExpenseContract', '/api/contracts/expense/9'],
      ['deleteAgreementContract', '/api/contracts/agreement/9'], // 历史缺失项
    ] as const) {
      expect(typeof api[fn]).toBe('function')
      await api[fn](9)
      expect(capture.some(c => c.url.endsWith(path) && c.method === 'DELETE')).toBe(true)
    }
  })
})
