/**
 * 工程管家 - 错误上报系统（前端）
 * ─────────────────────────────────────────────────────────────
 * 参考 Reasonix 的 crash-report 架构重建（原文件 src/lib/crash.ts 已被误删）。
 *
 * 关键设计（保持与原版一致，勿破坏）：
 * 1. 用【原生 DOM】创建覆盖层，而非 React —— 即使 React 崩溃也能显示。
 * 2. 用户点击"发送报告"才发送，不是静默自动上报。
 * 3. 4 层错误捕获：window.onerror + unhandledrejection + console.error 拦截 + fetch 拦截。
 * 4. fetch 拦截是关键 —— API 500 之类不走 window.onerror 也不走 console.error。
 * 5. 5 秒去重，防弹窗轰炸。
 * 6. 正则写法注意：全局标志用 /g，绝非 /\g/（历史出错点）。
 *
 * 接入方式：在 src/main.tsx 顶部调用 initCrashReporter({ version: ... })
 */

export interface CrashBreadcrumb {
  t?: number // 时间戳
  cat?: string // 分类，如 'navigation' | 'click' | 'api' | 'error'
  msg?: string
}

export interface CrashPayload {
  kind: string // unhandled | promise | console | fetch | react | ...
  message: string
  errorMessage?: string
  errorType?: string
  stack?: string
  componentStack?: string
  topFrame?: string
  view?: string
  source?: string
  label?: string
  version?: string
  os?: string
  arch?: string
  device?: string
  language?: string
  channel?: string
  buildCommit?: string
  breadcrumbs?: CrashBreadcrumb[]
}

export interface CrashReporterOptions {
  /** 上报接口，默认已指向工程管家错误上报 Worker */
  endpoint?: string
  /** 应用版本号，建议从 package.json 注入（如 import.meta.env.VITE_APP_VERSION） */
  version: string
  /** git commit（可选） */
  buildCommit?: string
  /** 更新渠道（可选） */
  channel?: string
  /** breadcrumb 上限，默认 50 */
  maxBreadcrumbs?: number
}

// ── 常量 ──
export const DEFAULT_ENDPOINT =
  'https://engineering-manager-crash.bb531285650.workers.dev/v1/report'
const DEDUP_MS = 5000 // 5 秒去重
const MAX_BREADCRUMBS = 50

// ── 内部状态 ──
let opts: Required<
  Pick<CrashReporterOptions, 'endpoint' | 'version' | 'maxBreadcrumbs'>
> &
  Partial<CrashReporterOptions> | null = null
const breadcrumbs: CrashBreadcrumb[] = []
let lastShownAt = 0
let overlayEl: HTMLElement | null = null
/** 内部上报请求标记，防止 fetch 拦截器把上报请求本身当成错误 */
let reporting = false

// ── 初始化 ──
export function initCrashReporter(options: CrashReporterOptions): void {
  if (opts) return // 防重复初始化
  opts = { endpoint: DEFAULT_ENDPOINT, maxBreadcrumbs: MAX_BREADCRUMBS, ...options }
  installGlobalHandlers()
  // 记录用户语言 / 平台信息
  addBreadcrumb('system', `ua ${navigator.userAgent.slice(0, 120)}`)
}

// ── Breadcrumb ──
export function addBreadcrumb(cat: string, msg: string): void {
  breadcrumbs.push({ t: Date.now(), cat, msg })
  const max = opts?.maxBreadcrumbs ?? MAX_BREADCRUMBS
  while (breadcrumbs.length > max) breadcrumbs.shift()
}

