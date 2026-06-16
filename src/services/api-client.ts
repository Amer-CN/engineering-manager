/**
 * C# API 客户端
 *
 * 通过 HTTP fetch 调用 ASP.NET Core Minimal API
 * 替代 Tauri 的 invoke 和 Electron 的 ipcRenderer
 */

const API_BASE = 'http://localhost:5048';
const TOKEN_KEY = 'jwt_token';
function getToken(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
export function setToken(token: string | null): void { try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch {} }
function authHeaders(): Record<string, string> { const t = getToken(); return t ? { Authorization: "Bearer " + t } : {}; }

/** snake_case → camelCase 转换 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** 判断 key 是否应转换为 camelCase（包含下划线的属性名） */
function shouldConvert(key: string): boolean {
  return key.includes('_') && !key.startsWith('custom_')
}

/** 递归转换对象 key 为 camelCase（跳过字典型 key） */
function convertKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        shouldConvert(key) ? toCamelCase(key) : key,
        convertKeysToCamelCase(value)
      ])
    )
  }
  return obj
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * GET 请求
 */
async function get<T>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    const resp = await fetch(url.toString(), { headers: authHeaders() });
    if (resp.status === 401) setToken(null);
    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    const raw = await resp.json();
    return convertKeysToCamelCase(raw);
  } catch (err) {
    console.error(`[API] GET ${path} 失败:`, err);
    return { success: false, error: String(err) };
  }
}

/**
 * POST 请求
 */
async function post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (resp.status === 401) setToken(null);
    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    const raw = await resp.json();
    return convertKeysToCamelCase(raw);
  } catch (err) {
    console.error(`[API] POST ${path} 失败:`, err);
    return { success: false, error: String(err) };
  }
}

/**
 * PUT 请求
 */
async function put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (resp.status === 401) setToken(null);
    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    const raw = await resp.json();
    return convertKeysToCamelCase(raw);
  } catch (err) {
    console.error(`[API] PUT ${path} 失败:`, err);
    return { success: false, error: String(err) };
  }
}

/**
 * DELETE 请求
 */
async function del<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: authHeaders() });
    if (resp.status === 401) setToken(null);
    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    const raw = await resp.json();
    return convertKeysToCamelCase(raw);
  } catch (err) {
    console.error(`[API] DELETE ${path} 失败:`, err);
    return { success: false, error: String(err) };
  }
}

export const apiClient = { get, post, put, del };
