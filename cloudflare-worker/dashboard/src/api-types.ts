/**
 * API 类型定义 —— 逐字段对齐 cloudflare-worker/index.js 的实现（契约真源）。
 * 不凭空猜形状；任何字段名都可在 index.js 的 SQL 列名 / apiJson 调用处核实。
 */

/** 严重度：crash=high, exception/performance=medium, 其余=low */
export type Severity = "high" | "medium" | "low";

/** 错误分组状态 */
export type GroupStatus = "open" | "resolved";

/** 上报类型（Report.kind） */
export type ReportKind = "crash" | "exception" | "feedback" | "performance";

/** 设备信息（reports.device 列存 JSON 字符串） */
export interface DeviceInfo {
  osVersion?: string;
  cpu?: string;
  cores?: number;
  ramGb?: number;
  screen?: string;
  language?: string;
  userAgent?: string;
}

/** 面包屑单项（reports.breadcrumbs 列存 JSON 字符串，每项 t/cat/msg 均 optional） */
export interface Breadcrumb {
  t?: number;
  cat?: string;
  msg?: string;
}

/**
 * 错误分组列表行 —— /api/groups 的 rows。
 * 字段来源：index.js 的 SELECT
 *   fingerprint, kind, count, last_seen, title, source, label,
 *   error_type, top_frame, severity, status, last_version
 */
export interface GroupRow {
  fingerprint: string;
  kind: ReportKind;
  count: number;
  last_seen: string;
  title: string;
  source: string;
  label: string;
  error_type: string;
  top_frame: string;
  severity: Severity;
  status: GroupStatus;
  last_version: string;
}

/**
 * 错误分组详情（groups 表全列）—— /api/groups/:fingerprint 的 group。
 * 字段来源：index.js `SELECT * FROM groups` + INSERT 列清单。
 * first_seen/last_seen/last_sample_at/regressed_at 为 ISO 字符串（空串表未发生）。
 */
export interface GroupFull extends GroupRow {
  first_seen: string;
  first_version: string;
  last_os: string;
  last_arch: string;
  last_build_commit: string;
  last_channel: string;
  last_sample_at: string;
  regressed_at: string;
}

/**
 * 单条上报样本（reports 表全列）—— /api/groups/:fingerprint 的 samples。
 * 字段来源：index.js `SELECT * FROM reports` + INSERT 列清单。
 * device / breadcrumbs 列在 DB 中为 JSON 字符串，api.ts 已反序列化为对象。
 */
export interface Report {
  id: number;
  fingerprint: string;
  kind: ReportKind;
  version: string;
  os: string;
  arch: string;
  message: string;
  device: DeviceInfo;
  created_at: string;
  source: string;
  label: string;
  error_type: string;
  error_message: string;
  top_frame: string;
  build_commit: string;
  channel: string;
  language: string;
  view: string;
  breadcrumbs: Breadcrumb[];
  component_stack: string;
  stack: string;
  occurred_at: string;
}

/** 趋势单点（30 天，d=YYYY-MM-DD，n=当日上报数） */
export interface TrendPoint {
  d: string;
  n: number;
}

/** GET /api/summary 响应 */
export interface SummaryResponse {
  ok: true;
  open: number;
  high: number;
  regressed: number;
  total: number;
  trend: TrendPoint[];
}

/** GET /api/groups 列表响应 */
export interface GroupsResponse {
  ok: true;
  total: number;
  page: number;
  pageSize: number;
  rows: GroupRow[];
}

/** GET /api/groups/:fingerprint 详情响应 */
export interface GroupDetailResponse {
  ok: true;
  group: GroupFull;
  samples: Report[];
}

/** /api/me 与 /api/login 成功响应 */
export interface AuthUser {
  ok: true;
  email: string;
  role: string;
}

/** 所有失败响应 */
export interface ApiError {
  ok: false;
  error?: string;
}

/** 工具栏状态筛选 */
export type StatusFilter = "open" | "resolved" | "all";
export type SeverityFilter = "" | "high" | "medium" | "low";
export type SortKey = "recent" | "count";
