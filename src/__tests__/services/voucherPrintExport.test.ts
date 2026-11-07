/**
 * 凭证打印/导出（T6e）纯函数测试。
 * 口径：CSV 首行说明 + UTF-8 BOM（下载层）+ 金额两位小数 + 转义。
 */
import { describe, expect, test } from 'vitest'
import {
  buildVoucherCsv,
  buildVoucherListPrintHtml,
  VOUCHER_EXPORT_NOTE,
} from '@/components/features/invoices/voucherPrintExport'

const draft = {
  id: 11,
  voucherNo: '记-202605-0001',
  voucherDate: '2026-05-18',
  period: '202605',
  sourceType: 'invoice',
  sourceId: 5,
  templateCode: 'INV_REVENUE',
  status: 'draft',
  postedAt: null,
  postedBy: null,
  totalDebit: 1060,
  totalCredit: 1060,
  entries: [{}, {}, {}],
} as never

const posted = {
  ...(draft as Record<string, unknown>),
  id: 12,
  voucherNo: '记-202605-0002',
  status: 'posted',
  postedAt: '2026-05-19 10:00:00',
  postedBy: '1',
  totalDebit: 2120,
  totalCredit: 2120,
} as never

describe('buildVoucherCsv', () => {
  test('首行为口径说明，第二行为表头，数据行含状态/金额/分录数', () => {
    const csv = buildVoucherCsv([draft as never, posted as never])
    const lines = csv.split('\r\n')

    expect(lines[0]).toBe(`"${VOUCHER_EXPORT_NOTE}"`)
    expect(lines[1]).toContain('"凭证号"')
    expect(lines[1]).toContain('"借方合计(元)"')

    expect(lines[2]).toContain('"记-202605-0001"')
    expect(lines[2]).toContain('"2026-05"')
    expect(lines[2]).toContain('"草稿"')
    expect(lines[2]).toContain('"1060.00"')
    expect(lines[2]).toContain('"3"')

    expect(lines[3]).toContain('"记-202605-0002"')
    expect(lines[3]).toContain('"已过账"')
    expect(lines[3]).toContain('"2026-05-19 10:00:00"')
    expect(lines[3]).toContain('"1"')
  })

  test('引号与逗号按 CSV 规则转义', () => {
    const weird = { ...(draft as Record<string, unknown>), voucherNo: '记-"0001",A' } as never
    const csv = buildVoucherCsv([weird])
    expect(csv).toContain('"记-""0001"",A"')
  })
})

describe('buildVoucherListPrintHtml', () => {
  test('包含标题、期间、凭证号、状态与借贷合计', () => {
    const html = buildVoucherListPrintHtml([draft as never, posted as never], '2026-05')

    expect(html).toContain('<h1>凭证列表</h1>')
    expect(html).toContain('期间：2026-05')
    expect(html).toContain(VOUCHER_EXPORT_NOTE)
    expect(html).toContain('记-202605-0001')
    expect(html).toContain('记-202605-0002')
    expect(html).toContain('草稿')
    expect(html).toContain('已过账')
    expect(html).toContain('合计（2 张）')
    // 合计 1060 + 2120 = 3180
    expect(html).toContain('3,180')
    // 文本转义
    const xss = { ...(draft as Record<string, unknown>), voucherNo: '<script>alert(1)</script>' } as never
    expect(buildVoucherListPrintHtml([xss], '全部期间')).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})