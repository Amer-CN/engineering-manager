/// <reference types="vite/client" />

// Vite define 注入的全局常量类型声明
declare const __APP_VERSION__: string

// WebView2 runtime type
declare interface Window {
  chrome?: {
    webview?: {
      postMessage: (message: unknown) => void
      addEventListener: (type: string, listener: (event: { data: unknown }) => void) => void
      removeEventListener: (type: string, listener: (event: { data: unknown }) => void) => void
    }
  }
}
