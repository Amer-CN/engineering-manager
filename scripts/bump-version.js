#!/usr/bin/env node
/**
 * bump-version.js — 自动版本号迭代 + 更新日志
 *
 * 用法:
 *   node scripts/bump-version.js patch     → 1.0.0 → 1.0.1 (Bug修复/小优化)
 *   node scripts/bump-version.js minor     → 1.0.1 → 1.1.0 (新功能/模块)
 *   node scripts/bump-version.js major     → 1.1.0 → 2.0.0 (架构级变更)
 *   node scripts/bump-version.js patch --msg "修复了XX问题" → 手动指定变更摘要
 *
 * 自动执行:
 *   1. 读取 package.json 当前版本
 *   2. 按 semver 递增版本号
 *   3. 更新 package.json
 *   4. 更新 src/components/Sidebar.tsx（Logo区版本号）
 *   5. 更新 src/components/Login.tsx（品牌区 + 页脚版本号）
 *   6. 更新 src/components/Settings.tsx（About版本 + 更新日志数组）
 *   7. 更新 CHANGELOG.md（顶部插入新版本条目）
 *   8. 更新 CLAUDE.md（当前版本引用）
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const level = process.argv[2]

// 解析可选 --msg 参数
const msgIdx = process.argv.indexOf('--msg')
const manualMsg = msgIdx > -1 ? process.argv[msgIdx + 1] : null

if (!level || !['patch', 'minor', 'major'].includes(level)) {
  console.error('用法: node scripts/bump-version.js <patch|minor|major> [--msg "变更说明"]')
  console.error('  patch — 修订号递增 (1.0.0 → 1.0.1) Bug修复/小优化')
  console.error('  minor — 次版本递增 (1.0.1 → 1.1.0) 新功能/模块')
  console.error('  major — 主版本递增 (1.1.0 → 2.0.0) 架构级变更')
  process.exit(1)
}

// ── 1. 读取当前版本 ─────────────────────────────────────────
const pkgPath = path.join(ROOT, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const oldVersion = pkg.version
const [major, minor, patch] = oldVersion.split('.').map(Number)

let newVersion
if (level === 'major') {
  newVersion = `${major + 1}.0.0`
} else if (level === 'minor') {
  newVersion = `${major}.${minor + 1}.0`
} else {
  newVersion = `${major}.${minor}.${patch + 1}`
}

console.log(`\n📦 版本迭代: ${pkg.version} → ${newVersion} (${level})\n`)

// ── 2. 更新 package.json ─────────────────────────────────────
pkg.version = newVersion
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
console.log('✅ package.json 已更新')

// ── 3. 更新 Sidebar.tsx（仅 Logo 区版本号） ─────────────────
// Sidebar Logo 区格式: <p className="text-[10px] text-white/60 ...">v1.2.13</p>
const sidebarPath = path.join(ROOT, 'src', 'components', 'Sidebar.tsx')
let sidebar = fs.readFileSync(sidebarPath, 'utf-8')
const sidebarOld = sidebar
sidebar = sidebar.replace(
  /(text-white\/60[^>]*>)\s*v[\d.]+\s*(<\/p>)/,
  `$1v${newVersion}$2`
)
if (sidebar === sidebarOld) {
  // 回退：兼容任何包含版本号的 p 标签
  sidebar = sidebar.replace(/>v[\d.]+<\/p>/, `>v${newVersion}</p>`)
}
fs.writeFileSync(sidebarPath, sidebar, 'utf-8')
console.log('✅ Sidebar.tsx 版本显示已更新')

// ── 4. 更新 Login.tsx（品牌区 + 页脚两处版本号） ────────────
const loginPath = path.join(ROOT, 'src', 'components', 'Login.tsx')
let login = fs.readFileSync(loginPath, 'utf-8')
const loginOld = login
// 品牌区: 工程项目管理系统 v1.2.13</motion.p>
login = login.replace(
  /(工程项目管理系统\s+)v[\d.]+(<\/motion\.p>)/,
  `$1v${newVersion}$2`
)
// 页脚: v1.2.13 - 工程管理系统
login = login.replace(
  />v[\d.]+ - 工程管理系统</,
  `>v${newVersion} - 工程管理系统<`
)
if (login === loginOld) {
  // 回退：逐行替换所有 vX.Y.Z
  login = login.replace(/v[\d.]+/g, `v${newVersion}`)
  console.warn('⚠️  Login.tsx 使用回退替换（全局 vX.Y.Z），请检查上下文')
}
fs.writeFileSync(loginPath, login, 'utf-8')
console.log('✅ Login.tsx 版本显示已更新')

// ── 5. 提取变更摘要 ─────────────────────────────────────────
// 优先级: --msg 参数 > CLAUDE.md 最新"本次/当前会话"摘要 > 占位符
let changeItems = ['（请手动填写变更内容）']
let sourceLabel = '（请手动填写）'

if (manualMsg) {
  changeItems = manualMsg.split('；').filter(Boolean).map(s => s.trim())
  if (changeItems.length === 0) changeItems = [manualMsg.trim()]
  sourceLabel = '（--msg 手动指定）'
} else {
  try {
    const claudeMdContent = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf-8')
    let bullets = []

    // 方式一：匹配旧格式 "### YYYY-MM-DD（...本次/本会话）..."
    const oldSectionRegex = /### (\d{4}-\d{2}-\d{2})（[^）]*?(?:本次|本)会话[^）]*）\s*\n([\s\S]*?)(?=\n### |\n---|$)/g
    const oldMatches = [...claudeMdContent.matchAll(oldSectionRegex)]
    if (oldMatches.length > 0) {
      bullets = oldMatches[0][2]
        .split('\n')
        .filter(l => /^\s*- (?!- )/.test(l))
        .map(l => l.replace(/^\s*-\s*/, '').trim())
        .filter(l => l.length > 0)
    }

    // 方式二：匹配新格式 "## 📋 本次会话"（压缩后的 CLAUDE.md）
    if (bullets.length === 0) {
      const sectionStart = claudeMdContent.indexOf('\n## 📋 本次会话')
      if (sectionStart !== -1) {
        const contentStart = claudeMdContent.indexOf('\n', sectionStart + 1) + 1
        // 找到下一个 ## 或 --- 作为结束标记
        let contentEnd = claudeMdContent.indexOf('\n## ', contentStart)
        if (contentEnd === -1) contentEnd = claudeMdContent.indexOf('\n---', contentStart)
        if (contentEnd === -1) contentEnd = claudeMdContent.length
        const sectionContent = claudeMdContent.slice(contentStart, contentEnd)
        bullets = sectionContent
          .split('\n')
          .filter(l => /^\s*- (?!- )/.test(l) && !l.includes('<!--'))
          .map(l => l.replace(/^\s*-\s*/, '').trim())
          .filter(l => l.length > 0 && !l.startsWith('（本次会话暂无变更记录）') && !l.startsWith('bump-version.js'))
      }
    }

    if (bullets.length > 0) {
      // 去重：仅检查新版本条目是否已存在于 CHANGELOG（防止重复运行时追加相同内容）
      const changelogPath = path.join(ROOT, 'CHANGELOG.md')
      const existingChangelog = fs.readFileSync(changelogPath, 'utf-8')
      // 精确匹配新版本条目（如 "## [1.2.17]"），而非最新条目
      const thisVersionRegex = new RegExp(`## \\[${newVersion.replace(/\./g, '\\.')}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`)
      const thisVersionMatch = existingChangelog.match(thisVersionRegex)
      if (thisVersionMatch) {
        // 新版本条目已存在（重复运行），去重
        const existingItems = (thisVersionMatch[1].match(/^- .+/gm) || [])
          .map(l => l.replace(/^- /, '').trim())
        const newItems = bullets.filter(b => !existingItems.includes(b))
        if (newItems.length === 0) {
          console.warn('⚠️  所有提取项已存在于该版本 CHANGELOG 条目中，使用占位符')
          changeItems = ['（请手动填写变更内容）']
        } else if (newItems.length < bullets.length) {
          console.warn(`⚠️  ${bullets.length - newItems.length} 项已存在于该版本 CHANGELOG，使用 ${newItems.length} 新项`)
          changeItems = newItems
        } else {
          changeItems = bullets
        }
      } else {
        // 新版本条目不存在，全部采用
        changeItems = bullets
      }
      sourceLabel = changeItems[0] === '（请手动填写变更内容）' ? '（请手动填写）' : '（自动填充 CLAUDE.md 摘要）'
    }
  } catch (e) {
    console.warn('⚠️  无法从 CLAUDE.md 提取摘要:', e.message)
  }
}

