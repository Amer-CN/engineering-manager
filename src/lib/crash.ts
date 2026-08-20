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
 * 契约与 UI（2026-08-20 强化，规格已用户逐节确认）：
 * - 发送链路严格对齐线上 Worker（cloudflare-worker/index.js 的 zod schema，以源码
 *   为准，不信任恢复包 md 文档）：kind 映射枚举、source 清洗、breadcrumbs ≤30、
 *   各字段上限截断、device 字段不再发送（Worker 要求对象，传字符串必 400）、原始
 *   kind 以 {cat:'kind'} breadcrumb 保留、用户备注以 {cat:'note'} 最后一条发出且
 *   绝不塞进 message（避免污染指纹聚合 normalize(kind,message)）。
 * - 弹窗四区布局原生 DOM 重写：顶栏 / 信息药丸行 / 消息正文 / 技术详情折叠区 /
 *   备注输入 + 发送反馈；颜色全部走 CSS 变量（--card/--fg/--panel-2/--danger/
 *   --success/--accent 等，三主题自动适配）；卡片 backdrop-filter 玻璃（已登记
 *   scripts/check-rules.cjs 的 GLASS_3D_ALLOWED_FILES）。
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
/** 线上 Worker zod schema：breadcrumbs 最多 30 条 */
const WIRE_MAX_BREADCRUMBS = 30

/** 原始 kind → 线上 Worker 枚举（zod: ["crash","exception","feedback","performance"]） */
const KIND_TO_WIRE: Record<string, string> = {
  unhandled: 'exception',
  promise: 'exception',
  react: 'exception',
  console: 'feedback',
  fetch: 'exception',
}

// ── 内部状态 ──
let opts: Required<
  Pick<CrashReporterOptions, 'endpoint' | 'version' | 'maxBreadcrumbs'>
> &
  Partial<CrashReporterOptions> | null = null
