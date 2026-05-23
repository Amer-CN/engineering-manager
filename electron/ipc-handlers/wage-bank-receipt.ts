import { db, dbReady, saveDatabase, getUploadsPath } from '../database'
import type { BankReceiptItem, ParsedBankReceipt } from './wage-calc'
import { exec } from 'child_process'

// ============ 辅助函数（从 wage-calc.ts 提取时遗漏的内联定义） ============

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

/** 解析银行回单PDF文本 */
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

    // ── 不匹配新行 → 可能是上一行"处理结果"字段的续行（PDF换行导致） ──
    if (items.length > 0 && line.length > 0) {
      items[items.length - 1].status += line
    }
  }

  return { date, totalAmount, successAmount, failCount, items }
}

// ============ 主函数 ============

/**
 * 解析银行回单PDF：复制到uploads → Python pypdf提取文本 → 解析 → 返回结构化数据。
 * 从 wage-calc.ts 提取，独立维护。
 */
export async function parseBankReceipt(
  sourcePath: string,
  projectName?: string | null,
  yearMonth?: string,
): Promise<{ success: boolean; data?: ParsedBankReceipt; error?: string }> {
  try {
    if (!require('fs').existsSync(sourcePath)) {
      return { success: false, error: `文件不存在: ${sourcePath}` }
    }

    const fs = require('fs')
    const path = require('path')
    const crypto = require('crypto')
    const { app } = require('electron')

    // S4 修复：校验 sourcePath 在允许范围内
    const resolvedSource = path.resolve(sourcePath)
    const uploadsDir = path.resolve(getUploadsPath())
    const tempDir = path.resolve(app.getPath ? app.getPath('temp') : require('os').tmpdir())
    const isAllowed = resolvedSource.startsWith(uploadsDir) || resolvedSource.startsWith(tempDir)
    if (!isAllowed) {
      return { success: false, error: '来源文件路径不合法' }
    }

    // 1. 复制文件到 uploads/wages/bank-receipts/
    const ext = path.extname(sourcePath) || '.pdf'
    const monthLabel = yearMonth
      ? yearMonth.replace('-', '年') + '月'
      : new Date().toISOString().slice(0, 7).replace('-', '年') + '月'
    const fileHash = crypto.createHash('md5').update(fs.readFileSync(sourcePath)).digest('hex').slice(0, 12)
    const storedName = `${monthLabel}_receipt_${fileHash}${ext}`
    const targetDir = path.join(
      getUploadsPath(),
      projectName ? projectName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').substring(0, 40) : '未分类',
      '工资',
      '银行回单'
    )
    fs.mkdirSync(targetDir, { recursive: true })
    const targetPath = path.join(targetDir, storedName)
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath)
    }
    const receiptPath = path.relative(getUploadsPath(), targetPath)

    // 2. 用Python pypdf提取文本
    const scriptPath = path.join(path.dirname(targetPath), `_extract_${Date.now()}.py`)
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

    if (!jsonOk) {
      const snippet = fullText.substring(0, 300).replace(/[\x00-\x1f]/g, ' ')
      return { success: false, error: `回单解析: JSON格式错误, 输出: ${snippet}` }
    }

    if (!fullText) {
      return {
        success: false,
        error: `回单解析失败: Python输出为空` + (stderr ? ` (stderr: ${stderr.slice(0, 200)})` : ''),
      }
    }

    // 内容质量检查
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
          rawTextSnippet: fullText.substring(0, 500),
        } as ParsedBankReceipt,
      }
    }

    // 4. 解析结构化数据
    const parsed = parseBankReceiptText(fullText)
    const rawTextSnippet = fullText.substring(0, 500)

    return {
      success: true,
      data: { ...parsed, receiptPath, rawTextSnippet } as ParsedBankReceipt,
    }
  } catch (error: any) {
    return { success: false, error: `回单解析失败: ${error.message}` }
  }
}
