/**
 * CostLedgerImportModal.tsx – 极简 smoke 测试
 * 目标：证明组件能挂载 / 卸载而不崩溃
 */
import { render, screen } from '@testing-library/react'
import React from 'react'

// ── Mock xlsx（组件内动态 import('xlsx')）──
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn(() => []) },
}))

// ── Mock framer-motion（简化版）──
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => (props: any) => React.createElement('div', props) }),
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}))

// ── 把 importComponents 下所有模块都 mock 成空壳 ──
const empty = (name: string) => () =>
  React.createElement('div', { 'data-testid': name }, name)

vi.mock('@/components/features/costLedger/importComponents/ImportFileStep',
  () => ({ ImportFileStep: empty('ImportFileStep') }))
vi.mock('@/components/features/costLedger/importComponents/ImportMappingStep',
  () => ({
    ImportMappingStep: empty('ImportMappingStep'),
    parseAllRows: vi.fn(() => []),
    buildCategorySummary: vi.fn(() => []),
  }))
vi.mock('@/components/features/costLedger/importComponents/ImportProgressStep',
  () => ({ ImportProgressStep: empty('ImportProgressStep') }))
vi.mock('@/components/features/costLedger/importComponents/ImportDoneStep',
  () => ({ ImportDoneStep: empty('ImportDoneStep') }))
vi.mock('@/components/features/costLedger/importComponents/importLogic',
  () => ({
    executeBatchImport: vi.fn().mockResolvedValue({ success: true, count: 0 }),
    learnFromOverrides: vi.fn().mockResolvedValue({ count: 0, merged: [] }),
    buildImportEntries: vi.fn(() => []),
  }))

// ── Mock window.electronAPI ──
beforeEach(() => {
  if (!(window as any).electronAPI) (window as any).electronAPI = {}
  const api = (window as any).electronAPI
  api.getCostLedgerMatchRules = vi.fn().mockResolvedValue({ success: true, data: [] })
  api.saveCostLedgerMatchRules = vi.fn().mockResolvedValue({ success: true })
})

// ── 辅助数据 ──
const makeCategories = () => [
  { id: 1, code: 'material', label: '材料费', direction: 'expense', color: '#f59e0b', isEnabled: true, isBuiltin: true },
]
const makeBatches = () => [{ id: 1, name: '2024年1月' }]

// ── 懒加载 ──
const importModule = async () => {
  const mod = await import('@/components/features/costLedger/CostLedgerImportModal')
  return { CostLedgerImportModal: (mod as any).CostLedgerImportModal }
}

describe('CostLedgerImportModal', () => {
  test('show=false 时返回 null', async () => {
    const { CostLedgerImportModal } = await importModule()
    const { container } = render(
      React.createElement(CostLedgerImportModal, {
        show: false,
        projectId: 1,
        projectName: '测试项目',
        batches: makeBatches(),
        categories: makeCategories(),
        onClose: vi.fn(),
        onImported: vi.fn(),
      })
    )
    expect(container.firstChild).toBeNull()
  })

  test('show=true 时渲染标题', async () => {
    const { CostLedgerImportModal } = await importModule()
    render(
      React.createElement(CostLedgerImportModal, {
        show: true,
        projectId: 1,
        projectName: '测试项目',
        batches: makeBatches(),
        categories: makeCategories(),
        onClose: vi.fn(),
        onImported: vi.fn(),
      })
    )
    expect(screen.queryByText('导入成本台账')).toBeTruthy()
  })
})
