import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, LogOut, RefreshCw } from "lucide-react";
import { api, ApiRequestError } from "./api";
import type {
  GroupsResponse,
  GroupRow,
  SummaryResponse,
  SeverityFilter,
  SortKey,
  StatusFilter,
} from "./api-types";
import { GroupDrawer } from "./components/GroupDrawer";
import { GroupsList } from "./components/GroupsList";
import { GroupsToolbar } from "./components/GroupsToolbar";
import { KpiCards } from "./components/KpiCards";
import { LoginPage } from "./components/LoginPage";
import { Toast, type ToastItem } from "./components/Toast";
import { ThemeToggle, type Theme, getInitialTheme, persistTheme } from "./components/ThemeToggle";
import { TrendChart } from "./components/TrendChart";

const PAGE_SIZE = 20;
const REFRESH_MS = 30_000;
const AUTO_REFRESH_KEY = "ec-auto-refresh";

interface Route {
  name: "login" | "list" | "detail";
  fingerprint?: string;
}

function parseHash(): Route {
  const h = window.location.hash.replace(/^#/, "");
  if (h === "/login" || h === "login") return { name: "login" };
  const m = h.match(/^\/group\/([a-f0-9]{64})$/);
  if (m) return { name: "detail", fingerprint: m[1] };
  return { name: "list" };
}

function navigate(route: Route) {
  if (route.name === "login") window.location.hash = "/login";
  else if (route.name === "detail" && route.fingerprint)
    window.location.hash = `/group/${route.fingerprint}`;
  else window.location.hash = "/";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [route, setRoute] = useState<Route>({ name: "list" });
  const [email, setEmail] = useState("");

  // 数据
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [groups, setGroups] = useState<GroupsResponse | null>(null);

  // 工具栏状态
  const [status, setStatus] = useState<StatusFilter>("open");
  const [severity, setSeverity] = useState<SeverityFilter>("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // 加载态
  const [loadingGroups, setLoadingGroups] = useState(false);

  // toast
  const [toast, setToast] = useState<ToastItem | null>(null);
  const toastId = useRef(0);

  // 自动刷新
  const [autoRefresh, setAutoRefresh] = useState(() => {
    try {
      return localStorage.getItem(AUTO_REFRESH_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const showToast = useCallback((message: string) => {
    toastId.current += 1;
    setToast({ id: toastId.current, message });
  }, []);

  // 应用主题到 <html data-theme>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    persistTheme(theme);
  }, [theme]);

  // hash 路由监听
  useEffect(() => {
    function onHash() {
      setRoute(parseHash());
    }
    window.addEventListener("hashchange", onHash);
    setRoute(parseHash());
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // 启动：探测登录态
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;
        setAuthed(true);
        setEmail(me.email);
      } catch {
        if (cancelled) return;
        setAuthed(false);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 登录成功
  function handleLoginSuccess(em: string, _role: string) {
    setAuthed(true);
    setEmail(em);
    navigate({ name: "list" });
  }

  // 登出
  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setAuthed(false);
    setEmail("");
    setSummary(null);
    setGroups(null);
    navigate({ name: "login" });
  }

  // 拉取数据
  const loadSummary = useCallback(async () => {
    try {
      const s = await api.summary();
      setSummary(s);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setAuthed(false);
        navigate({ name: "login" });
      } else {
        showToast(err instanceof ApiRequestError ? err.message : "加载概览失败");
      }
    }
  }, [showToast]);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const g = await api.groups({
        status,
        severity,
        q: search,
        sort,
        page,
        pageSize: PAGE_SIZE,
      });
      setGroups(g);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setAuthed(false);
        navigate({ name: "login" });
      } else {
        showToast(err instanceof ApiRequestError ? err.message : "加载列表失败");
      }
    } finally {
      setLoadingGroups(false);
    }
  }, [status, severity, search, sort, page, showToast]);

  // 首次拉取 + 依赖变化时拉取
  useEffect(() => {
    if (!authed || route.name === "login") return;
    loadSummary();
  }, [authed, route.name, loadSummary]);

  useEffect(() => {
    if (!authed || route.name === "login") return;
    loadGroups();
  }, [authed, route.name, loadGroups]);

  // 自动刷新 30s 轮询（抽屉打开时也刷新列表/概览）
  useEffect(() => {
    if (!authed || !autoRefresh) return;
    const timer = setInterval(() => {
      loadSummary();
      loadGroups();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [authed, autoRefresh, loadSummary, loadGroups]);

  // 持久化自动刷新偏好
  useEffect(() => {
    try {
      localStorage.setItem(AUTO_REFRESH_KEY, autoRefresh ? "on" : "off");
    } catch {
      /* ignore */
    }
  }, [autoRefresh]);

  // 筛选变化重置到第 1 页
  useEffect(() => {
    setPage(1);
  }, [status, severity, search, sort]);

  // ===== 渲染分支 =====

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw size={20} className="animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    );
  }

  // 未登录 或 路由在 login 页 → 登录页
  if (!authed || route.name === "login") {
    return (
      <>
        <LoginPage onSuccess={handleLoginSuccess} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  const rows: GroupRow[] = groups?.rows ?? [];

  return (
    <div className="min-h-screen">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* 顶栏 56px sticky */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 md:px-6"
        style={{
          backgroundColor: "var(--bg)",
          borderColor: "var(--border)",
          backdropFilter: "none",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Activity size={18} style={{ color: "var(--brand)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
            工程管家
          </span>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <span className="label-text" style={{ color: "var(--muted)" }}>
            报错中心
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* 自动刷新开关 */}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className="focus-ring flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors"
            style={{
              backgroundColor: "var(--panel)",
              borderColor: autoRefresh ? "var(--accent)" : "var(--border)",
              color: autoRefresh ? "var(--fg)" : "var(--muted)",
            }}
            title={autoRefresh ? "自动刷新已开启（30s）" : "自动刷新已关闭"}
          >
            <RefreshCw size={13} className={autoRefresh ? "animate-spin" : ""} style={{ animationDuration: "3s" }} />
            <span className="hidden sm:inline">{autoRefresh ? "自动" : "已停"}</span>
          </button>

          <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />

          {email && (
            <span className="mono hidden text-xs md:inline" style={{ color: "var(--fg-2)" }}>
              {email}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="focus-ring flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--panel)", borderColor: "var(--border)", color: "var(--fg-2)" }}
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">退出</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-5 md:px-6">
        {/* 概览：KPI + 趋势 */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          <div className="lg:flex-[1.4]">
            {summary ? (
              <KpiCards summary={summary} />
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="skeleton h-[88px] rounded-lg"
                  />
                ))}
              </div>
            )}
          </div>
          <div className="lg:flex-1">
            {summary ? (
              <TrendChart data={summary.trend} />
            ) : (
              <div className="skeleton h-full min-h-[156px] rounded-lg" />
            )}
          </div>
        </div>

        {/* 工具栏 sticky 在概览下 */}
        <div
          className="sticky top-14 z-20 mt-4 -mx-1 rounded-lg px-1 py-2.5"
          style={{ backgroundColor: "var(--bg)" }}
        >
          <GroupsToolbar
            status={status}
            severity={severity}
            sort={sort}
            search={search}
            total={groups?.total ?? 0}
            onStatus={setStatus}
            onSeverity={setSeverity}
            onSort={setSort}
            onSearch={setSearch}
          />
        </div>

        {/* 列表 */}
        <div className="mt-3">
          <GroupsList
            rows={rows}
            loading={loadingGroups}
            total={groups?.total ?? 0}
            page={page}
            onSelect={(fp) => navigate({ name: "detail", fingerprint: fp })}
            onPage={setPage}
          />
        </div>
      </main>

      {/* 详情抽屉 */}
      {route.name === "detail" && route.fingerprint && (
        <GroupDrawer
          fingerprint={route.fingerprint}
          onClose={() => navigate({ name: "list" })}
          onError={showToast}
        />
      )}
    </div>
  );
}
