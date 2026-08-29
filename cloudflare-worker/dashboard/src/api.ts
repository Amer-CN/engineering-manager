/**
 * API 封装 —— 原生 fetch + same-origin 凭据（cookie 自动带）。
 * 所有响应在 401 时由调用方触发切登录页；device/breadcrumbs 列的反序列化在此集中处理。
 */
import type {
  ApiError,
  AuthUser,
  GroupDetailResponse,
  GroupsResponse,
  GroupStatus,
  Report,
  SummaryResponse,
} from "./api-types";

/** 从 DB 的 JSON 字符串列安全解析回对象 */
function parseJSONCol<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 把 samples 里 device/breadcrumbs 列从 JSON 字符串还原为对象 */
function normalizeReport(r: Report): Report {
  return {
    ...r,
    device: parseJSONCol<Report["device"]>(r.device, {}),
    breadcrumbs: parseJSONCol<Report["breadcrumbs"]>(r.breadcrumbs, []),
  };
}

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? (JSON.parse(text) as T) : (undefined as T);
  if (!res.ok) {
    const err = (body as unknown as ApiError)?.error ?? `请求失败 (${res.status})`;
    throw new ApiRequestError(res.status, err);
  }
  return body;
}

export const api = {
  login(email: string, password: string): Promise<AuthUser> {
    return request<AuthUser>("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  logout(): Promise<void> {
    return request<void>("/api/logout", { method: "POST" });
  },
  me(): Promise<AuthUser> {
    return request<AuthUser>("/api/me");
  },
  summary(): Promise<SummaryResponse> {
    return request<SummaryResponse>("/api/summary");
  },
  groups(params: {
    status: string;
    severity: string;
    q: string;
    sort: string;
    page: number;
    pageSize: number;
  }): Promise<GroupsResponse> {
    const sp = new URLSearchParams();
    sp.set("status", params.status);
    if (params.severity) sp.set("severity", params.severity);
    if (params.q) sp.set("q", params.q);
    sp.set("sort", params.sort);
    sp.set("page", String(params.page));
    sp.set("pageSize", String(params.pageSize));
    return request<GroupsResponse>(`/api/groups?${sp.toString()}`);
  },
  async groupDetail(fingerprint: string): Promise<GroupDetailResponse> {
    const raw = await request<GroupDetailResponse>(`/api/groups/${fingerprint}`);
    return { ...raw, samples: raw.samples.map(normalizeReport) };
  },
  setStatus(fingerprint: string, status: GroupStatus): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/groups/${fingerprint}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },
};
