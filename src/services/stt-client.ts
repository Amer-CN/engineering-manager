/**
 * STT (语音转文字) API 客户端
 *
 * 复用 api-client.ts 的认证 token 和错误处理，
 * 但上传使用 XMLHttpRequest 以获得上传进度事件。
 */

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5048'
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

export interface SttCapability {
  canTranscribe: boolean
  canDiarize: boolean
  gpu: {
    hasDiscreteGpu: boolean
    name: string
    vramMb: number
    supportsVulkan: boolean
    allGpus: string[]
  }
  asrModelReady: boolean
  diarizationModelReady: boolean
  unavailableReason: string
}

export interface SttSegment {
  speaker: number
  start: number
  end: number
  text: string
}

export interface SttJobSummary {
  id: number
  sourceFile: string
  engine: string
  status: 'pending' | 'running' | 'processing' | 'completed' | 'failed'
  progress: number
  isMultiSpeaker: boolean
  durationSec?: number
  elapsedSec?: number
  error?: string
  createdAt: string
  updatedAt: string
}

export interface SttJobDetail extends SttJobSummary {
  numSpeakers?: number
  text?: string
  segments?: SttSegment[]
}

export interface SttUploadResult {
  filePath: string
  originalName: string
  size: number
  extension: string
}

export interface SttIngestPayload {
  text?: string
  segments?: SttSegment[]
  title?: string
  projectId?: number
  folderId?: number | null
  occurredAt?: string
}

export interface SttIngestResult {
  success: boolean
  documentId: number
  idempotent: boolean
  hasEmbeddings: boolean
  message?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// API 方法
// ═══════════════════════════════════════════════════════════════

/** GET /api/stt/status — 转写能力检测 */
export async function getSttStatus(): Promise<ApiResponse<SttCapability>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/stt/status`, {
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
    console.error('[STT] getSttStatus 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** POST /api/stt/upload — multipart/form-data 流式上传（带进度 + 可取消） */
export function uploadSttAudio(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<ApiResponse<SttUploadResult>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    const token = getToken()
    xhr.open('POST', `${API_BASE}/api/stt/upload`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })
    }

    // 支持外部取消
    const onAbort = () => {
      xhr.abort()
      resolve({ success: false, error: '上传已取消' })
    }
    if (signal) {
      if (signal.aborted) { onAbort(); return }
      signal.addEventListener('abort', onAbort, { once: true })
    }

    xhr.addEventListener('error', () => {
      resolve({ success: false, error: '网络错误，上传失败' })
    })

    xhr.addEventListener('timeout', () => {
      resolve({ success: false, error: '上传超时' })
    })

    xhr.addEventListener('load', () => {
      if (signal) signal.removeEventListener('abort', onAbort)
      if (xhr.status === 401) {
        try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
      }
      try {
        const raw = JSON.parse(xhr.responseText)
        const converted = convertKeysToCamelCase(raw)
        resolve(converted)
      } catch {
        resolve({ success: false, error: `HTTP ${xhr.status}: 解析响应失败` })
      }
    })

    xhr.send(formData)
  })
}

/** POST /api/stt/transcribe — 创建转写任务 */
export async function createSttJob(input: {
  filePath: string
  isMultiSpeaker: boolean
  numSpeakers?: number
  context?: string
}): Promise<ApiResponse<{ jobId: number; status: string }>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/stt/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(input),
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
    console.error('[STT] createSttJob 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** GET /api/stt/jobs/{id} — 查询任务详情 */
export async function getSttJob(id: number): Promise<ApiResponse<SttJobDetail>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/stt/jobs/${id}`, {
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
    console.error('[STT] getSttJob 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** GET /api/stt/jobs — 任务列表 */
export async function getSttJobs(
  page: number = 1,
  size: number = 20,
): Promise<ApiResponse<{ data: SttJobSummary[]; total: number; page: number; size: number }>> {
  try {
    const token = getToken()
    const url = new URL(`${API_BASE}/api/stt/jobs`, window.location.origin)
    url.searchParams.set('page', String(page))
    url.searchParams.set('size', String(size))
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
    console.error('[STT] getSttJobs 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** POST /api/stt/jobs/{id}/ingest — 校对后文本入库 */
export async function ingestSttJob(
  id: number,
  payload: SttIngestPayload,
): Promise<ApiResponse<SttIngestResult>> {
  try {
    const token = getToken()
    const resp = await fetch(`${API_BASE}/api/stt/jobs/${id}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
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
    console.error('[STT] ingestSttJob 失败:', err)
    return { success: false, error: String(err) }
  }
}

/** 导出统一的 sttClient */
export const sttClient = {
  getSttStatus,
  uploadSttAudio,
  createSttJob,
  getSttJob,
  getSttJobs,
  ingestSttJob,
}