const breadcrumbs: CrashBreadcrumb[] = []
let lastShownAt = 0
let overlayEl: HTMLElement | null = null
/** 当前弹窗的拆解回调（移除 keydown 监听 + 卸载 DOM），由 showOverlay 挂载 */
let overlayTearDown: (() => void) | null = null
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
        // 4xx 是业务正常态（401 未登录/404 不存在等），只记面包屑不弹窗；
        // 仅 5xx（服务端错误）才当 crash 弹层，避免登录前 /api/config 401 等把用户挡死
        if (status >= 500) {
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
 * 组装 payload 并弹出上报弹窗。返回 Promise<boolean>：用户最终发送成功时为 true，
 * 忽略 / 关闭 / 超时 / 去重时为 false。弹窗内部负责真正发送（备注从此处读取）。
 * 注意：被 fetch 拦截器/probe 等误用时通过 reporting 标志避免自递归。
 */
export async function reportCrash(payload: CrashPayload): Promise<boolean> {
  if (!opts) return false
  // 5 秒去重：同一个 message 短时间内只弹一次窗
  const now = Date.now()
  const dupKey = `${payload.kind}|${payload.message}`
  const lastKey = overlayEl?.dataset.dupKey
  if (lastKey === dupKey && now - lastShownAt < DEDUP_MS) return false

  // 组装完整 payload（显示用；契约层面的清洗/截断在发送时统一做）
  const full: CrashPayload = {
    ...payload,
    version: opts.version,
    buildCommit: opts.buildCommit,
    channel: opts.channel,
    os: detectOS(),
    arch: (navigator.platform || 'unknown').slice(0, 32),
    language: navigator.language,
    breadcrumbs: breadcrumbs.slice(-opts.maxBreadcrumbs),
  }

  // 展示覆盖层（弹窗），由用户决定是否发送
  showOverlay(full, dupKey)
  lastShownAt = now

  return waitForUserDecision()
}

// ── 发送链路契约（对齐 cloudflare-worker/index.js zod schema）──
/** 截断到上限（上限为正时），超界截断、空串保留原样由调用处兜底 */
function clamp(s: string | undefined, max: number): string {
  return s ? s.slice(0, max) : ''
}

/**
 * source：zod 为可选、trim 后 1-32 字符且须匹配 ^[a-z0-9_.-]+$。
 * 清洗：非法字符替换为 _、截 32；仍不合法（如清空）则不传该字段。
 */
function sanitizeSource(source: string | undefined): string | undefined {
  if (!source) return undefined
  const cleaned = String(source).replace(/[^a-z0-9_.-]+/g, '_').slice(0, 32)
  return /^[a-z0-9_.-]{1,32}$/.test(cleaned) ? cleaned : undefined
}

/**
 * 组装最终 wire payload：kind 映射枚举、device 字段不发送、各字段按上限截断、
 * 原始 kind 以 {cat:'kind'} breadcrumb 保留、备注以 {cat:'note'} 最后一条发出
 * （绝不塞进 message）。breadcrumbs 总上限 30。
 */
function composeWirePayload(full: CrashPayload, note: string): CrashPayload {
  const noteMsg = note.trim().slice(0, 240)
  const base: CrashBreadcrumb[] = full.breadcrumbs ?? []
  // 预留 kind(1) + note(最多 1) 两条的位置，保证总数 ≤ 30
  const spare = 1 + (noteMsg ? 1 : 0)
  const crumbs: CrashBreadcrumb[] = []
  for (const c of base.slice(-(WIRE_MAX_BREADCRUMBS - spare))) {
    const out: CrashBreadcrumb = {}
    if (typeof c.t === 'number') out.t = Math.trunc(c.t)
    if (c.cat !== undefined && c.cat !== '') out.cat = clamp(c.cat, 64)
    if (c.msg !== undefined && c.msg !== '') out.msg = clamp(c.msg, 240)
    crumbs.push(out)
  }
  crumbs.push({ cat: 'kind', msg: clamp(full.kind, 240) }) // 原始 kind 可追溯
  if (noteMsg) crumbs.push({ cat: 'note', msg: noteMsg })

  const message = clamp(full.message, 16 * 1024).trim() || 'unknown error'
  const wire: CrashPayload = {
    kind: KIND_TO_WIRE[full.kind] ?? 'exception',
    version: clamp(full.version, 64),
    os: clamp(full.os, 32) || 'Unknown',
    arch: clamp(full.arch, 32) || 'unknown',
    message,
    breadcrumbs: crumbs.slice(-WIRE_MAX_BREADCRUMBS),
  }

  // 可选字段：仅在其非空时带上，全部按 zod 上限截断
  const setStr = (
    key: 'errorMessage' | 'errorType' | 'stack' | 'componentStack' | 'topFrame' | 'view' | 'language' | 'label' | 'buildCommit' | 'channel',
    v: string | undefined,
    max: number,
  ): void => {
    const s = v?.trim()
    if (s) wire[key] = clamp(s, max)
  }
  setStr('errorMessage', full.errorMessage, 4 * 1024)
  setStr('errorType', full.errorType, 128)
  setStr('stack', full.stack, 16 * 1024)
  setStr('componentStack', full.componentStack, 16 * 1024)
  setStr('topFrame', full.topFrame, 300)
  setStr('view', full.view, 200)
  setStr('language', full.language, 64)
  setStr('label', full.label, 64)
  setStr('buildCommit', full.buildCommit, 64)
  setStr('channel', full.channel, 32)

  const src = sanitizeSource(full.source)
  if (src) wire.source = src

  return wire
}

// ── 原生 DOM 覆盖层（四区布局）──
function showOverlay(payload: CrashPayload, dupKey: string): void {
  if (overlayEl) return // 已有弹窗则不叠加
  injectOverlayStyles()

  overlayEl = document.createElement('div')
  overlayEl.dataset.dupKey = dupKey
  overlayEl.style.cssText = [
    'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;',
    'padding:24px;background:rgba(0,0,0,.5);', // 唯一允许写死的颜色：遮罩半透明黑
  ].join('')

  // 卡片（玻璃：backdrop-filter，已登记 check-rules 玻璃白名单）
  const box = document.createElement('div')
  box.style.cssText = [
    'width:560px;max-width:calc(100vw - 32px);max-height:80vh;overflow-y:auto;',
    'box-sizing:border-box;padding:20px 24px;display:flex;flex-direction:column;gap:14px;',
    'background:var(--card);color:var(--fg);border:1px solid var(--border);border-radius:16px;',
    'box-shadow:var(--shadow-lg);',
    'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
  ].join('')

  // ① 顶栏：危险三角警示 + 标题 | 技术详情开关 + ×（忽略）
  const topbar = document.createElement('div')
  topbar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;'
  const topLeft = document.createElement('div')
  topLeft.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:0;'
  topLeft.append(warningIcon())
  const title = document.createElement('span')
  title.textContent = '页面出现异常'
  title.style.cssText = 'font-size:15px;font-weight:700;color:var(--fg);white-space:nowrap;'
  topLeft.append(title)

  const topRight = document.createElement('div')
  topRight.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;'
  const btnDetailToggle = document.createElement('button')
  btnDetailToggle.textContent = '技术详情'
  btnDetailToggle.className = 'crash-topbtn'
  btnDetailToggle.style.cssText = topButtonStyle()
  const btnClose = document.createElement('button')
  btnClose.textContent = '×'
  btnClose.title = '忽略'
  btnClose.className = 'crash-topbtn'
  btnClose.style.cssText = topButtonStyle() + 'width:28px;height:28px;font-size:16px;'
  topRight.append(btnDetailToggle, btnClose)
  topbar.append(topLeft, topRight)

  // ② 信息药丸行：错误来源中文 · 版本号 · 发生时间 HH:mm:ss
  const pills = document.createElement('div')
  pills.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;'
  const pillTexts = [sourceLabel(payload.kind), payload.version || '', timeLabel()]
  for (const t of pillTexts) pills.append(makePill(t))

  // ③ 消息正文：等宽字体，限高 ~160px 内部滚动
  const msg = document.createElement('div')
  msg.textContent = payload.message || ''
  msg.style.cssText = [
    "margin:0;font-family:'JetBrains Mono',Consolas,monospace;",
    'font-size:13px;line-height:1.6;color:var(--fg);',
    'word-break:break-word;white-space:pre-wrap;',
    'max-height:160px;overflow-y:auto;',
  ].join('')

  // ④ 技术详情折叠区（默认收起，无值不渲染）
  const detail = document.createElement('div')
  detail.style.cssText = 'display:none;'
  const detailInner = document.createElement('div')
  detailInner.style.cssText = [
    'border:1px solid var(--border);border-radius:10px;background:var(--bg-2);',
    'padding:12px 14px;display:flex;flex-direction:column;gap:10px;',
  ].join('')
  const madeRows = makeDetailRows(payload)
  if (madeRows.length === 0) btnDetailToggle.style.display = 'none'
  for (const row of madeRows) {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;flex-direction:column;'
    const lb = document.createElement('div')
    lb.textContent = row.label
    lb.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:2px;'
    const val = document.createElement(row.isPre ? 'pre' : 'div')
    val.textContent = row.value
    if (row.isPre) {
      val.style.cssText = [
        "margin:0;font-family:'JetBrains Mono',Consolas,monospace;",
        'font-size:12px;line-height:1.5;color:var(--fg);',
        'word-break:break-all;white-space:pre-wrap;',
        'max-height:200px;overflow-y:auto;',
      ].join('')
    } else {
      val.style.cssText = 'font-size:13px;line-height:1.6;color:var(--fg);word-break:break-all;'
    }
    wrap.append(lb, val)
    detailInner.append(wrap)
  }
  detail.append(detailInner)

  // ⑤ 底部：备注输入框 + 按钮组
  const bottom = document.createElement('div')
  bottom.style.cssText = 'display:flex;flex-direction:column;gap:10px;'

  const note = document.createElement('textarea')
  note.placeholder = '备注（选填，≤240 字）'
  note.maxLength = 240
  note.style.cssText = [
    'width:100%;box-sizing:border-box;min-height:56px;max-height:120px;resize:vertical;',
    'background:var(--bg-2);color:var(--fg);border:1px solid var(--border);',
    'border-radius:9px;padding:8px 12px;font-size:13px;font-family:inherit;line-height:1.5;',
  ].join('')
  note.addEventListener('focus', () => { note.style.borderColor = 'var(--accent)' })
  note.addEventListener('blur', () => { note.style.borderColor = 'var(--border)' })
  // Enter 在 textarea 中天然只换行、不触发发送（无包裹 form）

  const actions = document.createElement('div')
  actions.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:10px;'

  const btnIgnore = document.createElement('button')
  btnIgnore.textContent = '忽略'
  btnIgnore.className = 'crash-ghost'
  btnIgnore.style.cssText = ghostButtonStyle()

  const btnSend = document.createElement('button')
  btnSend.textContent = '发送报告'
  btnSend.className = 'crash-send'
  btnSend.style.cssText = accentButtonStyle()

  // 发送反馈：发送中… → 成功变绿 800ms 关窗 / 失败变红 + 重试链接（可无限重试）
  let sending = false
  let retry: HTMLButtonElement | null = null
  const doSend = async (): Promise<void> => {
    if (sending) return
    sending = true
    btnSend.disabled = true
    btnSend.style.background = 'var(--accent)'
    btnSend.style.borderColor = 'var(--accent)'
    btnSend.textContent = '发送中…'
    if (retry) {
      retry.remove()
      retry = null
    }
    const wirePayload = composeWirePayload(payload, note.value)
    const ok = await sendReport(wirePayload)
    if (!overlayEl) return // 窗口已被关闭（如 Esc），不再更新按钮
    if (ok) {
      btnSend.style.background = 'var(--success)'
      btnSend.style.borderColor = 'var(--success)'
      btnSend.textContent = '已发送 ✓'
      setTimeout(() => close(true), 800)
    } else {
      sending = false
      btnSend.disabled = false
      btnSend.style.background = 'var(--danger)'
      btnSend.style.borderColor = 'var(--danger)'
      btnSend.textContent = '发送失败'
      retry = document.createElement('button')
      retry.textContent = '重试'
      retry.className = 'crash-retry'
      retry.style.cssText = retryLinkStyle()
      retry.onclick = () => void doSend()
      actions.insertBefore(retry, btnSend)
    }
  }
  btnSend.onclick = () => void doSend()

  actions.append(btnIgnore, btnSend)
  bottom.append(note, actions)

  // 开关：技术详情折叠
  btnDetailToggle.onclick = () => {
    detail.style.display = detail.style.display === 'none' ? 'block' : 'none'
  }

  // 关闭：忽略 / × / Esc；点遮罩不关闭
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close(false)
  }
  document.addEventListener('keydown', onKey)

  const tearDown = (): void => {
    document.removeEventListener('keydown', onKey)
    overlayTearDown = null
    const el = overlayEl
    overlayEl = null
    el?.remove()
  }
  overlayTearDown = tearDown
  const close = (sent: boolean): void => {
    if (!overlayEl) return
    tearDown()
    resolveUserDecision(sent)
  }

  btnIgnore.onclick = () => close(false)
  btnClose.onclick = () => close(false)

  box.append(topbar, pills, msg, detail, bottom)
  overlayEl.append(box)
  document.body.appendChild(overlayEl)
}

