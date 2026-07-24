import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listKnowledgeDocuments, getKnowledgeDocument, deleteKnowledgeDocument } from '../../../../services/knowledge-client'

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

describe('knowledge-client contract tests', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    localStorageMock.clear()
    localStorageMock.setItem('jwt_token', 'fake-token')
  })

  it('listKnowledgeDocuments parses res.data.data as array and res.data.total', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          data: [
            { id: 1, title: '文档1', sourceType: 'manual', chunkCount: 5 },
            { id: 2, title: '文档2', sourceType: 'call', chunkCount: 3 },
          ],
          total: 2,
          page: 1,
          size: 20,
        },
      }),
    })

    const result = await listKnowledgeDocuments(1, 20)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.data).toHaveLength(2)
    expect(result.data!.total).toBe(2)
  })

  it('listKnowledgeDocuments handles error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ success: false, error: '无权限' }),
    })

    const result = await listKnowledgeDocuments(1, 20)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('getKnowledgeDocument parses res.data as document detail', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 42,
          title: '测试文档',
          sourceType: 'manual',
          fullText: '文档全文内容',
          chunks: [{ id: 1, chunkIndex: 0, text: '分块1' }],
        },
      }),
    })

    const result = await getKnowledgeDocument(42)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.id).toBe(42)
    expect(result.data!.title).toBe('测试文档')
  })

  it('deleteKnowledgeDocument returns success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    const result = await deleteKnowledgeDocument(42)
    expect(result.success).toBe(true)
  })

  it('deleteKnowledgeDocument handles 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: '文档不存在' }),
    })

    const result = await deleteKnowledgeDocument(999)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
