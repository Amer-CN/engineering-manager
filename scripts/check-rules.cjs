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
    if (rel.includes('carousel-demo')) continue // 参考项目复刻演示页，不参与行数门禁
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
  // 历史孪生已合并：IncomeContracts + ExpenseContracts → ContractPage（2026-07 清理）
  // 未来发现新的孪生文件时在此追加
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
// 铁律七：样式系统防复发检查（新增 — 2026-06-10 治理）
// ═══════════════════════════════════════════════════════════

console.log('\n═══ 铁律七：样式系统防复发 ═══')

function walkTsxFiles(dir, filter) {
  const results = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkTsxFiles(fullPath, filter))
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      if (!filter || filter(fullPath)) results.push(fullPath)
    }
  }
  return results
}

// 规则 1：禁止硬编码 hex 颜色（排除 index.css 变量定义、测试文件、prototype HTML）
const hexColorRegex = /#[0-9a-fA-F]{6}/g
const noHexColorFiles = walkTsxFiles(SRC, f =>
  !f.includes('__tests__') && !f.includes('node_modules') && !f.includes('prototype') && !f.endsWith('.html') && !f.endsWith('Colors.ts'))
let hexWarnings = 0
for (const file of noHexColorFiles) {
  const content = fs.readFileSync(file, 'utf-8')
  const matches = content.match(hexColorRegex)
  if (matches) {
    // 排除 index.css 中的 CSS 变量定义和主题颜色
    const effective = matches.length
    if (effective > 0) {
      const rel = path.relative(ROOT, file)
      console.log(`  SOFT WARN  ${rel}: ${effective} 处硬编码 hex 颜色`)
      hexWarnings += effective
      warnings++
    }
  }
}
if (hexWarnings > 0) {
  console.log(`  共 ${hexWarnings} 处硬编码颜色，建议迁移到 Tailwind 主题色或 CSS 变量`)
}

// 规则 2：禁止 gray- 色系（排除 index.css 主题定义）
function checkGrayInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const violations = []
  lines.forEach((line, i) => {
    if (/\bgray-\d/.test(line) && !line.trim().startsWith('/*') && !line.trim().startsWith('//')) {
      violations.push({ line: i + 1, content: line.trim() })
    }
  })
  return violations
}
const grayCheckFiles = walkTsxFiles(SRC, f => !f.includes('__tests__') && !f.includes('node_modules'))
let grayViolations = 0
for (const file of grayCheckFiles) {
  const v = checkGrayInFile(file)
  if (v.length > 0) {
    const rel = path.relative(ROOT, file)
    console.log(`  HARD FAIL  ${rel}: ${v.length} 处 gray-* 使用，请改为 slate-*`)
    grayViolations += v.length
  }
}
if (grayViolations > 0) {
  console.log(`  共 ${grayViolations} 处 gray-* 违规，必须改为 slate-*`)
  violations += grayViolations
}

// 规则 3：禁止 text-[Npx] 任意字号（已有 text-caption/text-micro 替代）
const arbitraryTextPattern = /text-\[\d+(\.\d+)?px\]/g
const textCheckFiles = walkTsxFiles(SRC, f => !f.includes('__tests__') && !f.includes('node_modules'))
let textViolations = 0
for (const file of textCheckFiles) {
  const content = fs.readFileSync(file, 'utf-8')
  const matches = content.match(arbitraryTextPattern)
  if (matches) {
    const rel = path.relative(ROOT, file)
    if (rel.includes('carousel-demo')) continue // 参考项目复刻演示页，不参与字号门禁
    console.log(`  HARD FAIL  ${rel}: ${matches.length} 处任意字号 (${matches.join(', ')})，请用 text-caption 或 text-micro`)
    textViolations += matches.length
  }
}
if (textViolations > 0) {
  violations += textViolations
}

console.log(`  硬编码 hex: ${hexWarnings} (warn), gray-*: ${grayViolations}, 任意字号: ${textViolations}`)

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

