import { describe, it, expect } from 'vitest'
import {
  computeWindow,
  buildBlocks,
  percentOf,
  blockRect,
  HOUR,
  MIN_WINDOW_HOURS,
  DEFAULT_BUCKET,
  type SwimlaneLogLike,
} from '@/components/features/audit/swimlaneMath'

const AT = (iso: string) => ({ timestamp: iso })

function log(over: Partial<SwimlaneLogLike> & { timestamp: string }): SwimlaneLogLike {
  return {
    id: over.id ?? 'x',
    timestamp: over.timestamp,
    resource: over.resource ?? 'projects',
    level: over.level ?? 'info',
  }
}

describe('computeWindow', () => {
  it('无数据时以 now 为终点回溯至少 6 小时', () => {
    const now = new Date('2026-10-19T12:00:00Z').getTime()
    const win = computeWindow([], now)
    expect(win.start).toBeLessThanOrEqual(now - MIN_WINDOW_HOURS * HOUR)
    expect(win.end).toBeGreaterThanOrEqual(now)
    expect(win.ticks.length).toBeGreaterThanOrEqual(6)
  })

  it('窗口至少 6 小时（即使日志只跨 10 分钟）', () => {
    const logs = [
      AT('2026-10-19T10:00:00Z'),
      AT('2026-10-19T10:10:00Z'),
    ]
    const now = new Date('2026-10-19T10:30:00Z').getTime()
    const win = computeWindow(logs, now)
    expect(win.end - win.start).toBeGreaterThanOrEqual(MIN_WINDOW_HOURS * HOUR)
  })

  it('覆盖首条 −1h 到末条 +1h', () => {
    const logs = [
      AT('2026-10-19T01:00:00Z'),
      AT('2026-10-19T09:00:00Z'),
    ]
    const now = new Date('2026-10-19T12:00:00Z').getTime()
    const win = computeWindow(logs, now)
    const first = new Date(logs[0].timestamp).getTime()
    const last = new Date(logs[1].timestamp).getTime()
    expect(win.start).toBeLessThanOrEqual(first)
    expect(win.end).toBeGreaterThanOrEqual(last)
  })

  it('步长是整小时倍数', () => {
    const logs = [AT('2026-10-19T01:00:00Z'), AT('2026-10-19T09:30:00Z')]
    const now = new Date('2026-10-19T12:00:00Z').getTime()
    const win = computeWindow(logs, now)
    expect(win.step % HOUR).toBe(0)
    expect(win.step).toBeGreaterThanOrEqual(HOUR)
  })

  it('刻度递增且不越界', () => {
    const logs = [AT('2026-10-19T01:00:00Z'), AT('2026-10-19T09:30:00Z')]
    const now = new Date('2026-10-19T12:00:00Z').getTime()
    const win = computeWindow(logs, now)
    for (let i = 1; i < win.ticks.length; i++) {
      expect(win.ticks[i]).toBeGreaterThan(win.ticks[i - 1])
    }
    expect(win.ticks[0]).toBe(win.start)
    expect(win.ticks[win.ticks.length - 1]).toBeLessThanOrEqual(win.end + 1)
  })

  it('跨日也能正常出窗', () => {
    const logs = [AT('2026-10-18T23:00:00Z'), AT('2026-10-19T02:00:00Z')]
    const now = new Date('2026-10-19T02:30:00Z').getTime()
    const win = computeWindow(logs, now)
    expect(win.end - win.start).toBeGreaterThanOrEqual(MIN_WINDOW_HOURS * HOUR)
    expect(win.ticks.length).toBeGreaterThanOrEqual(6)
  })

  it('起点对齐到整点，使刻度标签与实际时间相符', () => {
    const logs = [AT('2026-10-19T01:37:00Z'), AT('2026-10-19T09:12:00Z')]
    const now = new Date('2026-10-19T12:00:00Z').getTime()
    const win = computeWindow(logs, now)
    expect(win.start % HOUR).toBe(0)
    // 每个刻度都落在整点（步长是整小时倍数）
    for (const t of win.ticks) {
      expect(t % HOUR).toBe(0)
    }
  })

  it('忽略非法时间戳', () => {
    const win = computeWindow([{ timestamp: 'not-a-date' }], 1_700_000_000_000)
    expect(Number.isFinite(win.start)).toBe(true)
    expect(Number.isFinite(win.end)).toBe(true)
  })
})

