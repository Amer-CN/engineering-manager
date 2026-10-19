/**
 * 操作日志泳道时间轴 — 纯函数层
 *
 * 借鉴 scaffold-master `Swimlane.vue` 的时间窗对齐算法思路（非代码）：
 * 时间窗默认聚焦「首条 −1h ～ 末条 +1h」，且至少 6 小时；
 * 刻度步长向上取整到整小时，使刻度均匀铺满标尺。
 *
 * 只放无 React 依赖的纯函数（见 src/utils/AGENTS.md 的边界约定）。
 */

export interface SwimlaneLogLike {
  id: string
  timestamp: string
  resource: string
  level: 'info' | 'warning' | 'error'
}

/** 一个聚合块：某泳道在某时间窗内的一组操作 */
export interface SwimlaneBlock<T extends SwimlaneLogLike = SwimlaneLogLike> {
  /** 所属泳道（= 业务模块 resource 原值） */
  lane: string
  /** 起始时间戳（ms） */
  start: number
  /** 结束时间戳（ms），等于 start 时为瞬时事件 */
  end: number
  /** 该块内日志条数 */
  count: number
  /** 块内最高级别：error > warning > info */
  level: 'info' | 'warning' | 'error'
  /** 块内全部日志，按时间升序 */
  logs: T[]
}

export interface SwimlaneWindow {
  /** 时间窗起点（ms） */
  start: number
  /** 时间窗终点（ms） */
  end: number
  /** 刻度步长（ms），整小时倍数 */
  step: number
  /** 刻度时间点（ms），从 start 起按 step 递增，末项 <= end */
  ticks: number[]
}

export const HOUR = 60 * 60 * 1000
/** 时间窗下限：至少 6 小时（沿用参考实现的口径） */
export const MIN_WINDOW_HOURS = 6
/** 聚合桶宽度：1 小时内把相邻操作合并成块，避免细碎块糊成一片 */
export const DEFAULT_BUCKET = HOUR

const LEVEL_RANK: Record<'info' | 'warning' | 'error', number> = {
  info: 0,
  warning: 1,
  error: 2,
}

/** 取两条日志中更高的级别 */
function higherLevel(
  a: 'info' | 'warning' | 'error',
  b: 'info' | 'warning' | 'error',
): 'info' | 'warning' | 'error' {
  return LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a
}

/**
 * 计算时间窗与刻度。
 *
 * - 无有效日志时：以 now 为终点回溯 MIN_WINDOW_HOURS
 * - 有日志时：从首条 −1h 到末条 +1h，不足 MIN_WINDOW_HOURS 则补足
 * - step 向上取整到整小时，且保证刻度数量落在 [minTicks, maxTicks]
 */
export function computeWindow(
  logs: Array<{ timestamp: string }>,
  now: number,
  options: { minTicks?: number; maxTicks?: number } = {},
): SwimlaneWindow {
  const minTicks = options.minTicks ?? 6
  const maxTicks = options.maxTicks ?? 12

  const times = logs
    .map((l) => new Date(l.timestamp).getTime())
    .filter((t) => Number.isFinite(t))

  let start: number
  let end: number

  if (times.length === 0) {
    end = now
    start = now - MIN_WINDOW_HOURS * HOUR
  } else {
    const first = Math.min(...times)
    const last = Math.max(...times)
    start = first - HOUR
    end = last + HOUR
    const span = end - start
    const minSpan = MIN_WINDOW_HOURS * HOUR
    if (span < minSpan) {
      // 不足下限时向后补足，保证「现在」尽量落在窗内
      end = start + minSpan
    }
    // 末条早于当前超过 1 小时时，把窗口延伸到当前，使「现在」线始终可见
    if (end < now) {
      end = now + HOUR
    }
  }

  const span = Math.max(end - start, HOUR)
  // 步长取整小时：ceil(span / maxTicks)，再至少 1 小时
  let step = Math.ceil(span / maxTicks / HOUR) * HOUR
  if (step < HOUR) step = HOUR
  // 保证刻度数不少于 minTicks：步长过大时回退
  while (span / step < minTicks && step > HOUR) {
    step -= HOUR
  }

  // 起点下取整到整点：否则步长为整小时时，刻度会落在 09:59 这类非整点，
  // 而标尺标签只显示「时」——标签与实际时间不符。
  start = Math.floor(start / HOUR) * HOUR

  // 终点对齐到步长整数倍，使末刻度不越界
  end = start + Math.ceil((end - start) / step) * step

  const ticks: number[] = []
  for (let t = start; t <= end + 1; t += step) {
    ticks.push(t)
    if (ticks.length > 400) break // 防御：异常输入不无限增长
  }

  return { start, end, step, ticks }
}

