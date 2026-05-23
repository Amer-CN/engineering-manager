import { CONFIG, AGREEMENT_SUB_TYPE_LABELS, getStatusLabel, getStatusColor, getContractPaymentTotal } from '@/components/features/contracts/contractConfig'
import type { PaymentRecord } from '@/types/electron'

describe('contractConfig', () => {
  describe('CONFIG', () => {
    test('应包含 income/expense/agreement 三种类型', () => {
      expect(CONFIG.income).toBeTruthy()
      expect(CONFIG.expense).toBeTruthy()
      expect(CONFIG.agreement).toBeTruthy()
    })

    test('income 配置正确', () => {
      expect(CONFIG.income.label).toBe('收入合同')
      expect(CONFIG.income.partnerLabel).toBe('甲方单位')
      expect(CONFIG.income.paymentRecordType).toBe('invoice_out')
    })

    test('expense 配置正确', () => {
      expect(CONFIG.expense.label).toBe('支出合同')
      expect(CONFIG.expense.partnerLabel).toBe('乙方单位')
      expect(CONFIG.expense.paymentRecordType).toBe('invoice_in')
    })

    test('agreement 配置正确', () => {
      expect(CONFIG.agreement.label).toBe('其他协议')
      expect(CONFIG.agreement.partnerLabel).toBe('协议方')
      expect(CONFIG.agreement.paymentRecordType).toBe('')
    })

    test('每种类型都有 label/auditResource/modalCreateTitle', () => {
      for (const type of ['income', 'expense', 'agreement'] as const) {
        expect(CONFIG[type].label).toBeTruthy()
        expect(CONFIG[type].auditResource).toBeTruthy()
        expect(CONFIG[type].modalCreateTitle).toBeTruthy()
      }
    })
  })

  describe('AGREEMENT_SUB_TYPE_LABELS', () => {
    test('应包含所有协议子类型', () => {
      expect(AGREEMENT_SUB_TYPE_LABELS.cooperation).toBe('合作协议')
      expect(AGREEMENT_SUB_TYPE_LABELS.framework).toBe('框架协议')
      expect(AGREEMENT_SUB_TYPE_LABELS.settlement).toBe('和解协议')
      expect(AGREEMENT_SUB_TYPE_LABELS.compensation).toBe('赔偿协议')
      expect(AGREEMENT_SUB_TYPE_LABELS.personal).toBe('个人协议')
      expect(AGREEMENT_SUB_TYPE_LABELS.other).toBe('其他协议')
    })
  })

  describe('getStatusLabel', () => {
    test('已知状态返回正确标签', () => {
      expect(getStatusLabel('draft')).toBe('起草')
      expect(getStatusLabel('active')).toBe('执行中')
      expect(getStatusLabel('expired')).toBe('已到期')
    })

    test('未知状态返回原值', () => {
      expect(getStatusLabel('unknown_status')).toBe('unknown_status')
    })
  })

  describe('getStatusColor', () => {
    test('draft 返回灰色', () => {
      expect(getStatusColor('draft')).toContain('slate')
    })

    test('active 返回绿色', () => {
      expect(getStatusColor('active')).toContain('green')
    })

    test('terminated 返回红色', () => {
      expect(getStatusColor('terminated')).toContain('red')
    })

    test('未知状态返回默认灰色', () => {
      expect(getStatusColor('unknown')).toContain('slate')
    })
  })

  describe('getContractPaymentTotal', () => {
    const payments: PaymentRecord[] = [
      { id: 1, contractId: 100, type: 'invoice_out', amount: 50000 } as any,
      { id: 2, contractId: 100, type: 'invoice_out', amount: 30000 } as any,
      { id: 3, contractId: 100, type: 'invoice_in', amount: 20000 } as any,
    ]

    test('应按合同和类型过滤并求和', () => {
      const config = CONFIG.income
      const total = getContractPaymentTotal(100, payments, config)
      expect(total).toBe(80000) // 50000 + 30000
    })

    test('无匹配记录返回 0', () => {
      const total = getContractPaymentTotal(999, payments, CONFIG.income)
      expect(total).toBe(0)
    })
  })
})
