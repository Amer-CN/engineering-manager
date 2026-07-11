/**
 * 知识库 API 客户端
 *
 * 复用 api-client.ts 的认证 token 和 snake_case → camelCase 转换
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5048'
const TOKEN_KEY = 'jwt_token'

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

/** snake_case → camelCase 转换 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function shouldConvert(key: string): boolean {
  return key.includes('_') && !key.startsWith('custom_')
}

function convertKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        shouldConvert(key) ? toCamelCase(key) : key,
        convertKeysToCamelCase(value),
      ])
    )
  }
  return obj
}

// ═══════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════

export interface KnowledgeHit {
  documentId: number
  chunkId: number
  chunkIndex: number
  text: string
  ftsScore?: number
  ftsRank?: number
  semanticScore?: number
  semanticRank?: number
  rrfScore?: number
  docTitle?: string
  title?: string
  sourceType?: string
  sourceRef?: string
  projectId?: number
  speakers?: string
  occurredAt?: string
}

export interface KnowledgeDocumentSummary {
  id: number
  title: string
  sourceType?: string
  sourceRef?: string
  projectId?: number
  speakers?: string
  occurredAt?: string
  createdAt: string
  chunkCount: number
}

export interface KnowledgeChunk {
  id: number
  index: number
  text: string
}

export interface KnowledgeDocumentDetail extends KnowledgeDocumentSummary {
  fullText: string
  chunks: KnowledgeChunk[]
  createdBy?: string
}

export interface KnowledgeSearchResult {
  query: string
  totalHits: number
  usedSemantic: boolean
  hits: KnowledgeHit[]
  documents: KnowledgeDocumentSummary[]
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// API 方法
// ═══════════════════════════════════════════════════════════════

/** GET /api/knowledge/search — 混合检索 */
export async function searchKnowledge(
  query: string,
  topK: number = 10,
  projectId?: number,
): Promise<ApiResponse<KnowledgeSearchResult>> {
  try {
    const token = getToken()
    const url = new URL(`${API_BASE}/api/knowledge/search`)
    url.searchParams.set('q', query)
    url.searchParams.set('topK', String(topK))
    if (projectId != null) url.searchParams.set('projectId', String(projectId))
    const resp = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[Knowledge] searchKnowledge 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** GET /api/knowledge/documents — 文档列表 */
export async function listKnowledgeDocuments(
  page: number = 1,
  size: number = 20,
  projectId?: number,
): Promise<ApiResponse<{ data: KnowledgeDocumentSummary[]; total: number; page: number; size: number }>> {
  try {
    const token = getToken()
    const url = new URL(`${API_BASE}/api/knowledge/documents`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('size', String(size))
    if (projectId != null) url.searchParams.set('projectId', String(projectId))
    const resp = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[Knowledge] listKnowledgeDocuments 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** GET /api/knowledge/documents/{id} — 文档详情 */
export async function getKnowledgeDocument(id: number): Promise<ApiResponse<KnowledgeDocumentDetail>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/knowledge/documents/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[Knowledge] getKnowledgeDocument 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** DELETE /api/knowledge/documents/{id} — 删除文档 */
export async function deleteKnowledgeDocument(id: number): Promise<ApiResponse<null>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/knowledge/documents/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (resp.status === 401) {
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    }
    if (!resp.ok) {
      try {
        const errBody = await resp.json()
        if (errBody?.error) return { success: false, error: errBody.error }
      } catch { /* */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` }
    }
    const raw = await resp.json()
    return convertKeysToCamelCase(raw)
  } catch (err) {
    console.error('[Knowledge] deleteKnowledgeDocument 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** 导出统一的 knowledgeClient */
export const knowledgeClient = {
  searchKnowledge,
  listKnowledgeDocuments,
  getKnowledgeDocument,
  deleteKnowledgeDocument,
}