// ── 4 层错误捕获 ──
function installGlobalHandlers(): void {
  if (typeof window === 'undefined') return

  // 层 1：运行时错误 window.error（含资源加载错误）
  window.addEventListener('error', (event) => {
    const e = event.error ?? event
    const message =
      event.message || (e instanceof Error ? e.message : String(e))
    void reportCrash({
      kind: 'unhandled',
      message,
      errorMessage: message,
      errorType: e?.name || (typeof e === 'string' ? 'script' : 'Error'),
      stack: e?.stack || (event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : ''),
      topFrame: event.filename ? `${event.filename}:${event.lineno}` : undefined,
      source: event.filename || undefined,
      view: window.location.pathname,
    })
  })

  // 层 2：未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message =
      reason instanceof Error ? reason.message : `Promise rejected: ${serialize(reason)}`
    void reportCrash({
      kind: 'promise',
      message,
      errorMessage: message,
      errorType: reason?.name || 'UnhandledRejection',
      stack: reason?.stack,
      view: window.location.pathname,
    })
  })

  // 层 3：console.error 拦截
  const origError = console.error
  console.error = (...args: unknown[]): void => {
    origError.apply(console, args)
    const message = args.map(serialize).join(' ')
    void reportCrash({
      kind: 'console',
      message: message.slice(0, 500),
      errorMessage: message.slice(0, 500),
      errorType: 'console.error',
      label: 'console.error',
      view: window.location.pathname,
    })
  }

  // 层 4：fetch 拦截 —— 捕获 HTTP 4xx/5xx（API 错误不走 onerror/console）
  const origFetch = window.fetch
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let ok = false
    let status = 0
    let url = ''
    try {
      const response = await origFetch(input, init)
      ok = response.ok
      status = response.status
      url = resolveUrl(input)
      if (!ok && !reporting && !isOwnEndpoint(url)) {
        addBreadcrumb('api', `HTTP ${status} ${url}`)
        void reportCrash({
          kind: 'fetch',
          message: `HTTP ${status} ${redact(url)}`,
          errorMessage: `HTTP ${status}`,
          errorType: 'HTTPError',
          stack: undefined,
          topFrame: String(status),
          label: 'fetch',
          view: window.location.pathname,
        })
      }
      return response
    } catch (err) {
      if (!reporting && !isOwnEndpoint(url)) {
        addBreadcrumb('api', `fetch failed ${url}`)
        void reportCrash({
          kind: 'fetch',
          message: `fetch failed: ${serialize(err)}`,
          errorMessage: serialize(err),
          errorType: 'NetworkError',
          stack: err instanceof Error ? err.stack : undefined,
          view: window.location.pathname,
        })
      }
      throw err
    }
  }) as typeof fetch
}

function isOwnEndpoint(url: string): boolean {
  return opts != null && url.includes(opts.endpoint)
}

// ── 上报核心 ──
/**
 * 组装 payload 并发送到后台。返回是否发送成功。
 * 注意：被 fetch 拦截器/probe 等误用时通过 reporting 标志避免自递归。
 */
export async function reportCrash(payload: CrashPayload): Promise<boolean> {
  if (!opts) return false
  // 5 秒去重：同一个 message 短时间内只弹一次窗
  const now = Date.now()
  const dupKey = `${payload.kind}|${payload.message}`
  const lastKey = overlayEl?.dataset.dupKey
  if (lastKey === dupKey && now - lastShownAt < DEDUP_MS) return false

  // 组装完整 payload
  const full: CrashPayload = {
    ...payload,
    version: opts.version,
    buildCommit: opts.buildCommit,
    channel: opts.channel,
    os: detectOS(),
    arch: navigator.platform || undefined,
    device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    language: navigator.language,
    breadcrumbs: breadcrumbs.slice(-opts.maxBreadcrumbs),
  }

  // 展示覆盖层（弹窗），由用户决定是否发送
  showOverlay(full, dupKey)
  lastShownAt = now

  const shouldSend = await waitForUserDecision()
  if (!shouldSend) return false

  return sendReport(full)
}

