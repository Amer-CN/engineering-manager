/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        card: "var(--card)",
        "card-hover": "var(--card-hover)",
        fg: "var(--fg)",
        "fg-2": "var(--fg-2)",
        muted: "var(--muted)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "on-accent": "var(--on-accent)",
        "accent-soft": "var(--accent-soft)",
        brand: "var(--brand)",
        danger: "var(--state-danger)",
        warn: "var(--state-warn)",
        ok: "var(--state-ok)",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans SC", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Geist Mono", "ui-monospace", "Consolas", "monospace"],
      },
      borderRadius: {
        sm: "9px",
        md: "10px",
        lg: "16px",
        xl: "22px",
      },
      boxShadow: {
        lift: "0 4px 16px -8px var(--shadow-color)",
        floating: "0 20px 60px -24px var(--shadow-color)",
      },
    },
  },
  plugins: [],
};
