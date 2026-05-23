/**
 * OCR IPC 处理器
 *
 * 将百度 OCR API 请求从渲染进程移到主进程，
 * 避免需要关闭 webSecurity 导致的安全风险。
 *
 * 主进程使用 Node.js 的 net.fetch (Electron 内置) 发起 HTTP 请求，
 * 不受浏览器同源策略限制。
 */
export declare function registerOCRHandlers(): void;
