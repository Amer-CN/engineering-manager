/**
 * 工程管家 - 错误上报系统（前端 · "里子"）
 * ─────────────────────────────────────────────────────────────
 * 4 层捕获 + 线上 Worker 契约 + 可溯源单号 + 复制文本 + 初始化。
 * "皮"（反馈专线 FX-01 传真机浮层）在 ./fax-overlay.ts，样式在 ./crash-fax.css。
 *
 * 关键设计（保持与原版一致，勿破坏）：
 * 1. 用【原生 DOM】创建覆盖层，而非 React —— 即使 React 崩溃也能显示。
 * 2. 用户点击 TRANSMIT 才发送，不是静默自动上报。
 * 3. 4 层错误捕获：window.error + unhandledrejection + console.error 拦截 + fetch 拦截。
 * 4. fetch 拦截是关键 —— API 500 之类不走 window.error 也不走 console.error；
 *    且 4xx 只记面包屑不弹窗（commit 78ffa69），仅 5xx 才当 crash。
 * 5. 5 秒去重，防弹窗轰炸。
 * 6. 正则写法注意：全局标志用 /g，绝非 /\g/（历史出错点）。
 *
 * 契约（规格已用户逐节确认，权威依据 cloudflare-worker/index.js 的 zod schema，
 * 以源码为准不信任文档；这套边界是用真实 400/202 测出来的）：
 * - kind 映射枚举、source 清洗、breadcrumbs ≤30、各字段上限截断、
 *   device 字段不再发送（Worker 要求对象，传字符串必 400）、原始 kind 以
 *   {cat:'kind'} 保留、用户备注以 {cat:'note'} 连续片段发出且绝不塞进 message
 *   （避免污染指纹聚合 normalize(kind,message)）。
 * - 传真机新增的两路数据同样走面包屑：发件邮箱 {cat:'contact'}、
 *   机器信息拨杆开时 {cat:'machine'}（关时 version/os/arch/language 仍按契约必填）。
 *
 * 回执单号：前端复刻线上 Worker 指纹算法（normalizeForFingerprint /
 * normalizeStackFrame / normalizeFingerprintText / scrubSensitiveText / sha256Hex
 * 逐条翻译自 cloudflare-worker/index.js），发送前算好，失败时也可凭单号走其他渠道。
 */

import { showFaxOverlay, type FaxOverlayHandle, type FaxReportInput } from './fax-overlay'
import './crash-fax.css'

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
/** 默认上报地址：自有域名 crash.emcrash.dpdns.org（Cloudflare 自定义域，国内可直连）；
 *  旧官方地址 engineering-manager-crash.bb531285650.workers.dev 仍在线，可经设置页覆盖键切换 */
export const DEFAULT_ENDPOINT =
  'https://crash.emcrash.dpdns.org/v1/report'
const DEDUP_MS = 5000 // 5 秒去重
const MAX_BREADCRUMBS = 50
/** 线上 Worker zod schema：breadcrumbs 最多 30 条 */
const WIRE_MAX_BREADCRUMBS = 30
/** localStorage 函号递增 key */
const LETTER_NO_KEY = 'crash-letter-no'
/** 单条 breadcrumb msg 上限（Worker zod） */
const NOTE_MAX = 240
/** 备注分片最多 8 条（240 字/条 = 1920 字随报送出；复制文本含全文） */
const NOTE_MAX_CHUNKS = 8

/**
 * 原始 kind → 线上 Worker 枚举（zod: ["crash","exception","feedback","performance"]）。
 * 传真机浮层上 kind 由模式键决定，这张表只用于【推导浮层初始档位】：
 * console → 建议档、其余 → 报错档，因此用户不动模式键时发送结果与旧契约逐位一致。
 * feedback → 建议档（openFaxFeedback 主动反馈专线：一打开就是 SUGGESTION 键选中）。
 */
const KIND_TO_WIRE: Record<string, string> = {
  unhandled: 'exception',
  promise: 'exception',
  react: 'exception',
  console: 'feedback',
  fetch: 'exception',
  feedback: 'feedback',
}

