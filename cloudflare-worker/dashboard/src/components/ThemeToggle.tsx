import { Moon, Sun } from "lucide-react";

export type Theme = "dark" | "light";

/** 主题切换：暗/亮，持久 localStorage */
export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      className="focus-ring flex h-9 w-9 items-center justify-center rounded-md border transition-colors"
      style={{
        backgroundColor: "var(--panel)",
        borderColor: "var(--border)",
        color: "var(--fg-2)",
      }}
      aria-label={isDark ? "切换到亮色" : "切换到暗色"}
      title={isDark ? "切换到亮色" : "切换到暗色"}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

/** 读取持久主题，默认暗色（Graphite） */
export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem("ec-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function persistTheme(theme: Theme) {
  try {
    localStorage.setItem("ec-theme", theme);
  } catch {
    /* ignore */
  }
}
