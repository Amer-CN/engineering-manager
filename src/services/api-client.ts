/**
 * C# API 客户端
 *
 * 通过 HTTP fetch 调用 ASP.NET Core Minimal API
 * 替代 Tauri 的 invoke 和 Electron 的 ipcRenderer
 */

const API_BASE = 'http://localhost:5048';

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
    const resp = await fetch(url.toString());
    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    return await resp.json();
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
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    return await resp.json();
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
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    return await resp.json();
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
    const resp = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    return await resp.json();
  } catch (err) {
    console.error(`[API] DELETE ${path} 失败:`, err);
    return { success: false, error: String(err) };
  }
}

export const apiClient = { get, post, put, del };
