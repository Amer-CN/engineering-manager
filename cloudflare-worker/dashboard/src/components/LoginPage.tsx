import { useState } from "react";
import { Activity, Loader2, LogIn } from "lucide-react";
import { api, ApiRequestError } from "../api";

/** 三角品牌标（铜琥珀，全站唯一携带彩色的标识） */
function BrandMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
      <path d="M17 4 L30 28 L4 28 Z" fill="var(--brand)" />
    </svg>
  );
}

export function LoginPage({ onSuccess }: { onSuccess: (email: string, role: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      onSuccess(res.email, res.role);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("网络错误，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-[360px] rounded-lg border p-7"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark />
          <div className="mt-4 flex items-center gap-2">
            <Activity size={16} style={{ color: "var(--muted)" }} />
            <span className="label-text" style={{ color: "var(--muted)" }}>
              工程管家
            </span>
          </div>
          <h1 className="mt-2 text-lg font-semibold" style={{ color: "var(--fg)" }}>
            报错中心
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="label-text" style={{ color: "var(--muted)" }} htmlFor="ec-email">
              邮箱
            </label>
            <input
              id="ec-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-ring h-10 w-full rounded-md border px-3 text-sm transition-colors"
              style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)", color: "var(--fg)" }}
              placeholder="you@company.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label-text" style={{ color: "var(--muted)" }} htmlFor="ec-pwd">
              密码
            </label>
            <input
              id="ec-pwd"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus-ring h-10 w-full rounded-md border px-3 text-sm transition-colors"
              style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)", color: "var(--fg)" }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--state-danger)" }} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="focus-ring mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-medium transition-all disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)", color: "var(--on-accent)" }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
