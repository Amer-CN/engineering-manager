/**
 * 文件服务模块
 *
 * 统一管理所有上传文件的磁盘读写，按类型分目录存储
 */

import path from 'path'
import fs from 'fs'
import log from 'electron-log'
import { getUploadsPath } from './database'

// ═══════════════════════════════════════════════════════════════════════════════
// 文件夹结构映射
// ═══════════════════════════════════════════════════════════════════════════════

export interface FileCategory {
  category: string
  subCategory: string
}

export const FOLDER_MAP: Record<string, Record<string, string>> = {
  members: {
    'id-cards': '成员/身份证',
    'contracts': '成员/劳动合同',
    'training': '成员/安全培训',
    'health': '成员/健康报告',
    'certificates': '成员/特种证书',
  },
  invoices: {
    'invoice_in': '发票/收票',
    'invoice_out': '发票/开票',
  },
  payments: {
    'payment_in': '收付款/回款',
    'payment_out': '收付款/付款',
  },
  partners: {
    licenses: '合作单位/营业执照',
    attachments: '合作单位/附件',
  },
  contracts: {
    income: '合同/收入',
    expense: '合同/支出',
  },
  drawings: {
    files: '图纸/文件',
  },
  attendance: {
    files: '考勤/记录',
  },
  settlement: {
    files: '结算/凭证',
  },
  templates: {
    files: '模板/文件',
  },
  costLedger: {
    files: '成本台账/凭证',
  },
  wages: {
    'bank-receipts': '工资/银行回单',
  },
}
export type FileCategoryKeyFileCategoryKey = keyof typeof FOLDER_MAP
export type FileSubCategoryKey<C extends FileCategoryKey> = keyof typeof FOLDER_MAP[C]

// ═══════════════════════════════════════════════════════════════════════════════
// 路径
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 获取某个分类的子目录绝对路径
 */
function sanitizeProjectName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').substring(0, 40).trim() || '未命名项目'
}

function getProjectPrefix(projectName?: string | null): string {
  if (projectName !== undefined && projectName !== null && projectName !== '') {
    return sanitizeProjectName(projectName)
  }
  return '未分类'
}

export function getCategoryDir(category: string, subCategory: string, projectName?: string | null): string {
  const key = FOLDER_MAP[category]?.[subCategory]
  const relativePath = key || `${category}/${subCategory}`
  return path.join(getUploadsPath(), getProjectPrefix(projectName), relativePath)
}

export function getLegacyFlatDir(category: string, subCategory: string): string {
  const key = FOLDER_MAP[category]?.[subCategory]
  if (!key) {
    return path.join(getUploadsPath(), category, subCategory)
  }
  return path.join(getUploadsPath(), key)
}

/**
 * 获取文件的绝对路径
 */
