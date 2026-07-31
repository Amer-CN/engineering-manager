/**
 * Univer 电子表格引擎层
 * 列定义、Shadow DOM 挂载、数据构建与回读
 * 从 CostLedgerSpreadsheet.tsx 拆出，保持主组件 < 400 行
 */

import { useRef, useEffect } from 'react'
import type { CostLedgerEntry } from '@/types'

// ── 列定义 ──────────────────────────────────────────────

export interface ColDef { key: keyof CostLedgerEntry; label: string; width: number }

export const SHEET_COLS: ColDef[] = [
  { key: 'voucherNo', label: '凭证号', width: 14 }, { key: 'date', label: '日期', width: 14 },
  { key: 'direction', label: '收支方向', width: 10 }, { key: 'category', label: '分类', width: 20 },
  { key: 'amount', label: '金额(元)', width: 14 }, { key: 'counterparty', label: '对方单位', width: 22 },
  { key: 'channel', label: '渠道', width: 14 }, { key: 'summary', label: '摘要', width: 30 },
  { key: 'notes', label: '备注', width: 22 },
]

/** 分→元显示 */
function centsToYuan(v: unknown): string {
  return typeof v === 'number' ? (v / 100).toFixed(2) : ''
}
function cellStr(val: unknown): string { return val == null ? '' : String(val) }

// ── Univer 单元格数据构建 ──────────────────────────────

interface UCell { v: string | number | null }
type URowData = Record<number, UCell>
type USheetData = Record<number, URowData>

function buildSheetData(entries: CostLedgerEntry[]): { data: USheetData; rowCount: number; colCount: number } {
  const data: USheetData = {}
  const ID_COL = SHEET_COLS.length // 隐藏 id 列索引（M2 修复：行对齐锚点）
  // 表头行
  data[0] = {}
  SHEET_COLS.forEach((col, ci) => {
    data[0][ci] = { v: col.label }
  })
  data[0][ID_COL] = { v: '__id' } // 隐藏列表头
  // 数据行
  entries.forEach((entry, ri) => {
    const row: URowData = {}
    SHEET_COLS.forEach((col, ci) => {
      const raw = entry[col.key]
      if (col.key === 'amount') {
        row[ci] = { v: parseFloat(centsToYuan(raw)) }
      } else if (col.key === 'direction') {
        row[ci] = { v: raw === 'expense' ? '支出' : raw === 'income' ? '收入' : cellStr(raw) }
      } else {
        row[ci] = { v: cellStr(raw) }
      }
    })
    row[ID_COL] = { v: entry.id ?? 0 } // 隐藏 id 列
    data[ri + 1] = { ...row }
  })
  return { data, rowCount: entries.length + 1, colCount: SHEET_COLS.length + 1 }
}

// ── Univer CSS 迁移到 Shadow DOM ──────────────────────

/**
 * 动态 import Univer 后，Vite 会将 CSS 注入到 document.head（dev 模式为 <style data-vite-dev-id>，
 * 生产为 <link>）。将这些样式元素迁移到 shadow root，隔离 Univer 全局 CSS 不污染项目 Tailwind。
 */
function moveUniverCSS(shadowRoot: ShadowRoot) {
  const head = document.head
  // dev 模式：Vite 注入的 <style data-vite-dev-id="...">
  head.querySelectorAll('style[data-vite-dev-id]').forEach(el => {
    const id = el.getAttribute('data-vite-dev-id') || ''
    if (id.includes('univer') || id.includes('@univerjs')) {
      shadowRoot.appendChild(el)
    }
  })
  // 生产模式：提取后的 <link rel="stylesheet" href="...vendor-univer...">
  head.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
    const href = (el as HTMLLinkElement).href
    if (href.includes('univer') || href.includes('vendor-univer')) {
      shadowRoot.appendChild(el)
    }
  })
}

// ── Univer 初始化（在 Shadow DOM 中挂载） ──────────────

