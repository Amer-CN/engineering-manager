/**
 * 知识库文件夹 API 客户端（M3）
 *
 * 复用 knowledge-client.ts 的认证 token + snake_case → camelCase 转换模式。
 * 端点对应 KnowledgeFolderEndpoints.cs：
 *   GET    /api/knowledge/folders            — 文件夹列表（?projectId= 筛选）
 *   POST   /api/knowledge/folders            — 建文件夹
 *   PUT    /api/knowledge/folders/{id}       — 改文件夹
 *   DELETE /api/knowledge/folders/{id}       — 软删文件夹（文档移出）
 *   GET    /api/knowledge/folders/{id}/documents — 文件夹内文档
 *   PUT    /api/knowledge/documents/{id}     — 文档归入/移出文件夹（白名单只收 folderId）
 */

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5048'
const TOKEN_KEY = 'jwt_token'

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function convertKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.includes('_') ? toCamelCase(key) : key,
        convertKeysToCamelCase(value),
      ])
    )
  }
  return obj
}

export interface KnowledgeFolder {
  id: number
  name: string
  englishName?: string | null
  projectId?: number | null
  category?: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
  docCount: number
}

export interface KnowledgeFolderDocument {
  id: number
  title: string
  sourceType: string
  sourceRef?: string | null
  projectId?: number | null
  occurredAt?: string | null
  createdAt: string
  createdBy: string
  chunkCount: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
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
    console.error('[KnowledgeFolders] 请求失败:', err)
    return { success: false, error: String(err) }
  }
}

/** GET /api/knowledge/folders — 文件夹列表（projectId 为空 = 全部；传 0 = 跨项目通用？由调用方约定） */
export async function listKnowledgeFolders(projectId?: number): Promise<ApiResponse<KnowledgeFolder[]>> {
  const qs = projectId != null ? `?projectId=${projectId}` : ''
  return request<KnowledgeFolder[]>(`/api/knowledge/folders${qs}`)
}

/** POST /api/knowledge/folders — 建文件夹 */
export async function createKnowledgeFolder(input: {
  name: string
  englishName?: string | null
  projectId?: number | null
  category?: string | null
}): Promise<ApiResponse<{ id: number }>> {
  return request<{ id: number }>('/api/knowledge/folders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** PUT /api/knowledge/folders/{id} — 改文件夹 */
export async function updateKnowledgeFolder(
  id: number,
  input: { name: string; englishName?: string | null; projectId?: number | null; category?: string | null },
): Promise<ApiResponse<null>> {
  return request<null>(`/api/knowledge/folders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

/** DELETE /api/knowledge/folders/{id} — 软删文件夹（文档移出） */
export async function deleteKnowledgeFolder(id: number): Promise<ApiResponse<null>> {
  return request<null>(`/api/knowledge/folders/${id}`, { method: 'DELETE' })
}

/** GET /api/knowledge/folders/{id}/documents — 文件夹内文档 */
export async function listFolderDocuments(
  folderId: number,
  page = 1,
  size = 20,
): Promise<ApiResponse<{ data: KnowledgeFolderDocument[]; total: number }>> {
  return request<{ data: KnowledgeFolderDocument[]; total: number }>(
    `/api/knowledge/folders/${folderId}/documents?page=${page}&size=${size}`,
  )
}

/** PUT /api/knowledge/documents/{id} — 文档归入/移出文件夹（folderId=null 移出） */
export async function assignDocumentFolder(
  documentId: number,
  folderId: number | null,
): Promise<ApiResponse<null>> {
  return request<null>(`/api/knowledge/documents/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify({ folderId }),
  })
}

/** 导出统一 client */
export const knowledgeFolderClient = {
  listKnowledgeFolders,
  createKnowledgeFolder,
  updateKnowledgeFolder,
  deleteKnowledgeFolder,
  listFolderDocuments,
  assignDocumentFolder,
}
