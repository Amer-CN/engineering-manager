/**
 * 错误上报浮层「反馈专线 FX-01」—— 皮
 * ─────────────────────────────────────────────────────────────
 * 逐拍翻译自 F:/AIXM/pomme-ui panel.js L1082-1555（PommeToys 前端逆向复刻样本，
 * HEAD 2f5cdc7）。样本规格是 4K 帧实测 + 二进制反汇编定值，所以这里的时序常量
 * （107ms 步进 / 420ms 撕断 / 1300ms 回执 / 2000ms 新纸 / 650·950·750 前置段…）
 * 一律原值保留，禁止"优化"。var→const、DOM 由 document.createElement 生成
 * （红线：React 崩了弹窗也要能弹）。
 *
 * 与样本的差异只有三处，全部是"接上工程管家里子"所必需：
 * 1. fxRef() 的随机字母单号 → 线上 Worker 真实指纹单号 R-XXXXXXXX；
 * 2. fxSend 的纯本地编排 → 与真实 POST 并行，网络先回则等编排到位再切 sent，
 *    网络失败复用 busy 相位（占线 + fax-error + 单号 + 可重发）；
 * 3. 纸上「随附机器信息」为真实版本/系统/架构/语言，正文=用户备注，发件=联系方式。
 * 另有两处样本没有的增补：纸面只读错误摘要区、底控台 COPY 按钮（复用 .fx-clear 样式）。
 */

import { SOUND_DATA, GAIN_TRIM, DECK_BASIS, MASTER_VOL } from './crash-fax-sfx'
import {
  advanceLetterNo,
  copyTextToClipboard,
  currentLetterNo,
  redact,
  resolveUserDecision,
} from './index'
import type { CrashPayload } from './index'

export type FaxMode = 'bug' | 'sug'

/** 浮层回收的表单值，交给 index.ts 组装 wire payload */
export interface FaxReportInput {
  note: string
  email: string
  attach: boolean
  mode: FaxMode
  letterNo: string
}

export interface FaxOverlayDeps {
  send: (input: FaxReportInput) => Promise<boolean>
  computeNumber: (input: FaxReportInput) => Promise<string>
  copyText: (input: FaxReportInput) => string
  /** 浮层卸载时回通知（index.ts 清空 overlayEl 引用，解除"不叠加"闸门） */
  onClosed: () => void
}

export interface FaxOverlayHandle {
  el: HTMLElement
  tearDown: () => void
}

/** 传送完成（回执撕下、新纸落位）后自动收窗的停留时长 */
const AUTO_CLOSE_MS = 3000

/** 收件方（传真单上的投递对象，非机身贴牌） */
const FAX_DESK = '工程管家'

/** 中文文案：取自样本 i18n.js 的 fx.* 词条（界面固定中文，LCD 英文行按样本原样） */
const FX_ZH: Record<string, string> = {
  'fx.line': '反馈专线',
  'fx.chars': '字数',
  'fx.modeBug': '错误报告',
  'fx.modeSug': '功能建议',
  'fx.feed': '进纸口',
  'fx.sheetTitle': '反馈传真单',
  'fx.desk': '支持台',
  'fx.to': '收件',
  'fx.date': '日期',
  'fx.from': '发件',
  'fx.pages': '页数',
  'fx.emailPh': '匿名（选填邮箱，可收回复）',
  'fx.stampBug': '错 误 报 告',
  'fx.stampSug': '功 能 建 议',
  'fx.stampNote': '类别由上方模式键决定',
  'fx.placeholder': '说明发生了什么，以及你原本预期的样子。',
  'fx.aria': '反馈内容',
  'fx.minfo': '随附机器信息',
  'fx.mApp': '应用版本',
  'fx.mOs': '系统',
  'fx.mArch': '架构',
  'fx.mLangLabel': '语言',
  'fx.privacy':
    '随纸送出的只有：所选类别、正文文字、机器信息栏所列内容、你在「发件」栏自愿留下的联系方式(不填即匿名)，以及本次故障的错误内容与最近的操作路径。此外不含姓名、账户、设备标识、截图或剪贴板内容。未送出的草稿不会离开这台电脑。',
  'fx.attachT': '随附机器信息',
  'fx.attachS': '版本、系统、架构、语言——按所示原样发送',
  'fx.clear': '清除',
  'fx.copy': '复制',
  'fx.copied': '已复制 ✓',
  'fx.send': '发送',
  'fx.st.ready': '待命',
  'fx.st.offhook': '摘机',
  'fx.st.dialing': '拨号中 ‥‥',
  'fx.st.connecting': '已接通',
  'fx.st.sending': '传送中 · 第 1 页',
  'fx.st.sent': '已送达',
  'fx.st.printed': '回执已打印',
  'fx.st.tearing': '撕下回执',
  'fx.st.loading': '换纸中',
  'fx.st.busy': '占线——稍后再试',
  'fx.st.empty': '纸上什么都没有',
  'fx.st.emailBad': '邮箱格式不对',
  'fx.rcpTitle': '传 送 回 执',
  'fx.rDate': '日期',
  'fx.rTo': '收件',
  'fx.rFrom': '发件',
  'fx.rType': '类别',
  'fx.rChars': '字数',
  'fx.rTime': '用时',
  'fx.rResult': '结果',
  'fx.rRef': '单号',
  'fx.anon': '匿名',
  'fx.catBug': '错误报告',
  'fx.catSug': '功能建议',
  'fx.okDelivered': 'OK · 已送达',
  'fx.thanks': '谢谢。每一张我们都会读。',
  'fx.tearHint': '点回执撕下 · 机器回到待命',
  'fx.errCap': '故障记录 · ERROR LOG',
  'fx.errFold': '技术详情',
}
const t = (key: string): string => FX_ZH[key] ?? key

// ══════════════════ 音效引擎（样本 panel.js L98-194：官网同构 WebAudio BufferSource 链路）══
/* BufferSource → voiceGain(逐次) → master(0.50) → 软限幅 → out。
   AudioContext 惰性创建，解码一次并缓存（样本在页面载入时即解码，这里推迟到浮层首开）。 */