describe('buildBlocks', () => {
  it('按 resource 分泳道，保持首次出现顺序', () => {
    const logs = [
      log({ id: '1', timestamp: '2026-10-19T01:00:00Z', resource: 'projects' }),
      log({ id: '2', timestamp: '2026-10-19T01:00:10Z', resource: 'invoices' }),
      log({ id: '3', timestamp: '2026-10-19T01:00:20Z', resource: 'projects' }),
    ]
    const { lanes } = buildBlocks(logs)
    expect(lanes).toEqual(['projects', 'invoices'])
  })

  it('同一泳道同一桶内合并为一个块并累计条数', () => {
    const logs = [
      log({ id: '1', timestamp: '2026-10-19T01:00:00Z' }),
      log({ id: '2', timestamp: '2026-10-19T01:10:00Z' }),
      log({ id: '3', timestamp: '2026-10-19T01:20:00Z' }),
    ]
    const { blocks } = buildBlocks(logs, DEFAULT_BUCKET)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].count).toBe(3)
    expect(blocks[0].logs).toHaveLength(3)
  })

  it('跨桶拆成多个块', () => {
    const logs = [
      log({ id: '1', timestamp: '2026-10-19T01:00:00Z' }),
      log({ id: '2', timestamp: '2026-10-19T03:00:00Z' }),
    ]
    const { blocks } = buildBlocks(logs, DEFAULT_BUCKET)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].start).toBeLessThan(blocks[1].start)
  })

  it('块级别取桶内最高级别（error 优先）', () => {
    const logs = [
      log({ id: '1', timestamp: '2026-10-19T01:00:00Z', level: 'info' }),
      log({ id: '2', timestamp: '2026-10-19T01:05:00Z', level: 'warning' }),
      log({ id: '3', timestamp: '2026-10-19T01:06:00Z', level: 'error' }),
    ]
    const { blocks } = buildBlocks(logs, DEFAULT_BUCKET)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].level).toBe('error')
  })

  it('空数据返回空结构', () => {
    const { lanes, blocks } = buildBlocks([])
    expect(lanes).toEqual([])
    expect(blocks).toEqual([])
  })

  it('块内日志按时间升序', () => {
    const logs = [
      log({ id: 'b', timestamp: '2026-10-19T01:20:00Z' }),
      log({ id: 'a', timestamp: '2026-10-19T01:00:00Z' }),
    ]
    const { blocks } = buildBlocks(logs, DEFAULT_BUCKET)
    expect(blocks[0].logs.map((l) => l.id)).toEqual(['a', 'b'])
  })

  it('resource 为空时归入 unknown 泳道', () => {
    const { lanes } = buildBlocks([log({ timestamp: '2026-10-19T01:00:00Z', resource: '' })])
    expect(lanes).toEqual(['unknown'])
  })
})

describe('percentOf / blockRect', () => {
  const win = { start: 0, end: 1000, step: 100, ticks: [0, 1000] }

  it('映射到 0–100', () => {
    expect(percentOf(0, win)).toBe(0)
    expect(percentOf(500, win)).toBe(50)
    expect(percentOf(1000, win)).toBe(100)
  })

  it('跨度为 0 时不除零', () => {
    expect(percentOf(5, { start: 10, end: 10, step: 1, ticks: [] })).toBe(0)
  })

  it('瞬时块给最小可见宽度', () => {
    const r = blockRect({ start: 500, end: 500 }, win, 0.6)
    expect(r.left).toBe(50)
    expect(r.width).toBe(0.6)
  })

  it('块矩形不越界', () => {
    const r = blockRect({ start: -100, end: 2000 }, win)
    expect(r.left).toBe(0)
    expect(r.left + r.width).toBeLessThanOrEqual(200)
  })
})
