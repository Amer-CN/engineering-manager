// Bedrock 机械 token 迁移 codemod（一次性）
// 只处理【确定安全】的中性映射：slate-* → 语义 token、bg-white → card、border-slate → border。
// 【不碰】彩色（green/red/amber/blue/emerald/orange/purple/violet/sky/indigo/primary）与渐变——那些由人工按语义判断。
// 排除：*Colors.ts、打印模板、测试、mocks、index.css。
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// 用 git 列出 src 下的 tsx（固定命令，无外部输入）
const files = execSync('git ls-files "src/**/*.tsx"', { cwd: process.cwd(), encoding: 'utf8' })
  .split('\n').map(s => s.trim()).filter(Boolean)

const EXCLUDE = /(Colors\.ts|PrintTemplate|printExport|\.test\.|__mocks__|invoicesPrintExportColors)/

// 有序映射：更长/更具体的先匹配，避免 text-slate-700 影响 hover:text-slate-700（子串安全：直接全局替换子串即可，hover: 前缀会一并带上）
const MAP = [
  ['text-slate-800', 'text-[color:var(--fg)]'],
  ['text-slate-700', 'text-[color:var(--fg-2)]'],
  ['text-slate-600', 'text-[color:var(--fg-2)]'],
  ['text-slate-500', 'text-[color:var(--muted)]'],
  ['text-slate-400', 'text-[color:var(--muted)]'],
  ['text-slate-300', 'text-[color:var(--border-strong)]'],
  ['placeholder-slate-400', 'placeholder-[color:var(--muted)]'],
  ['placeholder-slate-300', 'placeholder-[color:var(--muted)]'],
  ['border-slate-100', 'border-[color:var(--border)]'],
  ['border-slate-200', 'border-[color:var(--border)]'],
  ['border-slate-300', 'border-[color:var(--border)]'],
  ['bg-slate-50', 'bg-[color:var(--panel-2)]'],
  ['bg-slate-100', 'bg-[color:var(--panel-2)]'],
  ['bg-slate-200', 'bg-[color:var(--panel-2)]'],
  ['bg-white', 'bg-[color:var(--card)]'],
  ['divide-slate-100', 'divide-[color:var(--border)]'],
  ['divide-slate-200', 'divide-[color:var(--border)]'],
]

let changedFiles = 0, totalRepl = 0
for (const f of files) {
  if (EXCLUDE.test(f)) continue
  let src
  try { src = readFileSync(f, 'utf8') } catch { continue }
  let out = src
  let fileRepl = 0
  for (const [from, to] of MAP) {
    // 只替换出现在 class 字符串上下文里的（简单子串替换即可，这些串不会误伤标识符）
    const parts = out.split(from)
    if (parts.length > 1) { fileRepl += parts.length - 1; out = parts.join(to) }
  }
  if (out !== src) { writeFileSync(f, out); changedFiles++; totalRepl += fileRepl }
}
console.log(`codemod done: ${changedFiles} files, ${totalRepl} replacements`)
