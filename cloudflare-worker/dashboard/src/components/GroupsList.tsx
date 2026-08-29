import { memo } from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import type { GroupRow } from "../api-types";
import { prefetchGroupDetail } from "../api";
import { kindLabel, relativeTime } from "../utils";
import { SeverityBadge } from "./SeverityBadge";

const PAGE_SIZE = 20;

function ListRow({ row, onClick }: { row: GroupRow; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors"
      style={{ borderColor: "var(--border)", backgroundColor: "transparent" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--card-hover)";
        prefetchGroupDetail(row.fingerprint);
      }}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <SeverityBadge severity={row.severity} />
          <span
            className="truncate text-sm font-medium"
            style={{ color: "var(--fg)" }}
            title={row.title}
          >
            {row.title || "(无标题)"}
          </span>
        </div>
        <div
          className="mono mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"
          style={{ color: "var(--muted)" }}
        >
          {row.source && <span>{row.source}</span>}
          {row.label && (
            <>
              <span>·</span>
              <span>{row.label}</span>
            </>
          )}
          {row.error_type && (
            <>
              <span>·</span>
              <span>{row.error_type}</span>
            </>
          )}
          {row.last_version && (
            <>
              <span>·</span>
              <span>v{row.last_version}</span>
            </>
          )}
          <span>·</span>
          <span>{kindLabel(row.kind)}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="mono text-sm font-semibold" style={{ color: "var(--fg)" }}>
          {row.count}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {relativeTime(row.last_seen)}
        </span>
      </div>
    </button>
  );
}

export interface GroupsListProps {
  rows: GroupRow[];
  loading: boolean;
  total: number;
  page: number;
  pageSize?: number;
  onSelect: (fp: string) => void;
  onPage: (page: number) => void;
}

export const GroupsList = memo(function GroupsList({
  rows,
  loading,
  total,
  page,
  pageSize = PAGE_SIZE,
  onSelect,
  onPage,
}: GroupsListProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      {loading ? (
        <div className="flex flex-col">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b px-4 py-3.5" style={{ borderColor: "var(--border)" }}>
              <div className="skeleton h-3.5 w-2/3" />
              <div className="skeleton mt-2 h-2.5 w-1/3" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox size={28} style={{ color: "var(--muted)" }} />
          <p className="mt-3 text-sm" style={{ color: "var(--fg-2)" }}>
            这个分类下没有错误
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {rows.map((row) => (
            <ListRow key={row.fingerprint} row={row} onClick={() => onSelect(row.fingerprint)} />
          ))}
        </div>
      )}

      {/* 分页 */}
      {!loading && rows.length > 0 && (
        <div
          className="flex items-center justify-between border-t px-4 py-2.5"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="mono text-xs" style={{ color: "var(--muted)" }}>
            第 {page} / {totalPages} 页
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
              style={{ backgroundColor: "var(--panel)", borderColor: "var(--border)", color: "var(--fg-2)" }}
              aria-label="上一页"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => onPage(page + 1)}
              disabled={page >= totalPages}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
              style={{ backgroundColor: "var(--panel)", borderColor: "var(--border)", color: "var(--fg-2)" }}
              aria-label="下一页"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
