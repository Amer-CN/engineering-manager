/**
 * segmentUtils 单元测试：分词 / 时间比例切分 / 词级搬移 / 插段
 * （六期编辑器升级：词级搬移的纯函数门禁）
 */

import { describe, it, expect } from 'vitest'
import {
  segmentWords,
  cutTimeByProportion,
  moveFirstWordToPrev,
  moveLastWordToNext,
  insertSegmentAfter,
} from './segmentUtils'
import type { SttSegment } from '@/services/stt-client'

describe('segmentUtils — 分词 segmentWords', () => {
  it('英文按空格分词（AutoSubs 同语义），标点/空格随词，join 恒等于原文', () => {
    expect(segmentWords('Hello world')).toEqual(['Hello ', 'world'])
    expect(segmentWords('Hello world. Bye').join('')).toBe('Hello world. Bye')
  })

  it('中文按词段切分：join 恒等于原文、词段非空、不止一段；纯标点无可搬移词', () => {
    const zh = '你好，今天我们来聊一下报价。'
    const tokens = segmentWords(zh)
    expect(tokens.join('')).toBe(zh)
    expect(tokens.every(t => t.length > 0)).toBe(true)
    expect(tokens.length).toBeGreaterThan(1)
    // 纯标点/空白：没有词形片段 → 空数组（不可搬移）
    expect(segmentWords('。。。')).toEqual([])
    expect(segmentWords('   ')).toEqual([])
  })
})

describe('segmentUtils — 时间比例切分 cutTimeByProportion', () => {
  it('按字符比例线性切出时间点，并对越界输入夹取', () => {
    expect(cutTimeByProportion(10, 20, 4, 10)).toBe(14)
    expect(cutTimeByProportion(10, 20, 0, 10)).toBe(10) // 0 字符 → 起点
    expect(cutTimeByProportion(10, 20, 99, 10)).toBe(20) // 超长 → 终点
    expect(cutTimeByProportion(20, 20, 1, 2)).toBe(20) // 零时长段 → start
  })
})

describe('segmentUtils — 词级搬移与插段', () => {
  it('moveFirstWordToPrev：首词（含尾随空格）搬入上一段，时间按字符比例头部切出', () => {
    const segs: SttSegment[] = [
      { speaker: 1, start: 0, end: 10, text: 'Hi' },
      { speaker: 2, start: 20, end: 30, text: 'Hello world' },
    ]
    const next = moveFirstWordToPrev(segs, 1)
    expect(next[0].text).toBe('HiHello ') // 首词 'Hello ' 并入上一段
    expect(next[1].text).toBe('world') // 剩余文本
    expect(next[1].start).toBe(next[0].end) // 切点对齐：20 + 10 * 6/11
    expect(next[0].end).toBeCloseTo(20 + (10 * 6) / 11, 6)
    // 边界：首段无上一段 → 原样返回
    expect(moveFirstWordToPrev(segs, 0)).toBe(segs)
  })

  it('moveLastWordToNext：末词搬入下一段开头，时间按字符比例尾部切出；整段为词时文本清空', () => {
    const segs: SttSegment[] = [
      { speaker: 1, start: 0, end: 10, text: 'Hello world' },
      { speaker: 2, start: 20, end: 30, text: 'ok' },
    ]
    const next = moveLastWordToNext(segs, 0)
    expect(next[0].text).toBe('Hello ') // 末词 'world' 搬走
    expect(next[1].text).toBe('worldok') // 并入下一段开头
    expect(next[0].end).toBeCloseTo((10 * 6) / 11, 6) // 0 + 10 * 6/11
    expect(next[1].start).toBe(next[0].end) // 切点对齐
    // 边界：末段无下一段 → 原样返回
    expect(moveLastWordToNext(segs, 1)).toBe(segs)
  })

  it('insertSegmentAfter：新段继承 speaker、时间落在邻段之间、文本为空；delete 守卫单段', () => {
    const segs: SttSegment[] = [
      { speaker: 1, start: 0, end: 10, text: '第一段' },
      { speaker: 2, start: 15, end: 30, text: '第二段' },
    ]
    const next = insertSegmentAfter(segs, 0)
    expect(next).toHaveLength(3)
    expect(next[1]).toEqual({ speaker: 1, start: 10, end: 15, text: '' })
    expect(next[2]).toEqual(segs[1])
    // 末段后插入：无下一段 → 零时长
    const tail = insertSegmentAfter(segs, 1)
    expect(tail[2]).toEqual({ speaker: 2, start: 30, end: 30, text: '' })
  })
})
