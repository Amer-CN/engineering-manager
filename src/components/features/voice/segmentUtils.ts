/**
 * segmentUtils — 听悟编辑器纯函数工具（分词 / 时间比例切分 / 词级搬移 / 插段）
 *
 * 参照 AutoSubs 的词级搬移，差异点：AutoSubs 有词级时间戳且按空格分词（英文）；
 * 我们只有段级 [start,end] 且以中文为主——分词用 Intl.Segmenter（Chromium 90+ 支持，
 * WebView2 内核满足），旧内核 fallback 逐字符；被搬走的词的时间按字符长度比例从
 * 原段 [start,end] 中切出（无词级时间戳，字符比例近似）。
 */

import type { SttSegment } from '@/services/stt-client'

/** 说话人编号基检测（防御，照 AutoSubs）：存在 speaker===0 → 0 基，否则 1 基。
 *  当前引擎 1 基且 0 号为「原始噪声簇」（UI 按 speaker>0 过滤，见 TaskDetailView/
 *  TranscriptEditor）；此防御保证未来换 0 基引擎时编号推导有据可依，不炸。
 *  注意：不动 segments 数据，显示编号恒为原始编号。 */
export function detectSpeakerBase(segments: SttSegment[] | undefined): 0 | 1 {
  return (segments ?? []).some(s => s.speaker === 0) ? 0 : 1
}

/** Intl.Segmenter 的最小结构类型（tsconfig lib 为 ES2020，无内置 Segmenter 类型） */
interface SegmentPart {
  segment: string
  isWordLike?: boolean
}
interface SegmenterLike {
  segment(input: string): Iterable<SegmentPart>
}

function isWordChar(ch: string): boolean {
  return /[\p{L}\p{N}]/u.test(ch)
}

/** 把分词结果聚合成可搬移的「词段」：词后紧随的标点/空白并入该词（中文句号、英文空格
 *  跟词走），开头标点并入首个词；纯标点/空白文本无可搬移词 → 空数组。
 *  不变式：结果 join('') 恒等于原文（非空时）。 */
function groupTokens(parts: SegmentPart[]): string[] {
  const tokens: string[] = []
  let leading = ''
  for (const p of parts) {
    if (p.isWordLike) {
      tokens.push(leading + p.segment)
      leading = ''
    } else if (tokens.length > 0) {
      tokens[tokens.length - 1] += p.segment
    } else {
      leading += p.segment
    }
  }
  return tokens // 全程无词形片段 → 空数组（不可搬移）
}

/** 分词：Intl.Segmenter('zh', {granularity:'word'})，try/catch fallback 逐字符。
 *  搬移单位 = 一个词段（中文通常 1-3 字符，标点随词）。 */
export function segmentWords(text: string): string[] {
  if (!text) return []
  let parts: SegmentPart[] | null = null
  try {
    const Ctor = (Intl as unknown as { Segmenter?: new (locale: string, options: { granularity: 'word' }) => SegmenterLike }).Segmenter
    if (typeof Ctor === 'function') {
      parts = [...new Ctor('zh', { granularity: 'word' }).segment(text)]
    }
  } catch {
    parts = null // 极旧内核：走逐字符 fallback
  }
  if (!parts) {
    parts = [...text].map(ch => ({ segment: ch, isWordLike: isWordChar(ch) }))
  }
  return groupTokens(parts)
}

/** 无词级时间戳：按字符长度比例从 [start,end] 切出「前 headChars 个字符」对应的时间点。
 *  headChars = totalChars → 返回 end（整段被搬走）；非法输入回退 start。 */
export function cutTimeByProportion(start: number, end: number, headChars: number, totalChars: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return start
  const total = Math.max(totalChars, 1)
  const ratio = Math.min(1, Math.max(0, headChars / total))
  return start + (end - start) * ratio
}

/** 「↑首词→上一段」：把 index 段的首词段搬入上一段末尾；首词时间按字符比例从本段
 *  [start,end] 头部切出（本段 start 后移，上一段 end 吸收该词）。不动 speaker 归属。 */
export function moveFirstWordToPrev(segments: SttSegment[], index: number): SttSegment[] {
  if (index <= 0 || index >= segments.length) return segments
  const words = segmentWords(segments[index].text)
  if (words.length === 0) return segments
  const cur = segments[index]
  const word = words[0]
  const cut = cutTimeByProportion(cur.start, cur.end, word.length, cur.text.length)
  const next = [...segments]
  const prev = next[index - 1]
  next[index - 1] = { ...prev, text: prev.text + word, end: Math.max(prev.end, cut) }
  next[index] = { ...cur, text: cur.text.slice(word.length), start: cut }
  return next
}

