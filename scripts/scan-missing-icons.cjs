// 一次性扫描：找出使用了但未在 iconMap 注册的图标名（S0-S39 巡检辅助）
const fs = require('fs')
const path = require('path')

const mapSrc = fs.readFileSync('src/utils/iconMap.ts', 'utf8')
const mapMatch = mapSrc.match(/export const iconMap[\s\S]*?\n\}/)
const keys = new Set()
for (const m of mapMatch[0].matchAll(/([A-Za-z][A-Za-z0-9]*)\s*(?::\s*[A-Za-z0-9]+)?(?=,|\n\})/g)) keys.add(m[1])

const used = new Map()
function record(name, p) {
  if (!used.has(name)) used.set(name, new Set())
  used.get(name).add(p.replace(/\\/g, '/'))
}
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    const st = fs.statSync(p)
    if (st.isDirectory()) { if (f !== '__tests__' && f !== 'node_modules') walk(p) }
    else if (/\.(tsx|ts)$/.test(f)) {
      const s = fs.readFileSync(p, 'utf8')
      for (const m of s.matchAll(/<Icon\s+name="([A-Za-z0-9]+)"/g)) record(m[1], p)
      for (const m of s.matchAll(/icon:\s*'([A-Za-z][A-Za-z0-9]*)'/g)) record(m[1], p)
      for (const m of s.matchAll(/icon="([A-Za-z][A-Za-z0-9]*)"/g)) record(m[1], p)
      for (const m of s.matchAll(/emptyIcon="([A-Za-z][A-Za-z0-9]*)"/g)) record(m[1], p)
      for (const m of s.matchAll(/leftIcon="([A-Za-z][A-Za-z0-9]*)"/g)) record(m[1], p)
    }
  }
}
walk('src')
let count = 0
for (const [n, files] of used) {
  if (!keys.has(n)) {
    count++
    console.log(n, '->', [...files].slice(0, 3).join(', '))
  }
}
console.log('missing count:', count)
