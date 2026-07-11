import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSttJobs, createSttJob, ingestSttJob } from '../../../../services/stt-client'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock localStorage for getToken
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('stt-client contract tests', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    localStorageMock.clear()
    localStorageMock.setItem('jwt_token', 'fake-token')
  })

  it('getSttJobs parses res.data.data as array and res.data.total as count', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          data: [
            { id: 1, sourceFile: 'test1.wav', status: 'completed' },
            { id: 2, sourceFile: 'test2.wav', status: 'pending' },
          ],
          total: 2,
          page: 1,
          size: 20,
        },
      }),
    })

    const result = await getSttJobs(1, 20)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.data).toHaveLength(2)
    expect(result.data!.total).toBe(2)
  })

  it('createSttJob parses res.data.jobId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { jobId: 42, status: 'pending' },
      }),
    })

    const result = await createSttJob({
      filePath: 'stt/1/test.wav',
      isMultiSpeaker: false,
    })
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.jobId).toBe(42)
    expect(result.data!.status).toBe('pending')
  })

  it('ingestSttJob parses res.data.documentId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          documentId: 99,
          idempotent: false,
          hasEmbeddings: true,
          message: '转写文本已入库',
        },
      }),
    })

    const result = await ingestSttJob(1, { text: '校对文本' })
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.documentId).toBe(99)
    expect(result.data!.idempotent).toBe(false)
  })

  it('getSttJobs handles error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ success: false, error: '无权限' }),
    })

    const result = await getSttJobs(1, 20)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
