// Bedrock slate 收尾 codemod v3（一次性）
// v1 只覆盖 slate 的「安全中间档」，遗留极端档（900 文字 / 400 中灰 / 边框 ring 等）。
// 本脚本补齐【无歧义】的中性映射；【跳过】需上下文判断的：
//   bg-slate-700/800/900（暗色反相面：tooltip/toast/代码块 → 人工配 fg/bg 反相）、
//   from/via/to-slate-*（渐变 / 主题预览色卡 → 人工）、text-slate-100/200（暗底亮字 vs 空态浅图标 → 人工）。
// 排除：*Colors.*、打印模板、测试、mocks。
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const files = execSync('git ls-files "src/**/*.tsx"', { cwd: process.cwd(), encoding: 'utf8' })
  .split('\n').map(s => s.trim()).filter(Boolean)
const EXCLUDE = /(Colors\.|PrintTemplate|printExport|\.test\.|__mocks__)/

// [正则, 替换]；\b 边界 + 保留变体前缀（在匹配串之前）
const RULES = [
  [/\btext-slate-900\b/g, 'text-[color:var(--fg)]'],
  [/\bbg-slate-400\b/g, 'bg-[color:var(--muted)]'],
  [/\bbg-slate-(50|300)\b/g, 'bg-[color:var(--panel-2)]'],
  [/\bborder-slate-50\b/g, 'border-[color:var(--border)]'],
  [/\bborder-slate-(400|500|600)\b/g, 'border-[color:var(--border-strong)]'],
  [/\bring-slate-(200|300|400|500)\b/g, 'ring-[color:var(--border-strong)]'],
  [/\bdivide-slate-(50|100|200)\b/g, 'divide-[color:var(--border)]'],
  [/\bplaceholder-slate-(300|400|500)\b/g, 'placeholder-[color:var(--muted)]'],
]

let changedFiles = 0, totalRepl = 0
for (const f of files) {
  if (EXCLUDE.test(f)) continue
  let src
  try { src = readFileSync(f, 'utf8') } catch { continue }
  let out = src, fileRepl = 0
  for (const [re, to] of RULES) {
    out = out.replace(re, () => { fileRepl++; return to })
  }
  if (out !== src) { writeFileSync(f, out); changedFiles++; totalRepl += fileRepl }
}
console.log(`slate cleanup done: ${changedFiles} files, ${totalRepl} replacements`)
