// @ts-nocheck
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// Mock useToastStore (Zustand)
vi.mock('@/store/toastStore', () => ({
  useToastStore: vi.fn(() => ({ showToast: vi.fn() })),
}))

// Mock usePermission
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: () => true }),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: { div: 'div' as any, button: 'button' as any },
}))

// Mock mammoth
vi.mock('mammoth', () => ({
  default: { extractRawText: vi.fn(() => Promise.resolve({ value: '' })) },
}))

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

// Mock contractConfig
vi.mock('@/components/features/contracts/contractConfig', () => ({
  CONFIG: {
    income: { label: '收入合同', exportType: 'income' as const, auditResource: 'contract_income', subCategory: 'income', accentColor: 'bg-emerald-500', partnerCategoryDefault: '甲方' },
    expense: { label: '支出合同', exportType: 'expense' as const, auditResource: 'contract_expense', subCategory: 'expense', accentColor: 'bg-red-500', partnerCategoryDefault: '乙方' },
    agreement: { label: '其他协议', exportType: 'agreement' as const, auditResource: 'contract_agreement', subCategory: 'agreement', accentColor: 'bg-sky-500', partnerCategoryDefault: '协议方' },
  },
  getApi: () => ({ getContracts: vi.fn(() => Promise.resolve({ success: true, data: [] })), deleteContract: vi.fn(() => Promise.resolve({ success: true })) }),
  getStatusLabel: () => '',
  getStatusColor: () => '',
  getContractPaymentTotal: () => 0,
  AGREEMENT_SUB_TYPE_LABELS: {},
  type: {} as any,
  Contract: {} as any,
}))

// Mock ContractFormModal
vi.mock('@/components/features/contracts/ContractFormModal', () => ({
  ContractFormModal: ({ onClose }: any) => <div data-testid="contract-modal"><button onClick={onClose}>Close</button></div>,
}))

// Mock TemplateSelectorModal, TemplateGenerate
vi.mock('@/components/features/templates', () => ({
  TemplateSelectorModal: ({ onClose }: any) => <div data-testid="template-selector"><button onClick={onClose}>Close</button></div>,
  TemplateGenerate: ({ onClose }: any) => <div data-testid="template-generate"><button onClick={onClose}>Close</button></div>,
}))

// Mock window.electronAPI
beforeEach(() => {
  ;(window as any).electronAPI = {
    getProjects: vi.fn(() => Promise.resolve({ success: true, data: [] })),
    getPartners: vi.fn(() => Promise.resolve({ success: true, data: [] })),
    getPaymentRecords: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  }
  localStorage.clear()
})
afterEach(() => { cleanup(); delete (window as any).electronAPI })

import { default as ContractPage } from '@/components/ContractPage'

describe('ContractPage.tsx —— 最小化渲染', () => {
  test('应渲染页面标题（收入）', async () => {
    render(<ContractPage type="income" />)
    expect(await screen.findByText(/收入合同管理/)).toBeTruthy()
  }, 15000)

  test('应渲染页面标题（支出）', async () => {
    render(<ContractPage type="expense" />)
    expect(await screen.findByText(/支出合同管理/)).toBeTruthy()
  }, 15000)

  test('应渲染页面标题（协议）', async () => {
    render(<ContractPage type="agreement" />)
    expect(await screen.findByText(/其他协议管理/)).toBeTruthy()
  }, 15000)

  test('应显示新增合同按钮', async () => {
    render(<ContractPage type="income" />)
    expect(await screen.findByText(/新增合同/)).toBeTruthy()
  }, 15000)

  test('应显示搜索输入框', async () => {
    render(<ContractPage type="income" />)
    expect(await screen.findByPlaceholderText('搜索合同名称、编号...')).toBeTruthy()
  }, 15000)
})