export function getFileAbsolutePath(category: string, subCategory: string, fileName: string, projectName?: string | null): string {
  return path.join(getCategoryDir(category, subCategory, projectName), fileName)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 目录初始化
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 确保未分类子目录存在（文件按项目存储，无项目的进未分类）
 * 不再在 uploads 根目录下创建扁平分类目录
 */
export function ensureUploadDirs(): void {
  ensureUnclassifiedDirs()
}

/**
 * Ensure _common subdirectories exist (for files without project association)
 */
export function ensureUnclassifiedDirs(): void {
  const uploadsPath = getUploadsPath()
  const base = path.join(uploadsPath, '未分类')
  for (const [, subs] of Object.entries(FOLDER_MAP)) {
    for (const [, relativePath] of Object.entries(subs)) {
      const dir = path.join(base, relativePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 从 data URL 中提取纯 base64 数据
 * data:image/png;base64,iVBOR... → iVBOR...
 */
export function extractBase64Data(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1] || dataUrl
  }
  return dataUrl
}

/**
 * 生成存储文件名：描述信息_时间戳.扩展名
 * originalFileName 包含描述信息和扩展名，如 "张三_身份证人像.jpg"
 * 限制描述部分长度避免文件名过长
 */
export function generateStoredFileName(originalFileName: string): string {
  const ext = path.extname(originalFileName) || ''
  const base = path.basename(originalFileName, ext)
  const desc = base.replace(/[<>:"\/\\|?*\x00-\x1f]/g, '').substring(0, 80)
  return desc ? `${desc}${ext}` : `file${ext}`
}

/**
 * 根据扩展名获取 MIME 类型
 */
export function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.pdf': return 'application/pdf'
    case '.jpg': case '.jpeg': return 'image/jpeg'
    case '.png': return 'image/png'
    case '.webp': return 'image/webp'
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case '.gif': return 'image/gif'
    case '.bmp': return 'image/bmp'
    case '.dwg': return 'application/acad'
    case '.dxf': return 'application/dxf'
    default: return 'application/octet-stream'
  }
}

/**
 * 从 data URL 中推断文件扩展名
 * data:image/jpeg;base64,... → .jpg
 */
export function guessExtFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  if (!match) return '.bin'
  const mime = match[1]
  switch (mime) {
    case 'image/jpeg': return '.jpg'
    case 'image/png': return '.png'
    case 'image/webp': return '.webp'
    case 'image/gif': return '.gif'
    case 'image/bmp': return '.bmp'
    case 'application/pdf': return '.pdf'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return '.docx'
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': return '.xlsx'
    case 'application/acad':
    case 'image/vnd.dwg': return '.dwg'
    case 'application/dxf':
    case 'image/vnd.dxf': return '.dxf'
    default: return '.bin'
  }
}

/**
 * 判断字符串是否为 data URL
 */
export function isDataUrl(value: string): boolean {
  return typeof value === 'string' && value.startsWith('data:')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 核心文件操作
// ═══════════════════════════════════════════════════════════════════════════════

export interface SaveFileOptions {
  fileData: string
  fileName: string
}

export interface SaveFileResult {
  success: boolean
  data?: { fileName: string }
  error?: string
}

export interface ReadFileResult {
  success: boolean
  data?: { dataUrl: string; mimeType: string }
  error?: string
}

export interface DeleteFileResult {
  success: boolean
  error?: string
}

/**
 * 保存文件到磁盘
 * @param category 分类（如 members, invoices）
 * @param subCategory 子分类（如 id-cards, files）
 * @param options 文件数据和原始文件名
 * @returns 存储后的文件名
 */
export function saveFile(
  category: string,
  subCategory: string,
  options: SaveFileOptions,
  projectName?: string | null,
): SaveFileResult {
  try {
    const base64Data = extractBase64Data(options.fileData)
    const buffer = Buffer.from(base64Data, 'base64')
    const storedName = generateStoredFileName(options.fileName)
    const dir = getCategoryDir(category, subCategory, projectName)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const filePath = path.join(dir, storedName)
    if (fs.existsSync(filePath)) {
      return { success: false, error: `文件 "${storedName}" 已存在，请修改文件名后重新上传` }
    }
    fs.writeFileSync(filePath, buffer)

    log.info(`File saved: ${category}/${subCategory}/${storedName} (${buffer.length} bytes)`)
    return { success: true, data: { fileName: storedName } }
  } catch (error: any) {
    log.error(`Failed to save file (${category}/${subCategory}):`, error)
    return { success: false, error: error.message }
  }
}

/**
 * 从磁盘读取文件，返回 data URL
 * @param category 分类
 * @param subCategory 子分类
 * @param fileName 存储的文件名
 * @returns data URL
 */
export function readFile(
  category: string,
  subCategory: string,
  fileName: string,
  projectName?: string | null,
): ReadFileResult {
  try {
    // 三级回退：项目路径 → 未分类/ → 旧版平铺路径
    const prefixesToTry: (string | undefined)[] = []
    if (projectName !== undefined && projectName !== null && projectName !== '') {
      prefixesToTry.push(sanitizeProjectName(projectName))
    }
    prefixesToTry.push('未分类')
    // 旧版平铺路径（无前缀）+ _common 兼容
    prefixesToTry.push('_common')
    prefixesToTry.push(undefined)

    for (const prefix of prefixesToTry) {
      let filePath: string
      if (prefix !== undefined) {
        const key = FOLDER_MAP[category]?.[subCategory]
        const relativePath = key || `${category}/${subCategory}`
        filePath = path.join(getUploadsPath(), prefix, relativePath, fileName)
      } else {
        filePath = path.join(getLegacyFlatDir(category, subCategory), fileName)
      }
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath)
        const ext = path.extname(fileName)
        const mimeType = getMimeType(ext)
        const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
        log.info(`File read: ${filePath}`)
        return { success: true, data: { dataUrl, mimeType } }
      }
    }

    return { success: false, error: '文件不存在' }
  } catch (error: any) {
    log.error(`Failed to read file (${category}/${subCategory}/${fileName}):`, error)
    return { success: false, error: error.message }
  }
}

/**
 * 从磁盘删除文件
 */
export function deleteFile(
  category: string,
  subCategory: string,
  fileName: string,
  projectName?: string | null,
): DeleteFileResult {
  try {
    // 三级回退：项目路径 → 未分类/ → 旧版平铺路径
    const prefixesToTry: (string | undefined)[] = []
    if (projectName !== undefined && projectName !== null && projectName !== '') {
      prefixesToTry.push(sanitizeProjectName(projectName))
    }
    prefixesToTry.push('未分类')
    prefixesToTry.push('_common')
    prefixesToTry.push(undefined)

    for (const prefix of prefixesToTry) {
      let filePath: string
      if (prefix !== undefined) {
        const key = FOLDER_MAP[category]?.[subCategory]
        const relativePath = key || `${category}/${subCategory}`
        filePath = path.join(getUploadsPath(), prefix, relativePath, fileName)
      } else {
        filePath = path.join(getLegacyFlatDir(category, subCategory), fileName)
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        log.info(`File deleted: ${filePath}`)
        return { success: true }
      }
    }
    return { success: true } // 文件不存在也算成功
  } catch (error: any) {
    log.error(`Failed to delete file (${category}/${subCategory}/${fileName}):`, error)
    return { success: false, error: error.message }
  }
}
