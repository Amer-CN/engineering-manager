import { render, screen } from '@testing-library/react'
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
})
