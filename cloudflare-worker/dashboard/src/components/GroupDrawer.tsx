import { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { api, ApiRequestError } from "../api";
import type { GroupDetailResponse, GroupStatus } from "../api-types";
import {
  formatDateTime,
  kindLabel,
  relativeTime,
} from "../utils";
import { CopyButton } from "./CopyButton";
import { SeverityBadge, StatusBadge } from "./SeverityBadge";

interface Props {
  fingerprint: string;
  onClose: () => void;
  onError: (msg: string) => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="label-text" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span className="text-xs" style={{ color: "var(--fg-2)" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function PreBlock({ title, content }: { title: string; content: string }) {
  if (!content || content.trim().length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="label-text" style={{ color: "var(--muted)" }}>{title}</span>
        <CopyButton text={content} />
      </div>
      <pre
        className="mono overflow-x-auto rounded-md border p-3 text-xs leading-relaxed"
        style={{
          backgroundColor: "var(--bg)",
          borderColor: "var(--border)",
          color: "var(--fg-2)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {content}
      </pre>
    </div>
  );
}

function BreadcrumbTimeline({
  items,
}: {
  items: { t?: number; cat?: string; msg?: string }[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="label-text" style={{ color: "var(--muted)" }}>面包屑</span>
      <ol className="relative ml-1.5 flex flex-col gap-3 border-l pl-4" style={{ borderColor: "var(--border)" }}>
        {items.map((b, i) => (
          <li key={i} className="relative">
            <span
              className="absolute -left-[21px] top-1 h-2 w-2 rounded-full"
              style={{
                backgroundColor: "var(--accent)",
                boxShadow: "0 0 0 3px var(--bg)",
              }}
            />
            <div className="flex items-center gap-2 text-xs">
              {b.cat && (
                <span
                  className="label-text rounded-full border px-1.5 py-0.5"
                  style={{ borderColor: "var(--border)", color: "var(--fg-2)" }}
                >
                  {b.cat}
                </span>
              )}
              {b.msg && (
                <span className="truncate" style={{ color: "var(--fg)" }}>
                  {b.msg}
                </span>
              )}
            </div>
            {b.t != null && (
              <span className="mono mt-0.5 block text-xs" style={{ color: "var(--muted)" }}>
                {relativeTime(b.t)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function GroupDrawer({ fingerprint, onClose, onError }: Props) {
  const [data, setData] = useState<GroupDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [status, setStatus] = useState<GroupStatus>("open");
  const [latest, setLatest] = useState(0);

  async function load() {
    try {
      const res = await api.groupDetail(fingerprint);
      setData(res);
      setStatus(res.group.status);
      setLatest(res.samples.length);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "加载详情失败";
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  // Esc 关闭
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleToggleStatus() {
    if (!data || acting) return;
    const next: GroupStatus = status === "open" ? "resolved" : "open";
    setActing(true);
    try {
      await api.setStatus(fingerprint, next);
      setStatus(next);
      setData((d) => (d ? { ...d, group: { ...d.group, status: next } } : d));
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "操作失败";
      // 403 = 非 admin
      onError(msg);
    } finally {
      setActing(false);
    }
  }

  const g = data?.group;
  const sample = data?.samples[0];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* 遮罩 */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "oklch(0% 0 0 / 0.5)" }}
        onClick={onClose}
      />
      {/* 抽屉：520px，手机全屏 */}
      <aside
        className="drawer-in relative flex h-full w-full max-w-[520px] flex-col border-l shadow-floating"
        style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
      >
        {/* 头 */}
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="label-text" style={{ color: "var(--muted)" }}>错误详情</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setLoading(true);
                load();
              }}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:opacity-80"
              style={{ backgroundColor: "var(--panel)", borderColor: "var(--border)", color: "var(--fg-2)" }}
              aria-label="刷新"
              title="刷新"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onClose}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:opacity-80"
              style={{ backgroundColor: "var(--panel)", borderColor: "var(--border)", color: "var(--fg-2)" }}
              aria-label="关闭"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {loading || !g ? (
          <div className="flex flex-col gap-4 p-5">
            <div className="skeleton h-5 w-3/4" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton h-2.5 w-16" />
                  <div className="skeleton mt-1.5 h-3.5 w-24" />
                </div>
              ))}
            </div>
            <div className="skeleton h-24 w-full" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* 标题 + 徽章 */}
            <div className="flex items-center gap-2.5">
              <SeverityBadge severity={g.severity} />
              <StatusBadge status={status} />
            </div>
            <h2
              className="mt-2 text-base font-semibold leading-snug"
              style={{ color: "var(--fg)" }}
            >
              {g.title || "(无标题)"}
            </h2>

            {/* 键值对网格 */}
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="类型" value={kindLabel(g.kind)} />
              <Field label="来源" value={g.source} />
              <Field label="标签" value={g.label} />
              <Field label="错误类型" value={g.error_type} />
              <Field label="最近版本" value={g.last_version} />
              <Field label="首次版本" value={g.first_version} />
              <Field label="操作系统" value={g.last_os} />
              <Field label="架构" value={g.last_arch} />
              <Field label="首次出现" value={formatDateTime(g.first_seen)} />
              <Field label="最后出现" value={formatDateTime(g.last_seen)} />
            </div>
            <div className="mono mt-2 flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
              <span>fingerprint:</span>
              <span className="truncate">{g.fingerprint.slice(0, 16)}…</span>
            </div>

            {/* 样本数 */}
            {latest > 0 && (
              <p className="mono mt-3 text-xs" style={{ color: "var(--muted)" }}>
                共 {g.count} 次上报 · 保留 {data.samples.length} 个样本
              </p>
            )}

            {/* 操作按钮：随状态切换语义色 */}
            <div className="mt-4 flex gap-2">
              {status === "open" ? (
                <button
                  onClick={handleToggleStatus}
                  disabled={acting}
                  className="focus-ring flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-all disabled:opacity-60"
                  style={{ backgroundColor: "var(--state-ok)", color: "var(--bg)" }}
                >
                  {acting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {acting ? "处理中…" : "标记为已解决"}
                </button>
              ) : (
                <button
                  onClick={handleToggleStatus}
                  disabled={acting}
                  className="focus-ring flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-all disabled:opacity-60"
                  style={{ backgroundColor: "var(--panel)", borderColor: "var(--border)", color: "var(--fg)" }}
                >
                  {acting ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                  {acting ? "处理中…" : "重新打开"}
                </button>
              )}
            </div>

            {/* 错误消息 / 堆栈 / 面包屑 */}
            <div className="mt-5 flex flex-col gap-5">
              {sample?.message && <PreBlock title="错误消息" content={sample.message} />}
              {sample?.stack && <PreBlock title="堆栈" content={sample.stack} />}
              {sample?.component_stack && (
                <PreBlock title="组件堆栈" content={sample.component_stack} />
              )}
              {sample?.breadcrumbs && (
                <BreadcrumbTimeline items={sample.breadcrumbs} />
              )}
            </div>

            {/* 其余样本（折叠） */}
            {data.samples.length > 1 && (
              <details className="mt-5">
                <summary
                  className="label-text flex cursor-pointer items-center gap-1"
                  style={{ color: "var(--muted)" }}
                >
                  <ChevronRight size={13} />
                  其余 {data.samples.length - 1} 个样本
                </summary>
                <div className="mt-3 flex flex-col gap-4">
                  {data.samples.slice(1).map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-2 rounded-md border p-3"
                      style={{ borderColor: "var(--border)", backgroundColor: "var(--panel)" }}
                    >
                      <div className="mono flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
                        <span>#{s.id}</span>
                        <span>{formatDateTime(s.created_at)}</span>
                      </div>
                      <span className="text-xs" style={{ color: "var(--fg-2)" }}>
                        v{s.version} · {s.os}/{s.arch}
                      </span>
                      {s.message && (
                        <pre
                          className="mono overflow-x-auto text-xs"
                          style={{ color: "var(--fg-2)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                        >
                          {s.message}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