// ═══════════════════════════════════════════════════════
// 铁律：Modal 使用白名单棘轮（写表单必须用 Drawer）
// M-S15 已完成"20 个写表单 Modal 归零"；交互契约：写操作表单→Drawer，
// 浏览/预览/确认/选择器→居中 Modal。下列白名单为审查通过的合法 Modal
// 使用文件（含 ui 库自身），新文件使用 Modal 即 HARD FAIL——写表单请用
// ui/Drawer；确属浏览/预览类新场景，经 review 后在此登记。
// ═══════════════════════════════════════════════════════

const MODAL_ALLOWED_FILES = new Set([
  'src/components/AuditDetailModal.tsx',
  'src/components/features/agent/AgentSearch.tsx',
  'src/components/features/costLedger/CategoryManager.tsx',
  'src/components/features/costLedger/CostLedgerCompareModal.tsx',
  'src/components/features/contracts/ContractDetailModal.tsx',
  'src/components/features/invoices/FilePreviewModal.tsx',
  'src/components/features/labor/TeamWageModal.tsx',
  'src/components/features/labor/WorkerWageHistoryModal.tsx',
  'src/components/features/labor/WorkerWageModal.tsx',
  'src/components/features/members/MemberDetail.tsx',
  'src/components/features/members/MemberDetailParts.tsx',
  'src/components/features/members/TeamWorkerModal.tsx',
  'src/components/features/settings/SettingsChangelog.tsx',
  'src/components/features/settlement/SettlementProjectDetail.tsx',
  'src/components/features/templates/TemplatePreview.tsx',
  'src/components/features/templates/TemplateSelectorModal.tsx',
  'src/components/features/users/ProjectAuthorizationsTab.tsx',
  'src/components/ui/ConfirmDialog/ConfirmDialog.tsx',
])

console.log('\n═══ 铁律：Modal 白名单棘轮（写表单必须用 Drawer） ═══')
{
  const modalViolationsBefore = violations
  const allFiles = walkDir(path.join(SRC, 'components'), (f) => f.endsWith('.tsx') || f.endsWith('.ts'))
  for (const f of allFiles) {
    const relPath = path.relative(ROOT, f).replace(/\\/g, '/')
    if (relPath.includes('__tests__')) continue
    const content = fs.readFileSync(f, 'utf-8')
    const usesModal = /from\s+['"][^'"]*ui\/Modal['"]|<Modal[\s>]/.test(content)
    if (usesModal && !MODAL_ALLOWED_FILES.has(relPath)) {
      console.log(`  HARD FAIL  ${relPath}: 使用 Modal 但不在白名单。写操作表单必须用 ui/Drawer（S17 交互契约）；确属浏览/预览类场景经 review 后登记到 check-rules.cjs 的 MODAL_ALLOWED_FILES`)
      violations++
    }
  }
  // 白名单里已不再使用 Modal 的文件 → 提示收紧
  for (const relPath of MODAL_ALLOWED_FILES) {
    const abs = path.join(ROOT, relPath)
    if (!fs.existsSync(abs)) {
      console.log(`  SOFT WARN  ${relPath}: 白名单文件已删除，建议从 MODAL_ALLOWED_FILES 移除`)
      warnings++
      continue
    }
    const content = fs.readFileSync(abs, 'utf-8')
    if (!/from\s+['"][^'"]*ui\/Modal['"]|<Modal[\s>]/.test(content)) {
      console.log(`  SOFT WARN  ${relPath}: 已不再使用 Modal，建议从 MODAL_ALLOWED_FILES 移除收紧白名单`)
      warnings++
    }
  }
  if (violations === modalViolationsBefore) console.log('  OK  无白名单外的 Modal 使用')
}

// ═══════════════════════════════════════════════════════
// 铁律：辉光白名单（决策 2 · DESIGN.md § Stage Surfaces）
// 环境辉光抽象为单一 <AmbientGlow /> 组件（决策 2 明确要求“抽成单一
// <AmbientGlow />”），只允许出现在启动屏 / 登录锁屏 / AI 助手主页三处。
// 本规则针对 AmbientGlow 组件的 import/使用，不 police 普通 gradient/blur
// 工具类（那会与 HeroBanner 等大量既有合法用法冲突，且非本轮范围）。
// 当前仓库 0 处 AmbientGlow 引用 —— 前瞻式约束，AmbientGlow.tsx 落地后自动生效。
// ═══════════════════════════════════════════════════════

