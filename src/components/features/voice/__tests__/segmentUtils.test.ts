/**
 * segmentUtils.test.ts — 阅读态碎片合并纯函数测试（normalizeSegments / groupIntoParagraphs）
 *
 * 覆盖 job 22 形态（单段 1268 行换行大块）与常规形态（每短语一条带真实时间戳的分段）
 * 两种输入走同一管线：拆行时间比例推算 → 同说话人连续合并成段落。
 */

import { describe, test, expect } from 'vitest'
import { normalizeSegments, groupIntoParagraphs } from '../segmentUtils'
import type { SttSegment } from '@/services/stt-client'

const seg = (speaker: number, start: number, end: number, text: string): SttSegment => ({ speaker, start, end, text })

describe('normalizeSegments', () => {
  test('换行大块按行拆分：时间单调 + 字符比例 + speaker 继承 + 内容不丢', () => {
    // 3 行 10/20/70 字符，总 100 字符，源段 [0,100] → 行时间边界应为 10 / 30 / 100
    const block = seg(1, 0, 100, ['a'.repeat(10), 'b'.repeat(20), 'c'.repeat(70)].join('\n'))
    const out = normalizeSegments([block])

    expect(out).toHaveLength(3)
    expect(out.every(s => s.speaker === 1)).toBe(true) // speaker 继承
    expect(out.map(s => s.text).join('\n')).toBe(block.text) // 内容不丢
    for (let i = 1; i < out.length; i++) { // 时间单调（非严格）
      expect(out[i].start).toBeGreaterThanOrEqual(out[i - 1].start)
      expect(out[i].end).toBeGreaterThanOrEqual(out[i - 1].end)
    }
    expect(out[0].start).toBeCloseTo(0)
    expect(out[0].end).toBeCloseTo(10) // 10/100 占比
    expect(out[1].start).toBeCloseTo(10)
    expect(out[1].end).toBeCloseTo(30) // 30/100 累计占比
    expect(out[2].start).toBeCloseTo(30)
    expect(out[2].end).toBeCloseTo(100) // 末行吃到源段 end
  })

  test('空行不产生伪分段，非空行内容保留', () => {
    const out = normalizeSegments([seg(1, 0, 2, '你好\n\n世界')])
    expect(out).toHaveLength(2)
    expect(out.map(s => s.text)).toEqual(['你好', '世界'])
  })

  test('无换行段原样保留', () => {
    const plain = seg(2, 5, 6, '一句话')
    const out = normalizeSegments([plain])
    expect(out).toEqual([plain])
  })

  test('混合输入：拆分行与原样段按原顺序输出', () => {
    const block = seg(1, 0, 10, '甲\n乙')
    const plain = seg(1, 10, 11, '丙')
    const out = normalizeSegments([block, plain])
    expect(out.map(s => s.text)).toEqual(['甲', '乙', '丙'])
  })
})

describe('groupIntoParagraphs', () => {
  test('空数组 → 空段落', () => {
    expect(groupIntoParagraphs([])).toEqual([])
  })

  test('说话人变化必断', () => {
    const out = groupIntoParagraphs([seg(1, 0, 1, '甲说'), seg(2, 1, 2, '乙说')])
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ speaker: 1, start: 0, end: 1, segStartIdx: 0 })
    expect(out[1]).toMatchObject({ speaker: 2, start: 1, end: 2, segStartIdx: 1 })
  })

  test('≥60 字遇句终标点软断；59 字不断；60 字无句终不断', () => {
    const soft = groupIntoParagraphs([
      seg(1, 0, 1, '字'.repeat(59) + '。'),
      seg(1, 1, 2, '后续'),
    ])
    expect(soft).toHaveLength(2)

    const below = groupIntoParagraphs([
      seg(1, 0, 1, '字'.repeat(58) + '。'),
      seg(1, 1, 2, '后续'),
    ])
    expect(below).toHaveLength(1)

    const noPunct = groupIntoParagraphs([
      seg(1, 0, 1, '字'.repeat(60)),
      seg(1, 1, 2, '后续'),
    ])
    expect(noPunct).toHaveLength(1)
  })

  test('≥120 字硬断（无需句终标点）；119 字不断', () => {
    const hard = groupIntoParagraphs([seg(1, 0, 1, 'a'.repeat(120)), seg(1, 1, 2, 'b')])
    expect(hard).toHaveLength(2)

    const below = groupIntoParagraphs([seg(1, 0, 1, 'a'.repeat(119)), seg(1, 1, 2, 'b')])
    expect(below).toHaveLength(1)
  })

  test('间隔 >3s 断，≤3s 不断（两者时间均有限）', () => {
    const gapped = groupIntoParagraphs([seg(1, 0, 10, '前'), seg(1, 14, 15, '后')])
    expect(gapped).toHaveLength(2)

    const touching = groupIntoParagraphs([seg(1, 0, 10, '前'), seg(1, 13, 15, '后')])
    expect(touching).toHaveLength(1)
  })

  test('段落时长 ≥120s 硬断；<120s 不断', () => {
    const long = groupIntoParagraphs([seg(1, 0, 130, '长'), seg(1, 130, 131, '后')])
    expect(long).toHaveLength(2)

    const short = groupIntoParagraphs([seg(1, 0, 119, '短'), seg(1, 119, 120, '后')])
    expect(short).toHaveLength(1)
  })

  test('segStartIdx 连续且分段总数不变（混合断段场景）', () => {
    const input = [
      seg(1, 0, 10, 'a'.repeat(120)), // 120 字硬断 → p0
      seg(2, 10, 20, 'b'), // 说话人断 → p1 起
      seg(2, 20, 30, 'c'),
      seg(2, 30, 31, 'd'.repeat(60) + '。'), // 并入 p1 后累计 62 字 + 句终 → p2 起前软断
      seg(2, 31, 32, 'e'),
    ]
    const out = groupIntoParagraphs(input)
    expect(out.map(p => p.segStartIdx)).toEqual([0, 1, 4])
    expect(out.flatMap(p => p.segs)).toHaveLength(input.length)
    expect(out.flatMap(p => p.segs)).toEqual(input)
    expect(out[1]).toMatchObject({ speaker: 2, start: 10, end: 31 })
    expect(out[2]).toMatchObject({ start: 31, end: 32 })
  })

  test('job 22 形态：单段 1897s 换行大块经 normalize + group 产出可读段落', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `第${i}句今天天气不错我们在工地上把混凝土浇完了。`)
    const block = seg(1, 0, 1897.152, lines.join('\n'))
    const paragraphs = groupIntoParagraphs(normalizeSegments([block]))
    expect(paragraphs.length).toBeGreaterThan(1) // 被字数/时长规则拆开
    expect(paragraphs.flatMap(p => p.segs).map(s => s.text).join('\n')).toBe(block.text) // 内容不丢
  })
})