/** 模式键 → Worker kind（BUG REPORT=exception，SUGGESTION=feedback） */
const MODE_TO_WIRE: Record<string, string> = {
  bug: 'exception',
  sug: 'feedback',
}

// ── 内部状态 ──
let opts: Required<
  Pick<CrashReporterOptions, 'endpoint' | 'version' | 'maxBreadcrumbs'>
> &
  Partial<CrashReporterOptions> | null = null
const breadcrumbs: CrashBreadcrumb[] = []
let lastShownAt = 0
let overlayEl: HTMLElement | null = null
/** 当前弹窗的拆解回调（移除 keydown 监听 + 卸载 DOM），由 showFaxOverlay 挂载 */
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
 * 组装 payload 并弹出上报浮层。返回 Promise<boolean>：用户最终发送成功时为 true，
 * 忽略 / 关闭 / 超时 / 去重时为 false。浮层内部负责真正发送（备注/邮箱从此处读取）。
 * 注意：被 fetch 拦截器/probe 等误用时通过 reporting 标志避免自递归。
 */
export async function reportCrash(payload: CrashPayload): Promise<boolean> {
  if (!opts) return false
  // 5 秒去重：同一个 message 短时间内只弹一次窗
  const now = Date.now()
  const dupKey = `${payload.kind}|${payload.message}`
  const lastKey = overlayEl?.dataset.dupKey
  if (lastKey === dupKey && now - lastShownAt < DEDUP_MS) return false

  // 已有弹窗则不叠加（沿用旧 crash.ts 闸门）：换一个新的错误时保留先弹出的那张
  if (overlayEl) return false

  // 组装完整 payload（显示用；契约层面的清洗/截断在发送时统一做）
  const full: CrashPayload = {
    ...payload,
    version: opts.version,
    buildCommit: opts.buildCommit,
    channel: opts.channel,
    os: detectOS(),
    arch: detectArchSync(),
    language: navigator.language,
    breadcrumbs: breadcrumbs.slice(-opts.maxBreadcrumbs),
  }

  // 展示传真机浮层（原生 DOM），由用户决定是否 TRANSMIT
  // 主动反馈（kind='feedback'）：wire.message 以用户正文首行为准（≤200 字，空则
  // 固定兜底），让每条建议按自己的首行独立成指纹聚合组，不挤进同一组；正文全文仍走
  // {cat:'note'} 面包屑（契约与复制文本逐位照旧）。composeWirePayload 一行未动。
  const wireFor = (input: FaxReportInput): CrashPayload => {
    if (full.kind === 'feedback') {
      const head = (input.note.split('\n')[0] ?? '').trim()
      full.message = head.slice(0, 200) || '用户反馈'
    }
    return composeWirePayload(full, input)
  }
  const handle: FaxOverlayHandle = showFaxOverlay(full, dupKey, {
    send: (input) => deliver(wireFor(input)),
    computeNumber: (input) => computeReportNumber(wireFor(input)),
    copyText: (input) => buildCopyText(full, input),
    onClosed: () => {
      overlayEl = null
      overlayTearDown = null
    },
  }, KIND_TO_WIRE[full.kind] === 'feedback' ? 'sug' : 'bug')
  overlayEl = handle.el
  overlayTearDown = handle.tearDown
  lastShownAt = now

  // 64 位精修：优先 userAgentData 高熵值（WebView2=Chromium 可用）；与同步嗅探结果不一致时
  // 更新内存 payload（wire/复制文本同源）与传真单纸面（系统/架构行）
  void detectArch().then((a) => {
    if (!a || a === full.arch) return
    full.arch = a
    const osEl = handle.el.querySelector<HTMLElement>('[data-fx-mos]')
    if (osEl) osEl.textContent = `${full.os ?? ''} (${a})`
    const archEl = handle.el.querySelector<HTMLElement>('[data-fx-march]')
    if (archEl) archEl.textContent = a
  })

  return waitForUserDecision()
}

