import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * api-client vitest 测试 — v0.75.0 测试覆盖率提升
 *
 * 重点测试 PII Mask toggle 自动注入逻辑:
 * - masked=true (默认): 不加 ?unmask=true 参数
 * - masked=false (用户 toggle 后): 自动加 ?unmask=true 给 PII 端点
 * - 非 PII 端点: 任何状态都不加参数
 *
 * 技术: 通过 mock global.fetch 拦截 HTTP 请求, 检查 URL 是否含 unmask=true.
 */

const MASK_KEY = 'v120_mask_enabled'

function setMaskState(masked: boolean): void {
  localStorage.setItem(MASK_KEY, masked ? 'true' : 'false')
}

function clearMaskState(): void {
  localStorage.removeItem(MASK_KEY)
}

function mockFetch(capture: { url: string | null; init: RequestInit | null }) {
  global.fetch = vi.fn(async (url: any, init?: any) => {
    capture.url = String(url)
    capture.init = init
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as any
}

describe('api-client PII Mask 自动注入', () => {
  beforeEach(() => {
    localStorage.removeItem('jwt_token')
    clearMaskState()
  })

  afterEach(() => {
    clearMaskState()
    vi.restoreAllMocks()
  })

  it('masked=true (默认) 时 GET /api/members 不加 ?unmask=true', async () => {
    setMaskState(true)
    const capture: any = { url: null, init: null }
    mockFetch(capture)

    const { apiClient } = await import('@/services/api-client')
    await apiClient.get('/api/members')

    expect(capture.url).toBe('http://localhost:3000/api/members')
    expect(capture.url).not.toContain('unmask=')
  })

  it('masked=false (用户 toggle 后) 时 GET /api/members 加 ?unmask=true', async () => {
    setMaskState(false)
    const capture: any = { url: null, init: null }
    mockFetch(capture)

    const { apiClient } = await import('@/services/api-client')
    await apiClient.get('/api/members')

    expect(capture.url).toBe('http://localhost:3000/api/members?unmask=true')
  })

  it('masked=true 时 GET /api/projects (非 PII) 不加 ?unmask=true', async () => {
    setMaskState(true)
    const capture: any = { url: null, init: null }
    mockFetch(capture)

    const { apiClient } = await import('@/services/api-client')
    await apiClient.get('/api/projects')

    expect(capture.url).not.toContain('unmask=')
  })

  it('masked=false 时 GET /api/projects (非 PII) 也不加 ?unmask=true', async () => {
    setMaskState(false)
    const capture: any = { url: null, init: null }
    mockFetch(capture)

    const { apiClient } = await import('@/services/api-client')
    await apiClient.get('/api/projects')

    expect(capture.url).not.toContain('unmask=')
  })

  it('masked=false 时 4 个 PII 端点 (members/workers/partners/project-members) 都加 unmask=true', async () => {
    setMaskState(false)
    const { apiClient } = await import('@/services/api-client')

    for (const path of ['/api/members', '/api/workers', '/api/partners', '/api/project-members']) {
      const capture: any = { url: null, init: null }
      mockFetch(capture)
      await apiClient.get(path)
      expect(capture.url).toContain('unmask=true')
    }
  })

  it('masked=true 时 4 个 PII 端点 都不加 unmask=true', async () => {
    setMaskState(true)
    const { apiClient } = await import('@/services/api-client')

    for (const path of ['/api/members', '/api/workers', '/api/partners', '/api/project-members']) {
      const capture: any = { url: null, init: null }
      mockFetch(capture)
      await apiClient.get(path)
      expect(capture.url).not.toContain('unmask=')
    }
  })

  it('localStorage 无值时 默认 masked=true (保守)', async () => {
    const capture: any = { url: null, init: null }
    mockFetch(capture)

    const { apiClient } = await import('@/services/api-client')
    await apiClient.get('/api/members')

    expect(capture.url).not.toContain('unmask=')
  })

  it('localStorage 异常 (try/catch 兜底) 时默认 masked=true', async () => {
    const originalGetItem = localStorage.getItem.bind(localStorage)
    localStorage.getItem = vi.fn(() => {
      throw new Error('localStorage disabled')
    }) as any

    const capture: any = { url: null, init: null }
    mockFetch(capture)

    try {
      const { apiClient } = await import('@/services/api-client')
      await apiClient.get('/api/members')
      expect(capture.url).not.toContain('unmask=')
    } finally {
      localStorage.getItem = originalGetItem
    }
  })

  it('caller 显式传 params: { projectId: 5 } 不会被 toggle 状态覆盖', async () => {
    setMaskState(false)
    const capture: any = { url: null, init: null }
    mockFetch(capture)

    const { apiClient } = await import('@/services/api-client')
    await apiClient.get('/api/projects', { projectId: 5 })

    expect(capture.url).toContain('projectId=5')
    expect(capture.url).not.toContain('unmask=')
  })

  it('带 query string 的 PII 路径 /api/members?status=active 也正确处理', async () => {
    setMaskState(false)
    const capture: any = { url: null, init: null }
    mockFetch(capture)

    const { apiClient } = await import('@/services/api-client')
    await apiClient.get('/api/members', { status: 'active' })

    expect(capture.url).toContain('status=active')
    expect(capture.url).toContain('unmask=true')
    const unmaskCount = (capture.url.match(/unmask=/g) || []).length
    expect(unmaskCount).toBe(1)
  })

  it('POST 请求不受影响 (PII 自动注入仅作用于 GET)', async () => {
    setMaskState(false)
    const capture: any = { url: null, init: null }
    mockFetch(capture)

    const { apiClient } = await import('@/services/api-client')
    await apiClient.post('/api/members', { name: 'test' })

    expect(capture.url).toBe('/api/members')
    expect(capture.url).not.toContain('unmask=')
  })
})
