/**
 * 模板管理 IPC 处理器（双写模式）
 */
import { ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import mammoth from 'mammoth'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { db, dbReady, saveDatabase } from '../database'
import { deleteFile, getCategoryDir } from '../file-service'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, templateDrawingQueries } from '../sqlite/queries'

// Auto-detect {{变量}} from a .docx file on disk
async function detectVariables(storedFileName: string): Promise<any[]> {
  try {
    const dir = getCategoryDir('templates', 'files', null)
    const filePath = path.join(dir, storedFileName)
    if (!fs.existsSync(filePath)) return []
    const result = await mammoth.extractRawText({ path: filePath })
    const seen = new Set<string>()
    const vars: any[] = []
    const regex = /\{\{([^{}]+)\}\}/g
    let m
    while ((m = regex.exec(result.value)) !== null) {
      const key = m[1].trim()
      if (key && !seen.has(key)) {
        seen.add(key)
        vars.push({ key, label: key, type: 'text', defaultValue: '', required: false })
      }
    }
    return vars
  } catch (err) {
    console.error('Variable detection failed:', err)
    return []
  }
}

// 获取全部模板（可选 category 过滤）
ipcMain.handle('db:templates:getAll', (_, category?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    const data = templateDrawingQueries.listTemplates(category)
    if (data) return { success: true, data }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.templates) db.templates = []
  let list = db.templates
  if (category) list = list.filter((t: any) => t.category === category)
  return { success: true, data: list.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

// 创建模板
ipcMain.handle('db:templates:create', async (_, template) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.templates) db.templates = []
  try {
    let variables = template.variables || []
    if (template.fileType === 'docx' && template.storedFileName && variables.length === 0) {
      variables = await detectVariables(template.storedFileName)
    }
    const id = Date.now()
    const newTemplate = {
      ...template,
      variables,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.templates.push(newTemplate)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      templateDrawingQueries.createTemplate({ ...newTemplate, variables })
    }

    return { success: true, data: { id, variables } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 更新模板
ipcMain.handle('db:templates:update', async (_, template) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.templates) db.templates = []
  try {
    let variables = template.variables || []
    if (template.fileType === 'docx' && template.storedFileName && variables.length === 0) {
      variables = await detectVariables(template.storedFileName)
    }
    const index = db.templates.findIndex((t: any) => t.id === template.id)
    if (index !== -1) {
      db.templates[index] = { ...db.templates[index], ...template, variables, updatedAt: new Date().toISOString() }
      saveDatabase()

      // SQLite 双写
      if (useSqliteWrite()) {
        templateDrawingQueries.updateTemplate(template.id, { ...template, variables })
      }
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 删除模板（含关联文件）
ipcMain.handle('db:templates:delete', async (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.templates) db.templates = []
  try {
    const template = db.templates.find((t: any) => t.id === id)
    if (template?.storedFileName) {
      try {
        await deleteFile({ category: 'templates', subCategory: 'files', fileName: template.storedFileName, projectName: null })
      } catch (e) { /* 文件可能不存在，忽略 */ }
    }
    db.templates = db.templates.filter((t: any) => t.id !== id)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      templateDrawingQueries.deleteTemplate(id)
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 按分类统计
ipcMain.handle('db:templates:getStats', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    const data = templateDrawingQueries.getTemplateStats()
    if (data) return { success: true, data }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.templates) db.templates = []
  const stats: Record<string, number> = { total: db.templates.length }
  for (const t of db.templates) {
    stats[t.category] = (stats[t.category] || 0) + 1
  }
  return { success: true, data: stats }
})

// 用 mammoth 将 .docx 转为 HTML（供渲染进程预览用，不双写）
ipcMain.handle('templates:convert-docx-to-html', async (_, storedFileName: string, category?: string) => {
  try {
    const dir = getCategoryDir(category || 'templates', 'files', null)
    const filePath = path.join(dir, storedFileName)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '模板文件不存在' }
    }
    const result = await mammoth.convertToHtml({ path: filePath })
    return { success: true, data: result.value }
  } catch (error: any) {
    console.error('mammoth convert failed:', error)
    return { success: false, error: error.message || '文档转换失败' }
  }
})

// 用 docxtemplater 填充 .docx 模板变量，保留全部 Word 格式（文件操作，不双写）
ipcMain.handle('templates:fill-docx', async (_, storedFileName: string, values: Record<string, string>) => {
  try {
    const dir = getCategoryDir('templates', 'files', null)
    const filePath = path.join(dir, storedFileName)
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '模板文件不存在' }
    }

    const buffer = fs.readFileSync(filePath)
    const zip = new PizZip(buffer)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    })

    doc.render(values)

    const output = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
    const base64 = (output as Buffer).toString('base64')
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`

    return { success: true, data: { dataUrl } }
  } catch (error: any) {
    console.error('docxtemplater fill error:', error)
    return { success: false, error: error.message || '模板填充失败' }
  }
})
