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
 * 契约（2026-08-20 强化，规格已用户逐节确认）：
 * - 发送链路严格对齐线上 Worker（cloudflare-worker/index.js 的 zod schema，以源码
 *   为准，不信任恢复包 md 文档）：kind 映射枚举、source 清洗、breadcrumbs ≤30、
 *   各字段上限截断、device 字段不再发送（Worker 要求对象，传字符串必 400）、原始
 *   kind 以 {cat:'kind'} breadcrumb 保留、用户备注以 {cat:'note'} 最后一条发出且
 *   绝不塞进 message（避免污染指纹聚合 normalize(kind,message)）。
 *
 * UI（2026-08-20 二改，规格已用户逐节确认）：
 * - 「工程联络函」拟物形态 + 五态状态机（待命/填写中/寄出中/已送达/发送失败）：
 *   LCD 状态屏（--accent-strong 系配色、等宽字）→ 函件纸张（--card 底、底部圆角 3px）
 *   → 底部按钮组（复制报错/忽略/发送报告）→ 发送成功后从函件底部长出锯齿回执小票
 *   （含函号/日期/类别/字数/用时/结果 + 可溯源单号 R-XXXXXXXX；~3s 后自动关窗，
 *   或点「撕下」立即关）。prefers-reduced-motion 时跳过动画直切终态。
 * - 复制报错：navigator.clipboard.writeText + execCommand('copy') 兜底，
 *   复制完整格式化文本（函号/时间/版本/系统/语言/错误类型/页面/错误信息/堆栈/操作路径/备注）。
 * - 回执单号：前端复刻线上 Worker 指纹算法（normalizeForFingerprint /
 *   normalizeStackFrame / normalizeFingerprintText / scrubSensitiveText / sha256Hex
 *   逐条翻译自 cloudflare-worker/index.js），发送前算好，失败时也可凭单号走其他渠道。
 * - 颜色全部 CSS 变量；仅遮罩半透明黑允许写死。
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
/** localStorage 函号递增 key */
const LETTER_NO_KEY = 'crash-letter-no'
/** 备注上限（与 Worker schema 对齐） */
const NOTE_MAX = 240
/** 回执展示时长：~3s 后自动关窗 */
const RECEIPT_AUTO_CLOSE_MS = 3000
/** 隐私说明（随函附件区底部小字） */
const PRIVACY_LINE = '仅发送上述信息与错误内容，不含姓名 / 账户 / 文件内容。'

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
  const noteMsg = note.trim().slice(0, NOTE_MAX)
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

