import type { IncomeContract, ExpenseContract, Partner, Project, PaymentRecord } from '../../../types/electron'
import { contractStatuses } from '../../../data/regions'

export type ContractType = 'income' | 'expense'
export type Contract = IncomeContract | ExpenseContract

export interface TypeConfig {
  label: string; auditResource: string; partnerLabel: string; partnerPlaceholder: string
  partnerCategoryDefault: string; paymentColumnLabel: string; paymentRecordType: string
  accentColor: string; accentTextColor: string; accentBgLight: string
  emptyTitle: string; emptyDesc: string; modalCreateTitle: string
  subCategory: 'income' | 'expense'; exportType: string
}

export const CONFIG: Record<ContractType, TypeConfig> = {
  income: {
    label: '收入合同', auditResource: 'incomeContracts', partnerLabel: '甲方单位',
    partnerPlaceholder: '选择甲方单位', partnerCategoryDefault: '甲方',
    paymentColumnLabel: '已收款', paymentRecordType: 'invoice_out',
    accentColor: 'bg-primary-500', accentTextColor: 'text-primary-600', accentBgLight: 'bg-primary-100',
    emptyTitle: '暂无收入合同', emptyDesc: '点击上方按钮添加您的第一份收入合同',
    modalCreateTitle: '新增收入合同', subCategory: 'income', exportType: 'income',
  },
  expense: {
    label: '支出合同', auditResource: 'expenseContracts', partnerLabel: '乙方单位',
    partnerPlaceholder: '选择乙方单位', partnerCategoryDefault: '乙方',
    paymentColumnLabel: '已付款', paymentRecordType: 'invoice_in',
    accentColor: 'bg-red-500', accentTextColor: 'text-red-600', accentBgLight: 'bg-red-100',
    emptyTitle: '暂无支出合同', emptyDesc: '点击上方按钮添加您的第一份支出合同',
    modalCreateTitle: '新增支出合同', subCategory: 'expense', exportType: 'expense',
  },
}

export function getApi(type: ContractType) {
  const api = window.electronAPI
  return type === 'income'
    ? { getContracts: () => api.getIncomeContracts(), createContract: (d: any) => api.createIncomeContract(d), updateContract: (d: any) => api.updateIncomeContract(d), deleteContract: (id: number) => api.deleteIncomeContract(id) }
    : { getContracts: () => api.getExpenseContracts(), createContract: (d: any) => api.createExpenseContract(d), updateContract: (d: any) => api.updateExpenseContract(d), deleteContract: (id: number) => api.deleteExpenseContract(id) }
}

export function getStatusLabel(status: string) { return contractStatuses.find(s => s.value === status)?.label || status }
export function getStatusColor(status: string) {
  switch (status) {
    case 'draft': return 'bg-slate-100 text-slate-600'
    case 'pending': return 'bg-yellow-100 text-yellow-600'
    case 'active': return 'bg-green-100 text-green-600'
    case 'expired': return 'bg-orange-100 text-orange-600'
    case 'terminated': return 'bg-red-100 text-red-600'
    case 'archived': return 'bg-blue-100 text-blue-600'
    default: return 'bg-slate-100 text-slate-600'
  }
}

export function getContractPaymentTotal(contractId: number, paymentRecords: PaymentRecord[], config: TypeConfig) {
  return paymentRecords.filter(r => r.contractId === contractId && r.type === config.paymentRecordType).reduce((sum, r) => sum + r.amount, 0)
}
