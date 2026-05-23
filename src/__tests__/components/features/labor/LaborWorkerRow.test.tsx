import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import { LaborWorkerRow } from '@/components/features/labor/LaborWorkerRow'

describe('LaborWorkerRow', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnWageModal = vi.fn()

  const baseWorker = {
    id: 1,
    workerId: 100,
    name: '张三',
    idCard: '510123199001011234',
    birthDate: '1990-01-01',
    gender: '男',
    workerType: 'migrant',
    dailyWage: 300,
    bankAccount: '6222021234567890',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(cleanup)

  test('应渲染工人基本信息', () => {
    render(React.createElement(LaborWorkerRow, {
      worker: baseWorker,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onWageModal: mockOnWageModal,
    }))
    expect(screen.getByText('张三')).toBeTruthy()
    expect(screen.getByText('510123199001011234')).toBeTruthy()
    expect(screen.getByText('¥300')).toBeTruthy()
    expect(screen.getByText('6222021234567890')).toBeTruthy()
  })

  test('年龄不超过 60 时正常显示', () => {
    render(React.createElement(LaborWorkerRow, {
      worker: { ...baseWorker, birthDate: '1990-01-01' },
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onWageModal: mockOnWageModal,
    }))
    // 年龄列应该存在且不为红色
    const cells = screen.getByRole('row').querySelectorAll('td')
    const ageCell = cells[2]
    expect(ageCell.className).not.toContain('text-red-600')
  })

  test('缺少出生日期时显示 -', () => {
    render(React.createElement(LaborWorkerRow, {
      worker: { ...baseWorker, birthDate: '' },
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onWageModal: mockOnWageModal,
    }))
    expect(screen.getByText('-')).toBeTruthy()
  })

  test('缺少工种类型时显示 -', () => {
    render(React.createElement(LaborWorkerRow, {
      worker: { ...baseWorker, workerType: null },
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onWageModal: mockOnWageModal,
    }))
    // 应渲染至少一个 '-' 占位符
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  test('点击编辑按钮应触发 onEdit', () => {
    render(React.createElement(LaborWorkerRow, {
      worker: baseWorker,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onWageModal: mockOnWageModal,
    }))
    screen.getByText('编辑').click()
    expect(mockOnEdit).toHaveBeenCalledWith(baseWorker)
  })

  test('点击工资按钮应触发 onWageModal', () => {
    render(React.createElement(LaborWorkerRow, {
      worker: baseWorker,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onWageModal: mockOnWageModal,
    }))
    screen.getByText('工资').click()
    expect(mockOnWageModal).toHaveBeenCalledWith(100, '张三')
  })

  test('点击删除按钮应触发 onDelete', () => {
    render(React.createElement(LaborWorkerRow, {
      worker: baseWorker,
      onEdit: mockOnEdit,
      onDelete: mockOnDelete,
      onWageModal: mockOnWageModal,
    }))
    screen.getByText('删除').click()
    expect(mockOnDelete).toHaveBeenCalledWith(100)
  })
})
