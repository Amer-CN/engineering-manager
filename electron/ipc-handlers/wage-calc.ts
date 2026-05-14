import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'
import { db, dbReady, saveDatabase, getUploadsPath } from '../database'

export function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export function calculateActualWage(dailyWage: number, workDays: number, bonus: number, deduction: number): number {
  return Math.round((dailyWage * workDays + bonus - deduction) * 100) / 100
}


export function generateProjectWages(projectId: number, yearMonth: string) {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []; if (!db.attendances) db.attendances = []
  if (!db.workers) db.workers = []; if (!db.projectWorkers) db.projectWorkers = []

  const activePWs = db.projectWorkers.filter((pw: any) => pw.projectId === projectId && pw.status === 'active')

  db.wages = db.wages.filter((w: any) => !(w.projectId === projectId && w.yearMonth === yearMonth))
  const now = new Date().toISOString(); const generated: any[] = []; const daysInMonth = getDaysInMonth(yearMonth)

  for (const pw of activePWs) {
    const worker = db.workers.find((w: any) => w.id === pw.workerId)
    if (!worker) continue

    const attendance = db.attendances.find((a: any) =>
      a.projectWorkerId === pw.id && a.yearMonth === yearMonth
    )
    const dailyWage = worker.dailyWage ?? pw.dailyWage ?? 0
    const workDays = attendance?.workDays ?? daysInMonth
    const actualWage = calculateActualWage(dailyWage, workDays, 0, 0)

    const wageRecord: any = {
      id: Date.now() + generated.length, projectId,
      memberId: undefined, projectWorkerId: pw.id,
      yearMonth,
      dailyWage, workDays,
      bonus: 0, deduction: 0, actualWage,
      createdAt: now, updatedAt: now
    }
    db.wages.push(wageRecord); generated.push(wageRecord)
  }

  saveDatabase()

  return { success: true, data: generated.map((w: any) => {
    let memberName = ''; let teamName = ''
    if (w.projectWorkerId && db.projectWorkers) {
      const pw = db.projectWorkers.find((p: any) => p.id === w.projectWorkerId)
      if (pw && db.workers) {
        const worker = db.workers.find((wk: any) => wk.id === pw.workerId)
        memberName = worker?.name || ''
        const team = db.workerTeams?.find((t: any) => t.id === pw.teamId)
        teamName = team?.name || ''
      }
    }
    const project = db.projects?.find((p: any) => p.id === w.projectId)
    return { ...w, memberName, memberType: 'worker', projectName: project?.name || '', teamName }
  })}
}

// ═══════════════════════════════════════════════════════════════════════════════
// 银行回单PDF解析
// ═══════════════════════════════════════════════════════════════════════════════

export interface BankReceiptItem {
  name: string
  amount: number
  status: string       // "处理成功" | "处理失败" | 原文
  account?: string     // 收款账号（银行卡号），用于精确匹配
}

export interface ParsedBankReceipt {
  date: string          // YYYY-MM-DD
  totalAmount: number
  successAmount: number
  failCount: number
  items: BankReceiptItem[]
  receiptPath: string   // 凭证在uploads内的相对路径
  rawTextSnippet?: string  // 提取文本前500字符（调试用）
}

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