async function startUniver(
  containerEl: HTMLElement,
  shadowRoot: ShadowRoot,
  sheetData: USheetData,
  rowCount: number,
  colCount: number
) {
  const [
    { Univer },
    { UniverSheetsPlugin },
    { UniverUIPlugin },
    { UniverSheetsUIPlugin },
    { UniverSheetsFormulaPlugin },
  ] = await Promise.all([
    import('@univerjs/core'),
    import('@univerjs/sheets'),
    import('@univerjs/ui'),
    import('@univerjs/sheets-ui'),
    import('@univerjs/sheets-formula'),
  ])

  // 迁移 Univer CSS 到 shadow root
  moveUniverCSS(shadowRoot)

  const SHEET_ID = 'cost-ledger-sheet'

  const univer = new Univer({
    locale: 'zh-CN' as any,
    locales: { 'zh-CN': {} } as any,
  })

  univer.registerPlugin(UniverSheetsPlugin)
  univer.registerPlugin(UniverUIPlugin, { container: containerEl, toolbar: true, footer: false })
  univer.registerPlugin(UniverSheetsUIPlugin)
  univer.registerPlugin(UniverSheetsFormulaPlugin)

  // 列宽数组
  const columnData: Record<number, { w: number; hd?: number }> = {}
  SHEET_COLS.forEach((col, i) => { columnData[i] = { w: col.width * 7 } })
  // N2 修复：隐藏 id 列（hd:1 = hidden，宽度 0）
  columnData[SHEET_COLS.length] = { w: 0, hd: 1 }

  const workbook = univer.createUnit(2, { // UniverInstanceType.UNIVER_SHEET
      id: 'cost-ledger-workbook',
      sheetOrder: [SHEET_ID],
      name: '成本台账',
      appVersion: '0.91.0',
      sheets: {
        [SHEET_ID]: {
          id: SHEET_ID,
          name: '台账数据',
          cellData: sheetData,
          rowCount: Math.max(rowCount + 50, 200),
          columnCount: colCount,
          columnData,
          defaultRowHeight: 28,
          defaultColumnWidth: 80,
        },
      },
  } as any)

  // 存储 workbook 引用供 readUniverEntries 使用
  ;(univer as any).__workbook = workbook

  return univer
}

// ── Univer 挂载组件（渲染到 Shadow DOM 内部） ──────────

interface UniverMountProps {
  entries: CostLedgerEntry[]
  onError?: (err: string) => void
  univerRef?: React.MutableRefObject<any>
}

export function UniverMount({ entries, onError, univerRef }: UniverMountProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<ShadowRoot | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const localUniverRef = useRef<any>(null)

  useEffect(() => {
    if (!hostRef.current || shadowRef.current) return
    const root = hostRef.current.attachShadow({ mode: 'open' })
    shadowRef.current = root
    const el = document.createElement('div')
    el.id = 'univer-shadow-container'
    el.style.cssText = 'width:100%;height:100%;overflow:hidden'
    root.appendChild(el)
    containerRef.current = el
  }, [])

  useEffect(() => {
    if (!containerRef.current || !shadowRef.current) return

    // 清理旧实例
    if (localUniverRef.current) {
      try { localUniverRef.current.dispose() } catch { /* ignore */ }
      localUniverRef.current = null
      if (univerRef) univerRef.current = null
    }

    let cancelled = false
    const { data, rowCount, colCount } = buildSheetData(entries)
    startUniver(containerRef.current, shadowRef.current, data, rowCount, colCount)
      .then(u => {
        if (cancelled) {
          try { u.dispose() } catch { /* ignore */ }
          return
        }
        localUniverRef.current = u
        if (univerRef) univerRef.current = u
      })
      .catch(err => {
        if (cancelled) return
        console.error('[CostLedgerSpreadsheet] Univer 初始化失败:', err)
        onError?.(String(err))
      })

    return () => {
      cancelled = true
      if (localUniverRef.current) {
        try { localUniverRef.current.dispose() } catch { /* ignore */ }
        localUniverRef.current = null
        if (univerRef) univerRef.current = null
      }
    }
  }, [entries, onError, univerRef])

  return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
}

// ── Univer 数据回读 ────────────────────────────────────

/** 从 Univer 实例读取当前编辑后的单元格数据，映射回 CostLedgerEntry 结构。
 * M1 修复：失败时抛错阻止保存，禁止静默回退。
 * M2 修复：用隐藏 id 列锚定行对齐，防删/插/排序错位。
 * N2 修复：重复 id 自愈为新增行（而非拒绝，因 id 列隐藏用户无法自救）。
 */
export interface ReadUniverResult { entries: CostLedgerEntry[]; duplicatedRows: number }

