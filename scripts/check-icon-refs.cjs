/**
 * check-icon-refs.cjs — 图标引用门禁（由 .work/icon-check-all.cjs 转正）
 *
 * 扫描 src/ 全部 .tsx/.ts 的三种图标引用写法：
 *   <Icon name="X" ... /> / icon: "X" / icon: 'X'
 * 与 src/utils/iconMap.ts 的 iconMap 注册表 diff：
 *   任一引用未注册 → 逐行输出 MISSING: 图标名 -> 文件列表，exit 1（npm run check 失败）
 *   0 缺失 → 输出统计，exit 0
 *
 * 与原型一致：跳过 node_modules 与 __tests__（测试文件用 mock 图标名，不要求注册）。
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MAP_PATH = path.join(ROOT, 'src', 'utils', 'iconMap.ts')

const mapSrc = fs.readFileSync(MAP_PATH, 'utf8')
const bodyStart = mapSrc.indexOf('export const iconMap')
const body = mapSrc.slice(bodyStart, mapSrc.indexOf('}', bodyStart))
const registered = new Set(body.match(/[A-Za-z0-9]+/g) || [])

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '__tests__') walk(p, out)
    } else if (/\.(tsx|ts)$/.test(e.name)) {
      out.push(p)
    }
  }
  return out
}

const files = walk(path.join(ROOT, 'src'), [])
const missing = new Map()
let totalRefs = 0

const record = (name, file) => {
  totalRefs++
  if (!registered.has(name)) missing.set(name, (missing.get(name) || []).concat(file))
}

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8')
  for (const m of c.matchAll(/Icon name="([A-Za-z0-9]+)"/g)) record(m[1], f)
  for (const m of c.matchAll(/icon: "([A-Za-z0-9]+)"/g)) record(m[1], f)
  for (const m of c.matchAll(/icon: '([A-Za-z0-9]+)'/g)) record(m[1], f)
}

if (missing.size === 0) {
  console.log(`图标引用检查通过: ${totalRefs} 个引用 / ${registered.size} 个图标全部注册`)
  process.exit(0)
}

for (const [k, v] of missing) {
  console.log(`MISSING: ${k} -> ${[...new Set(v)].join(', ')}`)
}
console.error(`图标引用检查失败: ${missing.size} 个未注册图标（扫描 ${files.length} 个文件 / ${totalRefs} 个引用）。请到 src/utils/iconMap.ts 注册或修正引用。`)
process.exit(1)
