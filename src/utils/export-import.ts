/**
 * 数据导入导出工具
 * 
 * 支持：Excel 导出/导入、JSON 备份/恢复
 */

import * as XLSX from 'xlsx'

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 文件名（不含扩展名） */
  fileName: string
  /** 工作表名称 */
  sheetName?: string
  /** 是否自动调整列宽 */
  autoWidth?: boolean
  /** 日期格式 */
  dateFormat?: string
}

/**
 * 导入结果
 */
export interface ImportResult<T> {
  /** 是否成功 */
  success: boolean
  /** 数据列表 */
  data: T[]
  /** 错误信息 */
  error?: string
  /** 总行数 */
  totalRows: number
  /** 有效行数 */
  validRows: number
}

/**
 * 备份数据类型
 */
export type BackupDataType = 'projects' | 'partners' | 'members' | 'contracts' | 'invoices' | 'settlements' | 'inventory' | 'all'

/**
 * 备份元数据
 */
export interface BackupMetadata {
  version: string
  createdAt: string
  createdBy: string
  dataTypes: BackupDataType[]
  recordCounts: Record<string, number>
}

/**
 * 完整备份数据
 */
export interface BackupData {
  metadata: BackupMetadata
  data: {
    projects?: any[]
    partners?: any[]
    members?: any[]
    incomeContracts?: any[]
    expenseContracts?: any[]
    agreementContracts?: any[]
    invoices?: any[]
    settlements?: any[]
    inventoryItems?: any[]
    inventoryTransactions?: any[]
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Excel 导出
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 通用 Excel 导出函数
 * 
 * @param data 数据数组
 * @param columns 列配置
 * @param options 导出选项
 * 
 * @example
 * ```typescript
 * exportToExcel(users, [
 *   { key: 'name', header: '姓名' },
 *   { key: 'phone', header: '电话' },
 * ], { fileName: '用户列表' })
 * ```
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    throw new Error('没有数据可导出')
  }

  // 转换为工作表数据
  const wsData = data.map(row => {
    const newRow: Record<string, any> = {}
    columns.forEach(col => {
      newRow[col.header] = row[col.key]
    })
    return newRow
  })

  // 创建工作簿
  const worksheet = XLSX.utils.json_to_sheet(wsData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Sheet1')

  // 自动调整列宽
  if (options.autoWidth !== false) {
    const colWidths = columns.map(col => ({
      wch: Math.max(
        col.header.length,
        ...data.slice(0, 100).map(row => String(row[col.key] || '').length)
      ) + 2
    }))
    worksheet['!cols'] = colWidths
  }

  // 导出文件
  const fileName = `${options.fileName}_${formatDate(new Date())}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

/**
 * 导出项目列表
 */
export function exportProjects(projects: any[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    projects,
    [
      { key: 'name', header: '项目名称' },
      { key: 'address', header: '地址' },
      { key: 'startDate', header: '开始日期' },
      { key: 'endDate', header: '结束日期' },
      { key: 'status', header: '状态' },
      { key: 'budget', header: '预算' },
      { key: 'projectManagerName', header: '项目经理' },
    ],
    { fileName: '项目列表', ...options }
  )
}

/**
 * 导出合作单位列表
 */
export function exportPartners(partners: any[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    partners,
    [
      { key: 'name', header: '单位名称' },
      { key: 'category', header: '类型' },
      { key: 'contact', header: '联系人' },
      { key: 'phone', header: '电话' },
      { key: 'email', header: '邮箱' },
      { key: 'creditCode', header: '信用代码' },
      { key: 'bankName', header: '开户行' },
      { key: 'bankAccount', header: '银行账号' },
    ],
    { fileName: '合作单位', ...options }
  )
}

/**
 * 导出员工列表
 */
export function exportMembers(members: any[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    members,
    [
      { key: 'name', header: '姓名' },
      { key: 'phone', header: '电话' },
      { key: 'memberType', header: '类型' },
      { key: 'role', header: '职位/工种' },
      { key: 'idCard', header: '身份证号' },
      { key: 'teamName', header: '班组' },
      { key: 'projectName', header: '所属项目' },
      { key: 'status', header: '状态' },
    ],
    { fileName: '员工列表', ...options }
  )
}

/**
 * 导出合同列表
 */
export function exportContracts(contracts: any[], type: 'income' | 'expense' | 'agreement', options?: Partial<ExportOptions>): void {
  const prefix = type === 'income' ? '收入合同' : type === 'expense' ? '支出合同' : '其他协议'
  exportToExcel(
    contracts,
    [
      { key: 'contractNo', header: '合同编号' },
      { key: 'name', header: '合同名称' },
      { key: 'partnerName', header: '合作单位' },
      { key: 'projectName', header: '关联项目' },
      { key: 'amount', header: '合同金额' },
      { key: 'signedDate', header: '签订日期' },
      { key: 'startDate', header: '开始日期' },
      { key: 'endDate', header: '结束日期' },
      { key: 'status', header: '状态' },
    ],
    { fileName: `${prefix}列表`, ...options }
  )
}

/**
 * 导出结算单列表
 */
export function exportSettlements(settlements: any[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    settlements,
    [
      { key: 'settlementNo', header: '结算单号' },
      { key: 'name', header: '结算名称' },
      { key: 'type', header: '类型' },
      { key: 'partnerName', header: '合作单位' },
      { key: 'projectName', header: '关联项目' },
      { key: 'amount', header: '结算金额' },
      { key: 'periodStart', header: '结算开始' },
      { key: 'periodEnd', header: '结算结束' },
      { key: 'status', header: '状态' },
    ],
    { fileName: '结算单列表', ...options }
  )
}

/**
 * 导出发票列表
 */
export function exportInvoices(invoices: any[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    invoices,
    [
      { key: 'invoiceNo', header: '发票号码' },
      { key: 'type', header: '类型' },
      { key: 'sellerName', header: '销售方' },
      { key: 'buyerName', header: '购买方' },
      { key: 'amount', header: '价税合计' },
      { key: 'taxAmount', header: '税额' },
      { key: 'taxRate', header: '税率' },
      { key: 'issueDate', header: '开票日期' },
      { key: 'status', header: '状态' },
    ],
    { fileName: '发票列表', ...options }
  )
}

/**
 * 导出物料库存
 */
export function exportInventory(items: any[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    items,
    [
      { key: 'code', header: '物料编码' },
      { key: 'name', header: '物料名称' },
      { key: 'category', header: '分类' },
      { key: 'specifications', header: '规格型号' },
      { key: 'unit', header: '单位' },
      { key: 'purchasePrice', header: '采购单价' },
      { key: 'currentStock', header: '当前库存' },
    ],
    { fileName: '物料库存', ...options }
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Excel 导入
// ═════════════════════════════════ ══════════════════════════════════════════

/**
 * 通用 Excel 导入函数
 * 
 * @param file Excel 文件
 * @param mapping 列映射配置
 * @returns 导入结果
 */
export async function importFromExcel<T extends Record<string, any>>(
  file: File,
  mapping: { key: keyof T; header: string }[]
): Promise<ImportResult<T>> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet)
        
        if (jsonData.length === 0) {
          resolve({
            success: false,
            data: [],
            error: '文件为空',
            totalRows: 0,
            validRows: 0,
          })
          return
        }

        // 映射数据
        const result: T[] = []
        const headerToKey = new Map(mapping.map(m => [m.header, m.key]))
        
        for (const row of jsonData) {
          const mappedRow: Record<string, any> = {}
          let isValid = true
          
          for (const [header, key] of headerToKey) {
            const value = row[header]
            if (value === undefined || value === null || value === '') {
              // 非空检查（可以根据需求调整）
              // isValid = false
            }
            mappedRow[key as string] = value
          }
          
          if (isValid) {
            result.push(mappedRow as T)
          }
        }
        
        resolve({
          success: true,
          data: result,
          totalRows: jsonData.length,
          validRows: result.length,
        })
      } catch (error) {
        resolve({
          success: false,
          data: [],
          error: `解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
          totalRows: 0,
          validRows: 0,
        })
      }
    }
    
    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        error: '文件读取失败',
        totalRows: 0,
        validRows: 0,
      })
    }
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 导入项目数据
 */
