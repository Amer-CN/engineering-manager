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
  // 表头行
  data[0] = {}
  SHEET_COLS.forEach((col, ci) => {
    data[0][ci] = { v: col.label }
  })
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
    data[ri + 1] = { ...row }
  })
  return { data, rowCount: entries.length + 1, colCount: SHEET_COLS.length }
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
  const columnData: Record<number, { w: number }> = {}
  SHEET_COLS.forEach((col, i) => { columnData[i] = { w: col.width * 7 } })

  univer.createUnit(2, { // UniverInstanceType.UNIVER_SHEET
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

/** 从 Univer 实例读取当前编辑后的单元格数据，映射回 CostLedgerEntry 结构 */
export function readUniverEntries(univer: any, originalEntries: CostLedgerEntry[]): CostLedgerEntry[] {
  try {
    const workbook = univer.getActiveWorkbook?.() ?? univer.getUniverSheetInstance?.()
    if (!workbook) return originalEntries
    const sheet = workbook.getActiveSheet?.() ?? workbook.getSheetBySheetId?.('cost-ledger-sheet')
    if (!sheet) return originalEntries

    const getCellValue = (row: number, col: number): string => {
      const cell = sheet.getCellMatrix?.()?.getValue?.(row, col)
        ?? sheet.getCell?.(row, col)
      if (!cell) return ''
      return cell.v != null ? String(cell.v) : ''
    }

    const result: CostLedgerEntry[] = []
    // 从第 1 行开始（第 0 行是表头）
    for (let ri = 1; ; ri++) {
      // 超过原始数据 + 新增行范围时停止
      const firstCell = getCellValue(ri, 0)
      const dateCell = getCellValue(ri, 1)
      // 空行检测：凭证号和日期都为空则停止
      if (!firstCell && !dateCell && ri > originalEntries.length) break
      if (ri > originalEntries.length + 100) break // 安全上限

      const directionRaw = getCellValue(ri, 2)
      const direction = directionRaw === '支出' ? 'expense' : directionRaw === '收入' ? 'income' : (directionRaw || 'expense')
      const amountYuan = parseFloat(getCellValue(ri, 4)) || 0

      const entry: CostLedgerEntry = {
        ...(ri - 1 < originalEntries.length ? originalEntries[ri - 1] : {}),
        voucherNo: getCellValue(ri, 0) || null,
        date: getCellValue(ri, 1) || null,
        direction,
        category: getCellValue(ri, 3) || null,
        amount: Math.round(amountYuan * 100), // 元→分
        counterparty: getCellValue(ri, 5) || null,
        channel: getCellValue(ri, 6) || null,
        summary: getCellValue(ri, 7) || null,
        notes: getCellValue(ri, 8) || null,
      } as CostLedgerEntry
      result.push(entry)
    }
    return result.length > 0 ? result : originalEntries
  } catch (err) {
    console.warn('[CostLedgerSpreadsheet] Univer 读取失败，回退原始数据:', err)
    return originalEntries
  }
}
