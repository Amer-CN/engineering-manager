/**
 * 前端文件服务
 *
 * 封装统一文件 IPC 调用，提供 FILE_CATEGORIES 常量和便捷方法
 * 自动兼容旧 data URL 格式数据
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 分类常量（与后端 electron/file-service.ts 的 FOLDER_MAP 保持一致）
// ═══════════════════════════════════════════════════════════════════════════════

export const FILE_CATEGORIES = {
  MEMBER_ID_CARD:     { category: 'members', subCategory: 'id-cards' },
  MEMBER_CONTRACT:    { category: 'members', subCategory: 'contracts' },
  MEMBER_TRAINING:    { category: 'members', subCategory: 'training' },
  MEMBER_HEALTH:      { category: 'members', subCategory: 'health' },
  MEMBER_CERTIFICATE: { category: 'members', subCategory: 'certificates' },
  INVOICE_IN:         { category: 'invoices', subCategory: 'invoice_in' },
  INVOICE_OUT:        { category: 'invoices', subCategory: 'invoice_out' },
  PAYMENT_IN:         { category: 'payments', subCategory: 'payment_in' },
  PAYMENT_OUT:        { category: 'payments', subCategory: 'payment_out' },
  WAGE_BANK_RECEIPT:  { category: 'wages', subCategory: 'bank-receipts' },
  PARTNER_LICENSE:    { category: 'partners', subCategory: 'licenses' },
  PARTNER_ATTACHMENT: { category: 'partners', subCategory: 'attachments' },
  CONTRACT_INCOME:    { category: 'contracts', subCategory: 'income' },
  CONTRACT_EXPENSE:   { category: 'contracts', subCategory: 'expense' },
  DRAWING_FILE:       { category: 'drawings', subCategory: 'files' },
  ATTENDANCE_FILE:    { category: 'attendance', subCategory: 'files' },
  SETTLEMENT_FILE:    { category: 'settlement', subCategory: 'files' },
  TEMPLATE_FILE:      { category: 'templates', subCategory: 'files' },
  COST_LEDGER_FILE:   { category: 'costLedger', subCategory: 'files' },
} as const

export type FileCategoryConfig = typeof FILE_CATEGORIES[keyof typeof FILE_CATEGORIES]

// ═══════════════════════════════════════════════════════════════════════════════
// 文件上传
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 上传文件：将 data URL（或原始 base64）保存到磁盘
 * @returns 存储后的文件名
 * @throws 上传失败时抛出异常
 */
export async function uploadFile(
  category: string,
  subCategory: string,
  fileData: string,
  originalFileName: string,
  projectName?: string | null,
): Promise<string> {
  if (!fileData) return ''
  // 如果是纯 base64（无 data: 前缀），不加处理直接传
  // 如果是 data URL，后端 extractBase64Data 会处理
  const result = await window.electronAPI.saveFile({
    category,
    subCategory,
    fileData,
    fileName: originalFileName,
    projectName,
  })
  if (!result.success) {
    throw new Error(result.error || '文件上传失败')
  }
  return result.data!.fileName
}

/**
 * 批量处理对象中的文件字段：将 data URL 字段上传到磁盘并用文件名替换
 *
 * @param obj 包含 data URL 字段的对象
 * @param fieldConfigs 字段配置数组，指定每个文件字段对应的分类和原始文件名
 * @returns 处理后的对象（所有 data URL 已被文件名替换）
 *
 * 示例：
 *   processFileFields(memberData, [
 *     { field: 'idCardFront', category: FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => 'id_front.jpg' },
 *     { field: 'contractFile', category: FILE_CATEGORIES.MEMBER_CONTRACT, getFileName: () => 'contract.pdf' },
 *   ])
 */
export async function processFileFields<T extends Record<string, any>>(
  obj: T,
  fieldConfigs: {
    field: keyof T
    category: string
    subCategory: string
    getFileName?: () => string
  }[],
  projectName?: string | null,
): Promise<T> {
  const result = { ...obj }
  const uploads: Promise<void>[] = []

  for (const config of fieldConfigs) {
    const value = result[config.field]
    if (typeof value === 'string' && value.startsWith('data:')) {
      const fileName = config.getFileName ? config.getFileName() : 'file'
      uploads.push(
        uploadFile(config.category, config.subCategory, value, fileName, projectName)
          .then(storedName => {
            (result as any)[config.field] = storedName
          }),
      )
    }
  }

  if (uploads.length > 0) {
    await Promise.all(uploads)
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// 文件读取
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 获取文件的 data URL 用于前端预览
 * 自动兼容：如果传入的是已有 data URL，直接返回
 *            如果是文件名，走 IPC 读取
 */
export async function readUploadedFile(
  category: string,
  subCategory: string,
  value: string,
  projectName?: string | null,
): Promise<string> {
  if (!value) return ''
  // 向后兼容：如果值是 data URL，直接返回
  if (value.startsWith('data:')) return value
  // 否则按文件名从磁盘读取
  const result = await window.electronAPI.readFile({
    category,
    subCategory,
    fileName: value,
    projectName,
  })
  if (!result.success) return ''
  return result.data!.dataUrl
}

// ═══════════════════════════════════════════════════════════════════════════════
// 文件删除
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 删除已上传的文件
 * 自动兼容：如果值是 data URL（旧格式），不做磁盘删除
 */
export async function deleteUploadedFile(
  category: string,
  subCategory: string,
  value: string,
  projectName?: string | null,
): Promise<void> {
  if (!value || value.startsWith('data:')) return
  await window.electronAPI.deleteFile({
    category,
    subCategory,
    fileName: value,
    projectName,
  })
}

/**
 * 批量删除对象中的文件字段
 */
export async function deleteFileFields<T extends Record<string, any>>(
  obj: T,
  fieldConfigs: {
    field: keyof T
    category: string
    subCategory: string
  }[],
  projectName?: string | null,
): Promise<void> {
  const deletes: Promise<void>[] = []
  for (const config of fieldConfigs) {
    const value = obj[config.field]
    if (typeof value === 'string' && value && !value.startsWith('data:')) {
      deletes.push(deleteUploadedFile(config.category, config.subCategory, value, projectName))
    }
  }
  if (deletes.length > 0) {
    await Promise.all(deletes)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 使用 FileReader 读取文件为 data URL
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 根据 data URL 推断文件扩展名
 */
export function guessFileExt(dataUrl: string, fileType?: string): string {
  if (fileType === 'pdf') return '.pdf'
  if (fileType === 'word') return '.docx'
  if (fileType === 'excel') return '.xlsx'
  if (fileType === 'dwg') return '.dwg'
  if (fileType === 'dxf') return '.dxf'
  // 从 MIME 推断
  const match = dataUrl.match(/^data:([^;]+);/)
  if (match) {
    const mime = match[1]
    if (mime.includes('jpeg')) return '.jpg'
    if (mime.includes('png')) return '.png'
    if (mime.includes('webp')) return '.webp'
    if (mime.includes('gif')) return '.gif'
    if (mime.includes('pdf')) return '.pdf'
    if (mime.includes('dwg') || mime.includes('acad')) return '.dwg'
  }
  return '.bin'
}