export async function importProjects(file: File): Promise<ImportResult<any>> {
  return importFromExcel(file, [
    { key: 'name', header: '项目名称' },
    { key: 'address', header: '地址' },
    { key: 'startDate', header: '开始日期' },
    { key: 'endDate', header: '结束日期' },
    { key: 'budget', header: '预算' },
  ])
}

/**
 * 导入合作单位数据
 */
export async function importPartners(file: File): Promise<ImportResult<any>> {
  return importFromExcel(file, [
    { key: 'name', header: '单位名称' },
    { key: 'category', header: '类型' },
    { key: 'contact', header: '联系人' },
    { key: 'phone', header: '电话' },
    { key: 'email', header: '邮箱' },
  ])
}

/**
 * 导入员工数据
 */
export async function importMembers(file: File): Promise<ImportResult<any>> {
  return importFromExcel(file, [
    { key: 'name', header: '姓名' },
    { key: 'phone', header: '电话' },
    { key: 'memberType', header: '类型' },
    { key: 'role', header: '职位/工种' },
    { key: 'idCard', header: '身份证号' },
  ])
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON 备份/恢复
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 生成备份数据
 */
export function createBackupData(
  data: Record<string, any[]>,
  createdBy: string = 'system'
): BackupData {
  const recordCounts: Record<string, number> = {}
  
  for (const [key, items] of Object.entries(data)) {
    recordCounts[key] = items?.length || 0
  }
  
  return {
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      createdBy,
      dataTypes: Object.keys(data) as BackupDataType[],
      recordCounts,
    },
    data: data as BackupData['data'],
  }
}

/**
 * 导出 JSON 备份文件
 */
export function exportBackup(data: BackupData): void {
  const fileName = `backup_${formatDate(new Date())}.json`
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  
  URL.revokeObjectURL(url)
}

/**
 * 导入 JSON 备份文件
 */
export async function importBackup(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BackupData
        
        // 验证备份数据格式
        if (!data.metadata || !data.data) {
          throw new Error('无效的备份文件格式')
        }
        
        resolve(data)
      } catch (error) {
        reject(new Error(`备份文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    reader.readAsText(file)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 格式化日期为文件名友好格式
 */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}${m}${d}_${h}${min}`
}

