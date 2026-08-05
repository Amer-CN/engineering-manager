/**
 * 工程管家 后端 C# 红线检查脚本（机械化门禁）
 *
 * 覆盖 AGENTS.md 已声明的三条后端红线：
 *   B1. SQL 必须参数化 —— 禁止字符串拼接 SQL；插值 SQL 仅允许受控白名单表达式
 *   B2. 端点鉴权覆盖 —— 所有端点路由必须落在 /api/ 前缀（受 GlobalAuthMiddleware 保护），
 *       中间件必须在 UseAuthentication 之后注册，鉴权白名单不得悄悄扩大
 *   B3. catch 必须写 Console.Error.WriteLine 日志 —— 按文件基线棘轮（ratchet）：
 *       存量记录在 backend-rules-baseline.json，新增无日志 catch 即失败
 *   B4. 端点 lambda 禁用 dynamic 参数 —— Minimal API 不会给 dynamic 绑 JSON body，
 *       实际拿到的是 JsonElement/null，历史上已造成 5 个「缺参必 500」端点
 *       （contract-templates PUT / income PUT / settlements POST+PUT 等）。
 *       存量按文件基线棘轮，新增即失败；新端点请用强类型 DTO 或 HttpContext 读 body
 *
 * 用法：
 *   node scripts/check-backend-rules.cjs                  # 检查（CI 调用此形式）
 *   node scripts/check-backend-rules.cjs --write-baseline # 重新生成 catch 基线（需 code review）
 *
 * 违规 → exit 1（CI backend job 失败），输出 文件:行号 定位。
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const API_DIR = path.join(ROOT, 'EngineeringManager.Api')
const BASELINE_PATH = path.join(__dirname, 'backend-rules-baseline.json')
const WRITE_BASELINE = process.argv.includes('--write-baseline')

let violations = 0
let warnings = 0

// ═══════════════════════════════════════════════════════════
// 工具：遍历 .cs 文件（排除 bin/obj）
// ═══════════════════════════════════════════════════════════

function walkCsFiles(dir) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'bin' || entry.name === 'obj') continue
      results.push(...walkCsFiles(full))
    } else if (entry.name.endsWith('.cs')) {
      results.push(full)
    }
  }
  return results
}

function lineOf(content, index) {
  let line = 1
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++
  }
  return line
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

// ═══════════════════════════════════════════════════════════
// 工具：C# 轻量词法扫描
// 返回 { masked, literals }
//   masked   — 注释与字符串内容替换为空格的源码（引号保留），用于安全的括号配对
//   literals — 字符串字面量数组 { start, end, text, interpolated }
// ═══════════════════════════════════════════════════════════

function scanCs(content) {
  const masked = content.split('')
  const literals = []
  const n = content.length
  let i = 0

  function maskRange(a, b) {
    for (let k = a; k < b; k++) {
      if (masked[k] !== '\n') masked[k] = ' '
    }
  }

  while (i < n) {
    const c = content[i]
    const c2 = content.substr(i, 2)
    const c3 = content.substr(i, 3)

    // 行注释
    if (c2 === '//') {
      const end = content.indexOf('\n', i)
      const stop = end === -1 ? n : end
      maskRange(i, stop)
      i = stop
      continue
    }
    // 块注释
    if (c2 === '/*') {
      const end = content.indexOf('*/', i + 2)
      const stop = end === -1 ? n : end + 2
      maskRange(i, stop)
      i = stop
      continue
    }
    // 字符字面量
    if (c === "'") {
      let j = i + 1
      while (j < n) {
        if (content[j] === '\\') { j += 2; continue }
        if (content[j] === "'") { j++; break }
        j++
      }
      maskRange(i + 1, j - 1)
      i = j
      continue
    }
    // 逐字/插值字符串（$@" / @$" / @" —— "" 转义）
    if (c3 === '$@"' || c3 === '@$"' || c2 === '@"') {
      const interpolated = c3 === '$@"' || c3 === '@$"'
      const qStart = i + (c2 === '@"' ? 2 : 3)
      let j = qStart
      while (j < n) {
        if (content[j] === '"') {
          if (content[j + 1] === '"') { j += 2; continue }
          break
        }
        j++
      }
      const end = j < n ? j + 1 : n
      literals.push({ start: i, end, text: content.slice(qStart, j), interpolated })
      maskRange(qStart, j)
      i = end
      continue
    }
    // 普通/插值字符串（$" / " —— \ 转义）
    if (c2 === '$"' || c === '"') {
      const interpolated = c2 === '$"'
      const qStart = i + (interpolated ? 2 : 1)
      let j = qStart
      while (j < n) {
        if (content[j] === '\\') { j += 2; continue }
        if (content[j] === '"') break
        j++
      }
      const end = j < n ? j + 1 : n
      literals.push({ start: i, end, text: content.slice(qStart, j), interpolated })
      maskRange(qStart, j)
      i = end
      continue
    }
    i++
  }
  return { masked: masked.join(''), literals }
}