let waCtx: AudioContext | null = null
let waMaster: GainNode | null = null
const waBufs: Record<string, AudioBuffer> = {}
const waDecoding: Record<string, boolean> = {}
let waPredecoded = false
let gestureReady = false

function ensureAudio(): void {
  if (waCtx) return
  try {
    waCtx = new AudioContext()
    waMaster = waCtx.createGain()
    waMaster.gain.value = MASTER_VOL
    /* 官网软限幅（hero-scene.js LIMIT_*）：|x|≤0.92 直通，越过后 tanh 渐近 0.98 */
    const pre = waCtx.createGain()
    pre.gain.value = 1 / 2.5
    const shaper = waCtx.createWaveShaper()
    const n = 8193
    const curve = new Float32Array(n)
    const KNEE = 0.92
    const CEIL = 0.98
    for (let i = 0; i < n; i++) {
      const x = ((i / (n - 1)) * 2 - 1) * 2.5
      const a = Math.abs(x)
      const yy = a <= KNEE ? a : KNEE + (CEIL - KNEE) * Math.tanh((a - KNEE) / (CEIL - KNEE))
      curve[i] = (x < 0 ? -1 : x > 0 ? 1 : 0) * yy
    }
    shaper.curve = curve
    shaper.oversample = 'none'
    waMaster.connect(pre).connect(shaper).connect(waCtx.destination)
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
      window.addEventListener(
        ev,
        () => {
          if (waCtx && waCtx.state === 'suspended') void waCtx.resume()
        },
        { passive: true },
      )
    }
  } catch {
    waCtx = null
  }
}

function waBuf(name: string): AudioBuffer | null {
  if (waBufs[name]) return waBufs[name]
  if (waDecoding[name] || !waCtx || !SOUND_DATA[name]) return null
  waDecoding[name] = true
  try {
    const bin = atob(SOUND_DATA[name])
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    waCtx.decodeAudioData(
      bytes.buffer,
      (buf) => { waBufs[name] = buf },
      () => {},
    )
  } catch {
    /* 解码异常：本次静默 */
  }
  return null /* 本次 null，下次（解码完成后）就有 */
}

/** 预解码全部音效：数据已内嵌（无网络），一次性解码 42 颗约几十 ms，消除"首次点击无声" */
function predecodeAll(): void {
  if (waPredecoded) return
  waPredecoded = true
  ensureAudio()
  Object.keys(SOUND_DATA).forEach(waBuf)
}

function playFile(name: string, gain: number): void {
  if (!gestureReady) return /* 手势前不出声 */
  ensureAudio()
  waBuf(name) /* 触发懒解码 */
  const buf = waBufs[name]
  if (!waCtx || !waMaster || !buf) return /* 解码未完成：下次触发即有声 */
  if (waCtx.state === 'suspended') void waCtx.resume()
  const src = waCtx.createBufferSource()
  src.buffer = buf
  const g = waCtx.createGain()
  g.gain.value = DECK_BASIS * (GAIN_TRIM[name] != null ? GAIN_TRIM[name] : 1.0) * gain
  src.connect(g).connect(waMaster)
  src.start()
}

function playFax(name: string, gain = 1): void {
  playFile(name, gain)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { gestureReady = true }, { capture: true })
  window.addEventListener('keydown', () => { gestureReady = true }, { capture: true })
}

// ══════════════════ DOM 构造工具 ══════════════════
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  kids: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  for (const k of kids) el.append(typeof k === 'string' ? document.createTextNode(k) : k)
  return el
}
const setText = (node: Node, s: string): void => {
  node.textContent = s
}
const $ = <T extends Element = Element>(sel: string, root: ParentNode): T | null =>
  root.querySelector<T>(sel)

const REDUCED =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const FX_WEEK_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function fxPad(n: number | string, w: number): string {
  let s = String(n)
  while (s.length < w) s = '0' + s
  return s
}

function fxNow(): { date: string; stamp: string; week: string } {
  const d = new Date()
  return {
    date: d.getFullYear() + '-' + fxPad(d.getMonth() + 1, 2) + '-' + fxPad(d.getDate(), 2),
    stamp:
      fxPad(d.getMonth() + 1, 2) + '-' + fxPad(d.getDate(), 2) +
      ' ' + fxPad(d.getHours(), 2) + ':' + fxPad(d.getMinutes(), 2),
    week: FX_WEEK_ZH[d.getDay()],
  }
}

/** 打字机给文本节点挂的满值（样本用 node.__fxFull 同一手法） */
type Printable = Text & { __fxFull?: string }

