/**
 * check-icon-refs.cjs — 图标引用门禁（由 .work/icon-check-all.cjs 转正）
 *
 * 扫描 src/ 全部 .tsx/.ts 的图标引用写法：
 *   静态:  <Icon name="X" ... /> / icon: "X" / icon: 'X' / leftIcon="X" / leftIcon: "X"
 *   动态:  <Icon name={cond ? 'A' : 'B'} ... /> —— 提取花括号内全部字符串字面量。
 *          变量/查表引用（name={item.icon}）无法静态分析，跳过并计数（BSLINED）。
 * 与 src/utils/iconMap.ts 的 iconMap 注册表 diff：
 *   任一字面量引用未注册 → 逐行输出 MISSING: 图标名 -> 文件列表，exit 1（npm run check 失败）
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
let dynamicSkipped = 0

const record = (name, file) => {
  totalRefs++
  if (!registered.has(name)) missing.set(name, (missing.get(name) || []).concat(file))
}

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8')
  // 静态写法（原有三条 + Button 等组件的 leftIcon/rightIcon props）
  for (const m of c.matchAll(/Icon name="([A-Za-z0-9]+)"/g)) record(m[1], f)
  for (const m of c.matchAll(/Icon name='([A-Za-z0-9]+)'/g)) record(m[1], f)
  for (const m of c.matchAll(/\bicon: "([A-Za-z0-9]+)"/g)) record(m[1], f)
  for (const m of c.matchAll(/\bicon: '([A-Za-z0-9]+)'/g)) record(m[1], f)
  for (const m of c.matchAll(/\bleftIcon="([A-Za-z0-9]+)"/g)) record(m[1], f)
  for (const m of c.matchAll(/\brightIcon="([A-Za-z0-9]+)"/g)) record(m[1], f)
  // 动态写法：<Icon name={expr} ...>——提取表达式内全部字符串字面量（三元两臂等）。
  // 简单状态机：跳过三元/布尔比较的「条件区」（? 之前），只收集每个 : 分支与顶层字面量，
  // 避免把 `fileType === 'pdf' ? 'FileText' : 'Image'` 里的比较值 'pdf' 误当图标名。
  for (const m of c.matchAll(/Icon name=\{([^}]+)\}/g)) {
    const expr = m[1]
    const literals = [...expr.matchAll(/['"]([A-Za-z0-9]+)['"]/g)].map(x => x[1])
    if (literals.length === 0) {
      dynamicSkipped++
      continue
    }
    // 粗判：表达式含比较/布尔运算符时，只取「? 之后」的字面量（结果臂）；
    // 纯变量→查表跳过；纯字面量（无运算符）→ 全部收集。
    const hasConditional = /[?&|=!<>]/.test(expr.replace(/['"][^'"]*['"]/g, ''))
    let names = literals
    if (hasConditional) {
      const resultArms = expr.split('?').slice(1).join('?')  // 取首个 ? 之后的全部内容
      names = [...resultArms.matchAll(/['"]([A-Za-z0-9]+)['"]/g)].map(x => x[1])
      // 嵌套三元里若结果臂仍含 === 比较值（如 a==='x'?'A':'B' 展开不全），做二次过滤：
      // 图标名惯例首字母大写，比较值多为小写文件类型/颜色键——大小写过滤再兜一层
      names = names.filter(n => /^[A-Z]/.test(n))
    }
    if (names.length === 0) {
      dynamicSkipped++
      continue
    }
    names.forEach(name => record(name, f))
  }
}

if (missing.size === 0) {
  console.log(`图标引用检查通过: ${totalRefs} 个引用 / ${registered.size} 个图标全部注册` +
    (dynamicSkipped > 0 ? `（另有 ${dynamicSkipped} 处动态变量引用无法静态分析，见 BSLINED）` : ''))
  if (dynamicSkipped > 0) {
    console.log(`BSLINED: ${dynamicSkipped} 处 Icon name={变量} 引用未扫描（运行时查表，需人工确保来源已注册）`)
  }
  process.exit(0)
}

for (const [k, v] of missing) {
  console.log(`MISSING: ${k} -> ${[...new Set(v)].join(', ')}`)
}
console.error(`图标引用检查失败: ${missing.size} 个未注册图标（扫描 ${files.length} 个文件 / ${totalRefs} 个引用）。请到 src/utils/iconMap.ts 注册或修正引用。`)
process.exit(1)