// ═══════════════════════════════════════════════════════════
// 规则 B1：SQL 必须参数化
// ═══════════════════════════════════════════════════════════

// 结构化 SQL 识别（大写关键字 + 语法骨架，避免误伤日志文案）
const SQL_SHAPE = /(\bSELECT\s[\s\S]*?\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\s+[\[\]\w{}.]+\s+SET\b|\bDELETE\s+FROM\b|\bCREATE\s+TABLE\b|\bALTER\s+TABLE\b|\bPRAGMA\s)/

// 受控插值白名单（AGENTS.md 认可的 {w} 条件分支 + [{table}] 标识符插值）。
// 新增受控表达式必须在此登记并经 code review —— 这是有意的审查关卡。
const ALLOWED_SQL_INTERPOLATIONS = new Set([
  'w',
  'filter',
  'userFilter',
  'projectFilter',
  'projectFilterInvoices',
  'projectFilterSettlements',
  'projectFilterCostLedger',
  'companyFilter',
  'incomeFilter',
  'expenseFilter',
  'scope.Filter',
  'scopeFilter.Filter',
  'CurrentUser.UserFilterCompany(scope)',
  'createdByCol',
  'projectCol',
  'encCol',
  'selectCols',
  'table',
  't',
  'tableName',
  'column',
  'columns',
  'values',
])

// R4.1: UserFilterWithAuthorizedProjects 的插值形态——第二实参必须是「表名.列名」字面量
// （裸列名会退化为恒真 EXISTS 造成越权，见规则 B5）。用模式而非逐条枚举（表名会增长）。
const ALLOWED_SQL_INTERPOLATION_PATTERNS = [
  /^CurrentUser\s*\.\s*UserFilterWithAuthorizedProjects\(\s*scope\s*,\s*"[A-Za-z_]+\.project_id"\s*(?:,\s*"[A-Za-z_\.]+"\s*)?\)$/,
]

// 受控 + 拼接白名单（AGENTS.md 认可的租户隔离 filter helper 与常量条件组装）
// R4.1: UserFilter 拼接形态允许可选的「表名.列名」限定列字面量（如 scope, "wages.project_id"）
const ALLOWED_CONCAT_AFTER = [
  /^CurrentUser\s*\.\s*UserFilter\w*\s*\(\s*scope\s*(?:,\s*"[A-Za-z_]+\.project_id"\s*)?\)/, // 租户隔离 SQL 片段 helper
  /^string\s*\.\s*Join\s*\(\s*"[^"]*"\s*,\s*conditions\s*\)/, // 常量条件列表组装
]
const ALLOWED_CONCAT_BEFORE = [
  /CurrentUser\s*\.\s*UserFilter\w*\s*\(\s*scope\s*(?:,\s*"[A-Za-z_]+\.project_id"\s*)?\)\s*$/,
  /string\s*\.\s*Join\s*\(\s*"[^"]*"\s*,\s*conditions\s*\)\s*$/,
]