// ══════════════════ 浮层 ══════════════════
export function showFaxOverlay(
  payload: CrashPayload,
  dupKey: string,
  deps: FaxOverlayDeps,
  initialMode: FaxMode = 'bug',
): FaxOverlayHandle {
  const root = h('div', 'crash-fax')
  root.dataset.dupKey = dupKey
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    root.classList.add('crash-fax--dark')
  }

  // ── 机身（样本 index.html L532-653 .fx-block 逐节点还原）──
  const stZh = h('span', 'fx-st-zh')
  const stEn = h('span', 'fx-st-en')
  const countEl = h('p', 'fx-count')
  const shoulder = h('div', 'fx-shoulder', [
    h('span', 'fx-lights', [h('i'), h('i'), h('i')]),
    h('span', 'fx-linetag', [t('fx.line') + ' FEEDBACK LINE FX-01']),
  ])
  const lcd = h('div', 'fx-lcd', [
    h('div', 'fx-lcd-left', [h('p', 'fx-st-line', [stZh, h('i', 'fx-caret')]), h('p', 'fx-st-sub', [stEn])]),
    h('div', 'fx-lcd-right', [countEl, h('p', 'fx-count-cap', [t('fx.chars') + ' · CHARS'])]),
  ])

  const modeBtn = (mode: FaxMode, en: string, zh: string, cur: boolean): HTMLButtonElement => {
    const b = h('button', cur ? 'fx-mode cur' : 'fx-mode', [h('span', 'band', [h('span', 'en', [en]), h('span', 'zh', [zh])])])
    b.type = 'button'
    b.setAttribute('role', 'radio')
    b.setAttribute('aria-checked', cur ? 'true' : 'false')
    if (!cur) b.tabIndex = -1
    b.dataset.fxMode = mode
    return b
  }
  const modeBugBtn = modeBtn('bug', 'BUG REPORT', t('fx.modeBug'), true)
  const modeSugBtn = modeBtn('sug', 'SUGGESTION', t('fx.modeSug'), false)
  const modeBtns = [modeBugBtn, modeSugBtn]
  const modes = h('div', 'fx-modes', modeBtns)
  modes.setAttribute('role', 'radiogroup')
  modes.setAttribute('aria-label', '类别')

  const paper = h('div', 'fx-paper')
  paper.dataset.fxPaper = ''
  const noEl = h('span', 'fx-no')
  const dateEl = h('b')
  dateEl.dataset.fxDate = ''
  const email = h('input', 'fx-email')
  email.type = 'email'
  email.maxLength = 80
  email.autocomplete = 'off'
  email.spellcheck = false
  email.placeholder = t('fx.emailPh')
  email.setAttribute('aria-label', '发件邮箱')
  email.dataset.fxEmail = ''
  const stampText = h('span', undefined, [t('fx.stampBug')])
  stampText.dataset.fxStampText = ''
  const stampEl = h('span', 'fx-stamp', [stampText])
  stampEl.setAttribute('aria-hidden', 'true')
  stampEl.dataset.fxStamp = ''
  const body = h('textarea', 'fx-input')
  body.dataset.fxText = ''
  body.rows = 5
  body.maxLength = 2000
  body.placeholder = t('fx.placeholder')
  body.setAttribute('aria-label', t('fx.aria'))

  const mVersion = h('b')
  const mOs = h('b')
  const mArch = h('b')
  const mLang = h('b')
  mLang.dataset.fxMlang = ''
  setText(mVersion, payload.version ?? '')
  setText(mOs, payload.os ?? '')
  setText(mArch, payload.arch ?? '')
  setText(mLang, payload.language ?? '')
  const minfo = h('div', 'fx-minfo', [
    h('p', 'bt', [t('fx.minfo') + ' · MACHINE INFO']),
    h('p', undefined, [h('em', undefined, [t('fx.mApp')]), mVersion]),
    h('p', undefined, [h('em', undefined, [t('fx.mOs')]), mOs]),
    h('p', undefined, [h('em', undefined, [t('fx.mArch')]), mArch]),
    h('p', undefined, [h('em', undefined, [t('fx.mLangLabel')]), mLang]),
  ])
  const minfoClip = h('div', 'fx-minfo-clip', [minfo])
  /* 错误摘要区（样本没有的增补）：只读、等宽小字、细虚线框、纸墨色，
     视觉如"已打印在纸上的故障记录"，插在「随附机器信息」之前 */
  const errClip = h('div', 'fx-errclip')

  const sheet = h('div', 'fx-sheet', [
    h('div', 'fx-p-head', [h('span', 'fx-brand', ['工程管家 · ' + t('fx.sheetTitle')]), noEl]),
    h('div', 'fx-p-meta', [
      h('p', undefined, [h('em', undefined, [t('fx.to')]), h('b', undefined, [FAX_DESK + ' ' + t('fx.desk')])]),
      h('p', undefined, [h('em', undefined, [t('fx.date')]), dateEl]),
      h('p', undefined, [h('em', undefined, [t('fx.from')]), email]),
      h('p', undefined, [h('em', undefined, [t('fx.pages')]), h('b', undefined, ['01 / 01'])]),
    ]),
    h('div', 'fx-stamp-row', [stampEl, h('span', 'fx-stamp-note', [t('fx.stampNote')])]),
    h('div', 'fx-body', [body]),
    errClip,
    minfoClip,
    h('p', 'fx-privacy', [t('fx.privacy')]),
  ])
  paper.append(h('i', 'fx-holes l'), h('i', 'fx-holes r'), h('i', 'fx-light-catch'), sheet)

  // 回执（FaxReceiptView）
  const rcp = {
    date: h('dd'),
    from: h('dd'),
    type: h('dd'),
    chars: h('dd'),
    time: h('dd'),
    result: h('dd'),
    ref: h('dd'),
  }
  rcp.date.dataset.fxRDate = ''
  rcp.from.dataset.fxRFrom = ''
  rcp.type.dataset.fxRType = ''
  rcp.chars.dataset.fxRChars = ''
  rcp.time.dataset.fxRTime = ''
  rcp.result.dataset.fxRResult = ''
  rcp.ref.dataset.fxRRef = ''
  setText(rcp.from, t('fx.anon'))
  setText(rcp.type, t('fx.catBug'))
  setText(rcp.chars, '0000')
  setText(rcp.time, "00'06")
  setText(rcp.result, t('fx.okDelivered'))
  setText(rcp.ref, 'R-XXXXXXX')
  const dl = h('dl')
  const rcpRows: Array<[string, HTMLElement]> = [
    [t('fx.rDate'), rcp.date],
    [t('fx.rTo'), h('dd', undefined, [FAX_DESK + ' ' + t('fx.desk')])],
    [t('fx.rFrom'), rcp.from],
    [t('fx.rType'), rcp.type],
    [t('fx.rChars'), rcp.chars],
    [t('fx.rTime'), rcp.time],
    [t('fx.rResult'), rcp.result],
    [t('fx.rRef'), rcp.ref],
  ]
  for (const [label, dd] of rcpRows) dl.append(h('div', undefined, [h('dt', undefined, [label]), dd]))
  const receipt = h('div', 'fx-receipt', [
    h('div', 'body', [
      h('p', 'ttl', [t('fx.rcpTitle')]),
      h('p', 'sub', ['报 告 回 执']),
      h('div', 'rule'),
      dl,
      h('div', 'rule'),
      h('p', 'thanks', [t('fx.thanks')]),
      h('p', 'tear-hint', [t('fx.tearHint')]),
    ]),
    h('div', 'teeth'),
  ])
  receipt.dataset.fxReceipt = ''
  receipt.setAttribute('aria-hidden', 'true')

  // 底控台（FaxDeckView）
  const trigger = h('button', 'pt-sw fx-trigger', [h('span', 'i'), h('span', 'o'), h('span', 'k')])
  trigger.type = 'button'
  trigger.setAttribute('role', 'switch')
  trigger.setAttribute('aria-checked', 'true')
  trigger.setAttribute('aria-label', t('fx.attachT'))
  trigger.dataset.fxAttachSw = ''
  const clearBtn = h('button', 'fx-clear', [h('span', 'zh', [t('fx.clear')]), h('span', 'en', ['CLEAR'])])
  clearBtn.type = 'button'
  clearBtn.dataset.fxClear = ''
  /* COPY：样本没有的按钮，夹在 CLEAR 与 TRANSMIT 之间，同款 .fx-clear 样式 */
  const copyZh = h('span', 'zh', [t('fx.copy')])
  const copyEn = h('span', 'en', ['COPY'])
  const copyBtn = h('button', 'fx-clear fx-copy', [copyZh, copyEn])
  copyBtn.type = 'button'
  copyBtn.dataset.fxCopy = ''
  const sendBtn = h('button', 'fx-send', [h('span', 'zh', [t('fx.send')]), h('span', 'en', ['TRANSMIT'])])
  sendBtn.type = 'button'
  sendBtn.dataset.fxSend = ''
  const controls = h('div', 'fx-controls', [
    h('div', 'fx-attach', [
      trigger,
      h('div', 'fx-attach-copy', [h('b', undefined, [t('fx.attachT')]), h('span', undefined, [t('fx.attachS')])]),
    ]),
    h('div', 'fx-lamp-wrap', [h('i', 'fx-lamp'), h('span', 'fx-line-silk', ['LINE'])]),
    clearBtn,
    copyBtn,
    sendBtn,
  ])
  $(':scope .fx-lamp-wrap', controls)?.setAttribute('aria-hidden', 'true')

  const fx = h('section', 'fx', [
    shoulder,
    lcd,
    modes,
    h('div', 'fx-feed', [h('span', 'fl-lb', [t('fx.feed') + ' · DOCUMENT FEED']), h('span', 'fl-rule')]),
    h('div', 'fx-slot'),
    h('div', 'fx-feed-cap'),
    h('div', 'fx-cage', [paper, receipt]),
    controls,
  ])
  fx.dataset.fx = ''
  fx.setAttribute('data-fx-phase', 'ready')
  fx.setAttribute('data-fx-attach', 'on')
  root.append(h('section', 'fx-block', [fx]))

  // ── 状态机（样本 panel.js L1082-1537）──
  let fxPhase = 'ready'
  let fxSerial = currentLetterNo() /* 纸面单号，每完成一次传送 +1 */
  let fxMode: FaxMode = 'bug'
  let fxT0 = 0 /* 发送起点（回执「用时」用） */
  let fxNumber = '' /* 真实指纹单号（样本此处为随机 fxRef()） */
  let fxPct = 0
  let netResult: boolean | null = null
  let autoCloseTimer: ReturnType<typeof setTimeout> | null = null
  const FX_BUSY_PHASES = ['offhook', 'dialing', 'connecting', 'sending', 'sent', 'printed', 'tearing', 'loading', 'busy']

  /** LCD 右下小行读数（机器刻字，不翻译；busy 分支为工程管家扩展=失败态带单号） */
  function fxEnLine(p: string): string {
    const n = fxNow()
    switch (p) {
      case 'ready': return 'READY · ' + n.stamp + ' ' + n.week
      case 'offhook': return 'OFF HOOK'
      case 'dialing': return 'DIALING · 工程管家'
      case 'connecting': return 'CONNECT · '
      case 'sending': return 'SENDING · P.01 · ' + (fxPct || 10) + '%'
      case 'sent': return '报 告 已 送 达'
      case 'printed': return '撕 下 · NO.' + fxPad(fxSerial, 4)
      case 'tearing': return '撕 下 · NO.' + fxPad(fxSerial, 4)
      case 'loading': return 'LOADING · NO.' + fxPad(fxSerial, 4)
      case 'busy': return fxNumber ? 'BUSY · ' + fxNumber : ''
      default: return ''
    }
  }
  function fxShow(p: string): void {
    setText(stZh, t('fx.st.' + p))
    setText(stEn, fxEnLine(p))
  }

  const fxSfxTimers: Array<ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>> = []
  let fxSfxHold = false /* 主动编排链中豁免清理（fxSetPhase 会误杀刚排的下一步音） */
  function fxSfxClear(): void {
    for (const x of fxSfxTimers) {
      clearInterval(x as ReturnType<typeof setInterval>)
      clearTimeout(x as ReturnType<typeof setTimeout>)
    }
    fxSfxTimers.length = 0
  }
  function fxSfxIv(fn: () => void, ms: number): void {
    fxSfxTimers.push(setInterval(fn, ms))
  }
  function fxSfxTo(fn: () => void, ms: number): void {
    fxSfxTimers.push(setTimeout(fn, ms))
  }

  function fxSetPhase(p: string): void {
    if (p !== fxPhase && !fxSfxHold) fxSfxClear() /* 相位切换清音（hold 链中不误杀） */
    fxPhase = p
    fx.setAttribute('data-fx-phase', p)
    fxShow(p)
    const busy = FX_BUSY_PHASES.indexOf(p) >= 0
    if (busy) fxPrintRestore() /* 纸进机器时信息必须完整 */
    sendBtn.disabled = busy
    clearBtn.disabled = busy
    copyBtn.disabled = busy
    trigger.disabled = busy
    for (const b of modeBtns) b.disabled = busy
    body.disabled = busy
    email.disabled = busy
    receipt.setAttribute('aria-hidden', p === 'sent' || p === 'printed' ? 'false' : 'true')
  }

  const fxChars = (): number => body.value.length
  function fxCountUpdate(): void {
    setText(countEl, fxPad(fxChars(), 4) + ' / 2,000')
  }
  body.addEventListener('input', fxCountUpdate)

  function fxPaintStamp(): void {
    const bug = fxMode === 'bug'
    stampEl.classList.toggle('sug', !bug)
    setText(stampText, t(bug ? 'fx.stampBug' : 'fx.stampSug'))
  }

  function currentInput(): FaxReportInput {
    return {
      note: body.value,
      email: email.value,
      attach: trigger.getAttribute('aria-checked') === 'true',
      mode: fxMode,
      letterNo: 'NO.' + fxPad(fxSerial, 4),
    }
  }

  function selectMode(mode: FaxMode, viaClick: boolean): void {
    fxMode = mode
    for (const b of modeBtns) {
      const on = b.dataset.fxMode === mode
      b.classList.toggle('cur', on)
      b.setAttribute('aria-checked', on ? 'true' : 'false')
      b.tabIndex = on ? 0 : -1
    }
    fxPaintStamp()
    if (!viaClick) return
    /* 盖章动画（官方 PressStamp.land：scale 1.6→1 + opacity 0→1 下落叩击）；
       REDUCED 跳过（.fx-stamp.stamping 动画在 reduce 断点为 none） */
    if (!REDUCED) {
      stampEl.classList.remove('stamping')
      void stampEl.offsetWidth /* 重排触发：连续切换也重放动画 */
      stampEl.classList.add('stamping')
    }
    playFile('tick-fs626659', 1) /* 官方切换类别播键音（select 闭包 play case44） */
  }
  for (const k of modeBtns) {
    k.addEventListener('click', () => {
      if (fxPhase !== 'ready') return
      const mode = k.dataset.fxMode as FaxMode
      if (fxMode === mode) return /* 同键重复点击不重盖 */
      selectMode(mode, true)
    })
  }

  // 扳机开关：机器信息框显隐（只切可见性，不塌高度；CSS 见 .fx-minfo-clip）
  let fxOnBase: { inputH: number; paperH: number } | null = null
  const inputEl = (): HTMLElement | null => $<HTMLElement>('.fx-input', fx)
  const paperEl = (): HTMLElement | null => $<HTMLElement>('.fx-paper', fx)
  function fxOnBaseReady(): boolean {
    if (fxOnBase) return true
    const input = inputEl()
    const pg = paperEl()
    if (!input || !pg) return false
    if (!fxMinfoFullOK()) return false /* 只有打字机满文字状态才可记基准 */
    input.style.height = ''
    fxOnBase = { inputH: input.getBoundingClientRect().height, paperH: pg.getBoundingClientRect().height }
    return true
  }
  function fxOffBalance(): void {
    const input = inputEl()
    const pg = paperEl()
    if (!fxOnBase || !input || !pg) return
    input.style.height = fxOnBase.inputH + 'px'
    const d = fxOnBase.paperH - pg.getBoundingClientRect().height
    if (Math.abs(d) > 0.5) input.style.height = fxOnBase.inputH + d + 'px'
  }
  trigger.addEventListener('click', () => {
    if (fxPhase !== 'ready') return
    const on = trigger.getAttribute('aria-checked') !== 'true'
    fxPrintUnpin() /* 先无条件撤钉：off 态 clip 脱流看不见，残留 min-height 会让回 on 复流时矮一截 */
    trigger.setAttribute('aria-checked', on ? 'true' : 'false')
    if (!on) {
      /* 先停止打印并恢复满文字（此刻仍在 on 布局：clip 流内、文字满、minfo 自然满高） */
      fxPrintRestore()
      fxOnBaseReady()
      fx.setAttribute('data-fx-attach', 'off')
      fxOffBalance()
    } else {
      fx.setAttribute('data-fx-attach', 'on')
      const input = inputEl()
      if (input && fxOnBase) input.style.height = fxOnBase.inputH + 'px'
      fxPrintMinfo() /* 打完时 done() 会记基准 */
    }
  })

  // 机器信息打字机：显示时逐字打印，伴随 fax-print 噼里啪啦（打印期间钉满高，全程高度不变）
  let fxPrintTk = 0
  let fxMinfoFullH: number | null = null
  let fxMinfoNodesSnap: Printable[] | null = null
  function fxMinfoNodes(): Printable[] {
    if (fxMinfoNodesSnap && fxMinfoNodesSnap.some((n) => !n.isConnected)) fxMinfoNodesSnap = null
    if (!fxMinfoNodesSnap) {
      const out: Printable[] = []
      const box = $('.fx-minfo', fx)
      if (box) {
        const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT)
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (n.nodeValue && n.nodeValue.trim()) out.push(n as Printable)
        }
      }
      fxMinfoNodesSnap = out
    }
    return fxMinfoNodesSnap
  }
  function fxPrintUnpin(): void {
    const box = $('.fx-minfo', fx) as HTMLElement | null
    if (box) box.style.minHeight = ''
  }
  function fxPrintRestore(): void {
    fxPrintTk++ /* 取消进行中的打印 */
    for (const node of fxMinfoNodes()) {
      if (node.__fxFull != null) node.nodeValue = node.__fxFull
    }
    fxPrintUnpin()
  }
  function fxMinfoFullOK(): boolean {
    for (const node of fxMinfoNodes()) {
      if (node.__fxFull != null && node.nodeValue !== node.__fxFull) return false
    }
    return true
  }
  function fxPrintMinfo(): void {
    const box = $('.fx-minfo', fx) as HTMLElement | null
    const nodes = fxMinfoNodes()
    if (!box || !nodes.length) return
    fxPrintTk++
    const tk = fxPrintTk
    /* 满高只信首次载入的量测：clip 脱流期间 absolute shrink-to-fit 塌宽会量出假值 */
    if (fxMinfoFullH == null) fxMinfoFullH = box.offsetHeight
    box.style.minHeight = fxMinfoFullH + 'px'
    for (const node of nodes) {
      node.__fxFull = node.nodeValue ?? ''
      node.nodeValue = ''
    }
    const done = (): void => {
      if (tk !== fxPrintTk) return
      fxPrintUnpin()
      fxOnBaseReady() /* 满文字时刻：可记/校准开态基准 */
    }
    if (REDUCED) {
      for (const node of nodes) node.nodeValue = node.__fxFull ?? ''
      fxPrintUnpin()
      return
    }
    let i = 0
    let j = 0
    /* 逐字打字（每字 10ms / 换行 16ms）；音效密度对齐官版实测（每 5 字一声）：
       每字都响会让 10ms 短样本叠成连绵噪音 */
    let tick = 0
    const step = (): void => {
      if (tk !== fxPrintTk) return /* 已被取消/替换 */
      const node = nodes[i]
      if (!node) { done(); return } /* 打完 */
      node.nodeValue = (node.__fxFull ?? '').slice(0, ++j)
      if (++tick % 5 === 0) playFax('fax-print-' + (1 + Math.floor(Math.random() * 3)), 0.5)
      if (j >= (node.__fxFull ?? '').length) {
        i++
        j = 0
        setTimeout(step, 16) /* 换行进给 */
      } else setTimeout(step, 10)
    }
    step()
  }

  function fxFillReceipt(): void {
    const mail = email.value.trim()
    setText(rcp.date, fxNow().stamp)
    setText(rcp.from, mail || t('fx.anon'))
    setText(rcp.type, t(fxMode === 'bug' ? 'fx.catBug' : 'fx.catSug'))
    setText(rcp.chars, fxPad(fxChars(), 4))
    setText(rcp.time, "00'" + fxPad(Math.max(0, Math.round((performance.now() - fxT0) / 1000)), 2))
    setText(rcp.result, t('fx.okDelivered'))
    setText(rcp.ref, fxNumber || 'R-XXXXXXX')
  }

  /** 错误摘要区（无值不渲染）：message 前 500 字 + 折叠堆栈/组件堆栈/脱敏位置 */
  function fillErrorClip(): void {
    const message = (payload.message || '').slice(0, 500)
    const rows: Array<[string, string]> = []
    if (payload.stack) rows.push(['完整堆栈', payload.stack])
    if (payload.kind === 'react' && payload.componentStack) rows.push(['组件堆栈', payload.componentStack])
    const loc =
      payload.kind === 'fetch'
        ? (payload.message || '').replace(/^HTTP\s+\d+\s+/, '')
        : payload.topFrame || payload.source || ''
    if (loc) rows.push(['触发位置', /^https?:/.test(loc) ? redact(loc) : loc])
    if (!message && !rows.length) return
    errClip.append(h('p', 'fx-err-cap', [t('fx.errCap')]), h('p', 'fx-err-msg', [message]))
    /* 无技术详情就不挂 <details>：空 details 会被 UA 自动补出英文 "Details" 标签 */
    if (!rows.length) return
    const wrap = h('div', 'fx-err-rows')
    for (const [label, value] of rows) {
      wrap.append(h('p', 'fx-err-row', [h('span', 'k', [label]), h('pre', 'v', [value])]))
    }
    errClip.append(h('details', 'fx-err-fold', [h('summary', undefined, [t('fx.errFold')]), wrap]))
  }

  function fxSend(): void {
    if (fxPhase !== 'ready') return
    playFile('tick-fs626659', 1) /* 键行音（FooterKey 实锤：TRANSMIT 点击有键音） */
    /* 空内容：报错 + fax-error，停留待命。工程管家的备注属"选填"，
       纸上有故障记录即算有内容，不得因未写备注拒绝上报。 */
    if (!fxChars() && !(payload.message || payload.stack)) {
      playFax('fax-error')
      setText(stZh, t('fx.st.empty'))
      setTimeout(() => { if (fxPhase === 'ready') fxShow('ready') }, 1500)
      return
    }
    /* 邮箱格式校验（官方文案「邮箱格式不对」@0x211760；非法时不发送） */
    const mail = email.value.trim()
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      playFax('fax-error')
      setText(stZh, t('fx.st.emailBad'))
      setTimeout(() => { if (fxPhase === 'ready') fxShow('ready') }, 1500)
      return
    }
    fxT0 = performance.now()
    fxPct = 10
    const input = currentInput()
    /* 单号与真实 POST 同时发起，与拨号编排并行；两者都比 ~5.5s 的编排链快得多，
       回执落笔时已就位（备注/邮箱不进指纹，模式键改 kind，故按当前档位算） */
    fxNumber = ''
    netResult = null
    void deps.computeNumber(input).then((n) => { fxNumber = n }, () => { fxNumber = '' })
    void deps.send(input).then((ok) => { netResult = ok }, () => { netResult = false })

    /* 官方线性时间轴（音画交叉验证）：摘机170→拨号170→载波320→传送1820→切换390→回执650 */
    fxSetPhase('offhook')
    playFax('fax-offhook')
    setTimeout(() => {
      fxSetPhase('dialing')
      playFax('fax-dial-1', 1) /* 官方：dial-1 立即 1 声（0x10006245c IMM case26） */
      /* 官方拨号序列（runTransmission 0x100062864 计数器查表 @0x10023a680=[26..31]）：
         计数器 1..5 → dial-2→3→4→5→6，与首声组成完整六音，间隔 160ms（const 池） */
      for (let di = 2; di <= 6; di++) {
        const n = di
        fxSfxTo(() => {
          if (fxPhase === 'dialing') playFax('fax-dial-' + n, 1)
        }, REDUCED ? 0 : 160 * (n - 1))
      }
      setTimeout(() => {
        fxSetPhase('connecting')
        playFax('fax-carrier', 1) /* 载波握手音 0.70s 播一次 */
        setTimeout(() => {
          fxSetPhase('sending')
          playFax('fax-send-key')
          const p0 = performance.now()
          let feedStep = 0 /* 官方 feed-1/2/3 轮换计数（mod-3 查表） */
          let printStep = 0 /* 官方 print-1/2/3 轮换计数（回执段） */
          /* 传送段持续走纸音：官方 rollSheet 同构步进——一个时钟（107ms/步）同时驱动
             【纸位移+滚轮声】，音画物理同源，杜绝 CSS 合成器与 JS 定时器双时钟漂移 */
          paper.classList.remove('up')
          paper.style.transform = ''
          const sendDone = (): void => {
            if (fxPhase !== 'sending') return
            fxPct = 100
            setText(stEn, fxEnLine('sending'))
            fxSfxClear() /* 最后一步声已响，收尾即静 */
            finishSend() /* → 已送达 → 回执 */
          }
          fxSfxTo(function tick(): void {
            if (fxPhase !== 'sending') { fxSfxClear(); return }
            const k = Math.min(1, (performance.now() - p0) / 3200)
            const pg = paperEl()
            if (pg) pg.style.transform = 'translateY(' + (-118 * k).toFixed(2) + '%)'
            fxPct = Math.round(10 + k * 90) /* 10% → 100% */
            setText(stEn, fxEnLine('sending'))
            if (k >= 1) { sendDone(); return } /* 100%=纸全进=切送达（主时钟=进度百分比） */
            /* 官方传送段走纸音（feedSheet 0x10006415c mod-3 查表 @0x10023a6d0=[33,34,35]） */
            playFax('fax-feed-' + (1 + feedStep % 3), 0.55 - k * 0.25)
            feedStep++
            fxSfxTo(tick, k > 0.7 ? 107 + (k - 0.7) * 500 : 107) /* 末段渐稀（官版尾音余韵） */
          }, 107)

          /* 收尾链由 sendDone（=百分比 100%）触发；网络是第七路并行信号：
             先回则在此等编排到位（样本行为），未回则原地 50ms 复查，失败转占线 */
          const finishSend = (): void => {
            if (fxPhase !== 'sending') return
            if (netResult === null) { setTimeout(finishSend, 50); return }
            if (netResult === false) { transmitFailed(); return }
            fxSfxHold = true /* 编排链开始：相位切换不再清后续排定的音 */
            fxFillReceipt()
            fxSetPhase('sent')
            playFax('fax-ding', 1) /* 已送达：叮一声（全二进制仅此 1 处 ding） */
            /* 官方回执段 print 循环（printReceipt 0x1000647f8 双层，mod-3 表 [36,37,38]）：
               print-1→2→3 轮换，与回执滑入同刻起、落位同刻停 */
            playFax('fax-print-' + (1 + printStep++ % 3), 1) /* 首声立即（与叮同刻） */
            fxSfxIv(() => {
              /* 撕纸抢跑：静默停打印音，不得清全局音队列（否则误杀撕纸编排） */
              if (fxPhase !== 'sent' && fxPhase !== 'printed') return
              playFax('fax-print-' + (1 + printStep++ % 3), 1)
            }, 120) /* 官方视频实测 110-130ms（打印步进） */
            fxSfxTo(() => {
              if (fxPhase !== 'sent' && fxPhase !== 'printed') return /* 已被撕纸流程接管 */
              fxSetPhase('printed')
              /* 官方慢版（视频第一轮 8.63-11.17）：打印声全程持续 ~2.5s 才停——
                 printed 后继续响到链尾，落定时叮+offhook 收 */
              fxSfxTo(() => {
                if (fxPhase !== 'sent' && fxPhase !== 'printed') return /* 撕纸场景下整条收尾链让位 */
                fxSfxClear()
                fxSfxHold = false /* 编排链结束：恢复正常相位清音（hold 悬空=下轮切换不清音） */
                playFax('fax-ding', 1) /* 收尾：叮+落定 */
                setTimeout(() => playFax('fax-offhook', 1), 200)
              }, REDUCED ? 0 : 1150)
            }, REDUCED ? 0 : 1300) /* 滑入 1300ms（官方 Duration，sent→printed 连续一条） */
          }
        }, REDUCED ? 0 : 750) /* 接通 750ms（官版常规节奏：视频为快剪） */
      }, REDUCED ? 0 : 950) /* 拨号 950ms */
    }, REDUCED ? 0 : 650) /* 摘机 650ms */
  }

  /** 发送失败：复用 busy 相位（占线——稍后再试 + fax-error），单号照显，回落待命可重发 */
  function transmitFailed(): void {
    fxSfxHold = false
    fxSetPhase('busy')
    playFax('fax-error')
    setTimeout(() => {
      if (fxPhase !== 'busy') return
      fxSetPhase('ready') /* 回待命：busy 相已把单号打在 LCD 上，此处 fxShow 复位两行 */
    }, 1500)
  }

  function fxTear(): void {
    if (fxPhase !== 'printed') return
    fxSetPhase('tearing')
    /* 撕断段官方真相（视频第一轮 11.57-11.84 实测）：3 强峰 270ms 内（间隔 170/100）；
       FaxReceiptTeeth 0x10005fd60 animatableData setter IMM case43 = tear 随齿条动画逐步 */
    playFax('fax-tear', 1) /* 第 1 峰：立即 */
    fxSfxTo(() => { if (fxPhase === 'tearing') playFax('fax-tear', 1) }, 170) /* 第 2 峰 */
    fxSfxTo(() => { if (fxPhase === 'tearing') playFax('fax-tear', 0.9) }, 270) /* 第 3 峰 */
    /* 掉落段（官方 12.17-13.50 ~1.3s 密集中强声 120ms 间隔）：音轨频谱实测
       掉落峰 zcr=1.0-1.7kHz ≈ load(1.8-1.9kHz) 远离 print(3.3-3.8kHz)——mod-3 轮换 */
    fxSfxTo(() => {
      if (fxPhase !== 'tearing') return
      let dropStep = 0
      playFax('fax-load-' + (1 + dropStep++ % 3), 1)
      fxSfxIv(() => {
        if (fxPhase !== 'tearing') { fxSfxClear(); return }
        playFax('fax-load-' + (1 + dropStep++ % 3), 1)
      }, 120) /* 官方掉落摩擦间隔 */
    }, 420) /* 撕断动画 420ms 后掉落开始（=静默 150ms 后） */
    setTimeout(() => {
      /* 换纸段官方真相：无 load 调用（全二进制零引用），吞纸声=feedSheet 复用
         （feed-1/2/3 mod-3 循环 @0x10023a6d0）。时序：点击→撕断 270ms→掉落 ~1.3s→换纸 */
      fxSerial += 1
      advanceLetterNo(fxSerial)
      setText(noEl, 'NO.' + fxPad(fxSerial, 4))
      setText(dateEl, fxNow().date)
      body.value = ''
      fxCountUpdate()
      fxSetPhase('loading')
      let swallowStep = 0 /* 换纸段独立 mod-3 计数（feedStep 在发送闭包内不可达） */
      playFax('fax-feed-' + (1 + swallowStep++ % 3), 1) /* 吞纸首声立即 */
      fxSfxIv(() => {
        if (fxPhase !== 'loading') { fxSfxClear(); return }
        playFax('fax-feed-' + (1 + swallowStep++ % 3), 1)
      }, 107) /* 吞纸段与官方步进同钟（吞纸 1100ms，约 10 声） */
      setTimeout(() => {
        fxSfxClear() /* 吞纸结束：停 feed 循环 */
        /* 新纸步进降下（官方慢慢出纸）：从 -118% 每 107ms 一步匀速回 0；
           降下窗=新纸打印窗，print mod-3 循环伴纸同响——纸是被打印声"顶"出来的 */
        const fresh0 = performance.now()
        let freshStep = 0
        playFax('fax-print-' + (1 + freshStep++ % 3), 0.5) /* 打印首声与纸出同刻 */
        fxSfxIv(() => {
          if (fxPhase !== 'loading') { fxSfxClear(); return }
          playFax('fax-print-' + (1 + freshStep++ % 3), 0.5)
        }, 100) /* 官方 const 池 100ms（打印步进），低音量（新纸打印弱于回执） */
        fxSfxTo(function down(): void {
          if (fxPhase !== 'loading') { fxSfxClear(); return }
          const kk = Math.min(1, (performance.now() - fresh0) / 2000)
          paper.style.transform = 'translateY(' + (-118 * (1 - kk)).toFixed(2) + '%)'
          if (kk >= 1) return /* 终值由 ready 切换统一归零（防两时钟竞争残留） */
          fxSfxTo(down, 107)
        }, 107)
        fxSfxTo(() => {
          fxSfxClear() /* 纸落位即停打印声（音画同刻收） */
          paper.style.transform = 'translateY(0)' /* 强制归零：步进末帧残余 -0.97%≈3px 会压标题 */
          fxSetPhase('ready')
          /* 新纸不重打机器信息：吞纸时 fxPrintRestore 已恢复完整文字（真传真机吐出的
             就是成品单）；打字机效果只在首载与开关从 off 打开时演示。
             工程管家增量：一次上报闭环已完整（回执已撕、新纸已就位）→ 稍停后收窗 */
          autoCloseTimer = setTimeout(() => close(true), AUTO_CLOSE_MS)
        }, REDUCED ? 0 : 2000) /* 新纸打印段 */
      }, REDUCED ? 0 : 1100) /* 换纸吞纸 */
    }, REDUCED ? 0 : 1350) /* 撕断 420 + 掉落 900 ≈ 官方点击→换纸间隔（实测 ~1.3s） */
  }

  // CLEAR：点按清纸；长按 1.5 秒演示占线
  let fxClearTimer: ReturnType<typeof setTimeout> | null = null
  let fxClearLong = false
  clearBtn.addEventListener('pointerdown', () => {
    if (fxPhase !== 'ready') return
    fxClearLong = false
    fxClearTimer = setTimeout(() => {
      fxClearLong = true
      fxSetPhase('busy')
      playFax('fax-error')
      setTimeout(() => { if (fxPhase === 'busy') fxSetPhase('ready') }, 1500)
    }, 1500)
  })
  const fxClearUp = (): void => {
    if (fxClearTimer) { clearTimeout(fxClearTimer); fxClearTimer = null }
  }
  clearBtn.addEventListener('pointerup', fxClearUp)
  clearBtn.addEventListener('pointerleave', fxClearUp)
  clearBtn.addEventListener('click', () => {
    if (fxClearLong) { fxClearLong = false; return }
    if (fxPhase !== 'ready') return
    playFile('tick-fs626659', 1) /* 键行音（反汇编实锤：CLEAR/TRANSMIT 键行点击有键音） */
    body.value = ''
    email.value = ''
    fxCountUpdate()
  })

  // COPY：样本没有的按钮，逻辑沿用现有 buildCopyText + 剪贴板兜底
  copyBtn.addEventListener('click', () => {
    if (fxPhase !== 'ready') return
    playFile('tick-fs626659', 1)
    void copyTextToClipboard(deps.copyText(currentInput())).then((ok) => {
      if (!ok) return
      setText(copyZh, t('fx.copied'))
      setText(copyEn, 'COPIED')
      setTimeout(() => {
        setText(copyZh, t('fx.copy'))
        setText(copyEn, 'COPY')
      }, 1200)
    })
  })

  sendBtn.addEventListener('click', fxSend)
  receipt.addEventListener('click', fxTear)

  // 关闭：Esc 仅非 busy 相位（传送途中忽略）
  let closed = false
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    if (FX_BUSY_PHASES.indexOf(fxPhase) >= 0) return
    close(false)
  }
  document.addEventListener('keydown', onKey)

  function close(sent: boolean): void {
    if (closed) return
    closed = true
    tearDown()
    resolveUserDecision(sent)
  }

  function tearDown(): void {
    document.removeEventListener('keydown', onKey)
    fxClearUp()
    if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null }
    fxPrintTk++ /* 取消打字机链 */
    fxSfxHold = false
    fxSfxClear()
    if (!closed) closed = true /* 外部（3 分钟兜底）拆解也算已关 */
    root.remove()
    deps.onClosed()
  }

  // ── 首载（样本 L1527-1537）──
  setText(noEl, 'NO.' + fxPad(fxSerial, 4))
  setText(dateEl, fxNow().date)
  selectMode(initialMode, false) /* 默认档由 index.ts 按被捕获错误的原生 kind 推导 */
  fxCountUpdate()
  fxSetPhase('ready')
  fillErrorClip()
  document.body.appendChild(root)
  predecodeAll() /* 首开即预解码全部音效（几十 ms），避免第一轮传送漏声 */
  /* 首次打印推迟一拍再量基准（同样本 setTimeout 0 的节拍，等布局稳定） */
  if (fx.getAttribute('data-fx-attach') !== 'off') {
    setTimeout(() => {
      if (fxPhase === 'ready' && fx.getAttribute('data-fx-attach') !== 'off') fxPrintMinfo()
    }, 0)
  }

  return { el: root, tearDown }
}
