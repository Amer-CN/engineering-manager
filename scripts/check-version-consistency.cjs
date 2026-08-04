/**
 * 工程管家 版本一致性检查脚本（只读）
 *
 * 以 package.json 为唯一真源，比对所有版本引用位置，不一致 exit 1。
 * 覆盖清单与 docs/VERSIONING.md「版本号引用位置」保持一致，改动任一方须同步另一方。
 *
 * 用法：
 *   node scripts/check-version-consistency.cjs            # 日常/CI：manifest 允许滞后但不允许超前
 *   node scripts/check-version-consistency.cjs --release  # 发布收尾：manifest.latest 必须严格等于 package.json
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const RELEASE_MODE = process.argv.includes('--release')

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

/** semver 比较：a > b 返回 1，相等 0，a < b 返回 -1 */
function compareSemver(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

const truth = JSON.parse(read('package.json')).version
if (!/^\d+\.\d+\.\d+$/.test(truth)) {
  console.error(`[version-check] FAIL: package.json version 格式非法: ${truth}`)
  process.exit(1)
}

// ═══════════════════════════════════════════════════════════
// 覆盖清单（须与 docs/VERSIONING.md「版本号引用位置」一致）
// ═══════════════════════════════════════════════════════════

const checks = [
  {
    file: 'src/version.ts',
    extract: (c) => (c.match(/APP_VERSION = '([^']+)'/) || [])[1],
    desc: '前端运行时版本常量 APP_VERSION',
  },
  {
    file: 'EngineeringManager.Api/EngineeringManager.Api.csproj',
    extract: (c) => (c.match(/<Version>(.*?)<\/Version>/) || [])[1],
    desc: '后端程序集版本 <Version>',
  },
  {
    file: 'installer/package.json',
    extract: (c) => JSON.parse(c).version,
    desc: '安装器项目版本',
  },
  {
    file: 'installer/src/App.tsx',
    extract: (c) => (c.match(/version="([\d.]+)"/) || [])[1],
    desc: '安装器界面显示版本',
  },
  {
    file: 'src/components/Login.tsx',
    extract: (c) => (c.match(/__APP_VERSION__\s*\|\|\s*'([\d.]+)'/) || [])[1],
    desc: '登录页版本 fallback（人工同步项）',
  },
  // AGENTS.md 抬头版本号（仅前 5 行抬头区域，正文历史标记如「v0.84.0 起」不参与比对）
  {
    file: 'AGENTS.md',
    extract: (c) => (c.split('\n').slice(0, 5).join('\n').match(/v(\d+\.\d+\.\d+)/) || [])[1],
    desc: '根 AGENTS.md 抬头版本',
  },
  {
    file: 'src/components/AGENTS.md',
    extract: (c) => (c.split('\n').slice(0, 5).join('\n').match(/v(\d+\.\d+\.\d+)/) || [])[1],
    desc: '前端组件 AGENTS.md 抬头版本',
  },
]

let failures = 0

for (const { file, extract, desc } of checks) {
  let value
  try {
    value = extract(read(file))
  } catch (e) {
    console.error(`[version-check] FAIL: 无法读取/解析 ${file}（${desc}）: ${e.message}`)
    failures++
    continue
  }
  if (!value) {
    console.error(`[version-check] FAIL: ${file}（${desc}）未匹配到版本号`)
    failures++
  } else if (value !== truth) {
    console.error(`[version-check] FAIL: ${file}（${desc}）= ${value}，与 package.json = ${truth} 不一致`)
    failures++
  }
}

// ═══════════════════════════════════════════════════════════
// update/manifest.json：release 产物，日常允许滞后（发布时才由
// make-manifest.mjs 重新生成），但任何时候不允许超前于 package.json
// ═══════════════════════════════════════════════════════════

try {
  const latest = JSON.parse(read('update/manifest.json')).latest
  if (!latest) {
    console.error('[version-check] FAIL: update/manifest.json 缺少 latest 字段')
    failures++
  } else if (RELEASE_MODE && latest !== truth) {
    console.error(`[version-check] FAIL: update/manifest.json latest = ${latest}，发布模式要求严格等于 package.json = ${truth}（先跑 npm run release:manifest）`)
    failures++
  } else if (!RELEASE_MODE && compareSemver(latest, truth) > 0) {
    console.error(`[version-check] FAIL: update/manifest.json latest = ${latest} 超前于 package.json = ${truth}`)
    failures++
  }
} catch (e) {
  console.error(`[version-check] FAIL: 无法读取/解析 update/manifest.json: ${e.message}`)
  failures++
}

// ═══════════════════════════════════════════════════════════
// CHANGELOG.md：天然含历史版本号，日常允许滞后（CHANGELOG 可能还未更新到当
// 前版本），仅 --release 模式要求最新版本号与 package.json 一致
// ═══════════════════════════════════════════════════════════

try {
  const changelog = read('CHANGELOG.md')
  const changelogLatest = (changelog.match(/^##\s*v?(\d+\.\d+\.\d+)/m) || [])[1]
  if (!changelogLatest) {
    console.error('[version-check] FAIL: CHANGELOG.md 未匹配到版本号')
    failures++
  } else if (RELEASE_MODE && changelogLatest !== truth) {
    console.error(`[version-check] FAIL: CHANGELOG.md 最新版本 = ${changelogLatest}，发布模式要求严格等于 package.json = ${truth}`)
    failures++
  } else if (!RELEASE_MODE && compareSemver(changelogLatest, truth) > 0) {
    console.error(`[version-check] FAIL: CHANGELOG.md 最新版本 = ${changelogLatest} 超前于 package.json = ${truth}`)
    failures++
  }
} catch (e) {
  console.error(`[version-check] FAIL: 无法读取/解析 CHANGELOG.md: ${e.message}`)
  failures++
}

if (failures > 0) {
  console.error(`\n[version-check] ${failures} 处版本引用不一致（真源 package.json = ${truth}）。修复：node scripts/sync-version.mjs，人工项见 docs/VERSIONING.md「版本号引用位置」`)
  process.exit(1)
}

console.log(`[version-check] passed: 全部版本引用与 package.json = ${truth} 一致${RELEASE_MODE ? '（release 严格模式）' : ''}`)
