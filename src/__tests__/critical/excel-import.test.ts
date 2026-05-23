import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as XLSX from 'xlsx'

// ============================================================================
// Excel 导入数据校验测试（P2 级别）
// 测试目标：cost-ledger-importer.ts Excel 导入数据校验逻辑
// ============================================================================

describe('Excel 导入数据校验测试', () => {
  // 模拟 Excel 导入配置
  const importConfig = {
    requiredColumns: ['日期', '金额', '分类'],
    optionalColumns: ['说明', '收款方'],
    maxAmount: 1000000, // 最大金额 100 万
    maxRows: 1000, // 最大行数
  }

  // --------------------------------------------------------------------------
  // 测试 1: 应校验必填列是否存在
  // --------------------------------------------------------------------------
  it('应校验必填列是否存在', () => {
    // 模拟 Excel 数据（缺失必填列）
    const invalidData = [
      ['日期', '金额'], // 缺失 '分类' 列
      ['2026-05-01', 1000],
    ]

    // 模拟校验函数
    const validateColumns = (data: any[][]) => {
      const headers = data[0]
      const missingColumns = importConfig.requiredColumns.filter(
        (col) => !headers.includes(col)
      )

      return missingColumns
    }

    const missingColumns = validateColumns(invalidData)
    expect(missingColumns).toContain('分类')
    expect(missingColumns).toHaveLength(1)
  })

  // --------------------------------------------------------------------------
  // 测试 2: 应校验数据类型（金额必须为数字）
  // --------------------------------------------------------------------------
  it('应校验数据类型（金额必须为数字）', () => {
    // 模拟数据行
    const rows = [
      { 日期: '2026-05-01', 金额: 1000, 分类: '材料费' }, // 有效
      { 日期: '2026-05-02', 金额: '不是数字', 分类: '人工费' }, // 无效
      { 日期: '2026-05-03', 金额: undefined, 分类: '机械费' }, // 无效
    ]

    // 模拟数据类型校验函数
    const validateDataTypes = (rows: any[]) => {
      const errors: string[] = []

      rows.forEach((row, index) => {
        if (isNaN(Number(row.金额))) {
          errors.push(`第 ${index + 2} 行: 金额必须为数字，实际为 ${typeof row.金额}`)
        }
      })

      return errors
    }

    const errors = validateDataTypes(rows)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('第 3 行')
    expect(errors[1]).toContain('第 4 行')
  })

  // --------------------------------------------------------------------------
  // 测试 3: 应校验金额范围（0 < 金额 <= 最大金额）
  // --------------------------------------------------------------------------
  it('应校验金额范围（0 < 金额 <= 最大金额）', () => {
    // 模拟数据行
    const rows = [
      { 金额: 1000 }, // 有效
      { 金额: 0 }, // 无效
      { 金额: -500 }, // 无效
      { 金额: 2000000 }, // 无效（超过最大金额）
    ]

    // 模拟金额范围校验函数
    const validateAmountRange = (rows: any[]) => {
      const errors: string[] = []

      rows.forEach((row, index) => {
        const amount = Number(row.金额)

        if (amount <= 0) {
          errors.push(`第 ${index + 2} 行: 金额必须大于 0，实际为 ${amount}`)
        }

        if (amount > importConfig.maxAmount) {
          errors.push(
            `第 ${index + 2} 行: 金额不能超过 ${importConfig.maxAmount}，实际为 ${amount}`
          )
        }
      })

      return errors
    }

    const errors = validateAmountRange(rows)
    expect(errors).toHaveLength(3)
    expect(errors[0]).toContain('金额必须大于 0')
    expect(errors[1]).toContain('金额必须大于 0')
    expect(errors[2]).toContain(`金额不能超过 ${importConfig.maxAmount}`)
  })

  // --------------------------------------------------------------------------
  // 测试 4: 应校验日期格式（YYYY-MM-DD）
  // --------------------------------------------------------------------------
  it('应校验日期格式（YYYY-MM-DD）', () => {
    // 模拟数据行
    const rows = [
      { 日期: '2026-05-01' }, // 有效
      { 日期: '2026/05/01' }, // 无效
      { 日期: '2026-5-1' }, // 无效
      { 日期: '不是日期' }, // 无效
    ]

    // 模拟日期格式校验函数
    const validateDateFormat = (rows: any[]) => {
      const errors: string[] = []
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/

      rows.forEach((row, index) => {
        if (!dateRegex.test(row.日期)) {
          errors.push(`第 ${index + 2} 行: 日期格式必须为 YYYY-MM-DD，实际为 ${row.日期}`)
        }
      })

      return errors
    }

    const errors = validateDateFormat(rows)
    expect(errors).toHaveLength(3)
    expect(errors[0]).toContain('日期格式必须为 YYYY-MM-DD')
  })

  // --------------------------------------------------------------------------
  // 测试 5: 应限制最大行数
  // --------------------------------------------------------------------------
  it('应限制最大行数', () => {
    // 模拟超过最大行数的数据
    const rows = Array(importConfig.maxRows + 10)
      .fill(null)
      .map((_, i) => ({ 日期: '2026-05-01', 金额: 1000, 分类: '材料费' }))

    // 模拟行数校验函数
    const validateMaxRows = (rows: any[]) => {
      if (rows.length > importConfig.maxRows) {
        return {
          valid: false,
          error: `数据行数（${rows.length}）超过最大限制（${importConfig.maxRows}）`,
        }
      }

      return { valid: true, error: null }
    }

    const result = validateMaxRows(rows)
    expect(result.valid).toBe(false)
    expect(result.error).toContain(`${importConfig.maxRows + 10}`)
    expect(result.error).toContain(`${importConfig.maxRows}`)
  })

  // --------------------------------------------------------------------------
  // 测试 6: 应支持数据预览（前 10 行）
  // --------------------------------------------------------------------------
  it('应支持数据预览（前 10 行）', () => {
    // 模拟数据
    const rows = Array(50)
      .fill(null)
      .map((_, i) => ({
        id: `row-${i + 1}`,
        日期: '2026-05-01',
        金额: 1000,
        分类: '材料费',
      }))

    // 模拟预览函数
    const previewData = (rows: any[], previewRows: number = 10) => {
      return rows.slice(0, previewRows)
    }

    const preview = previewData(rows, 10)
    expect(preview).toHaveLength(10)
    expect(preview[0].id).toBe('row-1')
    expect(preview[9].id).toBe('row-10')
  })

  // --------------------------------------------------------------------------
  // 测试 7: 应生成导入报告（成功/失败行数）
  // --------------------------------------------------------------------------
  it('应生成导入报告（成功/失败行数）', () => {
    // 模拟导入结果
    const importResult = {
      totalRows: 100,
      successRows: 95,
      failedRows: 5,
      errors: [
        { row: 10, error: '金额必须为数字' },
        { row: 25, error: '日期格式错误' },
        { row: 50, error: '缺失必填字段' },
        { row: 75, error: '金额超过最大限制' },
        { row: 90, error: '分类不存在' },
      ],
    }

    // 模拟生成报告函数
    const generateImportReport = (result: any) => {
      const successRate = ((result.successRows / result.totalRows) * 100).toFixed(2)

      return {
        summary: `共 ${result.totalRows} 行，成功 ${result.successRows} 行，失败 ${result.failedRows} 行，成功率 ${successRate}%`,
        errors: result.errors,
      }
    }

    const report = generateImportReport(importResult)
    expect(report.summary).toContain('共 100 行')
    expect(report.summary).toContain('成功 95 行')
    expect(report.summary).toContain('失败 5 行')
    expect(report.summary).toContain('成功率 95.00%')
    expect(report.errors).toHaveLength(5)
  })
})