// ── 回执单号：复刻线上 Worker 指纹算法（权威依据 cloudflare-worker/index.js）──
// 下列函数与 Worker 源码逐条一致（正则、顺序、默认值不可擅动），用于在发送前算出与
// 后端 groups.fingerprint 前 8 位一致的 R-XXXXXXXX 单号。
function scrubSensitiveText(input: string): string {
  return input
    .replace(/([A-Z]:\\Users\\)[^/\\:\s"']+/gi, '$1_')
    .replace(/(\/(?:home|Users)\/)[^/\\:\s"']+/g, '$1_')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[redacted-email]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer [redacted]')
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|authorization|secret|password|passwd|pwd|token)\b\s*[:=]\s*(?:Bearer\s+)?['"]?[^'"\s,;]+['"]?/gi, '$1=[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]')
    .replace(/\b(?:sk|rk)-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g, '[redacted-key]')
    .replace(/\b[0-9a-fA-F]{32,}\b/g, '[redacted-hex]')
    .replace(/[A-Za-z0-9+/]{40,}={0,2}/g, '[redacted-token]')
    .replace(/\b[A-Za-z0-9_-]{48,}\b/g, '[redacted-token]')
}

function normalizeStackFrame(frame: string): string {
  return frame
    .replace(/[A-Za-z]:\\[^\s)('"]+/g, '<path>')
    .replace(/\/(?:home|Users)\/[^\s)('"]+/g, '/<home>')
    .replace(/(?:wails|https?|file):\/\/[^\s)('"]+/g, '<url>')
    .replace(/0x[0-9a-fA-F]+/g, '<addr>')
    .replace(/:\d+(?::\d+)?/g, ':<n>')
}

function normalizeFingerprintText(text: string): string {
  return text
    .replace(/[A-Za-z]:\\[^\s)('"]+/g, '<path>')
    .replace(/(?:wails|https?|file):\/\/[^\s)('"]+/g, '<url>')
    .replace(/0x[0-9a-fA-F]+/g, '<addr>')
    .replace(/^build [0-9a-f]+$/gm, 'build <commit>')
    .replace(/:\d+(?::\d+)?/g, ':<n>')
}

async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 计算回执单号 R-XXXXXXXX（sha256 指纹前 8 位大写）。
 * 指纹基 = 结构化分支：kind(映射后)\nsource|legacy\nlabel\nerrorType\n
 * normalizeStackFrame(topFrame)\nnormalizeFingerprintText(head)，head 取
 * (errorMessage||message) 前 6 行；message/errorMessage/topFrame 先过 scrub 正则，
 * 与 Worker handleReport 一致。备注不进指纹（breadcrumbs 不参与）。
 */
async function computeReportNumber(wire: CrashPayload): Promise<string> {
  const message = scrubSensitiveText(wire.message)
  const errorMessage = wire.errorMessage ? scrubSensitiveText(wire.errorMessage) : ''
  const messageBasis = errorMessage || message
  const head = messageBasis.split('\n').slice(0, 6).join('\n')
  const basis =
    wire.kind +
    '\n' +
    (wire.source || 'legacy') +
    '\n' +
    (wire.label || '') +
    '\n' +
    (wire.errorType || '') +
    '\n' +
    normalizeStackFrame(wire.topFrame ? scrubSensitiveText(wire.topFrame) : '') +
    '\n' +
    normalizeFingerprintText(head)
  const hex = await sha256Hex(basis)
  return 'R-' + hex.slice(0, 8).toUpperCase()
}

// ── 复制报错（完整格式化文本）──
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDateTime(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  )
}

function fmtHMS(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** 函件底稿正文（可直接粘给 Agent / 微信 / 邮件） */
function buildCopyText(
  payload: CrashPayload,
  note: string,
  letterNo: string,
): string {
  const lines: string[] = []
  lines.push('【工程管家 · 故障联络函】')
  lines.push(`函号: ${letterNo}`)
  lines.push(`时间: ${formatDateTime(new Date())}`)
  lines.push(`版本: ${payload.version ?? ''}`)
  const os =
    payload.os && payload.arch
      ? `${payload.os} (${payload.arch})`
      : payload.os || payload.arch || ''
  lines.push(`系统: ${os}`)
  lines.push(`语言: ${payload.language ?? ''}`)
  lines.push(`错误类型: ${sourceLabel(payload.kind)} (${payload.kind})`)
  lines.push(`发生页面: ${payload.view ?? ''}`)
  lines.push('')
  lines.push('错误信息:')
  lines.push(payload.message ?? '')
  if (payload.stack) {
    lines.push('')
    lines.push('技术堆栈:')
    lines.push(payload.stack)
  }
  if (payload.componentStack) {
    lines.push('')
    lines.push('组件堆栈:')
    lines.push(payload.componentStack)
  }
  const crumbs = payload.breadcrumbs ?? []
  if (crumbs.length > 0) {
    lines.push('')
    lines.push('操作路径:')
    for (const c of crumbs) {
      lines.push(`- [${fmtHMS(c.t)}] ${(c.cat ?? '') + ' ' + (c.msg ?? '')}`.trimEnd())
    }
  }
  const n = note.trim()
  if (n) {
    lines.push('')
    lines.push('用户备注:')
    lines.push(n)
  }
  return lines.join('\n')
}

/** 写剪贴板：navigator.clipboard.writeText 优先，失败兜底 execCommand('copy') */
async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator.clipboard?.writeText === 'function' &&
      (window.isSecureContext ?? true)
    ) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 落入 execCommand 兜底
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// ── 函号（localStorage 递增）──
function nextLetterNo(): string {
  let n = 0
  try {
    n = parseInt(localStorage.getItem(LETTER_NO_KEY) ?? '0', 10) || 0
  } catch {
    n = 0
  }
  const next = n + 1
  try {
    localStorage.setItem(LETTER_NO_KEY, String(next))
  } catch {
    // localStorage 不可用时仍展示函号，持久化失败不影响本轮
  }
  return 'NO.' + String(next).padStart(4, '0')
}

// ── 原生 DOM 覆盖层（工程联络函拟物形态）──
type CrashUiState = 'idle' | 'filling' | 'sending' | 'sent' | 'failed'
const LCD_STATUS: Record<CrashUiState, string> = {
  idle: '待命',
  filling: '填写中',
  sending: '寄出中',
  sent: '已送达',
  failed: '发送失败',
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function showOverlay(payload: CrashPayload, dupKey: string): void {
  if (overlayEl) return // 已有弹窗则不叠加
  injectOverlayStyles()

  const reduced = prefersReducedMotion()
  const letterNo = nextLetterNo()
  // 发送前算好单号（备注不进指纹，任何备注下单号不变；失败时用户也可凭此走其他渠道报告）
  const numberPromise = computeReportNumber(composeWirePayload(payload, ''))

  overlayEl = document.createElement('div')
  overlayEl.dataset.dupKey = dupKey
  overlayEl.style.cssText = [
    'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;',
    'padding:24px;background:rgba(0,0,0,.5);', // 唯一允许写死的颜色：遮罩半透明黑
  ].join('')

  // 机器外壳卡片（玻璃：backdrop-filter，已登记 check-rules 玻璃白名单）
  const box = document.createElement('div')
  box.style.cssText = [
    'width:560px;max-width:calc(100vw - 32px);max-height:82vh;display:flex;flex-direction:column;',
    'box-sizing:border-box;background:var(--bg);color:var(--fg);border:1px solid var(--border);',
    'border-radius:14px;box-shadow:var(--shadow-lg);overflow:hidden;',
    'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
  ].join('')

  // ① LCD 状态屏：深色条 + 等宽字；左状态文本，右备注字数 000/240
  const lcd = document.createElement('div')
  lcd.style.cssText = [
    'display:flex;align-items:center;justify-content:space-between;gap:12px;',
    'padding:9px 14px;background:var(--accent-strong);flex-shrink:0;',
  ].join('')
  const lcdStatus = document.createElement('span')
  lcdStatus.textContent = LCD_STATUS.idle
  lcdStatus.style.cssText = [
    "font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;letter-spacing:.5px;",
    'color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
  ].join('')
  const lcdCount = document.createElement('span')
  lcdCount.textContent = `000/${NOTE_MAX}`
  lcdCount.style.cssText = [
    "font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;flex-shrink:0;",
    'color:var(--state-warn);',
  ].join('')
  lcd.append(lcdStatus, lcdCount)
  const setLcdCount = (len: number): void => {
    lcdCount.textContent = `${String(Math.max(0, Math.min(NOTE_MAX, len))).padStart(3, '0')}/${NOTE_MAX}`
  }
  const setLcd = (state: CrashUiState, pct?: number): void => {
    let text = LCD_STATUS[state]
    if (state === 'sending' && typeof pct === 'number') text = `${LCD_STATUS.sending} ${pct}%`
    lcdStatus.textContent = text
    if (state === 'failed') lcd.style.background = 'var(--danger)'
    else lcd.style.background = 'var(--accent-strong)'
  }

  // ② 函件纸张（出纸：底部圆角 3px；寄出时向上滑出）
  const paper = document.createElement('div')
  paper.className = 'crash-paper'
  paper.style.cssText = [
    'box-sizing:border-box;margin:10px 12px 0;padding:12px 16px 14px;',
    'background:var(--card);border:1px solid var(--border);border-radius:0 0 3px 3px;',
    'display:flex;flex-direction:column;gap:9px;min-height:0;',
    'max-height:52vh;overflow-y:auto;position:relative;',
  ].join('')

  // 抬头：标题 + 右侧函号
  const paperHeader = document.createElement('div')
  paperHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;'
  const paperTitle = document.createElement('span')
  paperTitle.textContent = '工程管家 · 故障联络函'
  paperTitle.style.cssText = 'font-size:14px;font-weight:700;color:var(--fg);white-space:nowrap;'
  const noBadge = document.createElement('span')
  noBadge.textContent = letterNo
  noBadge.style.cssText = [
    "font-family:'JetBrains Mono',Consolas,monospace;font-size:11px;color:var(--muted);",
    'border:1px solid var(--border);border-radius:4px;padding:2px 6px;flex-shrink:0;',
  ].join('')
  paperHeader.append(paperTitle, noBadge)

  // 收件行：开发者支持台 / 日期 / 发件：匿名（占位灰字）
  const recvRow = document.createElement('div')
  recvRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;color:var(--muted);'
  const recvPart = document.createElement('span')
  recvPart.textContent = '收件：开发者支持台'
  const datePart = document.createElement('span')
  datePart.textContent = `日期：${formatDateTime(new Date())}`
  const senderPart = document.createElement('span')
  senderPart.textContent = '发件：匿名'
  recvRow.append(recvPart, datePart, senderPart)

  // 红色「故障报告」印章（border 章样式，非图片，旋转 -8deg）
  const stamp = document.createElement('div')
  stamp.textContent = '故障报告'
  stamp.style.cssText = [
    'position:absolute;z-index:1;right:14px;top:62px;pointer-events:none;user-select:none;',
    'transform:rotate(-8deg);padding:3px 10px;font-size:13px;font-weight:700;letter-spacing:3px;',
    'color:var(--danger);border:2px solid var(--danger);border-radius:4px;opacity:.88;',
  ].join('')

  // 错误来源中文 + 错误信息正文（等宽、只读、限高滚动）
  const sourceLine = document.createElement('div')
  sourceLine.textContent = `错误来源：${sourceLabel(payload.kind)}`
  sourceLine.style.cssText = 'font-size:13px;font-weight:600;color:var(--fg);'
  const msg = document.createElement('div')
  msg.textContent = payload.message || ''
  msg.style.cssText = [
    "margin:0;font-family:'JetBrains Mono',Consolas,monospace;",
    'font-size:12px;line-height:1.55;color:var(--fg);',
    'word-break:break-word;white-space:pre-wrap;max-height:140px;overflow-y:auto;',
  ].join('')

  // 备注区：函件打字区样式（横线/无框 textarea，240 字上限）
  const note = document.createElement('textarea')
  note.placeholder = '补充说明（选填）：当时在做什么？'
  note.maxLength = NOTE_MAX
  note.style.cssText = [
    'width:100%;box-sizing:border-box;resize:vertical;background:transparent;',
    'color:var(--fg);border:none;border-bottom:1px solid var(--border);',
    "padding:4px 0 8px;font-size:13px;font-family:inherit;line-height:1.6;outline:none;",
  ].join('')

  // 随函附件区（虚线分隔，默认展开，可点标题折叠）+ 隐私说明
  const attach = document.createElement('div')
  attach.style.cssText = 'margin-top:4px;border-top:1px dashed var(--border);padding-top:8px;'
  const attachToggle = document.createElement('button')
  attachToggle.type = 'button'
  attachToggle.className = 'crash-topbtn'
  attachToggle.style.cssText = 'width:100%;'
  const attachToggleText = document.createElement('span')
  attachToggleText.textContent = '随函附件'
  const attachToggleArrow = document.createElement('span')
  attachToggleArrow.textContent = '▾'
  attachToggle.append(attachToggleText, attachToggleArrow)
  const attachBody = document.createElement('div')
  attachBody.style.cssText = 'margin-top:6px;display:flex;flex-direction:column;gap:3px;'
  const attachRows: Array<[string, string]> = [
    ['版本', payload.version ?? ''],
    [
      '系统',
      payload.os && payload.arch
        ? `${payload.os} (${payload.arch})`
        : payload.os || payload.arch || '',
    ],
    ['错误类型', payload.errorType ?? ''],
    ['发生时间', formatDateTime(new Date())],
    ['页面', payload.view ?? ''],
  ]
  for (const [k, v] of attachRows) {
    if (!v) continue
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;color:var(--fg-2);'
    const kEl = document.createElement('span')
    kEl.textContent = k
    kEl.style.cssText = 'flex-shrink:0;color:var(--muted);width:52px;'
    const vEl = document.createElement('span')
    vEl.textContent = v
    vEl.style.cssText = "font-family:'JetBrains Mono',Consolas,monospace;word-break:break-all;"
    row.append(kEl, vEl)
    attachBody.append(row)
  }
  const privacy = document.createElement('div')
  privacy.textContent = PRIVACY_LINE
  privacy.style.cssText = 'margin-top:8px;font-size:11px;color:var(--muted);line-height:1.5;'
  attach.append(attachToggle, attachBody, privacy)
  attachToggle.onclick = () => {
    const open = attachBody.style.display !== 'none'
    attachBody.style.display = open ? 'none' : 'block'
    attachToggleArrow.textContent = open ? '▸' : '▾'
  }

  // 技术详情折叠区（默认收起，无值不渲染）
  const detail = document.createElement('div')
  detail.style.cssText = 'border-top:1px dashed var(--border);padding-top:8px;'
  const btnDetailToggle = document.createElement('button')
  btnDetailToggle.type = 'button'
  btnDetailToggle.className = 'crash-topbtn'
  btnDetailToggle.textContent = '技术详情 ▸'
  btnDetailToggle.style.cssText = 'width:100%;'
  const detailBody = document.createElement('div')
  detailBody.style.cssText = 'display:none;margin-top:6px;'
  const madeRows = makeDetailRows(payload)
  if (madeRows.length === 0) detail.style.display = 'none'
  for (const row of madeRows) {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;flex-direction:column;'
    const lb = document.createElement('div')
    lb.textContent = row.label
    lb.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:2px;'
    const val = document.createElement(row.isPre ? 'pre' : 'div')
    val.textContent = row.value
    if (row.isPre) {
      val.style.cssText = [
        "margin:0;font-family:'JetBrains Mono',Consolas,monospace;",
        'font-size:11px;line-height:1.5;color:var(--fg);',
        'word-break:break-all;white-space:pre-wrap;max-height:160px;overflow-y:auto;',
      ].join('')
    } else {
      val.style.cssText = 'font-size:12px;line-height:1.55;color:var(--fg);word-break:break-all;'
    }
    wrap.append(lb, val)
    detailBody.append(wrap)
  }
  detail.append(btnDetailToggle, detailBody)
  btnDetailToggle.onclick = () => {
    const open = detailBody.style.display !== 'none'
    detailBody.style.display = open ? 'none' : 'block'
    btnDetailToggle.textContent = open ? '技术详情 ▸' : '技术详情 ▾'
  }

  paper.append(paperHeader, recvRow, stamp, sourceLine, msg, note, attach, detail)

  // ③ 回执小票（发送成功后从函件底部长出；锯齿底边 CSS 三角渐变）
  const receiptWrap = document.createElement('div')
  receiptWrap.style.cssText = [
    'margin:0 12px;max-height:0;opacity:0;transform:translateY(14px);',
    'overflow:hidden;box-sizing:border-box;flex-shrink:0;',
  ].join('')
  const receipt = document.createElement('div')
  receipt.style.cssText = [
    'box-sizing:border-box;background:var(--bg-2);border:1px solid var(--border);border-bottom:none;',
    'border-radius:3px 3px 0 0;padding:10px 14px 12px;',
  ].join('')
  const receiptInner = document.createElement('div')
  receiptInner.style.cssText = "font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;"
  receipt.append(receiptInner)
  const tearLine = document.createElement('div')
  tearLine.className = 'crash-teeth'
  tearLine.style.cssText = 'margin:0 14px;height:13px;'
  receiptWrap.append(receipt, tearLine)

  // ④ 底部按钮组：复制报错 / 忽略 / 发送报告
  const actions = document.createElement('div')
  actions.style.cssText =
    'display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:10px 12px 12px;'

  const btnCopy = document.createElement('button')
  btnCopy.textContent = '复制报错'
  btnCopy.type = 'button'
  btnCopy.className = 'crash-ghost'
  btnCopy.style.cssText = ghostButtonStyle()
  btnCopy.onclick = () => {
    void (async () => {
      const ok = await copyTextToClipboard(buildCopyText(payload, note.value, letterNo))
      if (!ok) return
      btnCopy.textContent = '已复制 ✓'
      btnCopy.style.borderColor = 'var(--success)'
      btnCopy.style.color = 'var(--success)'
      setTimeout(() => {
        btnCopy.textContent = '复制报错'
        btnCopy.style.borderColor = 'var(--border)'
        btnCopy.style.color = 'var(--fg-2)'
      }, 1200)
    })()
  }

  const btnIgnore = document.createElement('button')
  btnIgnore.textContent = '忽略'
  btnIgnore.type = 'button'
  btnIgnore.className = 'crash-ghost'
  btnIgnore.style.cssText = ghostButtonStyle()

  const btnSend = document.createElement('button')
  btnSend.textContent = '发送报告'
  btnSend.type = 'button'
  btnSend.className = 'crash-send'
  btnSend.style.cssText = accentButtonStyle()

  // 失败时的「重试」链接（沿用现有失败重试逻辑，窗口不关、可无限重试）
  let retry: HTMLButtonElement | null = null
  // ⑤ 状态机
  let uiState: CrashUiState = 'idle'
  let sending = false
  let progressTimer: number | null = null
  let autoCloseTimer: number | null = null
  let failNo: HTMLElement | null = null
  setLcdCount(0)

  // LCD 进度动画（仅发送中、且未开启 reduced-motion）
  const startProgressAnimation = (): void => {
    if (reduced) return // prefers-reduced-motion：直切终态，不做进度动画
    let p = 0
    progressTimer = window.setInterval(() => {
      p = Math.min(90, p + 5 + Math.floor(Math.random() * 14))
      setLcd(uiState, p)
      if (p >= 90 && progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
    }, 140)
  }
  const stopProgressAnimation = (): void => {
    if (progressTimer !== null) {
      clearInterval(progressTimer)
      progressTimer = null
    }
  }

  const fillReceipt = async (elapsed: number, noteLen: number): Promise<void> => {
    let no = ''
    try {
      no = await numberPromise
    } catch {
      no = ''
    }
    const rows: Array<[string, string]> = [
      ['函号', letterNo],
      ['日期时间', formatDateTime(new Date())],
      ['类别', sourceLabel(payload.kind)],
      ['字数', String(noteLen)],
      ['用时(ms)', String(elapsed)],
    ]
    const title = document.createElement('div')
    title.textContent = '受理回执'
    title.style.cssText = 'font-size:13px;font-weight:700;color:var(--fg);letter-spacing:1px;'
    const noBox = document.createElement('div')
    noBox.textContent = no || 'R--------'
    noBox.style.cssText = 'font-size:15px;font-weight:700;color:var(--accent);word-break:break-all;'
    const row1 = document.createElement('div')
    row1.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px;'
    row1.append(title, noBox)
    const grid = document.createElement('div')
    grid.style.cssText = 'display:grid;grid-template-columns:auto 1fr auto 1fr;column-gap:12px;row-gap:4px;'
    for (const [k, v] of rows) {
      const kEl = document.createElement('span')
      kEl.textContent = k
      kEl.style.cssText = 'color:var(--muted);'
      const vEl = document.createElement('span')
      vEl.textContent = v
      vEl.style.cssText = 'color:var(--fg);word-break:break-all;'
      grid.append(kEl, vEl)
    }
    const result = document.createElement('div')
    result.textContent = '结果：OK · 已送达'
    result.style.cssText = 'font-size:12px;font-weight:700;color:var(--success);'
    const tearBtn = document.createElement('button')
    tearBtn.textContent = '撕下'
    tearBtn.type = 'button'
    tearBtn.className = 'crash-retry'
    tearBtn.style.cssText =
      retryLinkStyle() +
      'border:1px solid var(--border);border-radius:6px;padding:3px 12px;text-decoration:none;'
    tearBtn.onclick = () => close(true)
    const rowEnd = document.createElement('div')
    rowEnd.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:8px;'
    rowEnd.append(result, tearBtn)
    receiptInner.append(row1, grid, rowEnd)
  }

  // 展示回执：reduced-motion 直现，否则过渡动画（先应用 transition，再下一帧改尺寸触发）
  const showReceipt = async (elapsed: number, noteLen: number): Promise<void> => {
    await fillReceipt(elapsed, noteLen)
    if (!overlayEl || uiState !== 'sent') return
    if (reduced) {
      receiptWrap.style.maxHeight = '320px'
      receiptWrap.style.opacity = '1'
      receiptWrap.style.transform = 'translateY(0)'
    } else {
      receiptWrap.style.transition =
        'max-height .5s ease, opacity .45s ease, transform .5s ease'
      requestAnimationFrame(() => {
        receiptWrap.style.maxHeight = '320px'
        receiptWrap.style.opacity = '1'
        receiptWrap.style.transform = 'translateY(0)'
      })
    }
  }

  const doSend = async (): Promise<void> => {
    if (sending) return
    sending = true
    btnSend.disabled = true
    btnSend.textContent = '发送中…'
    btnSend.style.background = 'var(--accent)'
    btnSend.style.borderColor = 'var(--accent)'
    if (retry) {
      retry.remove()
      retry = null
    }
    if (failNo) {
      failNo.remove()
      failNo = null
    }
    uiState = 'sending'
    setLcd(uiState, 0)
    if (!reduced) paper.classList.add('crash-paper-leave')
    startProgressAnimation()
    const t0 = performance.now()
    const wirePayload = composeWirePayload(payload, note.value)
    const ok = await sendReport(wirePayload)
    if (!overlayEl) return // 窗口已被关闭（如 Esc），不再更新按钮
    const elapsed = Math.round(performance.now() - t0)
    stopProgressAnimation()
    if (ok) {
      uiState = 'sent'
      setLcd(uiState, 100)
      btnSend.disabled = false
      btnSend.textContent = '已发送 ✓'
      btnSend.style.background = 'var(--success)'
      btnSend.style.borderColor = 'var(--success)'
      await showReceipt(elapsed, note.value.trim().length)
      if (!overlayEl || uiState !== 'sent') return
      autoCloseTimer = window.setTimeout(() => close(true), RECEIPT_AUTO_CLOSE_MS)
    } else {
      uiState = 'failed'
      sending = false
      btnSend.disabled = false
      btnSend.textContent = '发送报告'
      btnSend.style.background = 'var(--accent)'
      btnSend.style.borderColor = 'var(--accent)'
      if (!reduced) paper.classList.remove('crash-paper-leave')
      setLcd(uiState)
      let no = ''
      try {
        no = await numberPromise
      } catch {
        no = ''
      }
      if (!overlayEl) return
      // 失败时在按钮上方补一行单号提示（发送失败也可凭单号走其他渠道报告，与复制功能呼应）
      failNo = document.createElement('div')
      failNo.textContent = `单号(未送达也可凭此报告): ${no || 'R--------'}`
      failNo.style.cssText = [
        "font-family:'JetBrains Mono',Consolas,monospace;font-size:11px;color:var(--muted);",
        'margin:0 14px;padding:6px 4px 0;border-top:1px dashed var(--border);flex-shrink:0;',
      ].join('')
      box.insertBefore(failNo, actions)
      retry = document.createElement('button')
      retry.textContent = '重试'
      retry.type = 'button'
      retry.className = 'crash-retry'
      retry.style.cssText = retryLinkStyle()
      retry.onclick = () => void doSend()
      actions.insertBefore(retry, btnSend)
    }
  }
  btnSend.onclick = () => void doSend()

  actions.append(btnCopy, btnIgnore, btnSend)
  box.append(lcd, paper, receiptWrap, actions)
  overlayEl.append(box)

  // 关闭：忽略 / × / Esc；点遮罩不关闭
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close(false)
  }
  document.addEventListener('keydown', onKey)

  const tearDown = (): void => {
    document.removeEventListener('keydown', onKey)
    stopProgressAnimation()
    if (autoCloseTimer !== null) clearTimeout(autoCloseTimer)
    overlayTearDown = null
    const el = overlayEl
    overlayEl = null
    el?.remove()
  }
  overlayTearDown = tearDown
  function close(sent: boolean): void {
    if (!overlayEl) return
    tearDown()
    resolveUserDecision(sent)
  }

  btnIgnore.onclick = () => close(false)

  // 备注输入：切换「填写中」状态 + LCD 字数实时计数
  note.addEventListener('input', () => {
    setLcdCount(note.value.length)
    if (uiState === 'idle') {
      uiState = 'filling'
      setLcd(uiState)
    }
  })
  note.addEventListener('focus', () => {
    note.style.borderBottomColor = 'var(--accent)'
  })
  note.addEventListener('blur', () => {
    note.style.borderBottomColor = 'var(--border)'
  })
  // Enter 在 textarea 中天然只换行、不触发发送（无包裹 form）

  document.body.appendChild(overlayEl)
}

/** 忽略（Ghost）：透明底 + 发丝边 + --fg-2 字 */
function ghostButtonStyle(): string {
  return [
    'height:34px;padding:0 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;',
    'background:transparent;color:var(--fg-2);border:1px solid var(--border);',
    'outline:none;',
  ].join('')
}

/** 感叹（填空）按钮：主发送用 --accent 实心底 */
function accentButtonStyle(): string {
  return [
    'height:34px;padding:0 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;',
    'background:var(--accent);color:var(--on-accent);border:1px solid var(--accent);',
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

// 悬停 / 禁用 / 状态机动画等无法内联表意的样式，注入一次全局 <style>
let overlayStylesInjected = false
function injectOverlayStyles(): void {
  if (overlayStylesInjected || typeof document === 'undefined') return
  overlayStylesInjected = true
  const s = document.createElement('style')
  s.textContent = [
    '.crash-send:hover{filter:brightness(1.08)}',
    '.crash-send:disabled{opacity:.7;cursor:default}',
    '.crash-ghost:hover{background:var(--panel-2)!important;color:var(--fg)!important}',
    '.crash-topbtn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:6px;border:none;background:transparent;color:var(--muted);border-radius:6px;padding:3px 6px;font-size:12px;line-height:1.4;cursor:pointer;outline:none;}',
    '.crash-topbtn:hover{background:var(--panel-2)!important;color:var(--fg)!important}',
    '.crash-retry:hover{opacity:.85}',
    // 函件纸张滑动（寄出中向上滑出 / 失败回位），reduced-motion 下全部禁用
    '.crash-paper{transition:transform .6s ease,opacity .6s ease}',
    '.crash-paper-leave{transform:translateY(-46px);opacity:.55}',
    // 回执锯齿底边：两向 45° 三角渐变拼出锯齿，颜色对齐回执底 --bg-2
    '.crash-teeth{background-color:transparent;background-image:linear-gradient(45deg,transparent 33.333%,var(--bg-2) 33.333%,var(--bg-2) 66.667%,transparent 66.667%),linear-gradient(-45deg,transparent 33.333%,var(--bg-2) 33.333%,var(--bg-2) 66.667%,transparent 66.667%);background-size:14px 26px;background-position:0 -13px;}',
    '@media (prefers-reduced-motion:reduce){.crash-paper,.crash-receipt{transition:none!important}}',
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
