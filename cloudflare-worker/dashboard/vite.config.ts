import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// prop-types 的生产 shim 里硬编码了一条指向 fb.me 的控制台警告字符串，
// 既非浏览器加载资源也永不触发；此处将其替换为空串以保持产物零外链字面量。
function stripPropTypesWarningUrl() {
  return {
    name: "strip-prop-types-warning-url",
    renderChunk(code: string) {
      return code.replace(
        /http:\/\/fb\.me\/use-check-prop-types/g,
        "use-check-prop-types",
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), stripPropTypesWarningUrl()],
  build: {
    outDir: "../dashboard-dist",
    emptyOutDir: true,
    // recharts 体积较大，阈值放宽以避免噪声警告
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5180,
  },
});
