/**
 * Sprint B P0-4 通用 patch 脚本 v4（v1.1.0）
 *
 * 简化：手动找端点边界，不再用括号平衡
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const WHITELIST_FILES = [
  'AuthEndpoints.cs', 'HealthEndpoints.cs', 'ConfigEndpoints.cs',
  'AuditEndpoints.cs', 'SqliteAdminEndpoints.cs', 'RegionEndpoints.cs',
  'TemplateEndpoints.cs', 'SnapshotEndpoints.cs', 'BackupEndpoints.cs', 'OcrEndpoints.cs',
]

function isBusinessEndpoint(fileName) {
  return !WHITELIST_FILES.includes(fileName)
}

function hasSecurityImport(content) {
  return /using\s+EngineeringManager\.Api\.Security;/.test(content)
}

function addSecurityImport(content) {
  if (hasSecurityImport(content)) return content
  if (/using\s+Dapper;/.test(content)) {
    return content.replace(/(using\s+Dapper;)/, '$1\nusing EngineeringManager.Api.Security;')
  }
  return content.replace(/(using\s+[\w\.]+;)/, '$1\nusing EngineeringManager.Api.Security;')
}

// 找 "app.MapXxx(..." 起点
function findAppMapStarts(content) {
  const starts = []
  const regex = /app\.(MapGet|MapPost|MapDelete|MapPut)\b/g
  let m
  while ((m = regex.exec(content)) !== null) {
    starts.push({ start: m.index, method: m[1], afterBracket: m.index + m[0].length })
  }
  return starts
}

// 找匹配的 ) 位置（基于 depth）
function findMatchingClose(content, startOpenIdx, openChar, closeChar) {
  let depth = 0
  for (let i = startOpenIdx; i < content.length; i++) {
    if (content[i] === openChar) depth++
    else if (content[i] === closeChar) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

// 找端点完整范围：app.MapXxx(path, lambda)
function findEndpointBlocks(content) {
  const blocks = []
  const starts = findAppMapStarts(content)
  for (const s of starts) {
    // path 起点是 app.MapXxx( 之后第一个字符
    // path 终点是匹配 )，但不包含 lambda
    // 因为 path 可能含 ( 但不会含 ) 嵌套（MapGet path 通常是 string）
    // 简化：path 是 string 直到第一个 unescaped " 结束 + 找 ,
    let p = s.afterBracket  // 跳过 app.MapXxx(
    // 跳过 path: 简单跳过到第一个 , 即可（path 通常不含 ,）
    while (p < content.length && content[p] !== ',') p++
    if (p >= content.length) continue
    p++  // 跳过 ,
    while (p < content.length && /\s/.test(content[p])) p++
    // 跳过 async
    if (content.slice(p, p + 6) === 'async ') p += 6
    while (p < content.length && /\s/.test(content[p])) p++
    // 现在是 lambda 起点
    if (content[p] !== '(') continue
    const lambdaOpen = p
    const lambdaClose = findMatchingClose(content, lambdaOpen, '(', ')')
    if (lambdaClose < 0) continue
    // 跳过 =>
    let q = lambdaClose + 1
    while (q < content.length && /\s/.test(content[q])) q++
    if (content.slice(q, q + 2) !== '=>') continue
    q += 2
    while (q < content.length && /\s/.test(content[q])) q++
    // body
    let blockEnd
    if (content[q] === '{') {
      const closeBrace = findMatchingClose(content, q, '{', '}')
      if (closeBrace < 0) continue
      blockEnd = closeBrace + 1
    } else {
      // 单行 lambda
      const semi = content.indexOf(';', q)
      if (semi < 0) continue
      blockEnd = semi + 1
    }
    const block = content.slice(s.start, blockEnd)
    blocks.push({ start: s.start, end: blockEnd, method: s.method, block, lambdaOpen, lambdaClose })
  }
  return blocks
}

function hasHttpContextInLambda(block) {
  // lambda (params) 部分（可能没有 async）
  // 用 [^\(\)]* 排除嵌套括号（避免误匹配 path string）
  const m = block.match(/(async\s+)?\(([^()]*)\)\s*=>/)
  if (m) return /HttpContext/.test(m[2])
  return false
}

function hasCurrentUser(block) {
  return /CurrentUser\./.test(block)
}

function patchAddHttpContext(block) {
  if (hasCurrentUser(block)) return null
  let newBlock = block
  if (!hasHttpContextInLambda(newBlock)) {
    newBlock = newBlock.replace(/(async\s+)?\(([^()]*)\)(\s*=>)/, (m, asyncKw, p2, p3) => {
      if (p2.includes("HttpContext")) return m
      const inner = p2.trim()
      if (inner === "") {
        return (asyncKw || "") + "(HttpContext ctx)" + p3
      }
      return (asyncKw || "") + "(HttpContext ctx, " + p2 + ")" + p3
    })
  }
  return newBlock
}

function patchInsert(block) {
  if (hasCurrentUser(block)) return null
  let newBlock = patchAddHttpContext(block)
  if (!newBlock) return null
  if (!newBlock.includes('var uid = CurrentUser.GetUserId(ctx)')) {
    newBlock = newBlock.replace(/(\{\s*\r?\n)/, `$1            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();\n`, 1)
  }
  return newBlock
}

function patchSelect(block) {
  return patchAddHttpContext(block)
}

function patchDeleteOrUpdate(block) {
  return patchAddHttpContext(block)
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const fileName = path.basename(filePath)
  if (!isBusinessEndpoint(fileName)) {
    return { file: fileName, status: 'whitelist', changed: 0 }
  }
  const blocks = findEndpointBlocks(content)
  let insertPatched = 0
  let selectPatched = 0
  let deletePatched = 0
  let updatePatched = 0
  let skipAlreadyPatched = 0

  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i]
    let newBlock = null
    if (b.method === 'MapPost') {
      newBlock = patchInsert(b.block)
      if (newBlock) insertPatched++
      else if (hasCurrentUser(b.block)) skipAlreadyPatched++
    } else if (b.method === 'MapGet') {
      newBlock = patchSelect(b.block)
      if (newBlock) selectPatched++
      else if (hasCurrentUser(b.block)) skipAlreadyPatched++
    } else if (b.method === 'MapDelete') {
      newBlock = patchDeleteOrUpdate(b.block)
      if (newBlock) deletePatched++
      else if (hasCurrentUser(b.block)) skipAlreadyPatched++
    } else if (b.method === 'MapPut') {
      newBlock = patchDeleteOrUpdate(b.block)
      if (newBlock) updatePatched++
      else if (hasCurrentUser(b.block)) skipAlreadyPatched++
    }
    if (newBlock && newBlock !== b.block) {
      content = content.slice(0, b.start) + newBlock + content.slice(b.end)
    }
  }

  const beforeImport = content
  content = addSecurityImport(content)
  const importAdded = content !== beforeImport

  if (insertPatched + selectPatched + deletePatched + updatePatched > 0 || importAdded) {
    fs.writeFileSync(filePath, content, 'utf8')
  }

  return {
    file: fileName,
    status: (insertPatched + selectPatched + deletePatched + updatePatched) > 0 ? 'patched' : 'skip',
    insert: insertPatched,
    select: selectPatched,
    delete: deletePatched,
    update: updatePatched,
    skip: skipAlreadyPatched,
    importAdded
  }
}

const args = process.argv.slice(2)
let files
if (args.length > 0) {
  files = args.map(f => path.resolve(ROOT, f))
} else {
  const endpointsDir = path.join(ROOT, 'EngineeringManager.Api', 'Endpoints')
  files = fs.readdirSync(endpointsDir)
    .filter(f => f.endsWith('.cs'))
    .map(f => path.join(endpointsDir, f))
}

console.log('Processing ' + files.length + ' files...')
console.log('')
let totalInsert = 0, totalSelect = 0, totalDelete = 0, totalUpdate = 0, totalSkip = 0
for (const f of files) {
  const r = processFile(f)
  if (r.status === 'patched') {
    console.log('  ' + r.file + ': INSERT=' + r.insert + ' SELECT=' + r.select + ' DELETE=' + r.delete + ' UPDATE=' + r.update + ' (import added: ' + r.importAdded + ')')
    totalInsert += r.insert
    totalSelect += r.select
    totalDelete += r.delete
    totalUpdate += r.update
    totalSkip += r.skip
  } else if (r.status === 'whitelist') {
    console.log('  ' + r.file + ': [whitelist]')
  } else {
    console.log('  ' + r.file + ': [skip - already patched=' + r.skip + ']')
    totalSkip += r.skip
  }
}
console.log('')
console.log('TOTAL: INSERT=' + totalInsert + ' SELECT=' + totalSelect + ' DELETE=' + totalDelete + ' UPDATE=' + totalUpdate + ' skip=' + totalSkip)