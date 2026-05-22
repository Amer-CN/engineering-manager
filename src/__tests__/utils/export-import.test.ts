// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// 使用 vi.hoisted() 确保 mock 函数在 vi.mock() factory 中可用
// ═══════════════════════════════════════════════════════════════════════════════
const {
  mockJsonToSheet,
  mockBookNew,
  mockBookAppendSheet,
  mockWriteFile,
  mockRead,
  mockSheetToJson,
} = vi.hoisted(() => ({
  mockJsonToSheet: vi.fn(() => ({})),
  mockBookNew: vi.fn(() => ({})),
  mockBookAppendSheet: vi.fn(),
  mockWriteFile: vi.fn(),
  mockRead: vi.fn(),
  mockSheetToJson: vi.fn(),
}))

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: mockJsonToSheet,
    book_new: mockBookNew,
    book_append_sheet: mockBookAppendSheet,
    sheet_to_json: mockSheetToJson,
  },
  read: mockRead,
  writeFile: mockWriteFile,
}))

import {
  exportToExcel,
  exportProjects,
  exportPartners,
  exportMembers,
  exportContracts,
  exportSettlements,
  exportInvoices,
  exportInventory,
  importFromExcel,
  importProjects,
  importPartners,
  importMembers,
  createBackupData,
  exportBackup,
  importBackup,
} from '../../utils/export-import'
import type { BackupData } from '../../utils/export-import'

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助：安全取 mock call 参数（绕过 TS 严格 mock.calls 类型）
// ═══════════════════════════════════════════════════════════════════════════════
function getCallArgs(fn: ReturnType<typeof vi.fn>, callIndex = 0): any[] {
  return (fn.mock.calls as any[][])[callIndex]!
}