/** 「←末词→下一段」：把 index 段的末词段搬入下一段开头；末词时间按字符比例从本段
 *  [start,end] 尾部切出（本段 end 前移，下一段 start 提前吸收该词）。不动 speaker 归属。 */
export function moveLastWordToNext(segments: SttSegment[], index: number): SttSegment[] {
  if (index < 0 || index >= segments.length - 1) return segments
  const words = segmentWords(segments[index].text)
  if (words.length === 0) return segments
  const cur = segments[index]
  const word = words[words.length - 1]
  const cut = cutTimeByProportion(cur.start, cur.end, cur.text.length - word.length, cur.text.length)
  const next = [...segments]
  const nxt = next[index + 1]
  next[index] = { ...cur, text: cur.text.slice(0, cur.text.length - word.length), end: Math.min(cur.end, cut) }
  next[index + 1] = { ...nxt, text: word + nxt.text, start: Math.min(nxt.start, cut) }
  return next
}

/** 「在此段后插入新段」：新段继承本段 speaker（归属修正仍由下拉负责），文本为空、
 *  时间落在本段 end 与下一段 start 之间（无下一段则零时长）。 */
export function insertSegmentAfter(segments: SttSegment[], index: number): SttSegment[] {
  if (index < 0 || index >= segments.length) return segments
  const cur = segments[index]
  const nxt = segments[index + 1]
  const fresh: SttSegment = {
    speaker: cur.speaker,
    start: cur.end,
    end: nxt ? Math.max(cur.end, nxt.start) : cur.end,
    text: '',
  }
  const next = [...segments]
  next.splice(index + 1, 0, fresh)
  return next
}

/** 阅读态段落：连续同说话人分段合并后的可读单元（纯内存形态，不落库）。
 *  segStartIdx = 首个成员分段在 flat（normalize 后）数组中的下标，供高亮 ref 定位。 */
export interface SttParagraph {
  speaker: number
  start: number
  end: number
  segStartIdx: number
  segs: SttSegment[]
}

/** 换行大块拆伪分段：text 含 \n 的段（如 job 22 单段 1268 行整块）按行拆开，每行一条
 *  伪分段，时间按字符占比从源段 [start,end] 推算（cutTimeByProportion 同公式，字符数
 *  不含换行符，末行吃到源段 end），speaker 继承源段；空行不产段。text 无换行的段原样
 *  保留（同引用）。纯内存变换，不落库、不 PATCH。 */
export function normalizeSegments(segments: SttSegment[]): SttSegment[] {
  const out: SttSegment[] = []
  for (const seg of segments) {
    if (!seg.text.includes('\n')) { out.push(seg); continue }
    const lines = seg.text.split('\n')
    const total = lines.reduce((n, l) => n + l.length, 0)
    let head = 0
    for (const line of lines) {
      if (line.trim() !== '') {
        out.push({
          speaker: seg.speaker,
          start: cutTimeByProportion(seg.start, seg.end, head, total),
          end: cutTimeByProportion(seg.start, seg.end, head + line.length, total),
          text: line,
        })
      }
      head += line.length
    }
  }
  return out
}

// 段落断段阈值：硬断字符 / 软断字符 / 硬断时长(s) / 间隔断段(s)
const PARA_CHAR_HARD = 120
const PARA_CHAR_SOFT = 60
const PARA_DUR_HARD = 120
const PARA_GAP_BREAK = 3

/** 连续同说话人分段合并成段落（阅读态用）。下一段加入前按序判定断段：
 *  ① 说话人变化（必断）；② 累计字符 ≥120（硬）；③ 段落时长 ≥120s（硬）；
 *  ④ 下一段 start − 本段 end 间隔 >3s（两者时间均有限）；⑤ 累计字符 ≥60 且
 *  段末文本以句终标点（。？！?）结尾（软）。 */
export function groupIntoParagraphs(segments: SttSegment[]): SttParagraph[] {
  const out: SttParagraph[] = []
  let cur: SttParagraph | null = null
  let chars = 0
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    const last = cur ? cur.segs[cur.segs.length - 1] : null
    if (
      cur && last &&
      (s.speaker !== cur.speaker ||
        chars >= PARA_CHAR_HARD ||
        cur.end - cur.start >= PARA_DUR_HARD ||
        (Number.isFinite(s.start) && Number.isFinite(cur.end) && s.start - cur.end > PARA_GAP_BREAK) ||
        (chars >= PARA_CHAR_SOFT && /[。？！?]$/.test(last.text)))
    ) cur = null
    if (!cur) {
      cur = { speaker: s.speaker, start: s.start, end: s.end, segStartIdx: i, segs: [] }
      out.push(cur)
      chars = 0
    }
    cur.segs.push(s)
    chars += s.text.length
    cur.end = s.end
  }
  return out
}
