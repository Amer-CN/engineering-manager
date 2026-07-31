// 一次性审计脚本：后端端点 vs 前端调用面 vs UI 入口（孤儿功能彻查）
// L1: 后端端点在前端(src/**)无任何路径引用 → 完全孤儿
// L2: tauri-bridge/api-client 封装了方法但无组件调用 → 服务层孤儿
// 只读扫描，不改任何代码。
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const EP_DIR = path.join(ROOT, 'EngineeringManager.Api', 'Endpoints')
const SRC = path.join(ROOT, 'src')

// ── 1. 提取后端端点 ──
const endpoints = [] // { method, route, file }
for (const f of fs.readdirSync(EP_DIR).filter(x => x.endsWith('.cs'))) {
  const src = fs.readFileSync(path.join(EP_DIR, f), 'utf8')
  const re = /Map(Get|Post|Put|Delete|Patch)\s*\(\s*"([^"]+)"/g
  let m
  while ((m = re.exec(src)) !== null) endpoints.push({ method: m[1].toUpperCase(), route: m[2], file: f })
}

// ── 2. 收集前端全部源码文本（含 __tests__ 排除，测试引用不算入口） ──
let frontendBlob = ''
const bridgeFiles = []
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p); continue }
    if (!/\.(ts|tsx)$/.test(e.name)) continue
    const txt = fs.readFileSync(p, 'utf8')
    frontendBlob += '\n' + txt
    if (/services[\\/](tauri-bridge|api-client|agent-client)\.ts$/.test(p)) bridgeFiles.push({ p, txt })
  }
}
walk(SRC)

// ── 3. L1: 路由匹配（把 {param} 段变成通配；前端模板串 ${...} 也归一成通配） ──
// 前端路径归一：全文抓任意位置的 /api/... 片段（含 `${API_BASE}/api/...` 模板串），${x} → *
const feathPaths = new Set()
for (const m of frontendBlob.matchAll(/\/api\/[A-Za-z0-9\-_/${}.]+/g)) {
  feathPaths.add(m[0].replace(/\$\{[^}]*\}/g, '*').replace(/[/.]+$/, ''))
}
function routeToPattern(route) {
  // 后端 {id} / {id:int} → *
  return route.replace(/\{[^}]+\}/g, '*')
}
function frontendHits(route) {
  const pat = routeToPattern(route)
  for (const fp of feathPaths) {
    if (fp === pat) return true
    // 前端通配段与后端通配段互配：把两边都按段比对，* 匹配任意段
    const a = pat.split('/'), b = fp.split('/')
    if (a.length !== b.length) continue
    let ok = true
    for (let i = 0; i < a.length; i++) {
      if (a[i] === '*' || b[i] === '*') continue
      if (a[i] !== b[i]) { ok = false; break }
    }
    if (ok) return true
  }
  return false
}
const orphansL1 = endpoints.filter(ep => !frontendHits(ep.route))

// ── 4. L2: bridge 导出方法零引用扫描 ──
// 提取 tauriAPI / piiKeyApi 的方法名，然后在 frontendBlob（排除定义文件本身）里数引用
const methodNames = []
for (const { txt } of bridgeFiles) {
  for (const m of txt.matchAll(/^  ([a-zA-Z0-9_]+):\s*(?:\(|async)/gm)) methodNames.push(m[1])
}
let blobNoBridge = ''
function walk2(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'node_modules') walk2(p); continue }
    if (!/\.(ts|tsx)$/.test(e.name)) continue
    if (/services[\\/](tauri-bridge|api-client)\.ts$/.test(p)) continue
    blobNoBridge += '\n' + fs.readFileSync(p, 'utf8')
  }
}
walk2(SRC)
const orphansL2 = methodNames.filter(n => !new RegExp(`[.\\s(]${n}\\s*\\(`).test(blobNoBridge))

// ── 输出 ──
console.log(`后端端点总数: ${endpoints.length}`)
console.log(`前端引用的 /api 路径数: ${feathPaths.size}`)
console.log(`\n═══ L1 完全孤儿端点（前端零路径引用，共 ${orphansL1.length} 个）═══`)
const byFile = {}
for (const o of orphansL1) (byFile[o.file] = byFile[o.file] || []).push(`${o.method} ${o.route}`)
for (const [f, list] of Object.entries(byFile)) {
  console.log(`\n  [${f}]`)
  for (const l of list) console.log(`    ${l}`)
}
console.log(`\n═══ L2 服务层孤儿方法（bridge 封装但零组件调用，共 ${orphansL2.length} 个）═══`)
for (const n of orphansL2) console.log(`  ${n}`)

// ── 5. L3: 顶层组件零引用（存在但没任何地方 import → 入口孤儿候选）──
const compDir = path.join(SRC, 'components')
const topComponents = fs.readdirSync(compDir).filter(f => f.endsWith('.tsx')).map(f => f.replace(/\.tsx$/, ''))
const orphansL3 = []
for (const name of topComponents) {
  // 在全库（含懒加载 import(...)）找引用；排除自身定义文件
  const re = new RegExp(`from ['\"][^'\"]*[/.]${name}['\"]|import\\(['\"][^'\"]*[/.]${name}['\"]\\)`)
  let used = false
  ;(function walk3(d) {
    if (used) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (used) return
      const p = path.join(d, e.name)
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk3(p); continue }
      if (!/\.(ts|tsx)$/.test(e.name)) continue
      if (e.name === `${name}.tsx`) continue
      if (re.test(fs.readFileSync(p, 'utf8'))) { used = true; return }
    }
  })(SRC)
  if (!used) orphansL3.push(name)
}
console.log(`\n═══ L3 零引用顶层组件（存在但无人 import，共 ${orphansL3.length} 个）═══`)
for (const n of orphansL3) console.log(`  ${n}.tsx`)