// 为 Settings.tsx 使用：剥离 markdown **bold** 标记
const stripMarkdown = (text) => text.replace(/\*\*/g, '')

// ── 6. 更新 Settings.tsx ─────────────────────────────────────
const settingsPath = path.join(ROOT, 'src', 'components', 'Settings.tsx')
let settings = fs.readFileSync(settingsPath, 'utf-8')
const settingsOld = settings

// 6a. 更新 About 区版本: "Version 1.2.13"
settings = settings.replace(
  /(Version\s+)\d+\.\d+\.\d+/g,
  `$1${newVersion}`
)
if (settings === settingsOld) {
  console.warn('⚠️  Settings.tsx 未找到 Version X.Y.Z 模式')
}

// 6b. 在更新日志数组中插入新条目
const todayStr = new Date().toISOString().split('T')[0]
const itemsStr = changeItems
  .map(i => `'${stripMarkdown(i).replace(/'/g, "\\'")}'`)
  .join(', ')
const newEntry = `{ v: 'v${newVersion}', date: '${todayStr}', items: [${itemsStr}] }`
const arrayOpenIdx = settings.indexOf('{[', settings.indexOf("showChangelog &&"))

if (arrayOpenIdx > -1) {
  // 找到数组内第一个 { v: 'v 条目的位置
  const firstEntryIdx = settings.indexOf("{ v: 'v", arrayOpenIdx)
  if (firstEntryIdx > -1) {
    // 获取该行的前导空白，复用缩进
    const lineStart = settings.lastIndexOf('\n', firstEntryIdx) + 1
    const indent = settings.slice(lineStart, firstEntryIdx)
    const formattedEntry = indent + newEntry + ',\n'
    settings = settings.slice(0, firstEntryIdx) + formattedEntry + settings.slice(firstEntryIdx)
  } else {
    // 数组为空，在 {[ 之后插入
    const insertPos = settings.indexOf('\n', arrayOpenIdx) + 1
    settings = settings.slice(0, insertPos) + '                  ' + newEntry + ',\n' + settings.slice(insertPos)
  }
}
fs.writeFileSync(settingsPath, settings, 'utf-8')
console.log('✅ Settings.tsx 版本显示 + 更新日志已更新' + (changeItems.length > 1 || changeItems[0].indexOf('请手动') === -1 ? ` ${sourceLabel}` : '（请手动填写变更内容）'))

