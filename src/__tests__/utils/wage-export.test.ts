/**
 * @vitest-environment jsdom
 */
import { exportWageDetailToExcel, printWageDetail } from '../../utils/wage-export'
import type { WageRecord } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// Mock XLSX
// ═══════════════════════════════════════════════════════════════════════════════
const {
  mockJsonToSheet,
  mockBookNew,
  mockBookAppendSheet,
  mockWriteFile,
} = vi.hoisted(() => ({
  mockJsonToSheet: vi.fn(() => ({})),
  mockBookNew: vi.fn(() => ({})),
  mockBookAppendSheet: vi.fn(),
  mockWriteFile: vi.fn(),
}))

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: mockJsonToSheet,
    book_new: mockBookNew,
    book_append_sheet: mockBookAppendSheet,
  },
  writeFile: mockWriteFile,
}))

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助：安全取 mock call 参数
// ═══════════════════════════════════════════════════════════════════════════════
function getCallArgs(fn: ReturnType<typeof vi.fn>, callIndex = 0): any[] {
  return (fn.mock.calls as any[][])[callIndex]!
}

// ═══════════════════════════════════════════════════════════════════════════════
// 测试数据
// ═══════════════════════════════════════════════════════════════════════════════
const mockRecords: WageRecord[] = [
  {
    id: 1, memberId: 101, memberName: '张三', teamName: '木工班',
    yearMonth: '2026-04', workDays: 22, dailyWage: 300,
    paidAmount: 6600, paidDate: '2026-04-30',
  } as WageRecord,
  {
    id: 2, memberId: 102, memberName: '李四', teamName: '钢筋班',
    yearMonth: '2026-04', workDays: 20, dailyWage: 280,
    paidAmount: 0, paidDate: '',
  } as WageRecord,
]

describe('wage-export.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── exportWageDetailToExcel ──────────────────────────────────
  describe('exportWageDetailToExcel', () => {
    it('空数组应直接返回（不抛异常）', async () => {
      await exportWageDetailToExcel([])
      expect(mockJsonToSheet).not.toHaveBeenCalled()
    })

    it('有效数据应触发 XLSX 导出', async () => {
      await exportWageDetailToExcel(mockRecords)
      expect(mockJsonToSheet).toHaveBeenCalled()
      expect(mockWriteFile).toHaveBeenCalled()
    })

    it('导出数据应包含正确的列', async () => {
      await exportWageDetailToExcel(mockRecords)

      const sheetData = getCallArgs(mockJsonToSheet)[0]
      expect(sheetData[0]['序号']).toBe(1)
      expect(sheetData[0]['姓名']).toBe('张三')
      expect(sheetData[0]['班组']).toBe('木工班')
      expect(sheetData[0]['出勤']).toBe(22)
      expect(sheetData[0]['日薪']).toBe(300)
    })

    it('应发 = 日薪 × 出勤天数', async () => {
      await exportWageDetailToExcel(mockRecords)

      const sheetData = getCallArgs(mockJsonToSheet)[0]
      expect(sheetData[0]['应发']).toBe(6600)  // 300 × 22
      expect(sheetData[1]['应发']).toBe(5600)  // 280 × 20
    })

    it('差额 = 应发 - 实发', async () => {
      await exportWageDetailToExcel(mockRecords)

      const sheetData = getCallArgs(mockJsonToSheet)[0]
      expect(sheetData[0]['差额']).toBe(0)     // 6600 - 6600
      expect(sheetData[1]['差额']).toBe(5600) // 5600 - 0
    })

    it('paidAmount 为 undefined 时应按 0 处理', async () => {
      const records = [{
        id: 3, memberId: 103, memberName: '王五', teamName: '泥工班',
        yearMonth: '2026-04', workDays: 15, dailyWage: 250,
        paidAmount: undefined, paidDate: '',
      } as any]

      await exportWageDetailToExcel(records)

      const sheetData = getCallArgs(mockJsonToSheet)[0]
      expect(sheetData[0]['实发金额']).toBe(0)
      expect(sheetData[0]['差额']).toBe(3750) // 250*15 - 0
    })
  })

  // ─── printWageDetail ─────────────────────────────────────────
  describe('printWageDetail', () => {
    let mockHtml: string
    let originalOpen: typeof window.open

    beforeEach(() => {
      mockHtml = ''
      originalOpen = window.open
      window.open = vi.fn().mockReturnValue({
        document: {
          write: (html: string) => { mockHtml = html },
          close: vi.fn(),
        },
        focus: vi.fn(),
        print: vi.fn(),
        close: vi.fn(),
      }) as any
    })

    afterEach(() => {
      window.open = originalOpen
    })

    it('空数组应直接返回', () => {
      printWageDetail([], '测试标题')
      expect(mockHtml).toBe('')
    })

    it('应生成包含标题的 HTML', () => {
      printWageDetail(mockRecords, '安岳项目部')

      expect(mockHtml).toContain('安岳项目部')
      expect(mockHtml).toContain('工资明细')
    })

    it('HTML 应包含正确的汇总数据', () => {
      printWageDetail(mockRecords, '测试')

      expect(mockHtml).toContain('12200.00') // 应发总额
      expect(mockHtml).toContain('6600.00')  // 实发总额
      expect(mockHtml).toContain('5600.00')  // 未发
    })

    it('差额为0应显示"已结清"', () => {
      printWageDetail(mockRecords, '测试')

      expect(mockHtml).toContain('已结清')
      expect(mockHtml).toContain('欠')
    })

    it('应包含人数统计', () => {
      printWageDetail(mockRecords, '测试')
      expect(mockHtml).toContain('2 人')
    })

    it('应包含打印时间', () => {
      printWageDetail(mockRecords, '测试')
      expect(mockHtml).toContain('打印时间')
    })
  })
})
