/**
 * writing-client.ts — 写作中心 API 客户端
 *
 * 后端 WritingEndpoints，snake_case 出参经 api-client convertKeysToCamelCase 转 camelCase。
 */

import { apiClient } from './api-client'

// ═══════════════════════════════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════════════════════════════

export interface WritingDocType {
  code: string
  label: string
  group: string
}

export interface WritingStyleOption {
  id: string
  name: string
  description: string
}

export interface WritingDocTypesResponse {
  groups: { group: string; types: { code: string; label: string }[] }[]
  styles: WritingStyleOption[]
}

export interface WritingDoc {
  id: number
  title: string
  docType: string
  styleId: string | null
  projectId: number | null
  sourceType: string
  sourceRef: string | null
  contentMd: string
  folderId: number | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface WritingFolder {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

export interface WritingListResponse {
  total: number
  page: number
  size: number
  items: WritingDoc[]
}

// ═══════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════

/** 文体 / 风格可选项（单源真值，后端 WritingSkillService 提供） */
export function fetchWritingDocTypes(): Promise<{ success: boolean; data?: WritingDocTypesResponse; error?: string }> {
  return apiClient.get<WritingDocTypesResponse>('/api/writing/doc-types')
}

/** 文档列表（分页 + 文体过滤 + 文件夹过滤：folderId=0 表示未分组） */
export function fetchWritingDocs(params: { docType?: string; folderId?: number; page?: number; size?: number } = {}): Promise<{
  success: boolean
  data?: WritingListResponse
  error?: string
}> {
  const q = new URLSearchParams()
  if (params.docType) q.set('docType', params.docType)
  if (params.folderId != null) q.set('folderId', String(params.folderId))
  if (params.page) q.set('page', String(params.page))
  if (params.size) q.set('size', String(params.size))
  const suffix = q.toString() ? `?${q.toString()}` : ''
  return apiClient.get<WritingListResponse>(`/api/writing/documents${suffix}`)
}

/** 风格轮换（R4）：按本人该文体上次用的风格返回下一个（S1-S6 循环），lastStyleId 可为 null */
export interface WritingNextStyle {
  styleId: string
  styleName: string
  lastStyleId: string | null
}

export function fetchNextWritingStyle(docType: string): Promise<{ success: boolean; data?: WritingNextStyle; error?: string }> {
  return apiClient.get<WritingNextStyle>('/api/writing/next-style', { docType })
}

/** 文档详情 */
export function fetchWritingDoc(id: number): Promise<{ success: boolean; data?: WritingDoc; error?: string }> {
  return apiClient.get<WritingDoc>(`/api/writing/documents/${id}`)
}

/** 新建文档 */
export function createWritingDoc(body: {
  title: string
  docType?: string
  styleId?: string
  contentMd?: string
  projectId?: number
  sourceType?: string
  sourceRef?: string
}): Promise<{ success: boolean; data?: { id: number; createdAt: string }; error?: string }> {
  return apiClient.post<{ id: number; createdAt: string }>('/api/writing/documents', body)
}

/** 保存编辑 */
export function updateWritingDoc(id: number, body: { title?: string; contentMd?: string; projectId?: number }): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  return apiClient.put<unknown>(`/api/writing/documents/${id}`, body)
}

/** 软删 */
export function deleteWritingDoc(id: number): Promise<{ success: boolean; error?: string }> {
  return apiClient.del<unknown>(`/api/writing/documents/${id}`)
}

// ═══════════════════════════════════════════════════════════════════
// 文件夹（R3）
// ═══════════════════════════════════════════════════════════════════

/** 文件夹列表（软删过滤） */
export function fetchWritingFolders(): Promise<{ success: boolean; data?: WritingFolder[]; error?: string }> {
  return apiClient.get<WritingFolder[]>('/api/writing/folders')
}

/** 新建文件夹 */
export function createWritingFolder(name: string): Promise<{ success: boolean; data?: { id: number; name: string }; error?: string }> {
  return apiClient.post<{ id: number; name: string }>('/api/writing/folders', { name })
}

/** 文件夹改名 */
export function renameWritingFolder(id: number, name: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.put<unknown>(`/api/writing/folders/${id}`, { name })
}

/** 软删文件夹（其文档 folder_id 置 NULL，回到未分组） */
export function deleteWritingFolder(id: number): Promise<{ success: boolean; error?: string }> {
  return apiClient.del<unknown>(`/api/writing/folders/${id}`)
}

/** 文档移入/移出文件夹（folderId=null 移出） */
export function moveWritingDoc(id: number, folderId: number | null): Promise<{ success: boolean; error?: string }> {
  return apiClient.put<unknown>(`/api/writing/documents/${id}/folder`, { folderId })
}

/** 行内改写：返回替换文本 */
export function writingAssist(body: {
  instruction: string
  selectedText: string
  customInstruction?: string
  docType?: string
  styleId?: string
  contextBefore?: string
  protectedSpans?: string[]
}): Promise<{ success: boolean; data?: { text: string }; error?: string }> {
  return apiClient.post<{ text: string }>('/api/writing/assist', body)
}

// 同源相对路径，与 api-client.ts 同源定义一致（API_BASE 未从那边导出，此处同样声明）
const API_BASE = import.meta.env.VITE_API_BASE ?? ''

/**
 * 整篇起草（SSE 流式优先，失败退非流式）。
 * events: {type:'content',text} | {type:'done',content} | {type:'error',error}
 * signal：可选 AbortSignal，面板关闭时中止底层 fetch。
 */
export async function streamingDraft(
  body: {
    docType: string
    title?: string
    audience?: string
    material: string
    styleId: string
    detailLevel: number
  },
  onEvent: (e: { type: 'content'; text: string } | { type: 'done'; content: string } | { type: 'error'; error: string }) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    // 与 api-client 同源：SSE 请求同样必须带 Bearer token（缺失会 401）
    let token: string | null = null
    try { token = localStorage.getItem('jwt_token') } catch { /* ignore */ }
    const resp = await fetch(`${API_BASE}/api/writing/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    })
    if (!resp.ok || !resp.body) return false
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (!line.startsWith('data: ')) continue
        try {
          onEvent(JSON.parse(line.slice(6)))
        } catch {
          /* 忽略坏帧 */
        }
      }
    }
    return true
  } catch {
    return false
  }
}