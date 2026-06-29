import fs from 'node:fs'
import { createHash } from 'node:crypto'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
const version = pkg.version

const releaseBase = process.env.EM_RELEASE_BASE
if (!releaseBase) {
  console.error('[make-manifest] 错误：缺少环境变量 EM_RELEASE_BASE（二进制下载根地址）')
  process.exit(1)
}

// 读现有 manifest（保留 notesUrl）
let existingNotesUrl = ''
const manifestPath = 'update/manifest.json'
if (fs.existsSync(manifestPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    if (existing.notesUrl) existingNotesUrl = existing.notesUrl
  } catch { /* ignore */ }
}

// minForced: 环境变量覆盖，否则用现 manifest 的值，否则 "0.0.0"
const minForced = process.env.EM_MIN_FORCED
  ?? (() => {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      return existing.minForced || '0.0.0'
    } catch { return '0.0.0' }
  })()

// 安装包路径
const setupFile = `release/EngineeringManager-Setup-${version}.exe`
if (!fs.existsSync(setupFile)) {
  console.error(`[make-manifest] 错误：安装包不存在 ${setupFile}（请先 iscc 编译）`)
  process.exit(1)
}

// 计算 SHA256 + size
const buf = fs.readFileSync(setupFile)
const sha256 = createHash('sha256').update(buf).digest('hex').toUpperCase()
const size = buf.length

const url = `${releaseBase.replace(/\/+$/, '')}/EngineeringManager-Setup-${version}.exe`

// 防呆检查
if (url.includes('example.cn')) {
  console.error(`[make-manifest] 错误：URL 仍含 example.cn 占位符：${url}`)
  process.exit(1)
}
if (!sha256 || sha256.length < 64) {
  console.error(`[make-manifest] 错误：SHA256 无效：${sha256}`)
  process.exit(1)
}

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
// 转成东八区各字段
const t = new Date(now.getTime() + 8 * 3600 * 1000)
const releasedAt =
  `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}` +
  `T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}+08:00`

const manifest = {
  latest: version,
  minForced,
  releasedAt,
  notesUrl: existingNotesUrl || '',
  package: {
    url,
    size,
    sha256,
    signature: '',
  },
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`[make-manifest] 已生成 ${manifestPath}`)
console.log(`[make-manifest] 版本: ${version}`)
console.log(`[make-manifest] URL:  ${url}`)
console.log(`[make-manifest] Size: ${(size / 1024 / 1024).toFixed(2)} MB`)
console.log(`[make-manifest] SHA256: ${sha256}`)