/** 顶栏里的小按钮（技术详情 / ×） */
function topButtonStyle(): string {
  return [
    'border:none;background:transparent;color:var(--muted);',
    'border-radius:6px;padding:4px 8px;font-size:12px;line-height:1.4;cursor:pointer;',
    'outline:none;',
  ].join('')
}

/** 信息药丸 */
function makePill(text: string): HTMLSpanElement {
  const s = document.createElement('span')
  s.textContent = text
  s.style.cssText = [
    'padding:4px 10px;border-radius:999px;border:1px solid var(--border);',
    'background:var(--panel-2);color:var(--fg-2);font-size:12px;line-height:1.4;white-space:nowrap;',
  ].join('')
  return s
}

/** 错误来源中文映射 */
function sourceLabel(kind: string): string {
  switch (kind) {
    case 'unhandled': return '运行时错误'
    case 'promise': return 'Promise 异常'
    case 'console': return '脚本错误'
    case 'fetch': return '网络请求错误'
    case 'react': return '界面渲染错误'
    default: return '页面异常'
  }
}

/** 发生时间 HH:mm:ss */
function timeLabel(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

/** 危险色三角警示 SVG（outline 三角 + 感叹号） */
function warningIcon(): SVGElement {
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('width', '18')
  svg.setAttribute('height', '18')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')

  const tri = document.createElementNS(NS, 'path')
  tri.setAttribute('d', 'M12 3.4 21.5 20 H2.5 Z')
  tri.setAttribute('stroke', 'var(--danger)')
  tri.setAttribute('stroke-width', '1.8')
  tri.setAttribute('stroke-linejoin', 'round')

  const ex = document.createElementNS(NS, 'path')
  ex.setAttribute('d', 'M12 7.8 V13.6')
  ex.setAttribute('stroke', 'var(--danger)')
  ex.setAttribute('stroke-width', '2')
  ex.setAttribute('stroke-linecap', 'round')

  const dot = document.createElementNS(NS, 'circle')
  dot.setAttribute('cx', '12')
  dot.setAttribute('cy', '17')
  dot.setAttribute('r', '1.5')
  dot.setAttribute('fill', 'var(--danger)')

  svg.append(tri, ex, dot)
  return svg
}

/** 感叹（填空）按钮：墨色实心底 */
function accentButtonStyle(): string {
  return [
    'height:34px;padding:0 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;',
    'background:var(--accent);color:var(--on-accent);border:1px solid var(--accent);',
    'outline:none;',
  ].join('')
}

/** 忽略（Ghost）：透明底 + 发丝边 + --fg-2 字 */
function ghostButtonStyle(): string {
  return [
    'height:34px;padding:0 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;',
    'background:transparent;color:var(--fg-2);border:1px solid var(--border);',
    'outline:none;',
  ].join('')
}

/** 重试（链接样式）：--accent 字 + 下划线 */
function retryLinkStyle(): string {
  return [
    'background:none;border:none;padding:4px 6px;cursor:pointer;',
    'color:var(--accent);font-size:13px;font-weight:600;text-decoration:underline;',
    'outline:none;',
  ].join('')
}

interface DetailRow {
  label: string
  value: string
  isPre?: boolean
}

/** 技术详情键值对：错误类型 / 触发位置 / 组件堆栈（react）/ 完整堆栈；无值不渲染 */
function makeDetailRows(p: CrashPayload): DetailRow[] {
  const rows: DetailRow[] = []
  if (p.errorType) rows.push({ label: '错误类型', value: p.errorType })
  const location = locationValue(p)
  if (location) rows.push({ label: '触发位置', value: location })
  if (p.kind === 'react' && p.componentStack) {
    rows.push({ label: '组件堆栈', value: p.componentStack, isPre: true })
  }
  if (p.stack) rows.push({ label: '完整堆栈', value: p.stack, isPre: true })
  return rows
}

/** 触发位置：fetch 类显示 redact 后 URL（从 message “HTTP <status> <url>” 提取），其余取 topFrame 或 source */
function locationValue(p: CrashPayload): string | undefined {
  if (p.kind === 'fetch') {
    const m = (p.message || '').match(/^HTTP\s+\d+\s+(.+)$/)
    if (m) return m[1]
  }
  return p.topFrame || p.source
}

// 悬停 / 禁用等无法内联表意的样式，注入一次全局 <style>
let overlayStylesInjected = false
function injectOverlayStyles(): void {
  if (overlayStylesInjected || typeof document === 'undefined') return
  overlayStylesInjected = true
  const s = document.createElement('style')
  s.textContent = [
    '.crash-send:hover{filter:brightness(1.08)}',
    '.crash-send:disabled{opacity:.7;cursor:default}',
    '.crash-ghost:hover{background:var(--panel-2)!important;color:var(--fg)!important}',
    '.crash-topbtn:hover{background:var(--panel-2)!important;color:var(--fg)!important}',
    '.crash-retry:hover{opacity:.85}',
  ].join('\n')
  document.head.appendChild(s)
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
        overlayTearDown?.()
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
