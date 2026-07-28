// Bedrock 语义色 codemod v2（一次性）
// 只处理【确定安全】的状态色 → 语义色阶 保色阶互换：
//   green/emerald/lime → success，red/rose → danger，amber/yellow → warning
// 依据：DESIGN.md「真正的彩色（绿/琥珀/红）只用于语义状态」；且 tailwind.config 的
//   success/warning/danger 色阶已 var 绑定（--color-*-50..900，主题感知），与 Tailwind 原色阶同档，
//   故 bg-emerald-50 → bg-success-50 语义与明暗都对齐，三主题自动切换。
// 与既有约定一致：收入=success（绿）、支出=danger（红）已在 costLedger DIRECTION_CONFIG 落地。
// 【不碰】：blue/indigo/purple/cyan/violet/sky/pink/gray/info（Bedrock 无这些色 → 人工判 accent/muted/panel）、
//   orange（劳务品牌色 vs warning 歧义 → 人工）、渐变（需扁平中性 → 人工）。
// 排除：*Colors.*、打印模板、测试、mocks（图表调色板/测试断言合法）。
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const files = execSync('git ls-files "src/**/*.tsx"', { cwd: process.cwd(), encoding: 'utf8' })
  .split('\n').map(s => s.trim()).filter(Boolean)

const EXCLUDE = /(Colors\.|PrintTemplate|printExport|\.test\.|__mocks__)/

// 色名 → 语义名
const HUE = { green: 'success', emerald: 'success', lime: 'success', red: 'danger', rose: 'danger', amber: 'warning', yellow: 'warning' }
const PREFIX = 'bg|text|border|ring|divide|from|via|to|fill|stroke|decoration|outline|placeholder|caret|ring-offset|shadow'
// 匹配 (可选变体前缀已在 prefix 前，靠 \b 保留) prefix-hue-shade（shade 两三位数字），保留 /opacity 后缀
const RE = new RegExp(`\\b(${PREFIX})-(green|emerald|lime|red|rose|amber|yellow)-(\\d{2,3})\\b`, 'g')

let changedFiles = 0, totalRepl = 0
for (const f of files) {
  if (EXCLUDE.test(f)) continue
  let src
  try { src = readFileSync(f, 'utf8') } catch { continue }
  let fileRepl = 0
  const out = src.replace(RE, (_m, pre, hue, shade) => { fileRepl++; return `${pre}-${HUE[hue]}-${shade}` })
  if (out !== src) { writeFileSync(f, out); changedFiles++; totalRepl += fileRepl }
}
console.log(`color codemod done: ${changedFiles} files, ${totalRepl} replacements`)