// ── 原生 DOM 覆盖层 ──
function showOverlay(payload: CrashPayload, dupKey: string): void {
  if (overlayEl) return // 已有弹窗则不叠加
  overlayEl = document.createElement('div')
  overlayEl.dataset.dupKey = dupKey
  overlayEl.style.cssText = [
    'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;',
    'background:rgba(15,23,42,.55);font-family:system-ui,sans-serif;',
  ].join('')

  const box = document.createElement('div')
  box.style.cssText = [
    'max-width:560px;width:calc(100vw - 48px);max-height:80vh;overflow:auto;background:#fff;color:#0f172a;',
    'border-radius:12px;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);',
  ].join('')

  const title = document.createElement('h3')
  title.textContent = '页面出现异常'
  title.style.cssText = 'margin:0 0 8px;font-size:16px;font-weight:700;color:#0f172a;'

  const msg = document.createElement('div')
  msg.textContent = (payload.message || '').slice(0, 400)
  msg.style.cssText = 'margin:0 0 14px;font-size:13px;line-height:1.6;color:#334155;word-break:break-word;white-space:pre-wrap;'

  const hint = document.createElement('div')
  hint.textContent = '点击"发送报告"将把错误信息发送给开发者，帮助修复问题。'
  hint.style.cssText = 'margin:0 0 16px;font-size:12px;color:#94a3b8;'

  const actions = document.createElement('div')
  actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;'

  const btnIgnore = document.createElement('button')
  btnIgnore.textContent = '忽略'
  btnIgnore.style.cssText = baseButtonStyle('#fff', '#64748b', '1px solid #cbd5e1')
  btnIgnore.onclick = () => {
    overlayEl?.remove()
    overlayEl = null
    resolveUserDecision(false)
  }

  const btnSend = document.createElement('button')
  btnSend.textContent = '发送报告'
  btnSend.style.cssText = baseButtonStyle('#2563eb', '#fff', '1px solid #2563eb')
  btnSend.onclick = () => {
    btnSend.disabled = true
    btnSend.textContent = '发送中…'
    // 立即放行，后台发送
    resolveUserDecision(true)
    const el = overlayEl
    Promise.resolve().then(() => {
      el?.remove()
      if (overlayEl === el) overlayEl = null
    })
  }

  actions.append(btnIgnore, btnSend)
  box.append(title, msg, hint, actions)
  overlayEl.append(box)
  document.body.appendChild(overlayEl)
}

function baseButtonStyle(bg: string, color: string, border: string): string {
  return [
    `padding:7px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;`,
    `background:${bg};color:${color};border:${border};`,
    'outline:none;',
  ].join('')
}

// ── 用户决策（Promise 桥） ──
let resolveDecision: ((send: boolean) => void) | null = null
function waitForUserDecision(): Promise<boolean> {
  return new Promise((resolve) => {
    resolveDecision = resolve
    // 安全兜底：3 分钟后若用户无操作且弹窗还被挂着，释放掉
    setTimeout(() => {
      if (resolveDecision && overlayEl) {
        const r = resolveDecision
        resolveDecision = null
        overlayEl.remove()
        overlayEl = null
        r(false)
      }
    }, 180000)
  })
}
function resolveUserDecision(send: boolean): void {
  const r = resolveDecision
  resolveDecision = null
  if (r) r(send)
}

// ── 发送 ──
async function sendReport(payload: CrashPayload): Promise<boolean> {
  if (!opts) return false
  reporting = true
  try {
    const response = await fetch(opts.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.ok
  } catch {
    return false
  } finally {
    reporting = false
  }
}

// ── 工具函数 ──
function serialize(value: unknown): string {
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input?.url ?? ''
}

/** 简单的 URL 脱敏：只保留 pathname + queryKey，去掉 query 里的值 */
function redact(url: string): string {
  try {
    const u = new URL(url, window.location.href)
    const keys: string[] = []
    u.searchParams.forEach((_v, k) => keys.push(k))
    keys.forEach((k) => u.searchParams.set(k, '…'))
    return u.pathname + u.search
  } catch {
    return url.slice(0, 200)
  }
}

function detectOS(): string {
  const ua = navigator.userAgent
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac OS/.test(ua)) return 'macOS'
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  return 'Unknown'
}

export function isCrashReporterInitialized(): boolean {
  return opts !== null
}