/**
 * 把日志按「泳道 × 时间桶」聚合成块。
 *
 * - 泳道 = resource
 * - 同一泳道内，落在同一 bucketMs 桶的日志合并为一个块
 * - 块级别取桶内最高级别（error 优先），用于红描边 / 斜线填充
 * - 结果按泳道首次出现顺序返回，泳道内按时间升序
 */
export function buildBlocks<T extends SwimlaneLogLike>(
  logs: T[],
  bucketMs: number = DEFAULT_BUCKET,
): { lanes: string[]; blocks: SwimlaneBlock<T>[] } {
  const safeBucket = bucketMs > 0 ? bucketMs : DEFAULT_BUCKET
  const laneOrder: string[] = []
  const byLane = new Map<string, T[]>()

  for (const log of logs) {
    const t = new Date(log.timestamp).getTime()
    if (!Number.isFinite(t)) continue
    const lane = log.resource || 'unknown'
    if (!byLane.has(lane)) {
      byLane.set(lane, [])
      laneOrder.push(lane)
    }
    byLane.get(lane)!.push(log)
  }

  const blocks: SwimlaneBlock<T>[] = []

  for (const lane of laneOrder) {
    const items = byLane.get(lane)!.slice().sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )

    let current: SwimlaneBlock<T> | null = null
    let currentBucket = Number.NaN

    for (const log of items) {
      const t = new Date(log.timestamp).getTime()
      const bucket = Math.floor(t / safeBucket)

      if (current && bucket === currentBucket) {
        current.end = Math.max(current.end, t)
        current.count += 1
        current.level = higherLevel(current.level, log.level)
        current.logs.push(log)
      } else {
        if (current) blocks.push(current)
        currentBucket = bucket
        current = {
          lane,
          start: t,
          end: t,
          count: 1,
          level: log.level,
          logs: [log],
        }
      }
    }
    if (current) blocks.push(current)
  }

  return { lanes: laneOrder, blocks }
}

/** 把绝对时间映射为 0–100 的百分比位置，供 CSS 定位使用 */
export function percentOf(t: number, win: SwimlaneWindow): number {
  const span = win.end - win.start
  if (span <= 0) return 0
  return ((t - win.start) / span) * 100
}

/** 块的左偏移与宽度百分比；瞬时块给一个最小可见宽度 */
export function blockRect(
  block: Pick<SwimlaneBlock, 'start' | 'end'>,
  win: SwimlaneWindow,
  minPercent = 0.6,
): { left: number; width: number } {
  // 两端都先钳制到 0–100，再算宽度；否则超出窗口的块会算出越界宽度
  const rawLeft = Math.max(0, Math.min(100, percentOf(block.start, win)))
  const rawRight = Math.max(0, Math.min(100, percentOf(block.end, win)))

  let left = rawLeft
  let width = Math.max(minPercent, rawRight - rawLeft)

  // 贴右边界的块：把左移回退一点，保证 left + width 不越过 100
  if (left + width > 100) {
    left = Math.max(0, 100 - width)
    width = Math.min(width, 100 - left)
  }

  return { left, width }
}
