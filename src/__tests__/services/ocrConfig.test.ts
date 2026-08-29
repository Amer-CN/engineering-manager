/**
 * ocr/config.ts 密钥三函数测试 — 向导端点返回裸 JSON（非 {success,data} 信封），
 * 曾因按信封解析导致「永远未配置」，此文件锁住兼容逻辑。
 */
import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockGet = vi.hoisted(() => vi.fn())
const mockPost = vi.hoisted(() => vi.fn())
const mockDel = vi.hoisted(() => vi.fn())

vi.mock('@/services/api-client', () => ({
  apiClient: { get: mockGet, post: mockPost, put: vi.fn(), patch: vi.fn(), del: mockDel },
}))

import { fetchOcrSetupStatus, saveOcrKeys, clearOcrKeys } from '@/services/ocr/config'

describe('OCR 密钥接口（裸 JSON 兼容）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('status 返回裸 {configured, source} → 正确解析（不因无 success 字段而判失败）', async () => {
    // apiClient.get 会把裸响应体直接作为返回值（convertKeysToCamelCase 原样）
    mockGet.mockResolvedValue({ configured: true, source: 'dpapi' })

    const status = await fetchOcrSetupStatus()

    expect(status).toEqual({ configured: true, source: 'dpapi' })
  })

  test('status 信封失败形状（{success:false,error}）→ 返回 null', async () => {
    mockGet.mockResolvedValue({ success: false, error: 'HTTP 500' })

    expect(await fetchOcrSetupStatus()).toBeNull()
  })

  test('save 成功（裸 {success,message}）→ success:true', async () => {
    mockPost.mockResolvedValue({ success: true, message: 'OCR key 已 DPAPI 加密保存' })

    const res = await saveOcrKeys('ak', 'sk')

    expect(res.success).toBe(true)
    expect(mockPost).toHaveBeenCalledWith('/api/ocr/setup/save', { apiKey: 'ak', secretKey: 'sk' })
  })

  test('save 400（信封 {success:false,error}）→ 透出后端错误文案', async () => {
    mockPost.mockResolvedValue({ success: false, error: 'API Key 和 Secret Key 都不能为空' })

    const res = await saveOcrKeys('', 'sk')

    expect(res.success).toBe(false)
    expect(res.error).toContain('不能为空')
  })

  test('clear 成功 → success:true', async () => {
    mockDel.mockResolvedValue({ success: true })

    expect((await clearOcrKeys()).success).toBe(true)
  })

  test('clear 失败（信封错误）→ success:false', async () => {
    mockDel.mockResolvedValue({ success: false, error: 'HTTP 500' })

    const res = await clearOcrKeys()

    expect(res.success).toBe(false)
    expect(res.error).toContain('500')
  })
})
