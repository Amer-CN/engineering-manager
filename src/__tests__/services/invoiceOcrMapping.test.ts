/**
 * 发票 OCR → 表单字段映射（T8）。
 * FP03（2026-11-07 取证）：数电票取消校验码/收款人/复核人 → 缺失必须留空，不伪造。
 */
import { describe, expect, test } from 'vitest'
import { mapInvoiceOcr } from '@/services/ocr/invoiceMapping'

const paperInvoice = {
  invoiceNum: '24312000000012345678',
  invoiceCode: '031002000111',
  invoiceDate: '2026-05-18',
  invoiceType: '增值税专用发票',
  totalAmount: 1060,
  amountWithoutTax: 1000,
  totalTax: 60,
  taxRate: 0.06,
  sellerName: '甲方建筑有限公司',
  purchaserName: '乙方工程有限公司',
  checkCode: '12345678901234567890',
  verifyCode: '12345678901234567890',
  sellerTaxNo: '91310000MA1FL1234X',
  purchaserTaxNo: '91310000MA1FL5678Y',
  drawer: '张三',
  payee: '李四',
  reviewer: '王五',
  taxCode: '3050102000000000000',
  itemName: '建筑服务',
  remarks: '项目备注',
}

describe('mapInvoiceOcr', () => {
  test('纸质/历史票样：映射 T8 全部字段', () => {
    const m = mapInvoiceOcr(paperInvoice as never)
    expect(m.invoiceNo).toBe('24312000000012345678')
    expect(m.invoiceCode).toBe('031002000111')
    expect(m.issueDate).toBe('2026-05-18')
    expect(m.amount).toBe(1060)
    expect(m.priceAmount).toBe(1000)
    expect(m.taxAmount).toBe(60)
    expect(m.taxRate).toBe(0.06)
    expect(m.sellerTaxNo).toBe('91310000MA1FL1234X')
    expect(m.purchaserTaxNo).toBe('91310000MA1FL5678Y')
    expect(m.verifyCode).toBe('12345678901234567890')
    expect(m.drawer).toBe('张三')
    expect(m.payee).toBe('李四')
    expect(m.reviewer).toBe('王五')
    expect(m.taxCode).toBe('3050102000000000000')
  })

  test('数电票：校验码/收款人/复核人缺失时留空，不伪造', () => {
    const digital = {
      invoiceNum: '24312000000012345678',
      invoiceDate: '2026-05-18',
      invoiceType: '电子发票（增值税专用发票）',
      totalAmount: 1060,
      amountWithoutTax: 1000,
      totalTax: 60,
      taxRate: 0.06,
      sellerName: '甲方建筑有限公司',
      purchaserName: '乙方工程有限公司',
      checkCode: '',
      itemName: '建筑服务',
      remarks: '',
    }
    const m = mapInvoiceOcr(digital as never)
    expect(m.verifyCode).toBe('')
    expect(m.drawer).toBe('')
    expect(m.payee).toBe('')
    expect(m.reviewer).toBe('')
    expect(m.sellerTaxNo).toBe('')
    expect(m.taxCode).toBe('')
  })

  test('verifyCode 缺失时回退旧字段 checkCode', () => {
    const legacy = { ...paperInvoice, verifyCode: undefined } as never
    expect(mapInvoiceOcr(legacy).verifyCode).toBe('12345678901234567890')
  })

  test('数值字段缺失时归零，字符串字段缺失时为空串', () => {
    const m = mapInvoiceOcr({ checkCode: '' } as never)
    expect(m.amount).toBe(0)
    expect(m.priceAmount).toBe(0)
    expect(m.taxAmount).toBe(0)
    expect(m.taxRate).toBe(0)
    expect(m.invoiceNo).toBe('')
    expect(m.sellerName).toBe('')
  })
})