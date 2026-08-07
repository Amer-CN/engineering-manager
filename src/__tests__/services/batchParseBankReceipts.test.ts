import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * K-2 批量回单解析（tauri-bridge batchParseBankReceipts）测试
 *
 * 锁死 C#/HTTP 模式批量解析实现的行为契约：
 * - N 文件 → N 次单张解析调用（recognizeBankReceipt，即 POST /api/ocr/bank-receipt）
 * - 单张失败隔离：failedFiles 记 { path, error }，其余文件继续
 * - 返回形状与 electron.d.ts BatchParseResult 逐字段一致（J-1 useBankReceiptBatch 消费）
 * - 保持输入顺序（results / failedFiles 按输入文件顺序）
 * - 并发上限 3 生效（mock 计数断言，同一时刻 in-flight ≤ 3）
 *
 * 失败语义按「文件路径」判定（非调用序）：fetch mock 按 URL 的 fileName 参数返回
 * 不同的 dataUrl（base64 = 文件名），识别 mock 反解 base64 得到文件名——并发时序无关。
 */

// vi.mock 工厂提升到顶层，状态必须经 vi.hoisted 传递
const state = vi.hoisted(() => ({
  calls: [] as string[],               // 单张解析收到的文件名（按调用序）
  active: 0,                           // 当前 in-flight 数
  maxActive: 0,                        // 峰值并发
  failurePaths: [] as string[],        // 模拟解析失败的文件路径集合
}))

vi.mock('@/services/ocr/bankReceipt', () => ({
  recognizeBankReceipt: vi.fn(async (imageBase64: string) => {
    const fileName = atob(imageBase64)
    state.calls.push(fileName)
    state.active++
    state.maxActive = Math.max(state.maxActive, state.active)
    await new Promise(r => setTimeout(r, 5))
    state.active--
    if (state.failurePaths.includes(fileName)) {
      return { success: false, error: '模拟单张解析失败' }
    }
    return {
      success: true,
      text: '银行回单识别文本',
      bankReceipt: {
        transactionDate: '2024-01-15',
        transactionTime: '10:30:00',
        amount: 1234.5,
        payerName: '付款人甲',
        payerAccount: '6222000000000099',
        payeeName: '收款人乙',
        payeeAccount: '6222000000000001',
        transactionNo: 'TXN001',
        bankName: '测试银行',
        remarks: '工资',
      },
    }
  }),
}))

let readCount = 0

function mockFetch() {
  readCount = 0
  global.fetch = vi.fn(async (url: any) => {
    const u = String(url)
    if (u.includes('/api/files/read')) {
      readCount++
      // 按 URL 的 fileName 参数返回不同 dataUrl（base64 = 文件名，供识别 mock 反解）
      const fileName = decodeURIComponent(new URL(u, 'http://localhost').searchParams.get('fileName') || 'unknown')
      return new Response(
        JSON.stringify({ success: true, data: { dataUrl: `data:image/jpeg;base64,${btoa(fileName)}`, mimeType: 'image/jpeg' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new Response(
      JSON.stringify({ success: true, data: {} }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }) as any
}

async function loadBridge() {
  const mod = await import('@/services/tauri-bridge')
  return mod.tauriAPI as any
}

describe('tauri-bridge batchParseBankReceipts（C#/HTTP 模式批量回单解析）', () => {
  beforeEach(() => {
    state.calls.length = 0
    state.active = 0
    state.maxActive = 0
    state.failurePaths = []
    mockFetch()
  })

  afterEach(() => vi.restoreAllMocks())

  it('N 文件 → N 次单张调用，且结果形状与 BatchParseResult 逐字段一致', async () => {
    const api = await loadBridge()
    const files = ['2024-01_a.jpg', '2024-01_b.jpg', '2024-01_c.jpg', '2024-01_d.jpg']

    const res = await api.batchParseBankReceipts(files, 1, '2024-01')

    // N 次单张调用（识别）+ N 次文件读取
    expect(state.calls.length).toBe(4)
    expect(readCount).toBe(4)
    // 全部成功
    expect(res.success).toBe(true)
    expect(res.data).toMatchObject({
      successCount: 4,
      failCount: 0,
      matches: [],
      failedFiles: [],
    })
    // BatchParseResult 形状：results 每项为 ParsedBankReceipt（date/totalAmount/successAmount/failCount/items/receiptPath）
    expect(res.data.results).toHaveLength(4)
    for (const r of res.data.results) {
      expect(r).toMatchObject({
        date: '2024-01-15',
        totalAmount: 1234.5,
        successAmount: 1234.5,
        failCount: 0,
        receiptPath: expect.any(String),
      })
      expect(Array.isArray(r.items)).toBe(true)
      expect(r.items[0]).toMatchObject({ name: '收款人乙', amount: 1234.5, status: '成功' })
    }
    // 无多余字段
    expect(Object.keys(res.data).sort()).toEqual(['failCount', 'failedFiles', 'matches', 'results', 'successCount'])
  })

  it('单张失败隔离：failedFiles 记 { path, error }，其余文件继续解析', async () => {
    const api = await loadBridge()
    state.failurePaths = ['f2.jpg'] // 第 2 个文件失败
    const files = ['f1.jpg', 'f2.jpg', 'f3.jpg']

    const res = await api.batchParseBankReceipts(files)

    expect(state.calls.length).toBe(3) // 3 个文件都调用了单张解析（失败不短路）
    expect(res.data.successCount).toBe(2)
    expect(res.data.failCount).toBe(1)
    expect(res.data.results.map((r: any) => r.receiptPath)).toEqual(['f1.jpg', 'f3.jpg'])
    expect(res.data.failedFiles).toEqual([{ path: 'f2.jpg', error: '模拟单张解析失败' }])
  })

  it('文件读取失败同样隔离进 failedFiles，且不触发 OCR', async () => {
    const api = await loadBridge()
    global.fetch = vi.fn(async (url: any) => {
      const u = String(url)
      if (u.includes('/api/files/read')) {
        readCount++
        return new Response(
          JSON.stringify({ success: false, error: '文件不存在' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ success: true, data: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }) as any

    const res = await api.batchParseBankReceipts(['x.jpg'])

    expect(res.data.successCount).toBe(0)
    expect(res.data.failedFiles).toEqual([{ path: 'x.jpg', error: '文件不存在' }])
    expect(state.calls.length).toBe(0) // 读取失败不触发 OCR
  })

  it('保持输入顺序：results 顺序与输入 filePaths 一致', async () => {
    const api = await loadBridge()
    const files = ['first.jpg', 'second.jpg', 'third.jpg', 'fourth.jpg', 'fifth.jpg', 'sixth.jpg']

    const res = await api.batchParseBankReceipts(files)

    expect(res.data.results.map((r: any) => r.receiptPath)).toEqual(files)
  })

  it('并发上限 3 生效：同一时刻 in-flight 单张调用 ≤ 3', async () => {
    const api = await loadBridge()
    const files = Array.from({ length: 6 }, (_, i) => `f${i}.jpg`)

    await api.batchParseBankReceipts(files)

    // 6 个文件 + 5ms 延迟：串行则峰值 1，全开则峰值 6，窗口实现应为 3
    expect(state.maxActive).toBeLessThanOrEqual(3)
    expect(state.maxActive).toBeGreaterThan(1) // 证明确有并发（非串行）
  })
})