const AMBIENT_GLOW_ALLOWED_FILES = new Set([
  'src/components/SplashScreen.tsx',
  'src/components/Login.tsx',
  'src/components/LockScreen.tsx',
  'src/components/features/agent/AgentDashboard.tsx', // AI 助手主页（App.tsx 的 Dashboard 路由）
  'src/components/features/agent/AgentWelcome.tsx',   // AI 助手空态问候区
  'src/components/ui/AmbientGlow.tsx',                // 组件自身（下一轮落地）
])

console.log('\n═══ 铁律：辉光白名单（AmbientGlow 仅限启动/登录锁屏/AI主页） ═══')
{
  const before = violations
  const glowRe = /<AmbientGlow[\s/>]|from\s+['"][^'"]*AmbientGlow['"]/
  const glowFiles = walkTsxFiles(SRC, (f) => !f.includes('__tests__'))
  for (const f of glowFiles) {
    const relPath = path.relative(ROOT, f).replace(/\\/g, '/')
    const content = fs.readFileSync(f, 'utf-8')
    if (glowRe.test(content) && !AMBIENT_GLOW_ALLOWED_FILES.has(relPath)) {
      console.log(`  HARD FAIL  ${relPath}: 使用 AmbientGlow 但不在白名单。Ambient-Glow Whitelist 仅允许 SplashScreen / Login·LockScreen / AI 助手主页（DESIGN.md § Stage Surfaces · 决策 2）`)
      violations++
    }
  }
  if (violations === before) console.log('  OK  无白名单外的 AmbientGlow 使用')
}

// ═══════════════════════════════════════════════════════
// 铁律：辉光旁路软警告（决策 2 补充 —— 堵“手写 radial-gradient 绕过 <AmbientGlow />”）
// 非辉光白名单文件里出现“大半径 radial-gradient（尺寸 > 100%）”往往是手写环境辉光，
// 绕过组件收敛。此处仅 SOFT WARN 提示人工复审，不 HARD FAIL（避免误伤合法小半径渐变）。
// ═══════════════════════════════════════════════════════