/** 检测文本是否包含中文字符（用于判断PDF是否已成功提取到有效内容） */
function hasCJK(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

/** 执行一个Python命令并返回stdout */
function execPython(scriptPath: string, pdfPath: string): Promise<{text: string; stderr: string}> {
  // Windows常见的python命令形式
  const commands = ['python', 'python3', 'py', 'py -3']

  return new Promise((resolve, reject) => {
    function tryNext(i: number, lastErr: string) {
      if (i >= commands.length) {
        return reject(new Error(`Python不可用 (尝试了${commands.join(', ')})。最后错误: ${lastErr}`))
      }
      const cmd = commands[i]
      exec(`"${cmd}" "${scriptPath}" "${pdfPath}"`, {
        encoding: 'utf-8',
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      }, (err, stdout, stderr) => {
        if (err) {
          const msg = (stderr?.slice(0, 200) || err.message || '')
          return tryNext(i + 1, msg)
        }
        resolve({ text: stdout, stderr })
      })
    }
    tryNext(0, '')
  })
}

// Python脚本：用pypdf提取PDF文本（强制UTF-8输出，解决中文Windows编码乱码问题）
const PYTHON_EXTRACT_SCRIPT = `
import sys, json
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from pypdf import PdfReader
r = PdfReader(sys.argv[1])
lines = []
for p in r.pages:
    t = p.extract_text()
    if t.strip():
        lines.append(t)
print(json.dumps(lines, ensure_ascii=False))
`

/**
 * 解析银行回单PDF文本
 * 兼容工行/农行/建行/农商行/中行等常见格式。
 * 表头含交易日期/总金额/成功金额，明细行含姓名/金额/处理结果。
 */
function parseBankReceiptText(text: string): Omit<ParsedBankReceipt, 'receiptPath'> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // ── 提取日期：支持 交易日期 / 交易时间 / 处理日期 / 申请日期 / 付款日期 ──
  let date = ''
  const dateMatch = text.match(/(?:交易[日时][期间]|处理日期|付款日期|申请日期)[：:]\s*(\d{4})[-\s./](\d{1,2})[-\s./](\d{1,2})/)
  if (dateMatch) {
    const [, y, m, d] = dateMatch
    date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // ── 提取总金额：支持 总金额 / 合计金额，可选 ¥ 前缀 ──
  let totalAmount = 0
  const totalMatch = text.match(/(?:总|合计)金额(?:[（(]元[)）])?[：:]\s*¥?\s*([\d,]+\.?\d*)/)
  if (totalMatch) totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''))

  // ── 提取成功金额：支持可选 ¥ 前缀 ──
  let successAmount = 0
  const successMatch = text.match(/成功金额(?:[（(]元[)）])?[：:]\s*¥?\s*([\d,]+\.?\d*)/)
  if (successMatch) successAmount = parseFloat(successMatch[1].replace(/,/g, ''))

  // ── 提取失败笔数 ──
  let failCount = 0
  const failMatch = text.match(/失败笔数[：:]\s*(\d+)/)
  if (failMatch) failCount = parseInt(failMatch[1], 10)

  // ── 解析明细行：序号 姓名 账号 金额 处理结果 ──
  const items: BankReceiptItem[] = []
  let inTable = false

  for (const line of lines) {
    // 检测表头：包含序号/编号 且含 收款人/户名/姓名（兼容各银行表头命名）
    if (!inTable && /(?:序号|编号)/.test(line) && /(?:收款人|户名|姓名)/.test(line)) {
      inTable = true
      continue
    }
    if (!inTable) continue

    // ── 尝试匹配为新的明细行 ──

    // 标准格式：序号 姓名 账号(10-25位数字) 金额 处理结果
    const fullMatch = line.match(/^(\d{1,3})\s+(\S+)\s+(\d{10,25})\s+([\d,]+\.?\d*)\s+(.+)$/)
    if (fullMatch) {
      items.push({
        name: fullMatch[2].trim(),
        amount: parseFloat(fullMatch[4].replace(/,/g, '')),
        status: fullMatch[5].trim(),
        account: fullMatch[3].trim()
      })
      continue
    }

    // 兼容格式：无账号列  "1 陈翔 3840 处理成功"
    const simpleMatch = line.match(/^(\d{1,3})\s+(\S+)\s+([\d,]+\.?\d*)\s+(.+)$/)
    if (simpleMatch) {
      items.push({
        name: simpleMatch[2].trim(),
        amount: parseFloat(simpleMatch[3].replace(/,/g, '')),
        status: simpleMatch[4].trim()
      })
      continue
    }

    // ── 不匹配新行 → 可能是上一行“处理结果”字段的续行（PDF换行导致） ──
    if (items.length > 0 && line.length > 0) {
      items[items.length - 1].status += line
    }
  }

  return { date, totalAmount, successAmount, failCount, items }
}

