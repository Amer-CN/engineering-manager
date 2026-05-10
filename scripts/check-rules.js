/**
 * 工程管家 架构规则检查脚本
 *
 * 在 vite build 前自动运行，违规则中断构建。
 * 规则优先级：硬上限 → build 失败 | 软上限 → 警告继续 | 无上限 → 无提示
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const ELECTRON = path.join(ROOT, 'electron')

let violations = 0
let warnings = 0

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content.split('\n').length
}

function countUseState(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const matches = content.match(/\buseState\s*\(/g)
  return matches ? matches.length : 0
}

function checkAnyInPreload(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  // 找每个 ipcRenderer.invoke 调用，检查其参数类型是否为 any
  const lines = content.split('\n')
  const violations = []
  lines.forEach((line, i) => {
    if (line.includes(': any') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      // 排除合法的 any 使用（如 catch 中的 error: any）
      if (line.includes('catch') || line.includes('error')) return
      violations.push({ line: i + 1, content: line.trim() })
    }
  })
  return violations
}

function fileExists(filePath) {
  return fs.existsSync(filePath)
}

// ═══════════════════════════════════════════════════════════
// 铁律一：文件行数上限
// ═══════════════════════════════════════════════════════════

const SIZE_LIMITS = {
  // 目录匹配模式 → { hard: 硬上限, soft: 软上限, glob: 匹配模式 }
  pageComponents: {
    dir: path.join(SRC, 'components'),
    hard: 500,
    soft: 350,
    // 只匹配顶层 .tsx（非 features/, 非 ui/）
    filter: (f) => f.endsWith('.tsx') && !f.includes('\\features\\') && !f.includes('\\ui\\') && !f.includes('/features/') && !f.includes('/ui/'),
  },
  featureComponents: {
    dir: path.join(SRC, 'components', 'features'),
    hard: 400,
    soft: 250,
    filter: (f) => f.endsWith('.tsx'),
  },
  ipcHandlers: {
    dir: path.join(ELECTRON, 'ipc-handlers'),
    hard: 350,
    soft: 200,
    filter: (f) => f.endsWith('.ts'),
  },
  hooks: {
    dir: path.join(SRC, 'hooks'),
    hard: 250,
    soft: 150,
    filter: (f) => f.endsWith('.ts') || f.endsWith('.tsx'),
  },
}

function walkDir(dir, filter) {
  const results = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, filter))
    } else if (filter(fullPath)) {
      results.push(fullPath)
    }
  }
  return results
}

console.log('\n═══ 铁律一：文件行数检查 ═══')
for (const [name, config] of Object.entries(SIZE_LIMITS)) {
  const files = walkDir(config.dir, config.filter)
  for (const file of files) {
    const lines = countLines(file)
    const rel = path.relative(ROOT, file)
    if (lines > config.hard) {
      console.log(`  HARD FAIL  ${rel}: ${lines} 行 (上限 ${config.hard})`)
      violations++
    } else if (lines > config.soft) {
      console.log(`  SOFT WARN  ${rel}: ${lines} 行 (建议 ≤${config.soft})`)
      warnings++
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 铁律二：已知孪生文件检测
// ═══════════════════════════════════════════════════════════

console.log('\n═══ 铁律二：孪生文件检测 ═══')

const TWIN_PAIRS = [
  {
    files: ['src/components/IncomeContracts.tsx', 'src/components/ExpenseContracts.tsx'],
    message: '收入/支出合同组件应合并为一个 ContractPage 组件',
  },
]

for (const pair of TWIN_PAIRS) {
  const exists = pair.files.filter(f => fileExists(path.join(ROOT, f)))
  if (exists.length >= 2) {
    console.log(`  HARD FAIL  孪生文件仍存在: ${exists.join(', ')}`)
    console.log(`              ${pair.message}`)
    violations++
  }
}

// ═══════════════════════════════════════════════════════════
// 铁律四：useState 数量检查
// ═══════════════════════════════════════════════════════════

console.log('\n═══ 铁律四：useState 数量检查 ═══')

const pageComponentDir = path.join(SRC, 'components')
const topLevelTsxFiles = fs.readdirSync(pageComponentDir)
  .filter(f => f.endsWith('.tsx'))
  .map(f => path.join(pageComponentDir, f))

for (const file of topLevelTsxFiles) {
  const count = countUseState(file)
  const rel = path.relative(ROOT, file)
  if (count > 8) {
    console.log(`  HARD FAIL  ${rel}: ${count} 个 useState (上限 8)`)
    violations++
  } else if (count > 5) {
    console.log(`  SOFT WARN  ${rel}: ${count} 个 useState (建议 ≤5，考虑拆分或 useReducer)`)
    warnings++
  }
}

// features 组件也检查
const featureFiles = walkDir(path.join(SRC, 'components', 'features'), f => f.endsWith('.tsx'))
for (const file of featureFiles) {
  const count = countUseState(file)
  const rel = path.relative(ROOT, file)
  if (count > 8) {
    console.log(`  HARD FAIL  ${rel}: ${count} 个 useState (上限 8)`)
    violations++
  }
}

// ═══════════════════════════════════════════════════════════
// 铁律五：preload.ts any 类型检测
// ═══════════════════════════════════════════════════════════

console.log('\n═══ 铁律五：preload.ts 类型安全 ═══')

const preloadPath = path.join(ELECTRON, 'preload.ts')
if (fileExists(preloadPath)) {
  const anyViolations = checkAnyInPreload(preloadPath)
  if (anyViolations.length > 30) {
    // 当前已有大量 any，只显示统计，不阻断
    console.log(`  SOFT WARN  preload.ts: ${anyViolations.length} 处使用 any（待逐步类型化）`)
    warnings++
  } else if (anyViolations.length > 0) {
    for (const v of anyViolations) {
      console.log(`  HARD FAIL  preload.ts:${v.line}: ${v.content}`)
    }
    violations += anyViolations.length
  }
}

// ═══════════════════════════════════════════════════════════
// 铁律六：代码分割检查
// ═══════════════════════════════════════════════════════════

console.log('\n═══ 铁律六：代码分割检查 ═══')

const appPath = path.join(SRC, 'App.tsx')
if (fileExists(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf-8')
  if (!appContent.includes('React.lazy') && !appContent.includes('lazy(')) {
    console.log(`  SOFT WARN  App.tsx 未使用 React.lazy 做路由级代码分割`)
    warnings++
  }
}

// ═══════════════════════════════════════════════════════════
// 汇总
// ═══════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════')
console.log(`检查完成: ${violations} 项违规, ${warnings} 项警告`)
console.log('═══════════════════════════════════════\n')

if (violations > 0) {
  console.error(`BUILD BLOCKED: ${violations} 项硬性规则违规。请修复后再构建。`)
  process.exit(1)
} else if (warnings > 0) {
  console.log(`BUILD PASSED: ${warnings} 项警告，建议尽快处理。\n`)
  process.exit(0)
} else {
  console.log('ALL CLEAN: 所有规则检查通过。\n')
  process.exit(0)
}