export function readUniverEntries(univer: any, originalEntries: CostLedgerEntry[]): ReadUniverResult {
  const ID_COL = SHEET_COLS.length // 隐藏 id 列索引

  // 尝试多种方式获取 worksheet（兼容 Univer 0.25.x 不同 API 路径）
  let sheet: any = null
  try {
    // 方式 1: createUnit 返回的 workbook（存在 univer.__workbook 上）
    const workbook = univer.__workbook
      ?? univer.getActiveWorkbook?.()
      ?? univer.getUniverInstanceService?.()?.getCurrentUnitOfType?.(2)
    if (workbook) {
      sheet = workbook.getSheetBySheetId?.('cost-ledger-sheet')
        ?? workbook.getActiveSheet?.()
    }
  } catch { /* 继续尝试下一种方式 */ }

  if (!sheet) {
    // M1: 禁止静默回退——取不到 sheet 说明 Univer API 不兼容，必须报错
    throw new Error('Univer 电子表格引擎读取失败：无法获取工作表实例，请刷新重试')
  }

  const getCellValue = (row: number, col: number): string => {
    try {
      const cell = sheet.getCellMatrix?.()?.getValue?.(row, col)
        ?? sheet.getCell?.(row, col)
      if (!cell) return ''
      return cell.v != null ? String(cell.v) : ''
    } catch { return '' }
  }

  // N1 修复：表头探针——校验读取通道兼容性，防止 getCellValue 静默返回空串导致全表清空
  const headerProbe = SHEET_COLS.map((_, i) => getCellValue(0, i)).join('|')
  const expectedHeader = SHEET_COLS.map(c => c.label).join('|')
  if (headerProbe !== expectedHeader) {
    throw new Error('Univer 表头校验失败：若您修改过表头标题请恢复原样，否则说明读取接口不兼容，已阻止保存')
  }

  // 构建 id → originalEntry 映射（M2: 不依赖数组下标）
  const entryById = new Map<number, CostLedgerEntry>()
  originalEntries.forEach(e => { if (e.id) entryById.set(e.id, e) })

  // N2 修复：重复 id 自愈计数
  const seenIds = new Set<number>()
  let duplicatedCount = 0

  const result: CostLedgerEntry[] = []
  for (let ri = 1; ; ri++) {
    const idRaw = getCellValue(ri, ID_COL)
    const firstCell = getCellValue(ri, 0)
    const dateCell = getCellValue(ri, 1)
    // 空行检测
    if (!idRaw && !firstCell && !dateCell) {
      if (ri > originalEntries.length) break
      continue // 跳过中间空行
    }
    if (ri > originalEntries.length + 200) {
      throw new Error(`数据行超出安全上限（${originalEntries.length + 200} 行），请分批保存`)
    }

    let rowId = parseInt(idRaw, 10) || 0
    // N2: 重复 id 自愈——复制行视为新增（而非拒绝，因 id 列隐藏用户无法自救）
    if (rowId > 0 && seenIds.has(rowId)) {
      rowId = 0 // 走 INSERT 路径
      duplicatedCount++
    } else if (rowId > 0) {
      seenIds.add(rowId)
    }
    const original = rowId > 0 ? entryById.get(rowId) : undefined

    const directionRaw = getCellValue(ri, 2)
    const direction = directionRaw === '支出' ? 'expense' : directionRaw === '收入' ? 'income' : (directionRaw || 'expense')
    const amountStr = getCellValue(ri, 4)
    const amountYuan = parseFloat(amountStr)
    if (amountStr && isNaN(amountYuan)) {
      throw new Error(`第 ${ri} 行金额格式无效："${amountStr}"，请修正后重试`)
    }

    const entry: CostLedgerEntry = {
      ...(original ?? {}),
      id: rowId || undefined,
      voucherNo: getCellValue(ri, 0) || null,
      date: getCellValue(ri, 1) || null,
      direction,
      category: getCellValue(ri, 3) || null,
      amount: Math.round((amountYuan || 0) * 100), // 元→分
      counterparty: getCellValue(ri, 5) || null,
      channel: getCellValue(ri, 6) || null,
      summary: getCellValue(ri, 7) || null,
      notes: getCellValue(ri, 8) || null,
    } as CostLedgerEntry
    result.push(entry)
  }

  if (result.length === 0) {
    throw new Error('Univer 读取结果为空，请确认表格中有数据')
  }
  return { entries: result, duplicatedRows: duplicatedCount }
}