describe('export-import.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── exportToExcel ──────────────────────────────────────────
  describe('exportToExcel', () => {
    it('空数据应抛出异常', () => {
      expect(() =>
        exportToExcel([], [{ key: 'name', header: '姓名' }], { fileName: 'test' })
      ).toThrow('没有数据可导出')
    })

    it('应正确映射列并调用 writeFile', () => {
      exportToExcel(
        [{ name: '张三', age: 30 }],
        [{ key: 'name' as const, header: '姓名' }, { key: 'age' as const, header: '年龄' }],
        { fileName: '测试' }
      )

      expect(mockJsonToSheet).toHaveBeenCalledWith([
        { '姓名': '张三', '年龄': 30 },
      ])
      expect(mockWriteFile).toHaveBeenCalled()
    })

    it('autoWidth=false 时不设置列宽', () => {
      exportToExcel(
        [{ name: 'A' }],
        [{ key: 'name' as const, header: '姓名' }],
        { fileName: 'test', autoWidth: false }
      )

      const ws = mockJsonToSheet.mock.results[0].value
      expect(ws['!cols']).toBeUndefined()
    })

    it('autoWidth 默认应设置 !cols', () => {
      exportToExcel(
        [{ name: '张三丰' }],
        [{ key: 'name' as const, header: '姓名' }],
        { fileName: 'test' }
      )

      const ws = mockJsonToSheet.mock.results[0].value
      expect(ws['!cols']).toBeDefined()
    })

    it('应使用自定义 sheetName', () => {
      exportToExcel(
        [{ name: 'A' }],
        [{ key: 'name' as const, header: '名称' }],
        { fileName: 'test', sheetName: '自定义' }
      )

      expect(mockBookAppendSheet).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        '自定义'
      )
    })

    it('默认 sheetName 应为 Sheet1', () => {
      exportToExcel(
        [{ name: 'A' }],
        [{ key: 'name' as const, header: '名称' }],
        { fileName: 'test' }
      )

      expect(mockBookAppendSheet).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'Sheet1'
      )
    })
  })

  // ─── 领域导出函数 ──────────────────────────────────────────
  describe('领域导出函数', () => {
    it('exportProjects 应映射正确列', () => {
      exportProjects([{ name: '项目A', address: '成都', status: '进行中' }])
      const sheetData = getCallArgs(mockJsonToSheet)[0][0]
      expect(sheetData).toHaveProperty('项目名称')
      expect(sheetData).toHaveProperty('地址')
      expect(sheetData).toHaveProperty('状态')
    })

    it('exportPartners 应映射正确列', () => {
      exportPartners([{ name: '单位A', category: '供应商' }])
      const sheetData = getCallArgs(mockJsonToSheet)[0][0]
      expect(sheetData).toHaveProperty('单位名称')
      expect(sheetData).toHaveProperty('类型')
    })

    it('exportMembers 应映射正确列', () => {
      exportMembers([{ name: '张三', memberType: '管理人员' }])
      const sheetData = getCallArgs(mockJsonToSheet)[0][0]
      expect(sheetData).toHaveProperty('姓名')
      expect(sheetData).toHaveProperty('类型')
    })

    it('exportContracts 收入合同应映射正确列', () => {
      exportContracts([{ contractNo: 'HT001' }], 'income')
      const sheetData = getCallArgs(mockJsonToSheet)[0][0]
      expect(sheetData).toHaveProperty('合同编号')
    })

    it('exportContracts 支出合同应使用正确文件名前缀', () => {
      exportContracts([{ contractNo: 'HT002' }], 'expense')
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('支出合同')
      )
    })

    it('exportContracts 其他协议应使用正确文件名前缀', () => {
      exportContracts([{ contractNo: 'HT003' }], 'agreement')
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('其他协议')
      )
    })

    it('exportSettlements 应映射正确列', () => {
      exportSettlements([{ settlementNo: 'JS001' }])
      const sheetData = getCallArgs(mockJsonToSheet)[0][0]
      expect(sheetData).toHaveProperty('结算单号')
    })

    it('exportInvoices 应映射正确列', () => {
      exportInvoices([{ invoiceNo: 'FP001' }])
      const sheetData = getCallArgs(mockJsonToSheet)[0][0]
      expect(sheetData).toHaveProperty('发票号码')
    })

    it('exportInventory 应映射正确列', () => {
      exportInventory([{ code: 'M001', name: '水泥' }])
      const sheetData = getCallArgs(mockJsonToSheet)[0][0]
      expect(sheetData).toHaveProperty('物料编码')
      expect(sheetData).toHaveProperty('物料名称')
    })
  })

  // ─── importFromExcel ──────────────────────────────────────
  describe('importFromExcel', () => {
    it('空文件应返回失败', async () => {
      mockRead.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      })
      mockSheetToJson.mockReturnValue([])

      const mockFile = new File([''], 'test.xlsx')
      const result = await importFromExcel(mockFile, [
        { key: 'name', header: '姓名' },
      ])

      expect(result.success).toBe(false)
      expect(result.error).toBe('文件为空')
    })

    it('有效数据应正确映射列', async () => {
      mockRead.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      })
      mockSheetToJson.mockReturnValue([
        { '姓名': '张三', '年龄': 30 },
        { '姓名': '李四', '年龄': 25 },
      ])

      const mockFile = new File([''], 'test.xlsx')
      const result = await importFromExcel(mockFile, [
        { key: 'name', header: '姓名' },
        { key: 'age', header: '年龄' },
      ])

      expect(result.success).toBe(true)
      expect(result.totalRows).toBe(2)
      expect(result.validRows).toBe(2)
      expect(result.data[0]).toEqual({ name: '张三', age: 30 })
    })

    it('解析失败应返回错误信息', async () => {
      mockRead.mockImplementation(() => {
        throw new Error('bad format')
      })

      const mockFile = new File(['invalid'], 'test.xlsx')
      const result = await importFromExcel(mockFile, [
        { key: 'name', header: '姓名' },
      ])

      expect(result.success).toBe(false)
      expect(result.error).toContain('解析失败')
    })
  })

  // ─── 领域导入函数 ────────────────────────────────────────
  describe('领域导入函数', () => {
    beforeEach(() => {
      mockRead.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      })
    })

    it('importProjects 应使用正确映射', async () => {
      mockSheetToJson.mockReturnValue([
        { '项目名称': '项目A', '地址': '成都' },
      ])

      const mockFile = new File([''], 'test.xlsx')
      const result = await importProjects(mockFile)

      expect(result.success).toBe(true)
      expect(result.data[0].name).toBe('项目A')
    })

    it('importPartners 应使用正确映射', async () => {
      mockSheetToJson.mockReturnValue([
        { '单位名称': '单位A', '类型': '供应商' },
      ])

      const mockFile = new File([''], 'test.xlsx')
      const result = await importPartners(mockFile)

      expect(result.success).toBe(true)
      expect(result.data[0].name).toBe('单位A')
    })

    it('importMembers 应使用正确映射', async () => {
      mockSheetToJson.mockReturnValue([
        { '姓名': '张三', '电话': '13800138000' },
      ])

      const mockFile = new File([''], 'test.xlsx')
      const result = await importMembers(mockFile)

      expect(result.success).toBe(true)
      expect(result.data[0].name).toBe('张三')
    })
  })

  // ─── createBackupData ────────────────────────────────────
  describe('createBackupData', () => {
    it('应正确生成备份元数据', () => {
      const data = {
        projects: [{ id: 1 }, { id: 2 }],
        partners: [{ id: 1 }],
      }

      const backup = createBackupData(data, 'admin')

      expect(backup.metadata.version).toBe('1.0.0')
      expect(backup.metadata.createdBy).toBe('admin')
      expect(backup.metadata.recordCounts.projects).toBe(2)
      expect(backup.metadata.recordCounts.partners).toBe(1)
    })

    it('默认 createdBy 应为 system', () => {
      const backup = createBackupData({ projects: [] })
      expect(backup.metadata.createdBy).toBe('system')
    })

    it('空数组应计为 0', () => {
      const backup = createBackupData({ partners: [] })
      expect(backup.metadata.recordCounts.partners).toBe(0)
    })

    it('undefined 数组应计为 0', () => {
      const backup = createBackupData({ partners: undefined as any })
      expect(backup.metadata.recordCounts.partners).toBe(0)
    })

    it('dataTypes 应反映传入的键', () => {
      const backup = createBackupData({ projects: [], invoices: [] })
      expect(backup.metadata.dataTypes).toContain('projects')
      expect(backup.metadata.dataTypes).toContain('invoices')
    })
  })

  // ─── exportBackup / importBackup ─────────────────────────
  describe('exportBackup', () => {
    it('应创建 Blob 并触发下载', () => {
      const mockUrl = 'blob:test-url'
      const createObjectURL = vi.fn(() => mockUrl)
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

      const mockClick = vi.fn()
      const mockLink = { href: '', download: '', click: mockClick } as any
      const origCreate = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return mockLink
        return origCreate(tag)
      })

      const backup: BackupData = {
        metadata: {
          version: '1.0.0',
          createdAt: '2026-01-01T00:00:00Z',
          createdBy: 'admin',
          dataTypes: ['projects'],
          recordCounts: { projects: 1 },
        },
        data: { projects: [{ id: 1 }] },
      }

      exportBackup(backup)

      expect(createObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(revokeObjectURL).toHaveBeenCalledWith(mockUrl)

      vi.restoreAllMocks()
    })
  })

  describe('importBackup', () => {
    it('有效 JSON 应正确解析', async () => {
      const backupData = {
        metadata: { version: '1.0.0', createdAt: '2026-01-01', createdBy: 'admin', dataTypes: ['projects'], recordCounts: { projects: 1 } },
        data: { projects: [{ id: 1 }] },
      }

      const file = new File([JSON.stringify(backupData)], 'backup.json')
      const result = await importBackup(file)

      expect(result.metadata.version).toBe('1.0.0')
      expect(result.data.projects).toHaveLength(1)
    })

    it('缺少 metadata 应抛出错误', async () => {
      const file = new File([JSON.stringify({ data: {} })], 'bad.json')
      await expect(importBackup(file)).rejects.toThrow('无效的备份文件格式')
    })

    it('缺少 data 应抛出错误', async () => {
      const file = new File(
        [JSON.stringify({ metadata: { version: '1' } })],
        'bad.json'
      )
      await expect(importBackup(file)).rejects.toThrow('无效的备份文件格式')
    })

    it('非法 JSON 应抛出解析错误', async () => {
      const file = new File(['not json'], 'bad.json')
      await expect(importBackup(file)).rejects.toThrow('备份文件解析失败')
    })
  })
})
