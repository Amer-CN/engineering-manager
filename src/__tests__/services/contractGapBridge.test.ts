import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * L-1 契约缺口补齐（tauri-bridge openExternalFile / parseBankReceipt）测试
 *
 * 锁死 C#/HTTP 模式两个补全方法的行为契约：
 * - openExternalFile → POST /api/files/open-external，透传调用方 options 原样（subCategory/projectName
 *   不消费但透传无害，后端 open-external handler 只读 category+fileName）
 * - 成功：后端 Common.Ok() = { success: true, data: null } → 返回形状与 electron.d.ts 声明一致
 * - 失败：后端 Fail/NotFound = { success: false, error } → 如实上抛，不吞错
 * - parseBankReceipt(filePath) → 单文件版 K-2 链路（readFile 读 base64 → recognizeBankReceipt），
 *   返回形状与 electron.d.ts ParsedBankReceipt 逐字段一致
 * - 错误如实上抛：文件读取失败 / OCR 失败 → { success: false, error }，不假成功
 *
 * 前端活调用方实况（L-1 取证）：
 * - openExternalFile：FileUploader.tsx / WagePaymentRecords.tsx（2 处，均不消费返回值）
 * - parseBankReceipt：useWageActions.ts / useBankReceipt.ts（2 处，消费 data.date/items/receiptPath/rawTextSnippet/totalAmount/successAmount）
 * 与 electron.d.ts 声明均无冲突；WageManagement.test.tsx 另有 1 处 mock（非活调用方）。
 */

const state = vi.hoisted(() => ({
  ocrCalls: [] as string[],          // 单张解析收到的 base64（供反解断言读取路径）
  failureMode: '' as '' | 'ocr' | 'read',
}))