function checkSqlRules(file, content, scanned) {
  const { literals } = scanned
  for (const lit of literals) {
    if (!SQL_SHAPE.test(lit.text)) continue
    const lineNo = lineOf(content, lit.start)

    // 1a. 插值 SQL：每个 {expr} 必须在白名单
    if (lit.interpolated) {
      const exprRe = /\{([^{}]+)\}/g
      let m
      while ((m = exprRe.exec(lit.text.replace(/\{\{|\}\}/g, '  ')))) {
        const expr = m[1].split(':')[0].trim() // 去掉格式说明符
        if (!ALLOWED_SQL_INTERPOLATIONS.has(expr) && !ALLOWED_SQL_INTERPOLATION_PATTERNS.some(re => re.test(expr))) {
          console.log(`  HARD FAIL  ${rel(file)}:${lineOf(content, lit.start + m.index)}: SQL 插值 {${expr}} 不在受控白名单，必须改用 Dapper @参数`)
          violations++
        }
      }
    }

    // 1b. 拼接 SQL："SELECT ..." + 变量 / 变量 + "SELECT ..."
    //     常量字符串之间的 + 拼接、受控白名单表达式放行
    let j = lit.end
    while (j < content.length && /\s/.test(content[j])) j++
    if (content[j] === '+') {
      let k = j + 1
      while (k < content.length && /\s/.test(content[k])) k++
      const next = content.substr(k, 2)
      const isStringNext = content[k] === '"' || next === '$"' || next === '@"' || content.substr(k, 3) === '$@"' || content.substr(k, 3) === '@$"'
      // R4.2: 切片窗口 80 → 240（UserFilter 带表名限定列后调用文本可超 80 字符，截断会漏配白名单）
      const after = content.slice(k, k + 240)
      if (!isStringNext && !ALLOWED_CONCAT_AFTER.some(re => re.test(after))) {
        console.log(`  HARD FAIL  ${rel(file)}:${lineNo}: SQL 字符串使用 + 拼接变量，必须改用 Dapper @参数`)
        violations++
      }
    }
    let p = lit.start - 1
    while (p >= 0 && /\s/.test(content[p])) p--
    if (content[p] === '+') {
      let q = p - 1
      while (q >= 0 && /\s/.test(content[q])) q--
      const before2 = content.slice(Math.max(0, p - 240), p)
      if (content[q] !== '"' && !ALLOWED_CONCAT_BEFORE.some(re => re.test(before2))) {
        console.log(`  HARD FAIL  ${rel(file)}:${lineNo}: SQL 字符串被变量 + 拼接，必须改用 Dapper @参数`)
        violations++
      }
    }

    // 1c. string.Format / string.Concat 组装 SQL
    const before = content.slice(Math.max(0, lit.start - 40), lit.start)
    if (/string\s*\.\s*(Format|Concat)\s*\(\s*$/.test(before)) {
      console.log(`  HARD FAIL  ${rel(file)}:${lineNo}: 禁止 string.Format/Concat 组装 SQL，必须改用 Dapper @参数`)
      violations++
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 规则 B2：端点鉴权覆盖（GlobalAuthMiddleware 前缀模型）
// ═══════════════════════════════════════════════════════════

// GlobalAuthMiddleware 已批准的公开路径白名单（扩大白名单必须同步改这里，触发 review）
const APPROVED_PUBLIC_PREFIXES = new Set([
  '/api/auth/login',
  '/api/health',
  '/api/ocr/setup',
  '/api/agent/setup',
  '/api/update/download',
])
// 中间件内已批准的精确放行分支数（/api/config GET + /api/config/data-path PUT）
const APPROVED_ISPUBLIC_ASSIGNMENTS = 2

function routeLiteralAt(content, literals, fromIndex) {
  // 从 fromIndex（左括号后）跳过空白，取紧随其后的字符串字面量
  let k = fromIndex
  while (k < content.length && /\s/.test(content[k])) k++
  const lit = literals.find(l => l.start === k)
  return { pos: k, lit }
}

function checkEndpointRules(file, content, scanned) {
  const { masked, literals } = scanned

  // MapGroup：收集挂在 /api/ 前缀上的组变量；非 /api 前缀直接违规
  const groupVars = new Set()
  const groupRe = /(\w+)\s*=\s*\w+\s*\.\s*MapGroup\s*\(/g
  let g
  while ((g = groupRe.exec(masked))) {
    const { lit } = routeLiteralAt(content, literals, g.index + g[0].length)
    if (!lit) continue
    if (lit.text.startsWith('/api/') || lit.text === '/api') {
      groupVars.add(g[1])
    } else {
      console.log(`  HARD FAIL  ${rel(file)}:${lineOf(content, g.index)}: MapGroup("${lit.text}") 不在 /api/ 前缀下，绕过 GlobalAuthMiddleware 鉴权`)
      violations++
    }
  }

  const mapRe = /(\w+)\s*\.\s*Map(Get|Post|Put|Delete|Patch)\s*\(/g
  let m
  while ((m = mapRe.exec(masked))) {
    const receiver = m[1]
    const verb = m[2]
    const lineNo = lineOf(content, m.index)
    const { lit } = routeLiteralAt(content, literals, m.index + m[0].length)
    if (!lit) {
      console.log(`  HARD FAIL  ${rel(file)}:${lineNo}: Map${verb} 路由不是字符串字面量，无法静态验证 /api/ 鉴权前缀`)
      violations++
      continue
    }
    if (lit.interpolated) {
      console.log(`  HARD FAIL  ${rel(file)}:${lineNo}: Map${verb} 路由使用插值字符串，请改为普通字面量以便静态验证`)
      violations++
      continue
    }
    if (lit.text.startsWith('/api/')) continue
    if (groupVars.has(receiver)) continue // 挂在 /api/ MapGroup 上的相对路由
    console.log(`  HARD FAIL  ${rel(file)}:${lineNo}: Map${verb}("${lit.text}") 不在 /api/ 前缀下，绕过 GlobalAuthMiddleware 鉴权`)
    violations++
  }
}

function checkAuthWiring() {
  // Program.cs：中间件必须注册且在 UseAuthentication 之后
  const programPath = path.join(API_DIR, 'Program.cs')
  if (!fs.existsSync(programPath)) {
    console.log('  HARD FAIL  EngineeringManager.Api/Program.cs 不存在')
    violations++
    return
  }
  const program = fs.readFileSync(programPath, 'utf-8')
  const authIdx = program.search(/\bUseAuthentication\s*\(\s*\)/)
  const mwIdx = program.search(/UseMiddleware<[^>]*GlobalAuthMiddleware>/)
  if (mwIdx === -1) {
    console.log('  HARD FAIL  EngineeringManager.Api/Program.cs: 未注册 GlobalAuthMiddleware，全部 API 端点裸奔')
    violations++
  } else if (authIdx === -1 || mwIdx < authIdx) {
    console.log('  HARD FAIL  EngineeringManager.Api/Program.cs: GlobalAuthMiddleware 必须在 UseAuthentication() 之后注册，否则 ctx.User 永远为匿名')
    violations++
  }

  // GlobalAuthMiddleware.cs：白名单不得悄悄扩大
  const mwPath = path.join(API_DIR, 'GlobalAuthMiddleware.cs')
  if (!fs.existsSync(mwPath)) {
    console.log('  HARD FAIL  EngineeringManager.Api/GlobalAuthMiddleware.cs 不存在')
    violations++
    return
  }
  const mw = fs.readFileSync(mwPath, 'utf-8')
  const arrMatch = mw.match(/PublicPathPrefixes\s*=\s*new\s*\[\s*\]\s*\{([\s\S]*?)\}/)
  if (!arrMatch) {
    console.log('  HARD FAIL  GlobalAuthMiddleware.cs: 找不到 PublicPathPrefixes 白名单定义（结构被改动，请同步更新门禁脚本）')
    violations++
  } else {
    const entries = [...arrMatch[1].matchAll(/"([^"]+)"/g)].map(x => x[1])
    for (const e of entries) {
      if (!APPROVED_PUBLIC_PREFIXES.has(e)) {
        console.log(`  HARD FAIL  GlobalAuthMiddleware.cs: 鉴权白名单新增 "${e}" 未经批准（需 review 后登记到 check-backend-rules.cjs 的 APPROVED_PUBLIC_PREFIXES）`)
        violations++
      }
    }
  }
  const isPublicAssigns = (mw.match(/isPublic\s*=\s*true/g) || []).length
  if (isPublicAssigns > APPROVED_ISPUBLIC_ASSIGNMENTS) {
    console.log(`  HARD FAIL  GlobalAuthMiddleware.cs: 精确放行分支从 ${APPROVED_ISPUBLIC_ASSIGNMENTS} 处增加到 ${isPublicAssigns} 处，未经批准（需 review 后更新门禁脚本）`)
    violations++
  }
}

// ═══════════════════════════════════════════════════════════
// 规则 B3：catch 必须写 Console.Error.WriteLine 日志（基线棘轮）
// ═══════════════════════════════════════════════════════════

function findUnloggedCatches(file, content, scanned) {
  const { masked } = scanned
  const results = []
  const catchRe = /\bcatch\b/g
  let m
  while ((m = catchRe.exec(masked))) {
    let i = m.index + 5
    // 可选 (ExceptionType ex)
    while (i < masked.length && /\s/.test(masked[i])) i++
    if (masked[i] === '(') {
      let depth = 1; i++
      while (i < masked.length && depth > 0) {
        if (masked[i] === '(') depth++
        else if (masked[i] === ')') depth--
        i++
      }
    }
    // 可选 when (...)
    while (i < masked.length && /\s/.test(masked[i])) i++
    if (masked.startsWith('when', i)) {
      i += 4
      while (i < masked.length && /\s/.test(masked[i])) i++
      if (masked[i] === '(') {
        let depth = 1; i++
        while (i < masked.length && depth > 0) {
          if (masked[i] === '(') depth++
          else if (masked[i] === ')') depth--
          i++
        }
      }
    }
    while (i < masked.length && /\s/.test(masked[i])) i++
    if (masked[i] !== '{') continue // catch 变量名等误匹配
    // 括号配对提取 catch 块体
    let depth = 1
    const bodyStart = i + 1
    i++
    while (i < masked.length && depth > 0) {
      if (masked[i] === '{') depth++
      else if (masked[i] === '}') depth--
      i++
    }
    const body = content.slice(bodyStart, i - 1)
    const hasLog = /Console\s*\.\s*Error\s*\.\s*WriteLine/.test(body)
    const rethrows = /\bthrow\b/.test(body)
    if (!hasLog && !rethrows) {
      results.push({ line: lineOf(content, m.index), empty: body.trim() === '' })
    }
  }
  return results
}

// ═══════════════════════════════════════════════════════════
// 执行
// ═══════════════════════════════════════════════════════════

// 规则 B4 检测：Map* 调用实参中的 dynamic lambda 参数
function findDynamicEndpointParams(file, content, scanned) {
  const { masked } = scanned
  const results = []
  const mapRe = /\.\s*Map(Get|Post|Put|Delete|Patch)\s*\(/g
  let m
  while ((m = mapRe.exec(masked))) {
    // 从 Map*( 后括号配对提取整个调用实参段，在其中找 lambda 参数列表的 dynamic
    let i = m.index + m[0].length
    let depth = 1
    const argStart = i
    while (i < masked.length && depth > 0) {
      if (masked[i] === '(') depth++
      else if (masked[i] === ')') depth--
      i++
    }
    const argText = masked.slice(argStart, i - 1)
    const dynRe = /\bdynamic\s+\w+/g
    let d
    while ((d = dynRe.exec(argText))) {
      results.push({ line: lineOf(content, argStart + d.index) })
    }
  }
  return results
}

const csFiles = walkCsFiles(API_DIR)

console.log('\n═══ 后端红线 B1：SQL 参数化 ═══')
const scannedCache = new Map()
for (const file of csFiles) {
  const content = fs.readFileSync(file, 'utf-8')
  const scanned = scanCs(content)
  scannedCache.set(file, { content, scanned })
  checkSqlRules(file, content, scanned)
}
if (violations === 0) console.log('  OK  未发现拼接/越权插值 SQL')

// ═══════════════════════════════════════════════════════════
// 规则 B5（R4.1c / R5.3 全枚举）：UserFilterWithAuthorizedProjects 第二实参必须为
// 「含 '.' 且限定符不在黑名单」的字符串字面量
// 退化 EXISTS 结构性防线：裸列名（如 "project_id"）或自引用限定符（pa_authz /
// project_authorizations）在 EXISTS 子查询内自比较恒真 → 「用户有任意一条授权记录
// 就全项目可见」（越权，R3.1 实测钉出）。
//
// R5.3 重写：不再用形状匹配（形状不匹配会【静默跳过】，fail-open），改为
// /UserFilterWithAuthorizedProjects\s*\(/g 枚举【全部】出现点 → 括号配对切出实参文本
// → 顶层逗号切分 → 第二实参必须是合规字面量；其余一切形态（变量 / 成员访问 /
// 插值串 / 首参是方法调用 / 无法解析）一律 HARD FAIL 并打印实际实参。
// 实现说明：必须在【原始源码】上扫描而非 masked——$@"...{...}" 插值字符串内的
// 嵌套引号会让 scanCs 提前结束字符串扫描、把整个调用表达式掩掉（实测 2026-08-05）。
// 允许的例外：SafeQueryValidator.GetTableFilter 用 tableAlias 动态构造列名
// （"{alias}project_id"），其安全性由 CurrentUser 的 fail-closed 运行时守卫兜底，
// 且行为已由 R5.1(b)(c)(d) 测试钉住——例外【显式计数打印】，不许静默放行。
// ═══════════════════════════════════════════════════════════
console.log('\n═══ 后端红线 B5：UserFilterWithAuthorizedProjects 限定列（全枚举） ═══')
const b0Violations = violations
const b5CallStartRe = /UserFilterWithAuthorizedProjects\s*\(/g
const b5Blacklist = new Set(['pa_authz', 'project_authorizations'])
let b5ExemptCount = 0

function b5Fail(file, content, idx, detail) {
  const line = lineOf(content, idx)
  console.log(`  HARD FAIL  ${rel(file)}:${line}: ${detail}`)
  violations++
}

/** 顶层逗号切分（跳过字符串字面量内的逗号），返回字符串数组 */
function splitTopLevelCommas(text) {
  const parts = []
  let depth = 0
  let inStr = null
  let cur = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      cur += c
      if (c === '\\') { cur += text[++i] ?? ''; continue }
      if (c === inStr) inStr = null
      continue
    }
    if (c === '"' || c === "'") { inStr = c; cur += c; continue }
    if (c === '(' || c === '[' || c === '{') { depth++; cur += c; continue }
    if (c === ')' || c === ']' || c === '}') { depth--; cur += c; continue }
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue }
    cur += c
  }
  parts.push(cur)
  return parts
}

/** R6.2(G4): SQL 标识符限定符归一化——剥离首尾空白与标识符引号（[] / "" / ``）后转小写 */
function normalizeSqlQualifier(q) {
  let s = q.trim()
  while (s.length >= 2 &&
         ((s[0] === '[' && s[s.length - 1] === ']') ||
          (s[0] === '"' && s[s.length - 1] === '"') ||
          (s[0] === '`' && s[s.length - 1] === '`'))) {
    s = s.slice(1, -1).trim()
  }
  return s.toLowerCase()
}

for (const file of csFiles) {
  const content = fs.readFileSync(file, 'utf-8')
  b5CallStartRe.lastIndex = 0
  let m
  while ((m = b5CallStartRe.exec(content))) {
    // 跳过方法定义本身（public static string UserFilterWithAuthorizedProjects(...)）
    const lineStart = content.lastIndexOf('\n', m.index) + 1
    if (/public\s+static\s+string\s+$/.test(content.slice(lineStart, m.index))) continue

    // 括号配对切出实参文本
    let i = m.index + m[0].length
    let depth = 1
    let inStr = null
    const argStart = i
    while (i < content.length && depth > 0) {
      const c = content[i]
      if (inStr) {
        if (c === '\\') { i += 2; continue }
        if (c === inStr) inStr = null
      } else if (c === '"' || c === "'") inStr = c
      else if (c === '(') depth++
      else if (c === ')') depth--
      i++
    }
    if (depth !== 0) {
      b5Fail(file, content, m.index, 'B5 无法解析调用点（括号未配对），必须人工核查')
      continue
    }
    const args = splitTopLevelCommas(content.slice(argStart, i - 1))
    if (args.length < 2) {
      b5Fail(file, content, m.index, `B5 实参不足（${args.length} 个）：${content.slice(argStart, i - 1).trim().slice(0, 60)}`)
      continue
    }
    const secondArg = args[1].trim()
    const lit = /^"([^"]*)"$/.exec(secondArg)
    if (lit) {
      const col = lit[1]
      if (!col.includes('.')) {
        b5Fail(file, content, m.index, `B5 第二实参字符串字面量不含 '.'（裸列名，退化 EXISTS 越权）："${col}"`)
        continue
      }
      const rawQualifier = col.slice(0, col.indexOf('.')).trim()
      const qualifier = normalizeSqlQualifier(rawQualifier)
      if (b5Blacklist.has(qualifier)) {
        b5Fail(file, content, m.index, `B5 第二实参限定符 '${rawQualifier}'（归一化后 '${qualifier}'）与授权子查询自身别名/表名冲突 → 自比较恒真 → 越权（R5.2 黑名单 / R6.2 去引号）`)
      }
      continue // 合规：表名.列名 字面量且限定符（归一化后）不在黑名单
    }
    // 非字面量实参：仅 SafeQueryValidator.cs 内（GetTableFilter 动态构造列名）显式例外
    if (file.includes('SafeQueryValidator.cs')) { b5ExemptCount++; continue }
    b5Fail(file, content, m.index, `B5 第二实参非字符串字面量（变量/成员访问/插值串/方法调用）：${secondArg.slice(0, 80)}`)
  }
}
if (violations === b0Violations) console.log('  OK  全部调用点均使用表名限定的 projectCol 字面量')
console.log(`  B5 例外放行 ${b5ExemptCount} 处（SafeQueryValidator.cs 动态构造，行为由 R5.1(b)(c)(d) 测试钉住）`)

// ═══════════════════════════════════════════════════════════
// 规则 B6（R5.4b）：消灭手写 project_authorizations 过滤副本
// 手写过滤副本的独有签名是 SELECT 1 FROM project_authorizations（EXISTS 子查询形态）——
// 谁手写一个 EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=project_id ...)
// 就会命中，且若删掉限定符即退化为恒真（B5 对绕过 helper 的副本不可见，B6 兜底）。
// 作用域界定（非白名单）：project_authorizations 表自身的【管理端点】
// （AuthEndpoints /api/admin/project-authorizations：SELECT pa.* / SELECT COUNT(*) /
// INSERT INTO project_authorizations）不是过滤副本，天然不匹配 SELECT 1 FROM 签名，
// 故规则仅命中过滤形态；若未来出现其他 SELECT 1 FROM project_authorizations 用法，
// 先报偏差再处理，不自行加白名单。
// ═══════════════════════════════════════════════════════════
console.log('\n═══ 后端红线 B6：手写 project_authorizations 过滤副本 ═══')
const b6Before = violations
const b6Re = /SELECT\s+1\s+FROM\s+project_authorizations/gi
for (const file of csFiles) {
  if (file.includes('Security' + path.sep + 'CurrentUser.cs')) continue // helper 本体豁免
  const content = fs.readFileSync(file, 'utf-8')
  // 用 scanCs 的 literals 只查 SQL 字符串字面量（注释/普通文本不误伤）
  const { literals } = scanCs(content)
  for (const lit of literals) {
    if (b6Re.test(lit.text)) {
      const line = lineOf(content, lit.start)
      console.log(`  HARD FAIL  ${rel(file)}:${line}: SQL 字面量含手写 project_authorizations 过滤副本（SELECT 1 FROM project_authorizations）——必须迁移到 CurrentUser.UserFilterWithAuthorizedProjects（B6，R5.4）`)
      violations++
    }
  }
}
if (violations === b6Before) console.log('  OK  无手写 project_authorizations 过滤副本（B6 白名单为空）')

console.log('\n═══ 后端红线 B2：端点鉴权覆盖 ═══')
const b1Violations = violations
for (const file of csFiles) {
  const { content, scanned } = scannedCache.get(file)
  checkEndpointRules(file, content, scanned)
}
checkAuthWiring()
if (violations === b1Violations) console.log('  OK  所有端点均在 /api/ 前缀 + GlobalAuthMiddleware 接线正确')

console.log('\n═══ 后端红线 B3：catch 日志（基线棘轮） ═══')
const b2Violations = violations
const currentCounts = {}
const details = {}
for (const file of csFiles) {
  const { content, scanned } = scannedCache.get(file)
  const unlogged = findUnloggedCatches(file, content, scanned)
  if (unlogged.length > 0) {
    currentCounts[rel(file)] = unlogged.length
    details[rel(file)] = unlogged
  }
}

if (WRITE_BASELINE) {
  // B4 存量也一并重算（下方 B4 段会填充 dynCounts 后统一写入）
} else {
  let baseline = { unloggedCatch: {} }
  if (fs.existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'))
  } else {
    console.log('  HARD FAIL  缺少 scripts/backend-rules-baseline.json（先运行 --write-baseline 生成并提交）')
    violations++
  }
  const allowed = baseline.unloggedCatch || {}
  for (const [f, count] of Object.entries(currentCounts)) {
    const limit = allowed[f] || 0
    if (count > limit) {
      console.log(`  HARD FAIL  ${f}: 无日志 catch 从基线 ${limit} 处增加到 ${count} 处。新增 catch 必须包含 Console.Error.WriteLine 或 throw。位置：`)
      for (const d of details[f]) {
        console.log(`             ${f}:${d.line}${d.empty ? '（空 catch，静默吞错）' : ''}`)
      }
      violations++
    } else if (count < limit) {
      console.log(`  SOFT WARN  ${f}: 无日志 catch 已降到 ${count} 处（基线 ${limit}），建议 --write-baseline 收紧基线`)
      warnings++
    }
  }
  // 基线里有但文件已清零/删除 → 提示收紧
  for (const [f, limit] of Object.entries(allowed)) {
    if (!(f in currentCounts) && limit > 0) {
      console.log(`  SOFT WARN  ${f}: 无日志 catch 已清零（基线 ${limit}），建议 --write-baseline 收紧基线`)
      warnings++
    }
  }
  if (violations === b2Violations) console.log('  OK  无新增无日志 catch')
}

console.log('\n═══ 后端红线 B4：端点 lambda 禁用 dynamic 参数（基线棘轮） ═══')
const b3Violations = violations
const dynCounts = {}
const dynDetails = {}
for (const file of csFiles) {
  const { content, scanned } = scannedCache.get(file)
  const found = findDynamicEndpointParams(file, content, scanned)
  if (found.length > 0) {
    dynCounts[rel(file)] = found.length
    dynDetails[rel(file)] = found
  }
}

if (WRITE_BASELINE) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify({
    _comment: '后端红线存量基线（棘轮：只许减不许增）。重新生成：node scripts/check-backend-rules.cjs --write-baseline，需 code review。',
    unloggedCatch: currentCounts,
    dynamicEndpointParams: dynCounts,
  }, null, 2) + '\n')
  console.log(`  基线已写入 ${rel(BASELINE_PATH)}（catch 无日志 ${Object.values(currentCounts).reduce((a, b) => a + b, 0)} 处，dynamic 参数 ${Object.values(dynCounts).reduce((a, b) => a + b, 0)} 处）`)
} else {
  let baseline = { dynamicEndpointParams: {} }
  if (fs.existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'))
  }
  const dynAllowed = baseline.dynamicEndpointParams || {}
  for (const [f, count] of Object.entries(dynCounts)) {
    const limit = dynAllowed[f] || 0
    if (count > limit) {
      console.log(`  HARD FAIL  ${f}: 端点 dynamic 参数从基线 ${limit} 处增加到 ${count} 处。Minimal API 不给 dynamic 绑 body，请用强类型 DTO 或 HttpContext 读 body。位置：`)
      for (const d of dynDetails[f]) {
        console.log(`             ${f}:${d.line}`)
      }
      violations++
    } else if (count < limit) {
      console.log(`  SOFT WARN  ${f}: 端点 dynamic 参数已降到 ${count} 处（基线 ${limit}），建议 --write-baseline 收紧基线`)
      warnings++
    }
  }
  for (const [f, limit] of Object.entries(dynAllowed)) {
    if (!(f in dynCounts) && limit > 0) {
      console.log(`  SOFT WARN  ${f}: 端点 dynamic 参数已清零（基线 ${limit}），建议 --write-baseline 收紧基线`)
      warnings++
    }
  }
  if (violations === b3Violations) console.log('  OK  无新增端点 dynamic 参数')
}

// ═══════════════════════════════════════════════════════════
// 汇总
// ═══════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════')
console.log(`后端红线检查完成: ${violations} 项违规, ${warnings} 项警告（扫描 ${csFiles.length} 个 .cs 文件）`)
console.log('═══════════════════════════════════════\n')

if (violations > 0) {
  console.error(`BACKEND CHECK BLOCKED: ${violations} 项红线违规。请修复后再提交。`)
  process.exit(1)
} else {
  console.log('BACKEND CHECK PASSED\n')
  process.exit(0)
}