/**
 * 设置页「反馈专线」入口：不依赖报错，用户随时主动打开传真机提建议/反馈。
 * - 初始档位=功能建议（KIND_TO_WIRE['feedback']='feedback' → showFaxOverlay 收到 'sug'），
 *   纸面无线错误摘要（message 留空、无 stack/componentStack/topFrame，契约容忍无值路径）
 * - wire kind=feedback 由模式键推导（sug→feedback）；user 正文首行作 wire.message（wireFor）
 * - 正文全文照旧走 {cat:'note'} 面包屑、发件邮箱 {cat:'contact'}、单号照常计算
 * - 已有弹窗（含 crash 弹窗）时重复调用不叠加：沿用 reportCrash 的 overlayEl 守卫
 * - reportCrash 对外签名不变，本函数只是用一个 kind='feedback' 的正常 payload 进同一管道
 */
export function openFaxFeedback(): void {
  if (!opts) return // 未初始化（main.tsx 启动即 init，正常不会走到这里）
  void reportCrash({
    kind: 'feedback',
    message: '', // wire 层由正文首行刷新，这里留空避免纸面出现伪错误摘要
    label: 'manual-feedback',
    view: window.location.pathname,
  })
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

/** 正文备注 → 240 字/条、最多 8 条连续片段（后台详情按顺序可见全文） */
function splitNoteChunks(note: string): string[] {
  const text = note.trim()
  if (!text) return []
  const chunks: string[] = []
  for (let i = 0; i < NOTE_MAX_CHUNKS && i * NOTE_MAX < text.length; i++) {
    chunks.push(text.slice(i * NOTE_MAX, (i + 1) * NOTE_MAX))
  }
  return chunks
}

/**
 * 组装最终 wire payload：kind 取模式键档位（bug→exception / sug→feedback）、
 * device 字段不发送、各字段按上限截断、原始 kind 以 {cat:'kind'} breadcrumb 保留、
 * 备注以 {cat:'note'} 连续片段发出（绝不塞进 message）、邮箱 {cat:'contact'}、
 * 拨杆开时机器信息 {cat:'machine'}。breadcrumbs 总上限 30。
 */
function composeWirePayload(full: CrashPayload, ui: FaxReportInput): CrashPayload {
  const noteChunks = splitNoteChunks(ui.note)
  const contact = ui.email.trim() ? clamp(ui.email.trim(), NOTE_MAX) : ''
  const machine = ui.attach
    ? clamp(
        `v${full.version ?? ''} ${full.os ?? ''}/${full.arch ?? ''} ${full.language ?? ''}`,
        NOTE_MAX,
      )
    : ''
  const base: CrashBreadcrumb[] = full.breadcrumbs ?? []
  // 预留 kind(1) + note(n) + contact(0/1) + machine(0/1) 的位置，保证总数 ≤ 30
  const spare = 1 + noteChunks.length + (contact ? 1 : 0) + (machine ? 1 : 0)
  const room = Math.max(0, WIRE_MAX_BREADCRUMBS - spare)
  const crumbs: CrashBreadcrumb[] = []
  for (const c of base.slice(-room)) {
    const out: CrashBreadcrumb = {}
    if (typeof c.t === 'number') out.t = Math.trunc(c.t)
    if (c.cat !== undefined && c.cat !== '') out.cat = clamp(c.cat, 64)
    if (c.msg !== undefined && c.msg !== '') out.msg = clamp(c.msg, 240)
    crumbs.push(out)
  }
  crumbs.push({ cat: 'kind', msg: clamp(full.kind, 240) }) // 原始 kind 可追溯
  for (const chunk of noteChunks) crumbs.push({ cat: 'note', msg: chunk })
  if (contact) crumbs.push({ cat: 'contact', msg: contact })
  if (machine) crumbs.push({ cat: 'machine', msg: machine })

  const message = clamp(full.message, 16 * 1024).trim() || 'unknown error'
  const wire: CrashPayload = {
    kind: MODE_TO_WIRE[ui.mode] ?? 'exception',
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
 * 与 Worker handleReport 一致。备注/邮箱不进指纹（breadcrumbs 不参与）。
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

// ── 复制报错（完整格式化文本，含备注全文）──
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

/** 传真单底稿正文（可直接粘给 Agent / 微信 / 邮件） */
function buildCopyText(payload: CrashPayload, ui: FaxReportInput): string {
  const lines: string[] = []
  lines.push('【工程管家 · 反馈传真 FX-01】')
  lines.push(`函号: ${ui.letterNo}`)
  lines.push(`时间: ${formatDateTime(new Date())}`)
  lines.push(`版本: ${payload.version ?? ''}`)
  const os =
    payload.os && payload.arch
      ? `${payload.os} (${payload.arch})`
      : payload.os || payload.arch || ''
  lines.push(`系统: ${os}`)
  lines.push(`语言: ${payload.language ?? ''}`)
  lines.push(`类别: ${sourceLabel(payload.kind)} (${payload.kind})`)
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
  if (ui.email.trim()) {
    lines.push('')
    lines.push(`发件邮箱: ${ui.email.trim()}`)
  }
  const n = ui.note.trim()
  if (n) {
    lines.push('')
    lines.push('用户备注:')
    lines.push(n)
  }
  return lines.join('\n')
}

/** 写剪贴板：navigator.clipboard.writeText 优先，失败兜底 execCommand('copy') */
export async function copyTextToClipboard(text: string): Promise<boolean> {
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

// ── 函号（localStorage 递增，键沿用 crash-letter-no）──
/** 读出当前待打印的函号（不递增：一次传送完成后由浮层递增并回写） */
export function currentLetterNo(): number {
  let n = 0
  try {
    n = parseInt(localStorage.getItem(LETTER_NO_KEY) ?? '0', 10) || 0
  } catch {
    n = 0
  }
  return n > 0 ? n : 1
}

/** 传送完成（撕纸换纸）后推进函号；localStorage 不可用时仍走本轮内存值 */
export function advanceLetterNo(n: number): void {
  try {
    localStorage.setItem(LETTER_NO_KEY, String(n))
  } catch {
    // 持久化失败不影响本轮
  }
}

/** 错误来源中文映射 */
export function sourceLabel(kind: string): string {
  switch (kind) {
    case 'unhandled': return '运行时错误'
    case 'promise': return 'Promise 异常'
    case 'console': return '脚本错误'
    case 'fetch': return '网络请求错误'
    case 'react': return '界面渲染错误'
    default: return '页面异常'
  }
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
export function resolveUserDecision(send: boolean): void {
  const r = resolveDecision
  resolveDecision = null
  if (r) r(send)
}

// ── 发送 ──
/** 真正 POST 一次。保留 reporting 防自递归（上报请求本身不得再触弹层）。 */
async function deliver(wire: CrashPayload): Promise<boolean> {
  if (!opts) return false
  reporting = true
  try {
    const response = await fetch(opts.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wire),
    })
    return response.ok
  } catch {
    return false
  } finally {
    reporting = false
  }
}

// ── 工具函数 ──
export function serialize(value: unknown): string {
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
export function redact(url: string): string {
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

export function detectOS(): string {
  const ua = navigator.userAgent
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac OS/.test(ua)) return 'macOS'
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  return 'Unknown'
}

/** 同步 64 位检测：UA 含 Win64|x64|WOW64 → x64，否则 x86。
    navigator.platform 恒返回 "Win32"（历史遗留 API 名，与位数无关），弃用。 */
function detectArchSync(): string {
  return /Win64|x64|WOW64/.test(navigator.userAgent) ? 'x64' : 'x86'
}

/** 64 位检测：优先 navigator.userAgentData 高熵值（WebView2=Chromium 可用），
    fallback 同步嗅探 navigator.userAgent。结果仅 x64 / x86。 */
async function detectArch(): Promise<string> {
  const uaData = (
    navigator as unknown as {
      userAgentData?: {
        getHighEntropyValues?: (hints: string[]) => Promise<{ bitness?: string }>
      }
    }
  ).userAgentData
  if (uaData && typeof uaData.getHighEntropyValues === 'function') {
    try {
      const { bitness } = await uaData.getHighEntropyValues(['architecture', 'bitness'])
      return bitness === '64' ? 'x64' : 'x86'
    } catch {
      /* 高熵值不可得：落入同步嗅探 */
    }
  }
  return detectArchSync()
}

export function isCrashReporterInitialized(): boolean {
  return opts !== null
}