// ── 7. 更新 CHANGELOG.md ─────────────────────────────────────
const changelogPath = path.join(ROOT, 'CHANGELOG.md')
const today = new Date().toISOString().split('T')[0]
const levelEmoji = { major: '🚀 主版本', minor: '✨ 次版本', patch: '🔧 修订' }[level]
const levelLabel = { major: '主版本', minor: '次版本', patch: '修订' }[level]

// 构建 CHANGELOG 条目 — 提供分类占位结构
const changelogItems = changeItems.map(item => `- ${stripMarkdown(item)}`).join('\n')
const placeholder = changeItems[0] === '（请手动填写变更内容）'
  ? '\n> ⚠️ 请手动填写此版本的变更内容\n'
  : ''

const newChangelogEntry = `## [${newVersion}] — ${today}

### ${levelEmoji}
${placeholder}${changelogItems}
`

let changelog = fs.readFileSync(changelogPath, 'utf-8')
const firstHeader = changelog.indexOf('\n## [')
// 标题行之后的第一个 ## [
const titleEnd = changelog.indexOf('\n---\n')
const insertAfter = titleEnd > -1
  ? changelog.indexOf('\n', titleEnd + 5) + 1  // --- 后的空行
  : firstHeader

if (insertAfter > 0) {
  changelog = changelog.slice(0, insertAfter) + '\n' + newChangelogEntry + '\n---\n\n' + changelog.slice(insertAfter).replace(/^\n+/, '')
} else if (firstHeader > -1) {
  changelog = changelog.slice(0, firstHeader) + newChangelogEntry + '\n---\n\n' + changelog.slice(firstHeader)
} else {
  changelog = changelog + '\n' + newChangelogEntry
}
fs.writeFileSync(changelogPath, changelog, 'utf-8')
console.log('✅ CHANGELOG.md 已更新' + (changeItems.length > 1 || changeItems[0].indexOf('请手动') === -1 ? ` ${sourceLabel}` : '（请手动填写变更内容）'))

// ── 8. 更新 CLAUDE.md 版本引用 ──────────────────────────────
const claudeMdPath = path.join(ROOT, 'CLAUDE.md')
let claudeMd = fs.readFileSync(claudeMdPath, 'utf-8')

// 8a. "当前版本：v1.2.13" — 仅替换这一处
claudeMd = claudeMd.replace(
  /当前版本：v\d+\.\d+\.\d+/,
  `当前版本：v${newVersion}`
)

// 8b. 版本范围如 "1.0.0 → 1.2.13" — 更新末尾版本号
claudeMd = claudeMd.replace(
  /\d+\.\d+\.\d+ → \d+\.\d+\.\d+/g,
  (match) => match.replace(/\d+\.\d+\.\d+$/, newVersion)
)

fs.writeFileSync(claudeMdPath, claudeMd, 'utf-8')
console.log('✅ CLAUDE.md 版本引用已更新')

console.log(`\n🚀 版本 ${newVersion} 就绪！\n`)
