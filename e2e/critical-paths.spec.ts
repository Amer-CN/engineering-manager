import { test, expect } from '@playwright/test'

test.describe('工程管家 E2E 关键路径', () => {

  test('API 健康检查', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
  })

  test('API 认证保护 — 未登录返回401', async ({ request }) => {
    const response = await request.get('/api/projects')
    expect(response.status()).toBe(401)
  })

  test('API 登录获取token', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' }
    })
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.token).toBeTruthy()
  })

  test('API 用token访问受保护端点', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'admin123' }
    })
    const loginBody = await loginRes.json()
    const token = loginBody.data.token

    const res = await request.get('/api/projects', {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(res.ok()).toBeTruthy()
  })

  test('API 无效token返回401', async ({ request }) => {
    const res = await request.get('/api/projects', {
      headers: { Authorization: 'Bearer invalid-token' }
    })
    expect(res.status()).toBe(401)
  })
})
