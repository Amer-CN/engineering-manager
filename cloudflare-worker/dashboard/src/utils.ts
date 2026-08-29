/**
 * 纯函数工具 —— 相对时间、防抖、格式化。不引第三方日期库。
 */
import type { Severity, GroupStatus } from "./api-types";

/** 把 ISO 字符串 / 时间戳安全解析为 Date */
function toDate(input: string | number): Date | null {
  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 相对时间：刚刚 / x 分钟前 / x 小时前 / 昨天 / x 天前 / 日期。
 * 入参为 ISO 字符串或毫秒时间戳；空值返回 "—".
 */
export function relativeTime(input: string | number): string {
  const d = toDate(input);
  if (!d) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 0) return "刚刚";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "刚刚";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "昨天";
  if (day < 30) return `${day} 天前`;
  // 超过 30 天显示日期
  return formatDate(d);
}

/** YYYY-MM-DD 短日期 */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 完整日期时间 YYYY-MM-DD HH:MM */
export function formatDateTime(input: string | number): string {
  const d = toDate(input);
  if (!d) return "—";
  const date = formatDate(d);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date} ${hh}:${mm}`;
}

/** 严重度中文标签 */
export function severityLabel(s: Severity): string {
  switch (s) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
  }
}

/** 状态中文标签 */
export function statusLabel(s: GroupStatus): string {
  return s === "open" ? "待处理" : "已解决";
}

/** 上报类型中文标签 */
export function kindLabel(k: string): string {
  switch (k) {
    case "crash":
      return "崩溃";
    case "exception":
      return "异常";
    case "performance":
      return "性能";
    case "feedback":
      return "反馈";
    default:
      return k;
  }
}

/** 简易防抖：延迟 ms 后执行 fn，期间再次调用重置计时 */
export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/** 复制文本到剪贴板，返回是否成功 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 千分位数字 */
export function formatNum(n: number): string {
  return n.toLocaleString("zh-CN");
}
