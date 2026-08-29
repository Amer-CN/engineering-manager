import { memo, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { SeverityFilter, SortKey, StatusFilter } from "../api-types";
import { debounce } from "../utils";

interface Props {
  status: StatusFilter;
  severity: SeverityFilter;
  sort: SortKey;
  search: string;
  total: number;
  onStatus: (v: StatusFilter) => void;
  onSeverity: (v: SeverityFilter) => void;
  onSort: (v: SortKey) => void;
  onSearch: (v: string) => void;
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "open", label: "待处理" },
  { key: "resolved", label: "已解决" },
  { key: "all", label: "全部" },
];

const selectClass =
  "focus-ring h-9 rounded-md border px-2 text-sm transition-colors cursor-pointer";

export const GroupsToolbar = memo(function GroupsToolbar(props: Props) {
  // 本地受控搜索框 + 300ms 防抖上抛
  const [local, setLocal] = useState(props.search);
  const emit = useRef(
    debounce((v: string) => props.onSearch(v), 300),
  );
  useEffect(() => emit.current(props.search), [props.search]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(v: string) {
    setLocal(v);
    emit.current(v);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* 状态 Tab：下划线式选中态 */}
      <div className="flex items-center gap-1">
        {STATUS_TABS.map((t) => {
          const active = props.status === t.key;
          return (
            <button
              key={t.key}
              onClick={() => props.onStatus(t.key)}
              className="focus-ring relative h-9 px-3 text-sm transition-colors"
              style={{ color: active ? "var(--fg)" : "var(--fg-2)" }}
            >
              {t.label}
              <span
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-opacity"
                style={{
                  backgroundColor: "var(--accent)",
                  opacity: active ? 1 : 0,
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex h-9 items-center gap-2 rounded-md border px-3"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Search size={14} style={{ color: "var(--muted)" }} />
          <input
            value={local}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="搜索标题 / 来源 / 类型…"
            className="focus-ring h-full w-[180px] bg-transparent text-sm outline-none md:w-[240px]"
            style={{ color: "var(--fg)" }}
          />
        </div>

        <select
          value={props.severity}
          onChange={(e) => props.onSeverity(e.target.value as SeverityFilter)}
          className={selectClass}
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
        >
          <option value="">全部严重度</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>

        <select
          value={props.sort}
          onChange={(e) => props.onSort(e.target.value as SortKey)}
          className={selectClass}
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
        >
          <option value="recent">最近</option>
          <option value="count">次数</option>
        </select>

        <span className="mono ml-1 text-xs" style={{ color: "var(--muted)" }}>
          {props.total} 条
        </span>
      </div>
    </div>
  );
});