/**
 * 解析银行回单PDF：复制到uploads → Python pypdf提取文本 → 解析 → 返回结构化数据
 */
export async function parseBankReceipt(
  sourcePath: string,
  projectName?: string | null,
): Promise<{ success: boolean; data?: ParsedBankReceipt; error?: string }> {
  try {
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: `文件不存在: ${sourcePath}` }
    }

    // 1. 复制文件到 uploads/wages/bank-receipts/
    const ext = path.extname(sourcePath) || '.pdf'
    const storedName = `receipt_${Date.now()}${ext}`
    const targetDir = path.join(getUploadsPath(), projectName ? projectName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').substring(0, 40) : '未分类', '工资', '银行回单')
    fs.mkdirSync(targetDir, { recursive: true })
    const targetPath = path.join(targetDir, storedName)
    fs.copyFileSync(sourcePath, targetPath)
    const receiptPath = path.relative(getUploadsPath(), targetPath)

    // 2. 用Python pypdf提取文本（写临时脚本，支持多命令回退）
    const scriptPath = path.join(path.dirname(targetPath), `_extract_${Date.now()}.py`)
    fs.writeFileSync(scriptPath, PYTHON_EXTRACT_SCRIPT, 'utf-8')

    let fullText = ''
    let stderr = ''
    let extractionError = ''
    try {
      const result = await execPython(scriptPath, sourcePath)
      fullText = result.text
      stderr = result.stderr
    } catch (e: any) {
      extractionError = e.message || String(e)
    } finally {
      fs.unlink(scriptPath, () => {})
    }

    // 如果Python执行失败，返回错误
    if (extractionError) {
      return { success: false, error: `回单解析失败: ${extractionError}` }
    }

    // 3. 解析JSON输出
    let jsonOk = true
    try {
      const pages = JSON.parse(fullText)
      if (Array.isArray(pages)) fullText = pages.join('\n')
    } catch {
      jsonOk = false
    }
    fullText = fullText.trim()

    // 如果 JSON 解析失败，把原始输出暴露给错误
    if (!jsonOk) {
      const snippet = fullText.substring(0, 300).replace(/[\x00-\x1f]/g, ' ')
      return { success: false, error: `回单解析: JSON格式错误, 输出: ${snippet}` }
    }

    // 如果为空，返回详细错误
    if (!fullText) {
      return { success: false, error: `回单解析失败: Python输出为空` + (stderr ? ` (stderr: ${stderr.slice(0,200)})` : '') }
    }

    // ── 内容质量检查：必须包含中文（否则很可能是扫描件或非回单文件） ──
    if (!hasCJK(fullText)) {
      const snippet = fullText.substring(0, 200).replace(/[\x00-\x1f]/g, ' ')
      const hint = fullText.length < 10
        ? '提取结果为空，可能为扫描件（图片），请使用银行网银导出的文字版PDF'
        : `提取到的文本无中文内容: "${snippet}"`
      return {
        success: false,
        error: `回单解析失败: ${hint}`,
        data: {
          date: '', totalAmount: 0, successAmount: 0, failCount: 0,
          items: [], receiptPath,
          rawTextSnippet: fullText.substring(0, 500)
        }
      }
    }

    // 4. 解析结构化数据
    const parsed = parseBankReceiptText(fullText)

    // 提取前500字符用于调试
    const rawTextSnippet = fullText.substring(0, 500)

    return {
      success: true,
      data: { ...parsed, receiptPath, rawTextSnippet }
    }
  } catch (error: any) {
    return { success: false, error: `回单解析失败: ${error.message}` }
  }
}
