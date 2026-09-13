import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RichToolResult from '../RichToolResult'
import type { ToolCallResult } from '@/types/agent'

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
}))
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid="icon">{name}</span>,
}))

describe('RichToolResult', () => {
  it('对象数组 → 渲染表头、数据与状态翻译', () => {
    const results: ToolCallResult[] = [{
      toolName: 'getProjects', toolCallId: 't1', success: true,
      result: [{ id: 1, name: 'A项目', status: 'active' }],
    }]
    render(<RichToolResult results={results} />)
    expect(screen.getByText('名称')).toBeTruthy()
    expect(screen.getByText('A项目')).toBeTruthy()
    expect(screen.getByText('进行中')).toBeTruthy()
  })

  it('含嵌套数组的对象 → 标量网格 + 子表', () => {
    const results: ToolCallResult[] = [{
      toolName: 'getCostSummary', toolCallId: 't2', success: true,
      result: {
        totalIncome: 1000, totalExpense: 400, netTotal: 600,
        byCategory: [{ category: '人工费', total: 400 }],
      },
    }]
    render(<RichToolResult results={results} />)
    expect(screen.getByText(/总收入/)).toBeTruthy()
    expect(screen.getByText('分类统计')).toBeTruthy()
    expect(screen.getByText('人工费')).toBeTruthy()
  })

  it('错误结果 → 显示红色错误文案', () => {
    const results: ToolCallResult[] = [{
      toolName: 'runSafeQuery', toolCallId: 't3', success: false, error: '权限不足',
    }]
    render(<RichToolResult results={results} />)
    expect(screen.getByText('权限不足')).toBeTruthy()
  })

  it('空数组 → 暂无数据', () => {
    const results: ToolCallResult[] = [{
      toolName: 'getInvoices', toolCallId: 't4', success: true, result: [],
    }]
    render(<RichToolResult results={results} />)
    expect(screen.getByText('暂无数据')).toBeTruthy()
  })

  it('S9: 成功结果渲染“打开 XX 模块”跳转链接', () => {
    const results: ToolCallResult[] = [{
      toolName: 'getInvoices', toolCallId: 't5', success: true,
      result: [{ id: 1, invoice_no: 'INV-001', amount: 82500 }],
    }]
    render(<RichToolResult results={results} />)
    expect(screen.getByText('数据来源：发票列表')).toBeTruthy()
    expect(screen.getByText('打开发票管理')).toBeTruthy()
  })

  it('S9: 失败结果不渲染跳转链接', () => {
    const results: ToolCallResult[] = [{
      toolName: 'getInvoices', toolCallId: 't6', success: false, error: '查询失败',
    }]
    render(<RichToolResult results={results} />)
    expect(screen.queryByText('打开发票管理')).toBeNull()
  })

  it('驼峰键（后端 JSON 序列化）→ 命中下划线字段的中文标签', () => {
    const results: ToolCallResult[] = [{
      toolName: 'getInvoices', toolCallId: 't7', success: true,
      result: [{ id: 1, invoiceNo: 'INV-001', issueDate: '2026-01-01', projectName: 'A项目' }],
    }]
    render(<RichToolResult results={results} />)
    expect(screen.getByText('发票号')).toBeTruthy()
    expect(screen.getByText('开票日期')).toBeTruthy()
    expect(screen.getByText('所属项目')).toBeTruthy()
  })

  it('runSafeQuery 动态列（created_by/created_at）→ 中文标签', () => {
    const results: ToolCallResult[] = [{
      toolName: 'runSafeQuery', toolCallId: 't8', success: true,
      result: { success: true, rowCount: 1, data: [{ id: 1, created_by: '张三', created_at: '2026-01-01' }] },
    }]
    render(<RichToolResult results={results} />)
    expect(screen.getByText('创建人')).toBeTruthy()
    expect(screen.getByText('创建时间')).toBeTruthy()
  })

  it('runSafeQuery 成功结果 → data 表格正常渲染，内部字段折叠进调试信息且默认不显示', () => {
    const results: ToolCallResult[] = [{
      toolName: 'runSafeQuery', toolCallId: 't9', success: true,
      result: {
        success: true, rowCount: 2,
        rewrittenSql: 'SELECT invoice_no FROM invoices WHERE project_id = 1',
        data: [
          { id: 1, invoice_no: 'INV-001', amount: 100 },
          { id: 2, invoice_no: 'INV-002', amount: 200 },
        ],
      },
    }]
    render(<RichToolResult results={results} />)
    // data 表格正常渲染
    expect(screen.getByText('INV-001')).toBeTruthy()
    expect(screen.getByText('INV-002')).toBeTruthy()
    expect(screen.getByText('发票号')).toBeTruthy()
    // 内部字段不再进键值网格：只存在于调试信息 details 内，且默认折叠
    const details = screen.getByText('调试信息').closest('details')
    expect(details).toBeTruthy()
    expect(details!.open).toBe(false)
    screen.getAllByText(/实际执行 SQL/).forEach((el) => {
      expect(el.closest('details')).toBeTruthy()
    })
    // 展开后可见
    fireEvent.click(screen.getByText('调试信息'))
    expect(details!.open).toBe(true)
  })

  it('runSafeQuery 失败载荷（success=false）→ 走现有展示路径，不出现调试信息', () => {
    const results: ToolCallResult[] = [{
      toolName: 'runSafeQuery', toolCallId: 't10', success: true,
      result: { success: false, error: 'SQL 不能为空' },
    }]
    render(<RichToolResult results={results} />)
    expect(screen.getByText('SQL 不能为空')).toBeTruthy()
    expect(screen.queryByText('调试信息')).toBeNull()
  })

  it('runSafeQuery 新格式化：invoice_out→销项发票、tax_rate 0.09→9%、ISO 日期截断', () => {
    const results: ToolCallResult[] = [{
      toolName: 'runSafeQuery', toolCallId: 't11', success: true,
      result: {
        success: true, rowCount: 1,
        data: [{ type: 'invoice_out', tax_rate: 0.09, settlement_date: '2026-05-14T17:32:00' }],
      },
    }]
    render(<RichToolResult results={results} />)
    expect(screen.getByText('销项发票')).toBeTruthy()
    expect(screen.getByText('9%')).toBeTruthy()
    expect(screen.getByText('2026-05-14')).toBeTruthy()
  })
})