console.log('\n═══ 铁律：辉光旁路软警告（radial-gradient 尺寸 > 100%） ═══')
{
  const rgFiles = walkDir(SRC, (f) =>
    (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.css')) && !f.includes('__tests__'))
  let rgWarn = 0
  for (const f of rgFiles) {
    const relPath = path.relative(ROOT, f).replace(/\\/g, '/')
    // Stage-Surface 授权舞台区豁免：聚焦卡左上角光源渐变是契约授权材质（DESIGN.md § Stage
    // Surfaces），非环境辉光旁路；不豁免会永久挂假阳性，每次审计都要重新排除。
    if (AMBIENT_GLOW_ALLOWED_FILES.has(relPath) || isStageSurface(relPath)) continue
    const content = fs.readFileSync(f, 'utf-8')
    const re = /radial-gradient\(([^,]*)/gi
    let m
    while ((m = re.exec(content)) !== null) {
      // 只看尺寸段（“at” 之前），避免把位置百分比（at X% Y%）误判为半径
      const sizePart = m[1].split(/\bat\b/i)[0]
      const pcts = sizePart.match(/(\d+(?:\.\d+)?)%/g) || []
      if (pcts.some((p) => parseFloat(p) > 100)) {
        console.log(`  SOFT WARN  ${relPath}: radial-gradient 尺寸 > 100%，疑似手写环境辉光 —— 请复审是否应收敛进 <AmbientGlow />（DESIGN.md § Stage Surfaces · 决策 2）`)
        rgWarn++
        warnings++
        break
      }
    }
  }
  if (rgWarn === 0) console.log('  OK  无大半径 radial-gradient 旁路')
}

// ═══════════════════════════════════════════════════════
// 铁律：玻璃 / 3D 白名单（决策 3 + Stage-Surface · DESIGN.md § Stage Surfaces）
// backdrop-filter / backdrop-blur / 3D transform（perspective/transform-style/
// rotateY/preserve-3d）只允许出现在六类浮层 + Stage-Surface 授权舞台区 +
// CSS 变量定义源。其余位置出现即报错，错误信息直指条款名。
// 存量说明：现存 backdrop-blur 均为 Modal/Dialog/Toast 浮层（决策 3 允许），
// 已逐一登记；Card.tsx 为 glass-capable UI 原语（opt-in glass 变体），本轮不
// 重构业务组件，先登记待审——若有消费方对内容/KPI 卡用 <Card glass> 即
// 违反决策 3，下一轮清理。3D transform 当前仅授权舞台区（FolderStack3D 已下线，GlassCarousel 保留）。
// ═══════════════════════════════════════════════════════

const GLASS_3D_ALLOWED_FILES = new Set([
  // —— CSS 变量 / 主题定义源 ——
  'src/index.css',
  'src/styles/theme-verdant.css',
  // —— 六类浮层：CommandPalette ——
  'src/components/CommandPalette.tsx',
  // —— 六类浮层：Modal / Dialog 原语 + 现存 Modal 浮层 ——
  'src/components/ui/Modal/Modal.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/features/hr/SalaryHistoryModal.tsx',
  'src/components/features/hr/BatchDeptAssignModal.tsx',
  'src/components/features/hr/StaffFormModal.tsx',
  'src/components/features/hr/DepartmentManager.tsx',
  'src/components/features/members/WorkerImportModal.tsx',
  'src/components/features/members/WorkerPickerModal.tsx',
  'src/components/features/projects/ProjectForm.tsx',
  'src/components/features/contracts/ContractPreviewModal.tsx',
  'src/components/features/wages/AttendanceImportModal.tsx',
  'src/components/features/wages/FileImportDialog.tsx',
  'src/components/features/costLedger/CostLedgerImportModal.tsx',
  'src/components/features/templates/TemplateGenerate.tsx',
  'src/components/features/settlement/SettlementImportModal.tsx',
  // —— 六类浮层：Toast ——
  'src/components/ui/Toast/ToastProvider.tsx',
  'src/components/ui/OCRRecognitionFeedback.tsx',
  // —— 六类浮层：Popover / 下拉 ——
  'src/components/ui/DropdownMenu/DropdownMenu.tsx',
  // —— 六类浮层：Sidebar 飞出层 ——
  'src/components/Sidebar.tsx',
])

// Stage-Surface 授权舞台区（目录前缀）：GlassCarousel（知识库首页 3D 玻璃文件夹轮播，
// DESIGN.md § Stage Surfaces 增补条目 2026-08-06；旧 FolderStack3D 已于 M4 下线）
function isStageSurface(relPath) {
  return relPath.startsWith('src/components/features/knowledge/glass/')
    || relPath.startsWith('src/components/features/carousel-demo/') // 参考项目复刻演示页
}

console.log('\n═══ 铁律：玻璃 / 3D 白名单（决策 3 + Stage-Surface） ═══')
{
  const before = violations
  const glassRe = /backdrop-filter|backdrop-blur|perspective\(|transform-style|rotateY|preserve-3d/
  const glassFiles = walkDir(SRC, (f) =>
    (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.css')) && !f.includes('__tests__'))
  for (const f of glassFiles) {
    const relPath = path.relative(ROOT, f).replace(/\\/g, '/')
    if (isStageSurface(relPath) || GLASS_3D_ALLOWED_FILES.has(relPath)) continue
    const content = fs.readFileSync(f, 'utf-8')
    if (glassRe.test(content)) {
      console.log(`  HARD FAIL  ${relPath}: Glass Whitelist violation: backdrop-filter/3D transform 只允许用于浮层与 Stage-Surface 授权区（DESIGN.md § Stage Surfaces）`)
      violations++
    }
  }
  if (violations === before) console.log('  OK  无白名单外的玻璃 / 3D 使用')
}

// ═══════════════════════════════════════════════════════
// 汇总
// ═══════════════════════════════════════════════════════

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
