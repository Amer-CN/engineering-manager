/**
 * endpoint-override.test.ts — 报错上报地址可配置（解析层）
 * 直接测 resolveEndpoint + localStorage 覆盖键交互：无覆盖回退 / 合法采用 / 非法回退 / 清空回退。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resolveEndpoint, DEFAULT_ENDPOINT, ENDPOINT_OVERRIDE_KEY } from '../index'

describe('resolveEndpoint', () => {
  beforeEach(() => {
    localStorage.removeItem(ENDPOINT_OVERRIDE_KEY)
  })

  it('无覆盖时返回 fallback', () => {
    expect(resolveEndpoint(DEFAULT_ENDPOINT)).toBe(DEFAULT_ENDPOINT)
  })

  it('合法覆盖（http(s) URL）返回覆盖值', () => {
    localStorage.setItem(ENDPOINT_OVERRIDE_KEY, 'https://crash.example.com/v1/report')
    expect(resolveEndpoint(DEFAULT_ENDPOINT)).toBe('https://crash.example.com/v1/report')
  })

  it('非法覆盖（非 URL / 非 http(s) 协议）返回 fallback', () => {
    localStorage.setItem(ENDPOINT_OVERRIDE_KEY, 'not a url')
    expect(resolveEndpoint(DEFAULT_ENDPOINT)).toBe(DEFAULT_ENDPOINT)
    localStorage.setItem(ENDPOINT_OVERRIDE_KEY, 'ftp://x')
    expect(resolveEndpoint(DEFAULT_ENDPOINT)).toBe(DEFAULT_ENDPOINT)
  })

  it('清空键后返回 fallback', () => {
    localStorage.setItem(ENDPOINT_OVERRIDE_KEY, 'https://crash.example.com/v1/report')
    expect(resolveEndpoint(DEFAULT_ENDPOINT)).toBe('https://crash.example.com/v1/report')
    localStorage.removeItem(ENDPOINT_OVERRIDE_KEY)
    expect(resolveEndpoint(DEFAULT_ENDPOINT)).toBe(DEFAULT_ENDPOINT)
  })
})