vi.mock('@/services/ocr/bankReceipt', () => ({
  recognizeBankReceipt: vi.fn(async (imageBase64: string) => {
    state.ocrCalls.push(imageBase64)
    if (state.failureMode === 'ocr') {
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

let capture: { url: string; method: string; body?: any }[] = []

function mockFetch() {
  capture = []
  global.fetch = vi.fn(async (url: any, init?: any) => {
    const u = String(url)
    const method = (init?.method || 'GET').toUpperCase()
    let body: any
    try { body = init?.body ? JSON.parse(init.body) : undefined } catch { /* non-JSON */ }

    if (u.includes('/api/files/open-external')) {
      capture.push({ url: u, method, body })
      // 默认成功：后端 Common.Ok() = { success: true, data: null }
      return new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (u.includes('/api/files/read')) {
      capture.push({ url: u, method })
      if (state.failureMode === 'read') {
        return new Response(JSON.stringify({ success: false, error: '文件不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
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

describe('tauri-bridge openExternalFile（L-1 契约缺口补齐）', () => {
  beforeEach(() => { state.failureMode = ''; mockFetch() })
  afterEach(() => vi.restoreAllMocks())

  it('POST /api/files/open-external，透传调用方 options 原样', async () => {
    const api = await loadBridge()
    const options = { category: 'costLedger', subCategory: 'files', fileName: 'report.pdf', projectName: '某项目' }

    const res = await api.openExternalFile(options)

    expect(capture).toHaveLength(1)
    expect(capture[0].url.endsWith('/api/files/open-external')).toBe(true)
    expect(capture[0].method).toBe('POST')
    expect(capture[0].body).toEqual(options) // 原样透传，不篡改
    // 返回形状：后端 Common.Ok() = { success: true, data: null }，桥接层如实透传信封
    expect(res.success).toBe(true)
    expect(res.error).toBeUndefined()
    expect(res.data).toBe(null)
  })

  it('projectName 省略（可选参数）时同样可调用', async () => {
    const api = await loadBridge()
    const options = { category: 'bank_receipts', subCategory: '', fileName: 'r.jpg' }

    const res = await api.openExternalFile(options)

    expect(capture[0].body).toEqual(options)
    expect(res.success).toBe(true)
  })

  it('后端失败如实上抛：{ success: false, error }，不吞错、不假成功', async () => {
    const api = await loadBridge()
    global.fetch = vi.fn(async (url: any) => {
      const u = String(url)
      if (u.includes('/api/files/open-external')) {
        return new Response(
          JSON.stringify({ success: false, error: '不支持的文件类型,仅允许文档和图片' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 })
    }) as any

    const res = await api.openExternalFile({ category: 'c', subCategory: '', fileName: 'evil.exe' })

    expect(res).toEqual({ success: false, error: '不支持的文件类型,仅允许文档和图片' })
  })

  it('后端文件不存在（404）如实上抛', async () => {
    const api = await loadBridge()
    global.fetch = vi.fn(async (url: any) => {
      const u = String(url)
      if (u.includes('/api/files/open-external')) {
        return new Response(
          JSON.stringify({ success: false, error: '文件不存在' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 })
    }) as any

    const res = await api.openExternalFile({ category: 'c', subCategory: '', fileName: 'missing.pdf' })

    expect(res).toEqual({ success: false, error: '文件不存在' })
  })
})

describe('tauri-bridge parseBankReceipt（L-1 单文件版 K-2 链路）', () => {
  beforeEach(() => { state.failureMode = ''; state.ocrCalls.length = 0; mockFetch() })
  afterEach(() => vi.restoreAllMocks())

  it('readFile 读 base64 → recognizeBankReceipt，返回形状与 ParsedBankReceipt 逐字段一致', async () => {
    const api = await loadBridge()
    const filePath = '2024-01_receipt.jpg'

    const res = await api.parseBankReceipt(filePath, '某项目')

    // 一次 readFile（category 'wages'/subCategory 'bank-receipts'，K-2 保存约定）
    const readCall = capture.find(c => c.url.includes('/api/files/read'))
    expect(readCall).toBeDefined()
    const url = new URL(readCall!.url, 'http://localhost')
    expect(url.searchParams.get('category')).toBe('wages')
    expect(url.searchParams.get('subCategory')).toBe('bank-receipts')
    expect(url.searchParams.get('fileName')).toBe(filePath)
    expect(url.searchParams.get('projectName')).toBe('某项目')
    // 一次单张解析，base64 反解 = 文件名（mock readFile 用 btoa(fileName) 编码）
    expect(state.ocrCalls).toHaveLength(1)
    expect(atob(state.ocrCalls[0])).toBe(filePath)

    // 返回形状与 electron.d.ts ParsedBankReceipt 逐字段一致
    expect(res.success).toBe(true)
    expect(res.error).toBeUndefined()
    expect(res.data).toEqual({
      date: '2024-01-15',
      totalAmount: 1234.5,
      successAmount: 1234.5,
      failCount: 0,
      items: [{ name: '收款人乙', amount: 1234.5, status: '成功', account: '6222000000000001' }],
      receiptPath: filePath,
      rawTextSnippet: '银行回单识别文本',
    })
    expect(Object.keys(res.data).sort()).toEqual(
      ['date', 'failCount', 'items', 'rawTextSnippet', 'receiptPath', 'successAmount', 'totalAmount']
    )
  })

  it('projectName/yearMonth 可省略（可选参数），读取时 projectName 缺省省略参数', async () => {
    const api = await loadBridge()

    const res = await api.parseBankReceipt('r.jpg')

    const readCall = capture.find(c => c.url.includes('/api/files/read'))
    const url = new URL(readCall!.url, 'http://localhost')
    // api-client 对 null/undefined 参数不放入 query（get() 内 filter），故参数省略
    expect(url.searchParams.get('projectName')).toBe(null)
    expect(res.success).toBe(true)
    expect(res.data.receiptPath).toBe('r.jpg')
  })

  it('文件读取失败如实上抛：{ success: false, error }，不触发 OCR', async () => {
    const api = await loadBridge()
    state.failureMode = 'read'

    const res = await api.parseBankReceipt('missing.jpg')

    expect(res).toEqual({ success: false, error: '文件不存在' })
    expect(state.ocrCalls).toHaveLength(0)
  })

  it('OCR 解析失败如实上抛：{ success: false, error }', async () => {
    const api = await loadBridge()
    state.failureMode = 'ocr'

    const res = await api.parseBankReceipt('x.jpg')

    expect(res).toEqual({ success: false, error: '模拟单张解析失败' })
  })

  it('读取返回异常信封（无 data）时如实报错', async () => {
    const api = await loadBridge()
    global.fetch = vi.fn(async (url: any) => {
      const u = String(url)
      if (u.includes('/api/files/read')) {
        return new Response(
          JSON.stringify({ success: true, data: null }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 })
    }) as any

    const res = await api.parseBankReceipt('y.jpg')

    expect(res.success).toBe(false)
    expect(res.error).toBeTruthy()
    expect(state.ocrCalls).toHaveLength(0)
  })
})
